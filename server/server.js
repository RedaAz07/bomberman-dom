import { createServer } from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { WebSocketServer } from "ws";
import { generateMap } from "./generateMap.js";

const PORT = 3000;
const TILE_SIZE = 50;

// --- CONFIGURATION ---
const GAME_TICK = 20; // Physics runs at 50 FPS (20ms) - High Precision
const BROADCAST_INTERVAL = 2; // Network runs at 25 FPS (40ms) - Throttled to save bandwidth
const MOVEMENT_SPEED = 2.4;

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

/**
 * Creates a new game room with a generated map.
 * @returns {Object} The created room object.
 */
function createRoom() {
  const map = generateMap(15, 15);
  const room = {
    id: rooms.length + 1,
    players: [],
    map,
    disponible: true,
    gameState: {
      bombs: [],
      explosions: [],
      giftsToExplosion: [],
      active: false,
    },
    gameInterval: null,
    tickCount: 0, // NEW: Track ticks for throttling
  };
  rooms.push(room);
  return room;
}

/**
 * Finds an available room or creates a new one if none exist.
 * @returns {Object} An available room.
 */
function findOrCreateRoom() {
  let room = rooms.find((r) => r.disponible && r.players.length < 4);
  if (!room) room = createRoom();
  return room;
}
/**
 * Stops the countdown timer for a room.
 * @param {Object} room - The room object.
 */
function stopTimer(room) {
  if (room.timer) clearInterval(room.timer);
  room.timer = null;
  room.timeLeft = null;
  room.disponible = true;
  broadcastRoom(room, {
    type: "counter",
    timeLeft: null,
  });
}

/**
 * Broadcasts a message to all players in a room.
 * @param {Object} room - The room object.
 * @param {Object} obj - The message object to send.
 */
function broadcastRoom(room, obj) {  
  const msg = JSON.stringify(obj);
  for (const p of room.players) {
    if (p.socket.readyState === 1) {
      p.socket.send(msg);
    }
  }
}

/**
 * Starts the game start countdown timer.
 * @param {Object} room - The room object.
 */
function startGameTimer(room) {
  if (room.players.length === 1) return;
  if (room.players.length === 2) room.timeLeft = 30;
  if (room.players.length === 4) room.timeLeft = 10;

  if (room.timer) clearInterval(room.timer);

  room.timer = setInterval(() => {
    room.timeLeft--;
    if (room.timeLeft <= 10) {
      room.disponible = false;
      broadcastRoom(room, {
        type: "counter",
        timeLeft: room.timeLeft,
      });
    } else {
      broadcastRoom(room, {
        type: "counter",
        timeLeft: room.timeLeft - 10,
      });
    }

    if (room.timeLeft <= 0) {
      clearInterval(room.timer);
      room.timer = null;
      room.disponible = false;
      startGame(room);
    }
  }, 1000);
}
/**
 * Initializes the game state and starts the game loop.
 * @param {Object} room - The room object.
 */
function startGame(room) {
  room.gameState.active = true;
  room.tickCount = 0; // Reset tick counter

  const spriteOffsetX = 32;
  const spriteOffsetY = 40;

  room.players.forEach((p, index) => {
    // 1. Calculate Grid Coordinates for spawns
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
    const centerX = tileX * TILE_SIZE + TILE_SIZE / 2;
    const centerY = tileY * TILE_SIZE + TILE_SIZE / 2;

    // 3. Apply Offset to get Top-Left of Sprite
    const startX = centerX - spriteOffsetX;
    const startY = centerY - spriteOffsetY;

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
    // Initialize sync state
    p.lastSync = { x: startX, y: startY, isMoving: false };

    p.socket.send(JSON.stringify({ type: "stats-update", stats: p.stats }));
  });

  broadcastRoom(room, {
    type: "start-game",
    map: room.map,
    players: room.players.map((p) => ({ username: p.username })),
  });

  room.gameInterval = setInterval(() => updateGame(room), GAME_TICK);
}

/**
 * Updates the game state for a single tick.
 * Handles movement, collisions, bombs, and interactions.
 * @param {Object} room - The room object.
 */
