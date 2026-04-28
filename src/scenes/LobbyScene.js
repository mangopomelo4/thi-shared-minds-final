/**
 * LobbyScene — Host/Join with room code. Keyboard only.
 */
import { network } from '../network/client.js';
import { Events } from '../network/events.js';

export class LobbyScene {
  init(data) {
    this.mode = data.mode;
    this.roomCode = '';
    this.codeInput = '';
    this.status = '';
    this.error = '';
    this.connected = false;
    this.alpha = 0;
    this.time = 0;
    this.cursorBlink = 0;
    this.cyberDeco = [];

    network.off(Events.ROOM_CREATED);
    network.off(Events.ROOM_JOINED);
    network.off(Events.ROOM_ERROR);

    network.on(Events.ROOM_CREATED, (data) => {
      this.roomCode = data.code;
      network.setRoomCode(data.code);
      this.status = 'waiting for partner';
    });

    network.on(Events.ROOM_JOINED, (data) => {
      this.connected = true;
      network.setRoomCode(data.code);
      this.roomCode = data.code;
      this.status = 'connected';
      // Auto-assign roles: host = room (palace), guest = terminal (controller)
      const role = this.mode === 'host' ? 'room' : 'terminal';
      network.selectRole(role);
      setTimeout(() => this.manager.switchTo('intro', { role }), 1500);
    });

    network.on(Events.ROOM_ERROR, (data) => {
      this.error = data.message || 'connection failed';
      this.status = '';
    });

    if (this.mode === 'host') {
      this.status = 'creating session';
      network.createRoom();
    }
  }

  update(dt) {
    this.time += dt;
    this.cursorBlink += dt;
    if (this.alpha < 1) this.alpha = Math.min(1, this.alpha + dt * 1.2);

    if (Math.random() < 0.1) {
      this.cyberDeco = Array(8).fill(0).map(() => `0x${Math.floor(Math.random() * 0xFFFF).toString(16).toUpperCase().padStart(4, '0')}`);
    }
  }

  draw(ctx) {
    const w = this.width, h = this.height;
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Subtle grid
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x < w; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y < h; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

    if (this.cyberDeco && this.cyberDeco.length > 0) {
      ctx.globalAlpha = 0.15 * this.alpha;
      ctx.textAlign = 'left';
      ctx.font = `12px 'JetBrains Mono', monospace`;
      ctx.fillStyle = '#fff';
      this.cyberDeco.forEach((str, i) => {
        ctx.fillText(str, 15, h - 25 - i * 18);
      });
      ctx.textAlign = 'right';
      this.cyberDeco.forEach((str, i) => {
        ctx.fillText(str, w - 15, h - 25 - i * 18);
      });
      ctx.globalAlpha = this.alpha;
      ctx.textAlign = 'center';
    }

    if (this.mode === 'host') {
      // Room code display
      ctx.font = '300 0.9rem \'JetBrains Mono\', monospace';
      ctx.fillStyle = '#aaa';
      ctx.fillText('> SYS_ALLOC: ROOM CODE', w / 2, h * 0.35);

      ctx.font = '300 3.2rem \'JetBrains Mono\', monospace';
      ctx.fillStyle = this.roomCode ? '#e8e8e8' : '#444';
      ctx.fillText(this.roomCode || '····', w / 2, h * 0.45);

      // Status
      ctx.font = '300 0.9rem \'JetBrains Mono\', monospace';
      ctx.fillStyle = this.connected ? '#bbb' : '#888';
      const dots = '.'.repeat(Math.floor(this.time * 2) % 4);
      ctx.fillText(`// ${this.status}${dots}`, w / 2, h * 0.56);
    } else {
      // Join: code input
      ctx.font = '300 0.9rem \'JetBrains Mono\', monospace';
      ctx.fillStyle = '#aaa';
      ctx.fillText('> INPUT SYS_ALLOC:', w / 2, h * 0.35);

      // Code slots
      const slotW = 48, slotH = 64, slotGap = 14;
      const totalW = 4 * slotW + 3 * slotGap;
      const startX = (w - totalW) / 2;
      const slotY = h * 0.42;

      for (let i = 0; i < 4; i++) {
        const sx = startX + i * (slotW + slotGap);
        const isActive = i === this.codeInput.length;
        const isFilled = i < this.codeInput.length;

        ctx.strokeStyle = isActive ? '#aaa' : isFilled ? '#777' : '#444';
        ctx.lineWidth = isActive ? 1.5 : 0.5;
        ctx.strokeRect(sx, slotY, slotW, slotH);
        ctx.fillStyle = '#111';
        ctx.fillRect(sx + 1, slotY + 1, slotW - 2, slotH - 2);

        if (isFilled) {
          ctx.font = '300 1.8rem \'JetBrains Mono\', monospace';
          ctx.fillStyle = '#eee';
          ctx.fillText(this.codeInput[i], sx + slotW / 2, slotY + slotH / 2);
        } else if (isActive && Math.floor(this.cursorBlink * 2) % 2 === 0) {
          ctx.fillStyle = '#777';
          ctx.fillRect(sx + slotW / 2 - 1, slotY + slotH / 2 - 10, 2, 20);
        }
      }

      // Status / error
      ctx.font = '300 0.9rem \'JetBrains Mono\', monospace';
      if (this.error) {
        ctx.fillStyle = '#aaa';
        ctx.fillText(`[ ERR: ${this.error} ]`, w / 2, h * 0.62);
      } else if (this.status) {
        ctx.fillStyle = '#888';
        ctx.fillText(`// ${this.status}`, w / 2, h * 0.62);
      }
    }

    // Back hint
    ctx.font = '300 0.8rem \'JetBrains Mono\', monospace';
    ctx.fillStyle = '#777';
    ctx.fillText('[ESC] BACK', w / 2, h * 0.9);

    ctx.restore();
  }

  onKeyDown(key) {
    if (key === 'Escape') {
      this.manager.switchTo('splash');
      return;
    }

    if (this.mode === 'join' && !this.connected) {
      if (key === 'Backspace') {
        this.codeInput = this.codeInput.slice(0, -1);
        this.error = '';
      } else if (/^[a-zA-Z0-9]$/.test(key) && this.codeInput.length < 4) {
        if (this.manager.audio) this.manager.audio.click();
        this.codeInput += key.toUpperCase();
        this.error = '';
        if (this.codeInput.length === 4) {
          this.status = 'connecting';
          setTimeout(() => network.joinRoom(this.codeInput), 300);
        }
      }
    }
  }

  destroy() {
    network.off(Events.ROOM_CREATED);
    network.off(Events.ROOM_JOINED);
    network.off(Events.ROOM_ERROR);
  }
}
