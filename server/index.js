import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { RoomManager } from './rooms.js';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:5173'],
    methods: ['GET', 'POST'],
  },
});

const rooms = new RoomManager();

io.on('connection', (socket) => {
  console.log(`[+] Player connected: ${socket.id}`);

  socket.on('create-room', () => {
    const room = rooms.create(socket.id);
    socket.join(room.code);
    socket.emit('room-created', { code: room.code });
  });

  socket.on('join-room', ({ code }) => {
    const result = rooms.join(code, socket.id);
    if (result.error) {
      socket.emit('room-error', { message: result.error });
      return;
    }
    socket.join(code);
    io.to(code).emit('room-joined', { code, players: result.room.players });
  });

  socket.on('select-role', ({ role }) => {
    const room = rooms.getByPlayer(socket.id);
    if (!room) return;

    const result = rooms.selectRole(room.code, socket.id, role);
    if (result.conflict) {
      io.to(room.code).emit('role-conflict');
      return;
    }

    io.to(room.code).emit('role-selected', { playerId: socket.id, role });

    if (result.ready) {
      io.to(room.code).emit('role-confirmed', { roles: room.roles });
      room.state = 'playing';
    }
  });

  // Generic state sync
  socket.on('sync-state', (data) => {
    const room = rooms.getByPlayer(socket.id);
    if (!room) return;
    socket.to(room.code).emit('sync-state', data);
  });

  // Chapter complete
  socket.on('chapter-complete', (data) => {
    const room = rooms.getByPlayer(socket.id);
    if (!room) return;
    io.to(room.code).emit('chapter-complete', data);
  });

  socket.on('reconnect-session', ({ roomCode, role }) => {
    const result = rooms.reconnect(roomCode, socket.id, role);
    if (result.success) {
      socket.join(roomCode);
      socket.emit('reconnect-success', { room: result.room });
      socket.to(roomCode).emit('player-reconnect');
    }
  });

  socket.on('disconnect', () => {
    const room = rooms.getByPlayer(socket.id);
    if (room) {
      socket.to(room.code).emit('player-disconnect');
      rooms.playerDisconnected(socket.id);
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