function updateGame(room) {
  const now = Date.now();
  room.tickCount++; // Increment tick

  let gridChanged = false;
  let shouldBroadcast = false;
  const grid = room.map;

  // 1. PROCESS MOVEMENT (Runs every 20ms for High Precision)
  room.players.forEach((p) => {
    if (p.stats.isDead) return;

    const moveDist = MOVEMENT_SPEED + p.stats.speedLevel * 0.6;

    // Dynamic Steps to prevent wall tunneling at high speeds
    const STEPS = Math.ceil(moveDist / 4);
    const stepSpeed = moveDist / STEPS;

    for (let i = 0; i < STEPS; i++) {
      if (p.inputs.ArrowUp) {
        const { hasCollision, collisions } = checkCollision(
          room,
          p.stats.x,
          p.stats.y - stepSpeed,
          p.stats.x,
          p.stats.y
        );
        if (!hasCollision) {
          p.stats.y -= stepSpeed;
        } else {
          if (collisions.tl && !collisions.tr) p.stats.x += stepSpeed;
          else if (collisions.tr && !collisions.tl) p.stats.x -= stepSpeed;
        }
      } else if (p.inputs.ArrowDown) {
        const { hasCollision, collisions } = checkCollision(
          room,
          p.stats.x,
          p.stats.y + stepSpeed,
          p.stats.x,
          p.stats.y
        );
        if (!hasCollision) {
          p.stats.y += stepSpeed;
        } else {
          if (collisions.bl && !collisions.br) p.stats.x += stepSpeed;
          else if (collisions.br && !collisions.bl) p.stats.x -= stepSpeed;
        }
      } else if (p.inputs.ArrowLeft) {
        const { hasCollision, collisions } = checkCollision(
          room,
          p.stats.x - stepSpeed,
          p.stats.y,
          p.stats.x,
          p.stats.y
        );
        if (!hasCollision) {
          p.stats.x -= stepSpeed;
        } else {
          if (collisions.tl && !collisions.bl) p.stats.y += stepSpeed;
          else if (collisions.bl && !collisions.tl) p.stats.y -= stepSpeed;
        }
      } else if (p.inputs.ArrowRight) {
        const { hasCollision, collisions } = checkCollision(
          room,
          p.stats.x + stepSpeed,
          p.stats.y,
          p.stats.x,
          p.stats.y
        );
        if (!hasCollision) {
          p.stats.x += stepSpeed;
        } else {
          if (collisions.tr && !collisions.br) p.stats.y += stepSpeed;
          else if (collisions.br && !collisions.tr) p.stats.y -= stepSpeed;
        }
      }
    }

    // --- CHECK FOR SYNC (THROTTLED) ---
    // Only check and send network updates every 2nd tick (25 FPS)
    if (room.tickCount % BROADCAST_INTERVAL === 0) {
      const isMoving =
        p.inputs.ArrowUp ||
        p.inputs.ArrowDown ||
        p.inputs.ArrowLeft ||
        p.inputs.ArrowRight;

      p.lastSync = { x: p.stats.x, y: p.stats.y, isMoving: false };

      // We check if position changed since LAST BROADCAST
      if (isMoving !== p.lastSync.isMoving) {
        shouldBroadcast = true;
      }
    }
  });

  // Only broadcast if it's the correct tick AND something changed
  if (shouldBroadcast && room.tickCount % BROADCAST_INTERVAL === 0) {
    const moves = room.players.map((p) => {
      const isMoving =
        p.inputs.ArrowUp ||
        p.inputs.ArrowDown ||
        p.inputs.ArrowLeft ||
        p.inputs.ArrowRight;
      p.lastSync = { x: p.stats.x, y: p.stats.y, isMoving }; // Update sync state

      return {
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
        isMoving: isMoving,
      };
    });
    broadcastRoom(room, { type: "players-sync", moves });
  }

  // 2. BOMBS
  room.gameState.bombs.forEach((bomb) => {
    if (now - bomb.creationTime > 3000) {
      handleExplosion(room, bomb);
      gridChanged = true;
      const owner = room.players.find((p) => p.username === bomb.owner);
      if (owner) owner.stats.activeBombs--;
    }
  });

  room.gameState.bombs = room.gameState.bombs.filter((b) => !b.hasExploded);

  // 3. EXPLOSIONS
  const explosionsToDelete = [];
  room.gameState.explosions.forEach((exp, idx) => {
    if (now - exp.creationTime > 500) {
      explosionsToDelete.push(idx);
      if (room.gameState.giftsToExplosion.length > 0) {
        const giftIndex = room.gameState.giftsToExplosion.findIndex(
          (g) => g.x === exp.x && g.y === exp.y
        );
        if (giftIndex !== -1) {
          grid[exp.y][exp.x] = room.gameState.giftsToExplosion[giftIndex].cell;
          room.gameState.giftsToExplosion.splice(giftIndex, 1);
        } else {
          grid[exp.y][exp.x] = TILES.GRASS;
        }
      } else {
        grid[exp.y][exp.x] = TILES.GRASS;
      }
      gridChanged = true;
    }
  });
  for (let i = explosionsToDelete.length - 1; i >= 0; i--) {
    room.gameState.explosions.splice(explosionsToDelete[i], 1);
  }

  // 4. INTERACTIONS (Delayed Damage)
  room.players.forEach((p) => {
    if (p.stats.isDead) return;
    const centerX = p.stats.x + 32;
    const centerY = p.stats.y + 32;
    const tileX = Math.floor(centerX / 50);
    const tileY = Math.floor(centerY / 50);

    const tile = grid[tileY][tileX];

    if (tile === TILES.EXPLOSION) {
      const explosion = room.gameState.explosions.find(
        (e) => e.x === tileX && e.y === tileY
      );
      // Wait 150ms before dealing damage so animation syncs
      if (explosion && now - explosion.creationTime > 150) {
        if (now > p.stats.invulnerableUntil) {
          p.stats.lives--;
          p.stats.invulnerableUntil = now + 1000;
          p.socket.send(
            JSON.stringify({ type: "stats-update", stats: p.stats })
          );
          broadcastRoom(room, { type: "player-hit", username: p.username });
          if (p.stats.lives <= 0) {
            p.stats.isDead = true;
            broadcastRoom(room, { type: "player-dead", username: p.username });
            setTimeout(() => {
              checkWinCondition(room);
            }, 0);
          }
        }
      }
    }
    if (tile >= 7 && tile <= 9) {
      if (tile === 7 && p.stats.speedLevel < 3) p.stats.speedLevel++;
      if (tile === 8 && p.stats.range < 3) p.stats.range++;
      if (tile === 9 && p.stats.maxBombs < 3) p.stats.maxBombs++;
      grid[tileY][tileX] = TILES.GRASS;
      gridChanged = true;
      p.socket.send(JSON.stringify({ type: "stats-update", stats: p.stats }));
    }
  });

  if (gridChanged) broadcastRoom(room, { type: "grid-update", map: grid });
}

