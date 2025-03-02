import { WebSocketServer } from "ws";

const wss = new WebSocketServer({ port: 8080 });

wss.on("connection", (ws) => {
    console.log("🟢 New client connected");

    ws.on("message", (data) => {
        const message = JSON.parse(data.toString());
        console.log("📩 Message:", message);

        wss.clients.forEach((client) => {
            if (client !== ws && client.readyState === ws.OPEN) {
                client.send(JSON.stringify(message));
            }
        });
    });

    ws.on("close", () => {
        console.log("🔴 Client disconnected");
    });
});

console.log("✅ WebSocket ready ws://localhost:8080");
