// Change 'const' to 'let' so we can update the connection
export let ws = new WebSocket("ws://10.1.1.4:3000");

// Function to close the old connection and start a new one
export function reconnect() {
    if (ws && ws.readyState !== WebSocket.CLOSED) {
        ws.close();
    }
    // Re-assign the exported 'ws' variable to a new instance
    ws = new WebSocket("ws://10.1.1.4:3000");
}