/**
 * Checks for collisions on the server side.
 * @param {Object} room - The room object.
 * @param {number} targetX - Target X coordinate.
 * @param {number} targetY - Target Y coordinate.
 * @param {number} currentX - Current X coordinate.
 * @param {number} currentY - Current Y coordinate.
 * @returns {Object} Collision result.
 */
function checkCollision(room, targetX, targetY, currentX, currentY) {
  const HITBOX = { x: 12, y: 20, w: 40, h: 40 };
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
      if ([1, 2, 3, 4].includes(cell)) {
        isBlocked = true;
      } else if (cell === 5) {
        const playerRect = {
          left: currentX + HITBOX.x,
          right: currentX + HITBOX.x + HITBOX.w,
          top: currentY + HITBOX.y,
          bottom: currentY + HITBOX.y + HITBOX.h,
        };
        const bombRect = {
          left: tileX * TILE_SIZE,
          right: (tileX + 1) * TILE_SIZE,
          top: tileY * TILE_SIZE,
          bottom: (tileY + 1) * TILE_SIZE,
        };
        const isOverlapping =
          playerRect.left < bombRect.right &&
          playerRect.right > bombRect.left &&
          playerRect.top < bombRect.bottom &&
          playerRect.bottom > bombRect.top;
        if (!isOverlapping) isBlocked = true;
      }
    }
    collisions[key] = isBlocked;
    if (isBlocked) hasCollision = true;
  }
  return { hasCollision, collisions };
}

/**
 * Handles bomb explosions and their effects on the map and players.
 * @param {Object} room - The room object.
 * @param {Object} bomb - The bomb object.
 */
