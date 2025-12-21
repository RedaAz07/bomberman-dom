import { createServer } from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { WebSocketServer } from "ws";
import { generateMap } from "./generateMap.js";

const PORT = 3000;
const TILE_SIZE = 50;
const GAME_TICK = 50;
const MOVEMENT_SPEED = 6;

const TILES = {
  GRASS: 0,
  WALL: 1,
  CRATE: 2,
  CORNER: 3,
  STONE: 4,
  BOMB: 5,
  EXPLOSION: 6,
  SPEED: 7,
  BOMB_UP: 8,
  POWER: 9,
};

let rooms = [];

function createRoom() {
  const { map, collisionMap } = generateMap(15, 15);

  const room = {
    id: rooms.length + 1,
    count: 0,
    players: [],
    map,
    collisionMap,
    disponible: true,
    gameState: {
      bombs: [],
      explosions: [],
      active: false,
    },
    gameInterval: null,
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

// --- TIMER ---
function startGameTimer(room) {
  if (room.players.length === 2) room.timeLeft = 1;
  if (room.players.length === 4) room.timeLeft = 10;

  if (room.timer) clearInterval(room.timer);

  room.timer = setInterval(() => {
    room.timeLeft--;
    broadcastRoom(room, { type: "counter", timeLeft: room.timeLeft });

    if (room.timeLeft <= 0) {
      clearInterval(room.timer);
      room.timer = null;
      room.disponible = false;
      startGame(room);
    }
  }, 1000);
}

// --- SERVER PHYSICS & GAME LOGIC ---

function startGame(room) {
  room.gameState.active = true;

  // Configuration to center the player visually on the tile center
  // Tile Center (1,1) is at 75px, 75px.
  // We want the HITBOX CENTER to align with TILE CENTER.
  // Hitbox Center X relative to Sprite = 16 + (32/2) = 32.
  // Hitbox Center Y relative to Sprite = 40 + (20/2) = 50.

  const spriteOffsetX = 32;
  const spriteOffsetY = 50;

  room.players.forEach((p, index) => {
    // 1. Calculate Grid Coordinates for spawns
    // TL (1,1), TR (13,1), BR (13,13), BL (1,13)
    let tileX = 1;
    let tileY = 1;

    if (index === 1) {
      tileX = 13;
      tileY = 1;
    } // TR
    if (index === 2) {
      tileX = 13;
      tileY = 13;
    } // BR
    if (index === 3) {
      tileX = 1;
      tileY = 13;
    } // BL

    // 2. Convert Grid to Pixel Center
    const centerX = tileX * TILE_SIZE + TILE_SIZE / 2; // e.g., 75
    const centerY = tileY * TILE_SIZE + TILE_SIZE / 2; // e.g., 75

    // 3. Apply Offset to get Top-Left of Sprite
    const startX = centerX - spriteOffsetX; // 75 - 32 = 43
    const startY = centerY - spriteOffsetY; // 75 - 50 = 25

    p.stats = {
      lives: 3,
      speedLevel: 1,
      maxBombs: 1,
      activeBombs: 0,
      range: 1,
      isDead: false,
      invulnerableUntil: 0,
      x: startX,
      y: startY,
    };
    p.inputs = {
      ArrowUp: false,
      ArrowDown: false,
      ArrowLeft: false,
      ArrowRight: false,
    };

    p.socket.send(JSON.stringify({ type: "stats-update", stats: p.stats }));
  });

  broadcastRoom(room, {
    type: "start-game",
    map: room.map,
    players: room.players.map((p) => ({ username: p.username })),
  });

  room.gameInterval = setInterval(() => updateGame(room), GAME_TICK);
}

function updateGame(room) {
  const now = Date.now();
  let gridChanged = false;
  let positionsChanged = false;
  const grid = room.map;

  // 1. PROCESS MOVEMENT WITH SLIDING
  room.players.forEach((p) => {
    if (p.stats.isDead) return;

    const moveSpeed = MOVEMENT_SPEED + p.stats.speedLevel * 1.5;

    // ARROW UP
    if (p.inputs.ArrowUp) {
      // Pass p.stats.x, p.stats.y as the 4th and 5th arguments
      const { hasCollision, collisions } = checkCollision(
        room,
        p.stats.x,
        p.stats.y - moveSpeed,
        p.stats.x,
        p.stats.y
      );
      if (!hasCollision) {
        p.stats.y -= moveSpeed;
      } else {
        if (collisions.tl && !collisions.tr) p.stats.x += moveSpeed;
        else if (collisions.tr && !collisions.tl) p.stats.x -= moveSpeed;
      }
      positionsChanged = true;
    }
    // ARROW DOWN
    else if (p.inputs.ArrowDown) {
      const { hasCollision, collisions } = checkCollision(
        room,
        p.stats.x,
        p.stats.y + moveSpeed,
        p.stats.x,
        p.stats.y
      );
      if (!hasCollision) {
        p.stats.y += moveSpeed;
      } else {
        if (collisions.bl && !collisions.br) p.stats.x += moveSpeed;
        else if (collisions.br && !collisions.bl) p.stats.x -= moveSpeed;
      }
      positionsChanged = true;
    }
    // ARROW LEFT
    else if (p.inputs.ArrowLeft) {
      const { hasCollision, collisions } = checkCollision(
        room,
        p.stats.x - moveSpeed,
        p.stats.y,
        p.stats.x,
        p.stats.y
      );
      if (!hasCollision) {
        p.stats.x -= moveSpeed;
      } else {
        if (collisions.tl && !collisions.bl) p.stats.y += moveSpeed;
        else if (collisions.bl && !collisions.tl) p.stats.y -= moveSpeed;
      }
      positionsChanged = true;
    }
    // ARROW RIGHT
    else if (p.inputs.ArrowRight) {
      const { hasCollision, collisions } = checkCollision(
        room,
        p.stats.x + moveSpeed,
        p.stats.y,
        p.stats.x,
        p.stats.y
      );
      if (!hasCollision) {
        p.stats.x += moveSpeed;
      } else {
        if (collisions.tr && !collisions.br) p.stats.y += moveSpeed;
        else if (collisions.br && !collisions.tr) p.stats.y -= moveSpeed;
      }
      positionsChanged = true;
    }
    positionsChanged = true;
  });

  if (positionsChanged) {
    const moves = room.players.map((p) => ({
      username: p.username,
      x: p.stats.x,
      y: p.stats.y,
      direction: p.inputs.ArrowUp
        ? "up"
        : p.inputs.ArrowDown
        ? "down"
        : p.inputs.ArrowLeft
        ? "left"
        : "right",
      isMoving:
        p.inputs.ArrowUp ||
        p.inputs.ArrowDown ||
        p.inputs.ArrowLeft ||
        p.inputs.ArrowRight,
    }));
    broadcastRoom(room, { type: "players-sync", moves });
  }

  // 2. BOMBS
  const bombsToDelete = [];
  room.gameState.bombs.forEach((bomb, idx) => {
    if (now - bomb.creationTime > 3000) {
      bombsToDelete.push(idx);
      handleExplosion(room, bomb);
      gridChanged = true;
      const owner = room.players.find((p) => p.username === bomb.owner);
      if (owner) owner.stats.activeBombs--;
    }
  });
  for (let i = bombsToDelete.length - 1; i >= 0; i--) {
    room.gameState.bombs.splice(bombsToDelete[i], 1);
  }

  // 3. EXPLOSIONS
  const explosionsToDelete = [];
  room.gameState.explosions.forEach((exp, idx) => {
    if (now - exp.creationTime > 500) {
      explosionsToDelete.push(idx);
      if (grid[exp.y][exp.x] === TILES.EXPLOSION) {
        grid[exp.y][exp.x] = TILES.GRASS;
        gridChanged = true;
      }
    }
  });
  for (let i = explosionsToDelete.length - 1; i >= 0; i--) {
    room.gameState.explosions.splice(explosionsToDelete[i], 1);
  }
  // 4. INTERACTIONS
  room.players.forEach((p) => {
    if (p.stats.isDead) return;
    const centerX = p.stats.x + 32;
    const centerY = p.stats.y + 32;
    const tileX = Math.floor(centerX / 50);
    const tileY = Math.floor(centerY / 50);
    if (!grid[tileY]) return;
    const tile = grid[tileY][tileX];

    if (tile === TILES.EXPLOSION) {
      if (now > p.stats.invulnerableUntil) {
        p.stats.lives--;
        p.stats.invulnerableUntil = now + 1000;
        p.socket.send(JSON.stringify({ type: "stats-update", stats: p.stats }));
        if (p.stats.lives <= 0) {
          p.stats.isDead = true;
          broadcastRoom(room, { type: "player-dead", username: p.username });
          checkWinCondition(room);
        }
      }
    }
    if (tile >= 7 && tile <= 9) {
      if (tile === 7 && p.stats.speedLevel < 5) p.stats.speedLevel++;
      if (tile === 8 && p.stats.range < 5) p.stats.range++;
      if (tile === 9 && p.stats.maxBombs < 5) p.stats.maxBombs++;
      grid[tileY][tileX] = TILES.GRASS;
      gridChanged = true;
      p.socket.send(JSON.stringify({ type: "stats-update", stats: p.stats }));
    }
  });

  if (gridChanged) broadcastRoom(room, { type: "grid-update", map: grid });
}

function checkCollision(
  room,
  targetX,
  targetY,
  currentX = null,
  currentY = null
) {
  // FEET HITBOX (same as previous fix)
  const HITBOX = { x: 16, y: 40, w: 32, h: 20 };

  const points = {
    tl: { x: targetX + HITBOX.x, y: targetY + HITBOX.y },
    tr: { x: targetX + HITBOX.x + HITBOX.w, y: targetY + HITBOX.y },
    bl: { x: targetX + HITBOX.x, y: targetY + HITBOX.y + HITBOX.h },
    br: { x: targetX + HITBOX.x + HITBOX.w, y: targetY + HITBOX.y + HITBOX.h },
  };

  const collisions = {};
  let hasCollision = false;

  for (const key in points) {
    const point = points[key];
    const tileX = Math.floor(point.x / TILE_SIZE);
    const tileY = Math.floor(point.y / TILE_SIZE);

    let isBlocked = false;

    if (tileY < 0 || tileY >= 15 || tileX < 0 || tileX >= 15) {
      isBlocked = true;
    } else {
      const cell = room.map[tileY][tileX];

      // STANDARD OBSTACLES (Wall, Crate, Corner, Stone)
      if ([1, 2, 3, 4].includes(cell)) {
        isBlocked = true;
      }
      // BOMB LOGIC (5)
      else if (cell === 5) {
        // If we provided current coordinates, check if we are "stuck" inside this bomb
        if (currentX !== null && currentY !== null) {
          // Calculate current player feet rectangle
          const playerRect = {
            left: currentX + HITBOX.x,
            right: currentX + HITBOX.x + HITBOX.w,
            top: currentY + HITBOX.y,
            bottom: currentY + HITBOX.y + HITBOX.h,
          };

          // Calculate the bomb tile rectangle
          const bombRect = {
            left: tileX * TILE_SIZE,
            right: (tileX + 1) * TILE_SIZE,
            top: tileY * TILE_SIZE,
            bottom: (tileY + 1) * TILE_SIZE,
          };

          // Check for Intersection:
          // If the player is CURRENTLY inside the bomb, allow them to move (isBlocked = false).
          // If they are NOT inside (approaching from outside), block them (isBlocked = true).
          const isOverlapping =
            playerRect.left < bombRect.right &&
            playerRect.right > bombRect.left &&
            playerRect.top < bombRect.bottom &&
            playerRect.bottom > bombRect.top;

          if (isOverlapping) {
            isBlocked = false; // Walk through it
          } else {
            isBlocked = true; // Hit it like a wall
          }
        } else {
          // If no current position passed, assume solid
          isBlocked = true;
        }
      }
    }

    collisions[key] = isBlocked;
    if (isBlocked) hasCollision = true;
  }
  return { hasCollision, collisions };
}
function handleExplosion(room, bomb) {
  const grid = room.map;
  const { x, y, range } = bomb;
  const now = Date.now();

  const explodeTile = (tx, ty) => {
    if (tx < 0 || ty < 0 || ty >= 15 || tx >= 15) return true;
    const cell = grid[ty][tx];
    if ([TILES.WALL, TILES.CORNER, TILES.STONE].includes(cell)) return true;

    if (cell === TILES.CRATE) {
      const loot =
        Math.random() < 0.3
          ? Math.floor(Math.random() * 3) + 7
          : TILES.EXPLOSION;
      grid[ty][tx] = TILES.EXPLOSION;
      if (loot !== TILES.EXPLOSION) {
        setTimeout(() => {
          if (room.gameState.active && room.map[ty][tx] === TILES.GRASS) {
            room.map[ty][tx] = loot;
            broadcastRoom(room, { type: "grid-update", map: room.map });
          }          
        }, 550);
      }
      room.gameState.explosions.push({ x: tx, y: ty, creationTime: now });
      return true;
    }

    grid[ty][tx] = TILES.EXPLOSION;
    room.gameState.explosions.push({ x: tx, y: ty, creationTime: now });
    return false;
  };

  grid[y][x] = 0;
  explodeTile(x, y);

  const dirs = [
    { dx: 0, dy: 1 },
    { dx: 0, dy: -1 },
    { dx: 1, dy: 0 },
    { dx: -1, dy: 0 },
  ];
  dirs.forEach((d) => {
    for (let i = 1; i <= range; i++) {
      if (explodeTile(x + d.dx * i, y + d.dy * i)) break;
    }
  });
}

function checkWinCondition(room) {
  const alive = room.players.filter((p) => !p.stats.isDead);
  if (alive.length <= 1 && room.players.length > 1) {
    const winner = alive[0];
    broadcastRoom(room, {
      type: "you-win",
      username: winner ? winner.username : "Draw",
    });
    clearInterval(room.gameInterval);
    room.gameState.active = false;
  }
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
      if (cleanUrl.startsWith("framework/")) {
        reqPath = cleanUrl;
      } else {
        reqPath = cleanUrl;
      }
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

const wss = new WebSocketServer({ server });

wss.on("connection", (socket) => {
  socket.on("message", (raw) => {
    const data = JSON.parse(raw);

    if (data.type === "join") {
      const username = data.username.trim();
      let room = findOrCreateRoom();
      if (!room || room.players.some((p) => p.username === username)) {
        return socket.send(
          JSON.stringify({ type: "join-error", msg: "Error" })
        );
      }
      room.players.push({ username, socket, stats: {}, inputs: {} });
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

    const room = rooms.find((r) => r.id === socket.roomId);
    if (!room) return;
    const player = room.players.find((p) => p.username === socket.username);

    if (data.type === "input" && player && room.gameState.active) {
      if (player.inputs.hasOwnProperty(data.key))
        player.inputs[data.key] = data.state;
    }

    if (data.type === "place-bomb" && player && !player.stats.isDead) {
      if (player.stats.activeBombs < player.stats.maxBombs) {
        // OLD: const bx = Math.round((player.stats.x + 32) / 50);

        // NEW: Calculate based on Feet Center (Hitbox Center)
        // This ensures the bomb drops on the tile the feet are touching
        const hitBoxCenterX = player.stats.x + 32; // Offset X + Width/2
        const hitBoxCenterY = player.stats.y + 50; // Offset Y + Height/2

        const bx = Math.floor(hitBoxCenterX / TILE_SIZE);
        const by = Math.floor(hitBoxCenterY / TILE_SIZE);

        if (room.map[by] && room.map[by][bx] === TILES.GRASS) {
          // ... rest of bomb placement logic
          room.map[by][bx] = TILES.BOMB;
          player.stats.activeBombs++;
          room.gameState.bombs.push({
            x: bx,
            y: by,
            owner: player.username,
            range: player.stats.range,
            creationTime: Date.now(),
          });
          broadcastRoom(room, { type: "grid-update", map: room.map });
        }
      }
    }
    if (data.type === "message")
      broadcastRoom(room, {
        type: "message",
        username: socket.username,
        msg: data.msg,
      });
  });

  socket.on("close", () => {
    const room = rooms.find((r) => r.id === socket.roomId);
    if (room) {
      room.players = room.players.filter((p) => p.socket !== socket);
      broadcastRoom(room, {
        type: "player-list",
        players: room.players.map((p) => p.username),
        roomId: room.id,
      });
    }
  });
});

server.listen(PORT, () =>
  console.log(`Server running at http://localhost:${PORT}`)
);
