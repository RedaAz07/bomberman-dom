import http from 'http';
import { WebSocketServer } from 'ws';



const PORT = 3000;

export const rooms = []

const server = http.createServer((req, res) => {
    res.writeHead(200)
    res.end("WebSocket Server is running")
})
const ws = new WebSocketServer({ server, path: '/ws' })


ws.on('connection', (stream) => {
    stream.on('message', (message) => {
        try {

            const data = JSON.parse(message.toString())

            switch (data.type) {
                case "join":
                   
                    break
                case "chating":
                    break
                case "close-room":
                    break
                case "move":
                    break
                case "stop-move":
                    break
                case "reset-counter":
                    break
            }
        } catch (error) {
            console.log("error");
        }
    })

    stream.on('close', () => {
    })
})

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});