function handleExplosion(room, bomb) {
  const grid = room.map;
  const { x, y, range } = bomb;
  const now = Date.now();
  bomb.hasExploded = true;
  const explodeTile = (tx, ty) => {
    if (tx < 0 || ty < 0 || ty >= 15 || tx >= 15) return true;
    const cell = grid[ty][tx];
    if ([TILES.WALL, TILES.CORNER, TILES.STONE].includes(cell)) return true;
    if (cell === TILES.BOMB) {
      const chainedBomb = room.gameState.bombs.find(
        (b) => b.x === tx && b.y === ty
      );
      if (chainedBomb) {
        handleExplosion(room, chainedBomb);
        const owner = room.players.find(
          (p) => p.username === chainedBomb.owner
        );
        if (owner) owner.stats.activeBombs--;
      }
      return true;
    }
    if (cell === TILES.CRATE) {
      const loot =
        Math.random() < 0.4
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
    if (cell >= TILES.SPEED && cell <= TILES.POWER) {
      room.gameState.giftsToExplosion.push({ x: tx, y: ty, cell });
    }
    grid[ty][tx] = TILES.EXPLOSION;
    room.gameState.explosions.push({ x: tx, y: ty, creationTime: now });
    return false;
  };

  grid[y][x] = 0;
  explodeTile(x, y);

  const dirs = [
    { dx: 0, dy: 1 }, // down
    { dx: 0, dy: -1 }, // up
    { dx: 1, dy: 0 }, // right
    { dx: -1, dy: 0 }, // left
  ];
  dirs.forEach((d) => {
    for (let i = 1; i <= range; i++) {
      if (explodeTile(x + d.dx * i, y + d.dy * i)) break;
    }
  });
}
/**
 * Resets the room state after a game ends.
 * @param {Object} room - The room object.
 */
function cleanRoom(room) {
  const map = generateMap(15, 15);
  room.map = map;

  clearInterval(room.gameInterval);
  stopTimer(room);
  room.gameState.active = false;
  room.players = [];
  room.disponible = true;
  room.gameState = {
    bombs: [],
    explosions: [],
    giftsToExplosion: [],
    active: false,
  };
  room.gameInterval = null;
}

/**
 * Checks if the game has a winner or is a draw.
 * @param {Object} room - The room object.
 */
function checkWinCondition(room) {
  const alive = room.players.filter((p) => !p.stats.isDead);
  if (alive.length === 1) {
    const winner = alive[0].username;
    broadcastRoom(room, {
      type: "game-over",
      winner: winner,
    });
    cleanRoom(room);
  } else if (alive.length === 0) {
    broadcastRoom(room, {
      type: "game-over",
      winner: "draw",
    });
    cleanRoom(room);
  }
}

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

    // Security: Prevent Directory Traversal
    // Ensure the resolved path is still within the 'client' directory
    const relative = path.relative(base, fullPath);
    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      res.writeHead(403, { "Content-Type": "text/plain" });
      res.end("403 Forbidden");
      return;
    }

    const ext = path.extname(fullPath);
    const type = mime[ext] || "text/plain";
    const isBinary = type.startsWith("image/");
    const content = await fs.readFile(fullPath, isBinary ? null : "utf8");
    const headers = { "Content-Type": type };
    if (isBinary) {
      headers["Cache-Control"] = "public, max-age=86400";
    }
    res.writeHead(200, headers);
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
    let data;
    try {
      data = JSON.parse(raw);
    } catch (err) {
      console.error("Error parsing WebSocket message:", err);
      return;
    }

    if (data.type === "join" && !socket.username) {
      if (typeof data.username !== "string") return;
      const username = data.username.trim();
      let room = findOrCreateRoom();
      if (
        room.players.some((p) => p.username === username) ||
        username.length > 10 || username.length === 0
      ) {
        return socket.send(
          JSON.stringify({
            type: "join-error",
            msg: "invalid or duplicate username.",
          })
        );
      }
      room.players.push({ username, socket, stats: {}, inputs: {} });
      socket.roomId = room.id;
      socket.username = username;
      broadcastRoom(room, { type: "join-success", username: username });
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
        const hitBoxCenterX = player.stats.x + 32;
        const hitBoxCenterY = player.stats.y + 40;
        const bx = Math.floor(hitBoxCenterX / TILE_SIZE);
        const by = Math.floor(hitBoxCenterY / TILE_SIZE);

        if (room.map[by][bx] === TILES.GRASS) {
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
    if (data.type === "message") {
      if (typeof data.msg !== "string") return;
      data.msg = data.msg.trim();
      if (data.msg.length > 20 || !data.msg) return;

      // Rate limiting: 1 message per second
      if (player) {
        const now = Date.now();
        if (player.lastMessageTime && now - player.lastMessageTime < 1000) {
          return;
        }
        player.lastMessageTime = now;
      }

      broadcastRoom(room, {
        type: "message",
        username: socket.username,
        msg: data.msg,
      });
    }
  });

  socket.on("close", () => {
    const room = rooms.find((r) => r.id === socket.roomId);
    if (room) {
      const player = room.players.find((p) => p.socket === socket);
      if (player && room.gameState.active) {
        player.stats.isDead = true;
        broadcastRoom(room, { type: "player-dead", username: player.username });
        setTimeout(() => {
          checkWinCondition(room);
        }, 0);
      }
      room.players = room.players.filter((p) => p.socket !== socket);
      broadcastRoom(room, {
        type: "player-list",
        players: room.players.map((p) => p.username),
        roomId: room.id,
      });
      if (room.players.length <= 1) {
        stopTimer(room);
      }
    }
  });
});

server.listen(PORT, () =>
  console.log(`Server running at http://localhost:${PORT}`)
);
