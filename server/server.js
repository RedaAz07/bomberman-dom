import { createServer } from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { WebSocketServer } from "ws";
import { generateMap } from "./generateMap.js";

const PORT = 3000;

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

function startGameTimer(room) {
  // if (room.players.length <= 1) return;

  // if (room.players.length === 2) room.timeLeft = 10;
  // if (room.players.length === 4) room.timeLeft = 10;

  // if (room.timer) clearInterval(room.timer);
  room.timeLeft = 2
  room.timer = setInterval(() => {
    room.timeLeft--;
    // if (room.timeLeft <= 10) {
    //     broadcastRoom(room, {
    //         type: "counter",
    //         timeLeft: room.timeLeft,
    //     })
    // } else {
    //     broadcastRoom(room, {
    //         type: "counter",
    //         timeLeft: room.timeLeft - 10,
    //     });
    // }
    broadcastRoom(room, {
      type: "counter",
      timeLeft: room.timeLeft,
    });
    if (room.timeLeft <= 0) {
      clearInterval(room.timer);
      room.timer = null;
      room.disponible = false;
      broadcastRoom(room, { type: "start-game", map: room.map, collisionMap: room.collisionMap, players: room.players });
    }
  }, 1000);
}

function stopTimer(room) {
  if (room.timer) clearInterval(room.timer);
  room.timer = null;
  room.timeLeft = null;

  broadcastRoom(room, {
    type: "counter",
    timeLeft: null,
  });
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

/* -------------------- WEBSOCKET SERVER -------------------- */

const wss = new WebSocketServer({ server });

wss.on("connection", (socket) => {

  socket.on("message", (raw) => {
    const data = JSON.parse(raw);

    /* ---------------- JOIN ---------------- */
    if (data.type === "join") {
      const username = data.username.trim();
      let room = findOrCreateRoom();

      if (room.players.some((p) => p.username === username)) {
        return socket.send(
          JSON.stringify({
            type: "join-error",
            msg: "Username already in use",
          })
        );
      }

      room.players.push({ username, socket });
      room.count++
      socket.roomId = room.id;
      socket.username = username;

      broadcastRoom(room, {
        type: "join-success",
      })

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

    if (data.type === "move") {
      const room = rooms.find((r) => r.id === data.roomId)
      broadcastRoom(room, {
        type: "player-move",
        username: data.username,
        x: data.x,
        y: data.y,
        frameX: data.frameX,
        frameY: data.frameY
      })
    }
  });

  /* ---------------- DISCONNECT ---------------- */
  socket.on("close", () => {
    const room = rooms.find((r) => r.id === socket.roomId);
    if (!room) return;

    room.players = room.players.filter((p) => p.socket !== socket);

    if (room.players.length <= 1) stopTimer(room);

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
