import mqtt from 'mqtt';
import { Events } from './events.js';

class NetworkClient {
  constructor() {
    this.client = null;
    this.roomCode = null;
    this.role = null;
    this.connected = false;
    this.listeners = {};
    this.topic = null;
  }

  connect() {}

  on(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
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

  _emitLocal(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => cb(data));
    }
  }

  createRoom() {
    this.roomCode = Array(4).fill(0).map(() => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join('');
    this.topic = `palace-game-2026/${this.roomCode}`;
    
    // Connect to free public MQTT broker via secure WebSockets
    this.client = mqtt.connect('wss://broker.hivemq.com:8884/mqtt');
    
    this.client.on('connect', () => {
      this.client.subscribe(this.topic + '/#', (err) => {
        if (!err) {
          this.connected = true;
          this._emitLocal(Events.ROOM_CREATED, { code: this.roomCode });
        } else {
          this._emitLocal(Events.ROOM_ERROR, { message: "Failed to subscribe" });
        }
      });
    });

    this.client.on('message', (topic, message) => {
      try {
        const data = JSON.parse(message.toString());
        if (topic === `${this.topic}/join`) {
          this._emitLocal(Events.ROOM_JOINED, { code: this.roomCode });
          // Send a start message so the guest knows it's good to go
          this.client.publish(`${this.topic}/start`, JSON.stringify({ ok: true }));
        } else if (topic === `${this.topic}/sync`) {
          if (data.role !== this.role) {
             this._emitLocal(Events.SYNC_STATE, data.payload);
          }
        } else if (topic === `${this.topic}/complete`) {
          this._emitLocal(Events.CHAPTER_COMPLETE, data);
        }
      } catch (e) {
        console.warn("Invalid message", e);
      }
    });

    this.client.on('error', (err) => {
      this._emitLocal(Events.ROOM_ERROR, { message: "Broker error" });
    });
  }

  joinRoom(code) {
    this.roomCode = code.toUpperCase();
    this.topic = `palace-game-2026/${this.roomCode}`;
    
    this.client = mqtt.connect('wss://broker.hivemq.com:8884/mqtt');
    
    this.client.on('connect', () => {
      this.client.subscribe(this.topic + '/#', (err) => {
        if (!err) {
          this.connected = true;
          // Tell the host we joined
          this.client.publish(`${this.topic}/join`, JSON.stringify({ role: 'terminal' }));
          
          // Start the game for Player 2 immediately! (Fixes pub/sub race conditions)
          setTimeout(() => {
            this._emitLocal(Events.ROOM_JOINED, { code: this.roomCode });
          }, 500);
        } else {
          this._emitLocal(Events.ROOM_ERROR, { message: "Failed to subscribe" });
        }
      });
    });

    this.client.on('message', (topic, message) => {
      try {
        const data = JSON.parse(message.toString());
        if (topic === `${this.topic}/start`) {
          this._emitLocal(Events.ROOM_JOINED, { code: this.roomCode });
        } else if (topic === `${this.topic}/sync`) {
          if (data.role !== this.role) {
             this._emitLocal(Events.SYNC_STATE, data.payload);
          }
        } else if (topic === `${this.topic}/complete`) {
          this._emitLocal(Events.CHAPTER_COMPLETE, data);
        }
      } catch (e) {
        console.warn("Invalid message", e);
      }
    });

    this.client.on('error', (err) => {
      this._emitLocal(Events.ROOM_ERROR, { message: "Broker error" });
    });
  }

  selectRole(role) {
    this.role = role;
  }

  syncState(statePayload) {
    if (this.client && this.connected) {
      this.client.publish(`${this.topic}/sync`, JSON.stringify({ role: this.role, payload: statePayload }));
    }
  }

  chapterComplete(data) {
    if (this.client && this.connected) {
      this.client.publish(`${this.topic}/complete`, JSON.stringify(data));
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
