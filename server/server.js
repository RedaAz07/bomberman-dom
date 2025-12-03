import { createServer } from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { WebSocketServer } from "ws";

const PORT = 3000;
const base = path.join(process.cwd(), "..", "client");

/* ---------------- MIME TYPES ---------------- */
const mime = {
    ".html": "text/html",
    ".css": "text/css",
    ".js": "application/javascript",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".webp": "image/webp"
};

/* ---------------- ROOM SYSTEM ---------------- */
let rooms = []; // { id, players[], timer, timeLeft }

function createRoom() {
    const room = {
        id: rooms.length + 1,
        players: [],
        timer: null,
        timeLeft: null,
    };
    rooms.push(room);
    return room;
}

function findOrCreateRoom() {
    let room = rooms.find((r) => r.players.length < 4);
    if (!room) room = createRoom();
    return room;
}

/* ---------------- TIMER LOGIC ---------------- */
function startTimer(room) {
    if (room.timer !== null) return;

    room.timeLeft = 10;

    room.timer = setInterval(() => {
        room.timeLeft--;

        broadcastRoom(room, {
            type: "counter",
            timeLeft: room.timeLeft
        });

        if (room.timeLeft <= 0) {
            clearInterval(room.timer);
            room.timer = null;
            room.timeLeft = null;

            broadcastRoom(room, {
                type: "start-game"
            });
        }
    }, 1000);
}

function stopTimer(room) {
    if (room.timer) clearInterval(room.timer);
    room.timer = null;
    room.timeLeft = null;
}

function broadcastRoom(room, obj) {
    const msg = JSON.stringify(obj);

    for (const client of wss.clients) {
        if (client.readyState === 1 && client.roomId === room.id) {
            client.send(msg);
        }
    }
}

/* ---------------- HTTP FILE SERVER ---------------- */
const server = createServer(async (req, res) => {
    try {
        let file = req.url === "/" ? "index.html" : req.url.slice(1);
        const fullPath = path.join(base, file);

        const ext = path.extname(fullPath);
        const type = mime[ext] || "text/plain";

        const content = await fs.readFile(fullPath, "utf8");

        res.writeHead(200, { "Content-Type": type });
        res.end(content);
    } catch {
        res.writeHead(404);
        res.end("Not Found");
    }
});

/* ---------------- WEBSOCKET SERVER ---------------- */
const wss = new WebSocketServer({ server });

wss.on("connection", (socket) => {

    socket.on("message", (msg) => {
        const data = JSON.parse(msg);

        /* -------- JOIN ROOM -------- */
        if (data.type === "join") {
            let room = findOrCreateRoom();

            socket.username = data.username;
            socket.roomId = room.id;

            room.players.push(socket.username);

            socket.send(JSON.stringify({
                type: "join-success",
                username: socket.username,
                roomId: room.id
            }));

            broadcastRoom(room, {
                type: "player-list",
                players: [...room.players]
            });

            if (room.players.length === 4) {
                startTimer(room);
            }
        }

        /* -------- CHAT MESSAGE -------- */
        if (data.type === "message") {
            const room = rooms.find((r) => r.id === socket.roomId);
            if (!room) return;

            broadcastRoom(room, {
                type: "message",
                username: socket.username,
                msg: data.msg
            });
        }
    });

    /* -------- PLAYER DISCONNECT -------- */
    socket.on("close", () => {
        const room = rooms.find((r) => r.id === socket.roomId);
        if (!room) return;

        const i = room.players.indexOf(socket.username);
        if (i !== -1) room.players.splice(i, 1);

        if (room.players.length <= 1) stopTimer(room);

        broadcastRoom(room, {
            type: "player-list",
            players: [...room.players]
        });
    });
});

server.listen(PORT, () =>
    console.log(`Server running on http://localhost:${PORT}`)
);
