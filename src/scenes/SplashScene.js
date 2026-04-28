/**
 * SplashScene — Title screen. Clean direct canvas draw.
 * Same style as lobby: subtle grid, Helvetica Neue Thin.
 */
import { network } from '../network/client.js';

const FONT = "'JetBrains Mono', monospace";

export class SplashScene {
  init() {
    this.alpha = 0;
    this.time = 0;
    this.selectedIndex = 0;
    this.items = ['> initiate_host', '> connect_node'];
    this.cyberDeco = [];
    network.connect();
    document.getElementById('game-container').classList.remove('terminal-active');
  }

  update(dt) {
    this.time += dt;
    if (this.alpha < 1) this.alpha = Math.min(1, this.alpha + dt * 0.4);

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
    for (let x = 0; x < w; x += 60) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y < h; y += 60) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    if (this.cyberDeco && this.cyberDeco.length > 0) {
      ctx.globalAlpha = 0.15 * this.alpha;
      ctx.textAlign = 'left';
      ctx.font = `12px ${FONT}`;
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

    // Title
    ctx.font = `300 2.8rem ${FONT}`;
    ctx.fillStyle = '#eee';
    ctx.fillText('[ sys.palace // core_module ]', w / 2, h * 0.32);

    // Subtitle
    ctx.font = `300 1.1rem ${FONT}`;
    ctx.fillStyle = '#aaa';
    ctx.fillText('a cooperative memory reconstruction protocol', w / 2, h * 0.40);

    // Menu
    const menuY = h * 0.56;
    this.items.forEach((item, i) => {
      const y = menuY + i * 46;
      const selected = i === this.selectedIndex;

      ctx.font = `300 1.2rem ${FONT}`;
      ctx.fillStyle = selected ? '#fff' : '#777';
      ctx.fillText(item, w / 2, y);

      if (selected) {
        const tw = ctx.measureText(item).width;
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(w / 2 - tw / 2 - 15, y + 16);
        ctx.lineTo(w / 2 + tw / 2 + 15, y + 16);
        ctx.stroke();
      }
    });

    // Hint
    ctx.globalAlpha = (0.5 + Math.sin(this.time * 2) * 0.1) * this.alpha;
    ctx.font = `300 0.9rem ${FONT}`;
    ctx.fillStyle = '#bbb';
    ctx.fillText('[↑↓] select   [⏎] confirm', w / 2, h * 0.9);

    ctx.restore();
  }

  onKeyDown(key) {
    if (this.manager.audio) this.manager.audio.init();
    if (key === 'ArrowUp') {
      this.selectedIndex = (this.selectedIndex - 1 + this.items.length) % this.items.length;
      if (this.manager.audio) this.manager.audio.click();
    } else if (key === 'ArrowDown') {
      this.selectedIndex = (this.selectedIndex + 1) % this.items.length;
      if (this.manager.audio) this.manager.audio.click();
    } else if (key === 'Enter') {
      if (this.manager.audio) this.manager.audio.select();
      const mode = this.selectedIndex === 0 ? 'host' : 'join';
      this.manager.switchTo('lobby', { mode });
    }
  }

  onClick(x, y) {
    if (this.manager.audio) this.manager.audio.init();
    const menuY = this.height * 0.54;
    this.items.forEach((item, i) => {
      const iy = menuY + i * 42;
      if (Math.abs(y - iy) < 20 && Math.abs(x - this.width / 2) < 80) {
        this.selectedIndex = i;
        if (this.manager.audio) this.manager.audio.select();
        const mode = i === 0 ? 'host' : 'join';
        this.manager.switchTo('lobby', { mode });
      }
    });
  }

  onMouseMove(x, y) {
    const menuY = this.height * 0.54;
    this.items.forEach((item, i) => {
      const iy = menuY + i * 42;
      if (Math.abs(y - iy) < 20 && Math.abs(x - this.width / 2) < 80) {
        this.selectedIndex = i;
      }
    });
  }

  destroy() {}
}
