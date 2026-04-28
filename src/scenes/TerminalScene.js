/**
 * TerminalScene — Player 2. Keyboard only, no mouse.
 * Arrow keys navigate, ENTER selects, BACKSPACE removes.
 */
import { network } from '../network/client.js';
import { Events } from '../network/events.js';

export class TerminalScene {
  init() {
    this.alpha = 0; this.time = 0;
    this.cursorIndex = 0;
    document.getElementById('game-container').classList.add('terminal-active');
    this.sequence = [];
    this.maxSelections = 3;
    this.solved = false;
    this.resultText = ''; this.resultAlpha = 0;
    this.notification = ''; this.notifTimer = 0;
    this.flickerAlpha = 1;
    this.glitchTimer = 0;

    this.entries = [
      { name: 'RABBIT' },
      { name: 'DOG' },
      { name: 'BIRD' },
      { name: 'TREE' },
      { name: 'CHAIR' },
    ];

    network.off(Events.CLUE_NOTIFY);
    network.off(Events.PUZZLE_SOLVED);
    network.off(Events.PUZZLE_FAILED);

    network.on(Events.CLUE_NOTIFY, () => {
      this._notify('// NEW DATA RECEIVED');
      if (this.manager.audio) this.manager.audio.click();
    });

    network.on(Events.PUZZLE_SOLVED, () => {
      this.solved = true;
      this.resultText = 'ARCHIVE RESTORED';
      if (this.manager.audio) this.manager.audio.solve();
      setTimeout(() => this.manager.switchTo('transition', { nextLevel: 2 }), 3500);
    });

    network.on(Events.PUZZLE_FAILED, () => {
      this.resultText = 'ACCESS DENIED';
      this.glitchTimer = 0.4;
      if (this.manager.audio) this.manager.audio.error();
      this.sequence = [];
      setTimeout(() => { this.resultText = ''; }, 2000);
    });
  }

  _notify(t) { this.notification = t; this.notifTimer = 3; }

  update(dt) {
    this.time += dt;
    if (this.alpha < 1) this.alpha = Math.min(1, this.alpha + dt * 1.0);
    if (this.notifTimer > 0) this.notifTimer -= dt;
    if (this.glitchTimer > 0) this.glitchTimer -= dt;
    if (this.resultText) this.resultAlpha = Math.min(1, this.resultAlpha + dt * 2);
    else this.resultAlpha = Math.max(0, this.resultAlpha - dt * 2);
    // Flicker
    if (Math.random() < 0.003) this.flickerAlpha = 0.82 + Math.random() * 0.1;
    else this.flickerAlpha += (1 - this.flickerAlpha) * dt * 4;
  }

