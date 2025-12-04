import { createServer } from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { WebSocketServer } from "ws";

const PORT = 3000;
const players = [];
let timer = null;
let timeLeft = null;

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

function broadcast(data) {
    const msg = JSON.stringify(data);
    for (const client of wss.clients) {
        if (client.readyState === 1) client.send(msg);
    }
}

function startGameTimer() {
    console.log(players.length);

    console.log("ssssssssssss", players.length);

    if (players.length <= 1) return;
    if (players.length == 2) timeLeft = 30;
    if (players.length == 4) timeLeft = 10;
    console.log("time", timeLeft);
    if (timer) {
        clearInterval(timer)
    }
    timer = setInterval(() => {
        timeLeft--;
        if (timeLeft <= 10) {
            broadcast({
                type: "counter",
                timeLeft: timeLeft,
            });
        } else {
            broadcast({
                type: "counter",
                timeLeft: timeLeft - 10,
            });
        }

        if (timeLeft <= 0) {
            clearInterval(timer);
            timer = null;
            broadcast({ type: "start-game" });
        }
    }, 1000);
}

function stopGameTimer() {
    if (timer !== null) clearInterval(timer);
    timer = null;
    timeLeft = null;

    broadcast({
        type: "counter",
        timeLeft: null
    });
}

wss.on("connection", (socket) => {
    socket.on("message", (msg) => {
        const data = JSON.parse(msg);

    if (data.type === "join") {
      const username = data.username.trim();

            if (players.includes(username)) {
                return socket.send(JSON.stringify({
                    type: "join-error",
                    msg: "Username already exists"
                }));
            }

      players.push(username);
      socket.username = username;

            socket.send(JSON.stringify({
                type: "join-success",
                username
            }));

      broadcast({
        type: "player-list",
        players: [...players],
      });

            startGameTimer();
        }

        if (data.type === "message") {
            broadcast({
                type: "message",
                username: socket.username,
                msg: data.msg
            });
        }
    });

    socket.on("close", () => {
        if (socket.username) {
            const index = players.indexOf(socket.username);
            if (index !== -1) players.splice(index, 1);

            broadcast({
                type: "player-list",
                players: [...players]
            });

            if (players.length <= 1) stopGameTimer();
        }
    });
});

server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));