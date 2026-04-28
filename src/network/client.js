import { io } from 'socket.io-client';
import { Events } from './events.js';

class NetworkClient {
  constructor() {
    this.socket = null;
    this.roomCode = null;
    this.playerId = null;
    this.role = null;
    this.connected = false;
    this.listeners = {};
  }

  connect() {
    if (this.socket) return;

    this.socket = io({
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      this.connected = true;
      this.playerId = this.socket.id;

      if (this.roomCode) {
        this.socket.emit(Events.RECONNECT_SESSION, {
          roomCode: this.roomCode,
          role: this.role,
        });
      }
    });

    this.socket.on('disconnect', () => {
      this.connected = false;
    });

    Object.values(Events).forEach(event => {
      this.socket.on(event, (data) => {
        if (this.listeners[event]) {
          this.listeners[event].forEach(cb => cb(data));
        }
      });
    });
  }

  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  off(event, callback) {
    if (!this.listeners[event]) return;
    if (callback) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    } else {
      delete this.listeners[event];
    }
  }

  offAll() {
    this.listeners = {};
  }

  createRoom() {
    this.socket.emit(Events.CREATE_ROOM);
  }

  joinRoom(code) {
    this.socket.emit(Events.JOIN_ROOM, { code: code.toUpperCase() });
  }

  selectRole(role) {
    this.role = role;
    this.socket.emit(Events.SELECT_ROLE, { role });
  }

  syncState(data) {
    if (this.socket) {
      this.socket.emit(Events.SYNC_STATE, data);
    }
  }

  chapterComplete(data) {
    if (this.socket) {
      this.socket.emit(Events.CHAPTER_COMPLETE, data);
    }
  }

  setRoomCode(code) {
    this.roomCode = code;
    sessionStorage.setItem('bp_room', code);
  }

  recoverRoomCode() {
    return sessionStorage.getItem('bp_room');
  }
}

export const network = new NetworkClient();
