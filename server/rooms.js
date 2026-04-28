/**
 * RoomManager — Server-side room and puzzle state management.
 */
export class RoomManager {
  constructor() {
    this.rooms = {};        // code -> room
    this.playerRoom = {};   // socketId -> code
  }

  /** Generate a 4-character room code */
  _generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars
    let code;
    do {
      code = '';
      for (let i = 0; i < 4; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
      }
    } while (this.rooms[code]);
    return code;
  }

  /** Create a new room */
  create(hostSocketId) {
    const code = this._generateCode();
    const room = {
      code,
      players: {
        host: { socketId: hostSocketId, connected: true },
        guest: null,
      },
      roles: {}, // socketId -> 'room' | 'terminal'
      state: 'waiting', // waiting | role_select | playing | completed
      currentLevel: 1,
      puzzleState: {
        cluesFound: [],
        terminalSelections: [],
        solved: false,
      },
      createdAt: Date.now(),
    };

    this.rooms[code] = room;
    this.playerRoom[hostSocketId] = code;
    return room;
  }

  /** Join an existing room */
  join(code, guestSocketId) {
    code = code.toUpperCase();
    const room = this.rooms[code];

    if (!room) {
      return { error: 'room not found' };
    }
    if (room.players.guest && room.players.guest.connected) {
      return { error: 'room is full' };
    }

    room.players.guest = { socketId: guestSocketId, connected: true };
    room.state = 'role_select';
    this.playerRoom[guestSocketId] = code;

    return { room };
  }

  /** Get room by player socket ID */
  getByPlayer(socketId) {
    const code = this.playerRoom[socketId];
    return code ? this.rooms[code] : null;
  }

  /** Select a role for a player */
  selectRole(code, socketId, role) {
    const room = this.rooms[code];
    if (!room) return { error: 'room not found' };

    // Check if someone else already has this role
    const otherPlayer = Object.entries(room.roles).find(([id, r]) => r === role && id !== socketId);
    if (otherPlayer) {
      // Conflict — same role chosen
      delete room.roles[socketId];
      delete room.roles[otherPlayer[0]];
      return { conflict: true };
    }

    room.roles[socketId] = role;

    // Check if both players have roles
    const roleValues = Object.values(room.roles);
    const ready = roleValues.length === 2 && roleValues.includes('room') && roleValues.includes('terminal');

    return { ready };
  }

  /** Check puzzle answer for Level 1 */
  checkAnswer(code, sequence) {
    const room = this.rooms[code];
    if (!room) return false;

    // Level 1 correct answer: RABBIT, BIRD, DOG
    // (poster shows R, B, D left to right → map to list entries)
    const correctAnswer = ['RABBIT', 'BIRD', 'DOG'];

    if (sequence.length !== correctAnswer.length) return false;
    return sequence.every((name, i) => name === correctAnswer[i]);
  }

  /** Handle player disconnect */
  playerDisconnected(socketId) {
    const code = this.playerRoom[socketId];
    if (!code) return;

    const room = this.rooms[code];
    if (!room) return;

    if (room.players.host?.socketId === socketId) {
      room.players.host.connected = false;
    }
    if (room.players.guest?.socketId === socketId) {
      room.players.guest.connected = false;
    }

    // Don't delete room — allow reconnect
    // Clean up after 5 minutes if both disconnected
    setTimeout(() => {
      if (room.players.host && !room.players.host.connected &&
          (!room.players.guest || !room.players.guest.connected)) {
        delete this.rooms[code];
        delete this.playerRoom[socketId];
      }
    }, 5 * 60 * 1000);
  }

  /** Handle reconnect */
  reconnect(code, socketId, role) {
    const room = this.rooms[code];
    if (!room) return { success: false };

    // Find disconnected player slot
    if (room.players.host && !room.players.host.connected) {
      const oldId = room.players.host.socketId;
      room.players.host.socketId = socketId;
      room.players.host.connected = true;
      delete this.playerRoom[oldId];
      this.playerRoom[socketId] = code;
      if (role) room.roles[socketId] = room.roles[oldId] || role;
      delete room.roles[oldId];
      return { success: true, room };
    }
    if (room.players.guest && !room.players.guest.connected) {
      const oldId = room.players.guest.socketId;
      room.players.guest.socketId = socketId;
      room.players.guest.connected = true;
      delete this.playerRoom[oldId];
      this.playerRoom[socketId] = code;
      if (role) room.roles[socketId] = room.roles[oldId] || role;
      delete room.roles[oldId];
      return { success: true, room };
    }

    return { success: false };
  }
}
