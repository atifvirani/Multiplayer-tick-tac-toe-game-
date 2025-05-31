const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static('public'));

const rooms = {};

wss.on('connection', (ws) => {
  ws.on('message', (msg) => {
    const message = JSON.parse(msg);
    const { type, room, move } = message;

    if (type === 'create') {
      const roomId = uuidv4().slice(0, 5);
      rooms[roomId] = [ws];
      ws.roomId = roomId;
      ws.send(JSON.stringify({ type: 'created', room: roomId }));
    }

    if (type === 'join') {
      if (rooms[room] && rooms[room].length === 1) {
        rooms[room].push(ws);
        ws.roomId = room;
        rooms[room].forEach((client, i) => {
          client.send(JSON.stringify({ type: 'start', symbol: i === 0 ? 'X' : 'O' }));
        });
      } else {
        ws.send(JSON.stringify({ type: 'error', message: 'Room full or not found' }));
      }
    }

    if (type === 'move') {
      rooms[room]?.forEach(client => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: 'move', move }));
        }
      });
    }
  });

  ws.on('close', () => {
    const roomId = ws.roomId;
    if (roomId && rooms[roomId]) {
      rooms[roomId] = rooms[roomId].filter(client => client !== ws);
      if (rooms[roomId].length === 0) delete rooms[roomId];
    }
  });
});

server.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});