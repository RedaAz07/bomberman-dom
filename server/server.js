import { createServer } from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { WebSocketServer } from "ws";

const PORT = 3000;

let rooms = [];

function createRoom() {
    const room = {
        id: rooms.length + 1,
        players: [],
        timer: null,
        timeLeft: null,
        disponible: true
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
    if (room.players.length <= 1) return;

    if (room.players.length === 2) room.timeLeft = 5;
    if (room.players.length === 4) room.timeLeft = 10;

    if (room.timer) clearInterval(room.timer);

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
            room.disponible = false
            broadcastRoom(room, { type: "start-game" });
        }
    }, 1000);
}

function stopTimer(room) {
    if (room.timer) clearInterval(room.timer);
    room.timer = null;
    room.timeLeft = null;

    broadcastRoom(room, {
        type: "counter",
        timeLeft: null
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
    ".json": "application/json"
};

const server = createServer(async (req, res) => {
    try {
        let reqPath = req.url === "/" ? "index.html" : req.url.slice(1);
        const fullPath = path.join(base, reqPath);
        const ext = path.extname(fullPath);
        const type = mime[ext] || "text/plain";
        const isBinary = type.startsWith("image/");

        const content = await fs.readFile(fullPath, isBinary ? null : "utf8");
        res.writeHead(200, { "Content-Type": type });
        res.end(content);
    } catch {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("404 Not Found");
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

            if (room.players.some(p => p.username === username)) {
                return socket.send(JSON.stringify({
                    type: "join-error",
                    msg: "Username already in use"
                }));
            }

            room.players.push({ username, socket });
            socket.roomId = room.id;
            socket.username = username;

            socket.send(JSON.stringify({
                type: "join-success",
                roomId: room.id
            }));

            broadcastRoom(room, {
                type: "player-list",
                players: room.players.map(p => p.username),
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
                msg: data.msg
            });
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
            players: room.players.map(p => p.username)
        });
    });
});

server.listen(PORT, () =>
    console.log(`Server running at http://localhost:${PORT}`)
);
