/**
 * OutroScene — Ending narrative. Clean, direct canvas draw like lobby/intro.
 */

const FONT = "'JetBrains Mono', monospace";

export class OutroScene {
  init() {
    this.time = 0;
    this.alpha = 0;
    this.whiteFade = 0;
    this.restartAlpha = 0;

    this.lines = [
      { text: '[ SYSTEM END ]', delay: 0 },
      { text: '. . .', delay: 2.5 },
      { text: 'PROCESS COMPLETE', delay: 4 },
      { text: 'CORRUPTED FILE RESTORED', delay: 6 },
      { text: 'MEMORY STRUCTURE REBUILT', delay: 8 },
      { text: '. . .', delay: 10.5 },
      { text: 'the palace is stable', delay: 12 },
      { text: 'all missing sections have been replaced', delay: 14 },
      { text: 'all sequences are correct', delay: 16 },
      { text: '. . .', delay: 18.5 },
      { text: 'two users detected', delay: 20 },
      { text: 'both remain connected', delay: 22 },
      { text: '. . .', delay: 24.5 },
      { text: 'thank you', delay: 26 },
      { text: 'my corrupted file has been restored', delay: 28 },
      { text: '. . .', delay: 30.5 },
      { text: 'the system will continue as expected', delay: 32 },
      { text: '. . .', delay: 34.5 },
      { text: '[ CLOSE ]', delay: 37 },
    ];
    this.totalDuration = 41;
  }

  update(dt) {
    this.time += dt;
    if (this.alpha < 1) this.alpha = Math.min(1, this.alpha + dt * 0.3);

    if (this.time > this.totalDuration) {
      this.whiteFade = Math.min(1, this.whiteFade + dt * 0.15);
    }
    
    if (this.whiteFade >= 1) {
      this.restartAlpha = Math.min(1, this.restartAlpha + dt * 0.5);
    }
  }

  draw(ctx) {
    const w = this.width, h = this.height;

    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.globalAlpha = this.alpha;

    // Subtle grid
    ctx.strokeStyle = 'rgba(0,0,0,0.05)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x < w; x += 60) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y < h; y += 60) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < this.lines.length; i++) {
      const line = this.lines[i];
      if (this.time < line.delay) continue;

      const age = this.time - line.delay;
      const nextDelay = this.lines[i + 1]?.delay ?? this.totalDuration;
      const duration = nextDelay - line.delay;

      let lineAlpha = 0;
      if (age < 1.5) lineAlpha = age / 1.5;
      else if (age > duration - 1.2) lineAlpha = Math.max(0, (duration - age) / 1.2);
      else lineAlpha = 1;

      if (lineAlpha > 0.01) {
        ctx.globalAlpha = this.alpha * lineAlpha;
        ctx.font = `100 1.6rem ${FONT}`;
        ctx.fillStyle = '#000';
        ctx.fillText(line.text, w / 2, h / 2);
      }
    }

    ctx.restore();

    if (this.whiteFade > 0) {
      ctx.fillStyle = `rgba(255, 255, 255, ${this.whiteFade})`;
      ctx.fillRect(0, 0, w, h);
    }

    if (this.restartAlpha > 0) {
      ctx.globalAlpha = this.restartAlpha;
      ctx.font = `200 1.2rem ${FONT}`;
      
      const btnW = 160;
      const btnH = 45;
      const btnX = w / 2 - btnW / 2;
      const btnY = h / 2 - btnH / 2;

      ctx.fillStyle = '#fff';
      ctx.fillRect(btnX, btnY, btnW, btnH);
      ctx.strokeStyle = '#000';
      ctx.strokeRect(btnX, btnY, btnW, btnH);

      ctx.fillStyle = '#000';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText("corrupt", w / 2, btnY + btnH / 2 + 2);

      ctx.globalAlpha = 1;
    }
  }

  onKeyDown(key) {
    if (this.restartAlpha > 0.5 && (key === 'Enter' || key === ' ')) {
      this.manager.switchTo('lobby');
    }
  }

  onClick() {
    if (this.restartAlpha > 0.5) {
      this.manager.switchTo('lobby');
    }
  }

  destroy() {}
}
