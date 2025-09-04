import WebSocket, { WebSocketServer } from 'ws';
import { addConnection, removeConnection, listConnections } from './utils.js';

const wss = new WebSocketServer({ port: 8080 });

wss.on('connection', async (ws) => {
  const connectionId = crypto.randomUUID();
  ws.id = connectionId;
  await addConnection(connectionId);

  ws.send(JSON.stringify({ type: 'system', body: `Connected as ${connectionId}` }));

  ws.on('message', async (message) => {
    // broadcast to all clients
    const msg = JSON.parse(message);
    const clients = wss.clients;
    for (let client of clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'broadcast',
          body: { ...msg.body, ts: Date.now() }
        }));
      }
    }
  });

  ws.on('close', async () => {
    await removeConnection(connectionId);
  });
});

console.log('WebSocket server running on ws://localhost:8080');
