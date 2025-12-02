import { createServer } from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { WebSocketServer } from "ws";

const PORT = 3000;

const base = path.join(process.cwd(), "..", "mini-framework");
console.log(process.cwd());

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
        let reqPath;

        if (req.url === "/") {
            reqPath = "app/index.html";
        } else {



            const cleanUrl = req.url.startsWith("/") ? req.url.slice(1) : req.url;



            if (cleanUrl.startsWith("framework/")) {
                reqPath = cleanUrl;
            } else {
                reqPath = "app/" + cleanUrl;
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
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("404 Not Found");
    }
});



const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
    ws.on('message', message => {
        let data = {}
        try {
            data = JSON.parse(message)
        } catch (error) {
            console.log(error);

        }


        switch (data.type) {
            case "newPlayer":
                
                break;
        
            default:
                break;
        }
    })
});

server.listen(PORT, () =>
    console.log(`Server running on http://localhost:${PORT}`)
);