/**
 * IntroScene — Clean narrative intro. Draws direct to canvas (no buffer).
 * Same visual style as LobbyScene: subtle grid, clean Helvetica Neue Thin.
 */

const FONT = "'JetBrains Mono', monospace";

export class IntroScene {
  init(data) {
    this.role = data?.role || 'room';
    this.time = 0;
    this.alpha = 0;
    this.exitFade = 0;

    this.lines = [
      { text: '[ SYSTEM START ]', delay: 0 },
      { text: '. . .', delay: 2.5 },
      { text: 'ERROR 01: MEMORY DATA CORRUPTED', delay: 4 },
      { text: 'ERROR 02: SEQUENCE MISMATCH', delay: 6 },
      { text: 'ERROR 03: STRUCTURE FAILURE', delay: 8 },
      { text: '. . .', delay: 10.5 },
      { text: 'the palace is degrading', delay: 12 },
      { text: 'sections are missing', delay: 14 },
      { text: 'records no longer align', delay: 16 },
      { text: '. . .', delay: 18.5 },
      { text: 'two users detected', delay: 20 },
      { text: 'connection established', delay: 22 },
      { text: 'what appears here', delay: 24.5 },
      { text: 'does not appear there', delay: 26.5 },
      { text: '. . .', delay: 29 },
      { text: 'restore my corrupted self', delay: 31 },
      { text: '. . .', delay: 33.5 },
      { text: '[ BEGIN ]', delay: 36 },
    ];
    this.totalDuration = 40;
  }

  update(dt) {
    this.time += dt;
    if (this.alpha < 1) this.alpha = Math.min(1, this.alpha + dt * 0.6);

    if (this.time > this.totalDuration && this.exitFade === 0) {
      this.exitFade = 0.01;
    }
    if (this.exitFade > 0) {
      this.exitFade += dt * 0.5;
      if (this.exitFade >= 1) {
        this.manager.switchTo('chapter', { chapter: 1, role: this.role });
      }
    }
  }

  draw(ctx) {
    const w = this.width, h = this.height;

    // Black background
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.globalAlpha = this.alpha;

    // Subtle grid (same as lobby)
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x < w; x += 60) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y < h; y += 60) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    // Show active line
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < this.lines.length; i++) {
      const line = this.lines[i];
      if (this.time < line.delay) continue;

      const age = this.time - line.delay;
      const nextDelay = this.lines[i + 1]?.delay ?? this.totalDuration;
      const duration = nextDelay - line.delay;

      let lineAlpha = 0;
      if (age < 1.2) lineAlpha = age / 1.2;
      else if (age > duration - 1) lineAlpha = Math.max(0, (duration - age));
      else lineAlpha = 1;

      if (lineAlpha > 0.01 && line.text) {
        ctx.globalAlpha = this.alpha * lineAlpha;
        ctx.font = `100 1.6rem ${FONT}`;
        ctx.fillStyle = '#ccc';
        ctx.fillText(line.text, w / 2, h / 2);
      }
    }

    // Skip hint
    if (this.time > 3 && this.time < this.totalDuration - 2) {
      ctx.globalAlpha = 0.35;
      ctx.font = `100 0.7rem ${FONT}`;
      ctx.fillStyle = '#999';
      ctx.fillText('press enter to skip', w / 2, h * 0.92);
    }

    ctx.restore();

    // Exit fade
    if (this.exitFade > 0) {
      ctx.globalAlpha = Math.min(1, this.exitFade);
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, w, h);
    }
  }

  onKeyDown(key) {
    if (key === 'Enter' || key === ' ') {
      this.time = this.totalDuration + 1;
    }
  }

  onClick() {
    this.time = this.totalDuration + 1;
  }

  destroy() {}
}
