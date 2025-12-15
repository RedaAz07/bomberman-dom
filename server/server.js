import { createServer } from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { WebSocketServer } from "ws";
import { generateMap } from "./generateMap.js";

const PORT = 3000;
const GAME_TICK = 50; // Run game logic every 50ms (20 ticks/second)

// Game Constants
const TILE_SIZE = 50;
const POWERUPS = [7, 8, 9]; // Speed, BombUp, Range
const TILES = {
  GRASS: 0,
  WALL: 1,
  BARREL: 2,
  CORNER: 3,
  STONE: 4,
  BOMB: 5,
  EXPLOSION: 6,
  SPEED: 7,
  BOMB_UP: 8,
  POWER: 9,
};

let rooms = [];

/* -------------------- ROOM MANAGEMENT -------------------- */

function createRoom() {
  const { map, collisionMap } = generateMap(15, 15);

  const room = {
    id: rooms.length + 1,
    count: 0,
    players: [],
    map, // The visual map
    collisionMap, // The logic map (server authority)
    disponible: true,
    gameInterval: null,
    gameState: {
      bombs: [], // { id, x, y, owner, range, created }
      explosions: [], // { x, y, created }
    },
  };
  rooms.push(room);
  return room;
}

function findOrCreateRoom() {
  let room = rooms.find((r) => r.disponible && r.players.length < 4);
  if (!room) room = createRoom();
  return room;
}

function broadcastRoom(room, obj) {
  const msg = JSON.stringify(obj);
  for (const p of room.players) {
    if (p.socket.readyState === 1) {
      p.socket.send(msg);
    }
  }
}

/* -------------------- GAME LOGIC ENGINE -------------------- */

function startGame(room) {
  room.disponible = false;
  
  // Initialize Player Stats
  room.players.forEach((p, index) => {
    p.stats = {
      lives: 3,
      speedLevel: 1,
      speedValue: 0.1,
      maxBombs: 1,
      activeBombs: 0,
      range: 1,
      isDead: false,
      invulnerable: 0, // Timestamp for invulnerability after hit
    };
    // Send initial stats to each player
    sendStatsUpdate(room, p);
  });

  broadcastRoom(room, {
    type: "start-game",
    map: room.map,
    players: room.players.map(p => ({ username: p.username })), // Send basic info
  });

  // Start the Server Game Loop
  room.gameInterval = setInterval(() => {
    updateGame(room);
  }, GAME_TICK);
}

