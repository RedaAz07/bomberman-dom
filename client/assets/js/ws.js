// Change 'const' to 'let' so we can update the connection
export let ws = new WebSocket("ws://localhost:3000");
/**
 * Closes the existing WebSocket connection and establishes a new one.
 * Used to reset the connection state.
 */
export function reconnect() {
    if (ws && ws.readyState !== WebSocket.CLOSED) {
        ws.close();
    }
    // Re-assign the exported 'ws' variable to a new instance
    ws = new WebSocket("ws://localhost:3000");
    window.ws = ws;
}