  draw(ctx) {
    const w = this.width, h = this.height;
    ctx.save(); ctx.globalAlpha = this.alpha * this.flickerAlpha;

    // Background
    ctx.fillStyle = '#0c0c0c'; ctx.fillRect(0, 0, w, h);

    // Scanlines
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    for (let sy = 0; sy < h; sy += 4) ctx.fillRect(0, sy, w, 2);

    // Glitch offset
    const gx = this.glitchTimer > 0 ? (Math.random()-0.5)*8 : 0;
    const gy = this.glitchTimer > 0 ? (Math.random()-0.5)*4 : 0;
    ctx.translate(gx, gy);

    // Terminal frame
    const fx = w*0.15, fy = h*0.08, fw = w*0.7, fh = h*0.84;
    ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 1;
    ctx.strokeRect(fx, fy, fw, fh);

    // Header
    ctx.fillStyle = '#181818'; ctx.fillRect(fx, fy, fw, 30);
    ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(fx, fy+30); ctx.lineTo(fx+fw, fy+30); ctx.stroke();
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.font = '300 0.6rem JetBrains Mono, monospace'; ctx.fillStyle = '#555';
    ctx.fillText('LEVEL 01 — MEMORY ARCHIVE', fx+12, fy+15);
    ctx.textAlign = 'right'; ctx.fillStyle = '#444';
    ctx.fillText('CONNECTED', fx+fw-12, fy+15);

    // List header
    const listX = fx+20, listY = fy+50;
    ctx.textAlign = 'left';
    ctx.font = '300 0.7rem JetBrains Mono, monospace'; ctx.fillStyle = '#666';
    ctx.fillText('> MEMORY ARCHIVE', listX, listY);
    ctx.fillStyle = '#333';
    ctx.fillText('─'.repeat(32), listX, listY+20);

    // Entries
    this.entries.forEach((entry, i) => {
      const ey = listY + 46 + i * 34;
      const isCursor = i === this.cursorIndex;
      const seqPos = this.sequence.indexOf(i);
      const isSelected = seqPos !== -1;

      // Highlight bar
      if (isCursor) {
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(listX-4, ey-12, fw-32, 28);
        ctx.strokeStyle = '#333'; ctx.lineWidth = 0.5;
        ctx.strokeRect(listX-4, ey-12, fw-32, 28);
      }

      // Index
      ctx.font = '300 0.7rem JetBrains Mono, monospace';
      ctx.fillStyle = isCursor ? '#888' : '#444';
      ctx.fillText(`${i+1}.`, listX, ey);

      // Selection marker
      if (isSelected) {
        ctx.fillStyle = '#999';
        ctx.fillText(`[${seqPos+1}]`, listX+28, ey);
      }

      // Name
      ctx.fillStyle = isSelected ? '#ddd' : isCursor ? '#bbb' : '#666';
      ctx.fillText(entry.name, listX+68, ey);
    });

    // Sequence display
    const seqY = listY + 46 + this.entries.length * 34 + 20;
    ctx.fillStyle = '#333';
    ctx.fillText('─'.repeat(32), listX, seqY);
    ctx.fillStyle = '#555'; ctx.font = '300 0.6rem JetBrains Mono, monospace';
    ctx.fillText('SEQUENCE:', listX, seqY+24);

    for (let s = 0; s < this.maxSelections; s++) {
      const slotX = listX + 90 + s * 120;
      ctx.strokeStyle = '#333'; ctx.lineWidth = 0.5;
      ctx.strokeRect(slotX, seqY+12, 100, 24);
      if (this.sequence[s] !== undefined) {
        ctx.fillStyle = '#ccc';
        ctx.fillText(this.entries[this.sequence[s]].name, slotX+6, seqY+24);
      } else {
        ctx.fillStyle = '#333'; ctx.fillText('_', slotX+46, seqY+24);
      }
    }

    // Footer
    const footY = fy + fh - 20;
    ctx.fillStyle = '#333';
    ctx.fillText('─'.repeat(32), listX, footY-10);
    ctx.fillStyle = '#444'; ctx.font = '300 0.5rem JetBrains Mono, monospace';
    ctx.fillText('↑↓ NAVIGATE    ⏎ SELECT    ⌫ UNDO    SPACE SUBMIT', listX, footY+4);

    // Notification
    if (this.notifTimer > 0) {
      ctx.textAlign = 'center'; ctx.globalAlpha = Math.min(1, this.notifTimer);
      ctx.font = '300 0.65rem JetBrains Mono, monospace'; ctx.fillStyle = '#666';
      ctx.fillText(this.notification, w/2, fy+fh+20);
      ctx.globalAlpha = this.alpha;
    }

    // Result overlay
    if (this.resultAlpha > 0.01) {
      ctx.globalAlpha = this.resultAlpha;
      ctx.fillStyle = 'rgba(12,12,12,0.85)'; ctx.fillRect(0, 0, w, h);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '200 1.6rem JetBrains Mono, monospace';
      ctx.fillStyle = this.solved ? '#ddd' : '#888';
      ctx.fillText(this.resultText, w/2, h/2);
    }

    ctx.restore();
  }

  onKeyDown(key) {
    if (this.solved) return;

    if (key === 'ArrowUp') {
      this.cursorIndex = Math.max(0, this.cursorIndex - 1);
      if (this.manager.audio) this.manager.audio.click();
    } else if (key === 'ArrowDown') {
      this.cursorIndex = Math.min(this.entries.length - 1, this.cursorIndex + 1);
      if (this.manager.audio) this.manager.audio.click();
    } else if (key === 'Enter') {
      const pos = this.sequence.indexOf(this.cursorIndex);
      if (pos !== -1) {
        this.sequence.splice(pos, 1);
      } else if (this.sequence.length < this.maxSelections) {
        this.sequence.push(this.cursorIndex);
      }
      if (this.manager.audio) this.manager.audio.click();
      network.terminalSelect(this.sequence);
    } else if (key === 'Backspace') {
      if (this.sequence.length > 0) {
        this.sequence.pop();
        if (this.manager.audio) this.manager.audio.click();
      }
    } else if (key === ' ') {
      if (this.sequence.length === this.maxSelections) {
        if (this.manager.audio) this.manager.audio.select();
        const answer = this.sequence.map(i => this.entries[i].name);
        network.submitAnswer(answer);
      }
    }
  }

  destroy() {
    network.off(Events.CLUE_NOTIFY);
    network.off(Events.PUZZLE_SOLVED);
    network.off(Events.PUZZLE_FAILED);
  }
}