function updateGame(room) {
  const now = Date.now();
  let gridChanged = false;
  const grid = room.map;

  // 1. Handle Bombs
  // Filter out bombs that exploded
  const activeBombs = [];
  room.gameState.bombs.forEach((bomb) => {
    if (now - bomb.created > 3000) {
      // Boom!
      explodeBomb(room, bomb, now);
      gridChanged = true;
    } else {
      activeBombs.push(bomb);
    }
  });
  room.gameState.bombs = activeBombs;

  // 2. Handle Explosions (Clear them after 500ms)
  const activeExplosions = [];
  room.gameState.explosions.forEach((exp) => {
    if (now - exp.created > 500) {
      // Clear explosion
      if (grid[exp.y][exp.x] === TILES.EXPLOSION) {
        // Check if there was a powerup "under" the explosion or generate one
        grid[exp.y][exp.x] = TILES.GRASS;
        
        // Simple loot drop logic:
        if (exp.wasBarrel) {
           // 30% chance of loot
           if (Math.random() < 0.3) {
             const loot = POWERUPS[Math.floor(Math.random() * POWERUPS.length)];
             grid[exp.y][exp.x] = loot;
           }
        }
      }
      gridChanged = true;
    } else {
      activeExplosions.push(exp);
    }
  });
  room.gameState.explosions = activeExplosions;

  // 3. Player Collision Checks (Powerups & Damage)
  room.players.forEach((p) => {
    if (p.stats.isDead) return;

    // Use a Bounding Box check instead of a single point
    // Player is 64x64, let's assume a hitbox of 40x40 in the center
    // Coordinates sent by client are top-left relative to initial pos (64,64)
    // So actual X = p.x + 64 (initial offset) + p.x (movement)? 
    // Wait, the client sends RELATIVE movement in 'move' event? 
    // NO, client sends: posX (relative to start).
    // Initial start is 64,64. 
    // So Absolute X = 64 + p.x
    // Let's normalize: The server should track absolute Grid Coordinates.
    
    // Simplification: Let's assume p.x and p.y are the Visual Offsets sent by client.
    // Client start pos: 64px, 64px.
    const absX = 64 + p.x; 
    const absY = 64 + p.y;
    
    // Hitbox Center
    const centerX = absX + 32; 
    const centerY = absY + 32;

    // Check the tile directly under the center (Primary Check)
    const tileX = Math.floor(centerX / TILE_SIZE);
    const tileY = Math.floor(centerY / TILE_SIZE);

    // Also Check 4 corners of the internal hitbox (Size 30x30) to be generous
    // This fixes "cannot collect item" if you are straddling two tiles
    const checkPoints = [
        {x: centerX, y: centerY},           // Center
        {x: centerX - 15, y: centerY - 15}, // Top-Left
        {x: centerX + 15, y: centerY + 15}, // Bottom-Right
        {x: centerX + 15, y: centerY - 15}, // Top-Right
        {x: centerX - 15, y: centerY + 15}  // Bottom-Left
    ];

    let hitSomething = false;

    for (const point of checkPoints) {
        const tx = Math.floor(point.x / TILE_SIZE);
        const ty = Math.floor(point.y / TILE_SIZE);

        if (grid[ty] && grid[ty][tx] !== undefined) {
            const tile = grid[ty][tx];

            // HIT BY EXPLOSION
            if (tile === TILES.EXPLOSION) {
                if (now > p.stats.invulnerable) {
                    p.stats.lives -= 1;
                    p.stats.invulnerable = now + 1000;
                    sendStatsUpdate(room, p);
                    if (p.stats.lives <= 0) {
                        p.stats.isDead = true;
                        broadcastRoom(room, { type: "player-dead", username: p.username });
                        checkWinCondition(room);
                    }
                }
            }

            // PICK UP POWERUP
            if (POWERUPS.includes(tile)) {
                applyPowerup(p, tile);
                grid[ty][tx] = TILES.GRASS; // Remove powerup
                gridChanged = true;
                hitSomething = true;
                sendStatsUpdate(room, p);
                break; // Don't pick up 2 items in one frame
            }
        }
    }
  });

  // 4. Broadcast Updates
  if (gridChanged) {
    broadcastRoom(room, {
      type: "grid-update",
      grid: room.map,
    });
  }
}

