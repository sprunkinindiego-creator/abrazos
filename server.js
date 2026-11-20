const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static(path.join(__dirname, 'public')));

// Mapa de clientes conectados: id -> { ws, name, color }
const clients = new Map();

function broadcastUsers() {
  const userList = Array.from(clients.entries()).map(([id, data]) => ({
    id,
    name: data.name,
    color: data.color
  }));

  const payload = JSON.stringify({ type: 'users', users: userList });
  for (const { ws } of clients.values()) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  }
}

wss.on('connection', (ws) => {
  const id = Math.random().toString(36).substring(2, 10);

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw);

      if (msg.type === 'join') {
        const cleanName = String(msg.name || 'Anónimo').trim().slice(0, 24) || 'Anónimo';
        const colors = ['#38bdf8', '#f472b6', '#a78bfa', '#34d399', '#fbbf24', '#fb7185'];
        const color = colors[Math.floor(Math.random() * colors.length)];

        clients.set(id, { ws, name: cleanName, color });
        ws.send(JSON.stringify({ type: 'welcome', id, name: cleanName }));
        broadcastUsers();
      }

      if (msg.type === 'hug') {
        const sender = clients.get(id);
        const target = clients.get(msg.to);
        if (!sender || !target) return;

        const hugEvent = JSON.stringify({
          type: 'hug_received',
          fromId: id,
          fromName: sender.name,
          toId: msg.to,
          toName: target.name
        });

        // Notificar a todos para que salga en el historial en vivo y animar a los involucrados
        for (const { ws: clientWs } of clients.values()) {
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(hugEvent);
          }
        }
      }
    } catch (e) {
      console.error('Error procesando mensaje:', e);
    }
  });

  ws.on('close', () => {
    clients.delete(id);
    broadcastUsers();
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