function explodeBomb(room, bomb, now) {
  const grid = room.map;
  
  // Free up the player's bomb slot
  const owner = room.players.find(p => p.username === bomb.owner);
  if (owner) owner.stats.activeBombs = Math.max(0, owner.stats.activeBombs - 1);

  // Clear the actual bomb tile first
  if (grid[bomb.y][bomb.x] === TILES.BOMB) {
      grid[bomb.y][bomb.x] = TILES.GRASS;
  }

  const createExplosion = (x, y) => {
    // Bounds check
    if (x < 0 || y < 0 || y >= grid.length || x >= grid[0].length) return false;
    
    const tile = grid[y][x];

    // Stop at Walls (1), Stones (4), Corners (3)
    if (tile === TILES.WALL || tile === TILES.STONE || tile === TILES.CORNER) return false;

    const wasBarrel = (tile === TILES.BARREL);

    // Chain Reaction: If we hit another bomb, explode it instantly
    if (tile === TILES.BOMB) {
       const chainedBomb = room.gameState.bombs.find(b => b.x === x && b.y === y);
       if (chainedBomb) chainedBomb.created = 0; // Trigger next tick
       // Don't overwrite the bomb with explosion yet, let the bomb logic handle it
       return false; 
    }

    // Set explosion tile
    grid[y][x] = TILES.EXPLOSION;
    room.gameState.explosions.push({ x, y, created: now, wasBarrel });
    
    // If we hit a barrel, stop the ray here (don't go through it)
    return !wasBarrel; 
  };

  // 1. Explode Center
  createExplosion(bomb.x, bomb.y);

  // 2. Explode Rays
  const directions = [{dx:0, dy:-1}, {dx:0, dy:1}, {dx:-1, dy:0}, {dx:1, dy:0}];
  directions.forEach(dir => {
    for(let i=1; i<=bomb.range; i++) {
      const tx = bomb.x + (dir.dx * i);
      const ty = bomb.y + (dir.dy * i);
      if (!createExplosion(tx, ty)) break; // Stop ray if createExplosion returns false
    }
  });
}

function applyPowerup(player, type) {
  if (type === TILES.SPEED) {
     if (player.stats.speedLevel < 5) {
       player.stats.speedLevel++;
       player.stats.speedValue += 0.05;
     }
  } else if (type === TILES.BOMB_UP) {
     if (player.stats.maxBombs < 6) player.stats.maxBombs++;
  } else if (type === TILES.POWER) {
     if (player.stats.range < 6) player.stats.range++;
  }
}

function sendStatsUpdate(room, player) {
  if (player.socket.readyState === 1) {
    player.socket.send(JSON.stringify({
      type: "stats-update",
      username: player.username,
      lives: player.stats.lives,
      speedLevel: player.stats.speedLevel,
      speedValue: player.stats.speedValue,
      maxBombs: player.stats.maxBombs,
      range: player.stats.range
    }));
  }
}

function checkWinCondition(room) {
    const alive = room.players.filter(p => !p.stats.isDead);
    if (alive.length === 1 && room.players.length > 1) {
        broadcastRoom(room, { type: "game-over", winner: alive[0].username });
        clearInterval(room.gameInterval);
        // Reset or cleanup room logic here
    }
}


/* -------------------- LOBBY TIMERS -------------------- */

function startGameTimer(room) {
  if (room.players.length === 1) room.timeLeft = 1;
  if (room.players.length === 4) room.timeLeft = 10;

  if (room.timer) clearInterval(room.timer);
  
  room.timer = setInterval(() => {
    room.timeLeft--;
    
    // Broadcast timer logic
    if (room.timeLeft <= 10 || room.timeLeft % 10 === 0) {
        broadcastRoom(room, {
            type: "counter",
            timeLeft: room.timeLeft,
        });
    }

    if (room.timeLeft <= 0) {
      clearInterval(room.timer);
      room.timer = null;
      startGame(room); // Trigger the Game Engine
    }
  }, 1000);
}

/* -------------------- FILE SERVER -------------------- */

const base = path.join(process.cwd(), "..", "client");
const mime = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".json": "application/json",
};
const Routes = ["/", "/map", "/lobby"];

const server = createServer(async (req, res) => {
  try {
    let reqPath;
    if (req.url === "/") {
      reqPath = "index.html";
    } else {
      const cleanUrl = req.url.startsWith("/") ? req.url.slice(1) : req.url;
      reqPath = cleanUrl;
    }

    const fullPath = path.join(base, reqPath);
    const ext = path.extname(fullPath);
    const type = mime[ext] || "text/plain";
    const isBinary = type.startsWith("image/");
    const content = await fs.readFile(fullPath, isBinary ? null : "utf8");

    res.writeHead(200, { "Content-Type": type });
    res.end(content);
  } catch (err) {
    if (Routes.includes(req.url)) {
      res.writeHead(302, { Location: "/" });
      res.end();
    } else {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("404 Not Found");
    }
  }
});

/* -------------------- WEBSOCKET SERVER -------------------- */

const wss = new WebSocketServer({ server });

wss.on("connection", (socket) => {
  socket.on("message", (raw) => {
    const data = JSON.parse(raw);

    /* ---------------- JOIN ---------------- */
    if (data.type === "join") {
      const username = data.username.trim();
      let room = findOrCreateRoom();
      if (!room) return;
      
      // Check duplicate user
      if (room.players.some((p) => p.username === username)) {
        return socket.send(JSON.stringify({
           type: "join-error", msg: "Username taken" 
        }));
      }

      // Add Player
      const newPlayer = { 
          username, 
          socket, 
          x: 64, y: 64 // Default safe pos
      };
      
      room.players.push(newPlayer);
      room.count++;
      socket.roomId = room.id;
      socket.username = username;

      broadcastRoom(room, { type: "join-success" });
      broadcastRoom(room, {
        type: "player-list",
        players: room.players.map((p) => p.username),
        roomId: room.id,
      });

      startGameTimer(room);
    }

    /* ---------------- CHAT ---------------- */
    if (data.type === "message") {
      const room = rooms.find((r) => r.id === socket.roomId);
      if (!room) return;
      broadcastRoom(room, {
        type: "message",
        username: socket.username,
        msg: data.msg,
      });
    }

    /* ---------------- MOVE ---------------- */
    if (data.type === "move") {
      const room = rooms.find((r) => r.id === data.roomId);
      if (!room) return;

      // Update server-side position for collision checks
      const player = room.players.find(p => p.username === data.username);
      if (player) {
          player.x = data.x;
          player.y = data.y;
      }

      // Relay to others for animation
      broadcastRoom(room, {
        type: "player-move",
        username: data.username,
        x: data.x,
        y: data.y,
        frameX: data.frameX,
        frameY: data.frameY,
      });
    }

    /* ---------------- PLACE BOMB ---------------- */
    if (data.type === "place-bomb") {
      const room = rooms.find((r) => r.id === data.roomId);
      // Ensure game is running
      if (!room || !room.gameInterval) return; 

      const player = room.players.find(p => p.username === data.username);
      
      if (player && !player.stats.isDead && player.stats.activeBombs < player.stats.maxBombs) {
          const { x, y } = data;
          
          // Debugging: Check what the server sees
          // console.log(`User ${player.username} tries bomb at ${x},${y}. Tile is: ${room.map[y][x]}`);

          // FIX: Allow placing bomb on Grass (0) OR on top of user's own position if slight overlap
          // Strictly checking for 0 (GRASS) is the safest bet
          if (room.map[y] && room.map[y][x] === TILES.GRASS) {
              room.map[y][x] = TILES.BOMB;
              player.stats.activeBombs++;
              
              room.gameState.bombs.push({
                  id: Date.now(),
                  x, y,
                  owner: player.username,
                  range: player.stats.range,
                  created: Date.now()
              });

              // CRITICAL: Broadcast the new grid immediately so the bomb shows up
              broadcastRoom(room, { type: "grid-update", grid: room.map });
          }
      }
    }
    
    if (data.type === "player-dead") {
       // Handled by server calculation now, but can keep for sync insurance
    }
  });

  /* ---------------- DISCONNECT ---------------- */
  socket.on("close", () => {
    const room = rooms.find((r) => r.id === socket.roomId);
    if (!room) return;

    room.players = room.players.filter((p) => p.socket !== socket);
    room.count = room.players.length;

    // Check win condition if someone leaves
    if (room.gameInterval) checkWinCondition(room);

    broadcastRoom(room, {
      type: "player-list",
      players: room.players.map((p) => p.username),
      roomId: room.id,
    });
  });
});

server.listen(PORT, () =>
  console.log(`Server running at http://localhost:${PORT}`)
);