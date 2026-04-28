/**
 * MenuScene — Main menu with Host/Join/Settings/Credits.
 * Minimal vertical layout, cold and sterile.
 */
import { network } from '../network/client.js';

export class MenuScene {
  init() {
    this.items = [
      { id: 'host', label: 'HOST GAME', enabled: true },
      { id: 'join', label: 'JOIN GAME', enabled: true },
      { id: 'settings', label: 'SETTINGS', enabled: false },
      { id: 'credits', label: 'CREDITS', enabled: false },
    ];
    this.selectedIndex = 0;
    this.alpha = 0;
    this.time = 0;
    this.hoverIndex = -1;

    // Ensure network is connected
    network.connect();

    // Initialize audio on first interaction
    if (this.manager.audio) {
      this.manager.audio.init();
    }
  }

  update(dt) {
    this.time += dt;
    if (this.alpha < 1) {
      this.alpha = Math.min(1, this.alpha + dt * 1.2);
    }
  }

  draw(ctx) {
    const w = this.width;
    const h = this.height;

    // Background
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Title
    ctx.font = '200 2.8rem Inter, sans-serif';
    ctx.fillStyle = '#e8e8e8';
    ctx.fillText('BRAIN PALACE', w / 2, h * 0.3);

    // Thin line under title
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(w / 2 - 80, h * 0.3 + 30);
    ctx.lineTo(w / 2 + 80, h * 0.3 + 30);
    ctx.stroke();

    // Menu items
    const startY = h * 0.48;
    const gap = 52;

    this.items.forEach((item, i) => {
      const y = startY + i * gap;
      const isSelected = i === this.selectedIndex;
      const isHovered = i === this.hoverIndex;
      const active = isSelected || isHovered;

      ctx.font = '300 0.85rem Inter, sans-serif';
      ctx.fillStyle = !item.enabled ? '#333' : active ? '#e8e8e8' : '#777777';
      ctx.fillText(item.label, w / 2, y);

      // Selection indicator
      if (active && item.enabled) {
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 0.5;
        const tw = ctx.measureText(item.label).width;
        ctx.strokeRect(w / 2 - tw / 2 - 24, y - 16, tw + 48, 32);
      }

      // Store hit area
      item._y = y;
      item._hw = 120;
    });

    ctx.restore();
  }

  onKeyDown(key) {
    if (this.manager.audio) this.manager.audio.init();

    if (key === 'ArrowUp') {
      do {
        this.selectedIndex = (this.selectedIndex - 1 + this.items.length) % this.items.length;
      } while (!this.items[this.selectedIndex].enabled);
      if (this.manager.audio) this.manager.audio.click();
    } else if (key === 'ArrowDown') {
      do {
        this.selectedIndex = (this.selectedIndex + 1) % this.items.length;
      } while (!this.items[this.selectedIndex].enabled);
      if (this.manager.audio) this.manager.audio.click();
    } else if (key === 'Enter') {
      this._select(this.selectedIndex);
    }
  }

  onClick(x, y) {
    if (this.manager.audio) this.manager.audio.init();

    this.items.forEach((item, i) => {
      if (!item.enabled) return;
      if (Math.abs(y - item._y) < 20 && Math.abs(x - this.width / 2) < item._hw) {
        this._select(i);
      }
    });
  }

  onMouseMove(x, y) {
    this.hoverIndex = -1;
    this.items.forEach((item, i) => {
      if (!item.enabled) return;
      if (Math.abs(y - item._y) < 20 && Math.abs(x - this.width / 2) < item._hw) {
        this.hoverIndex = i;
      }
    });
  }

  _select(index) {
    const item = this.items[index];
    if (!item || !item.enabled) return;
    if (this.manager.audio) this.manager.audio.select();

    switch (item.id) {
      case 'host':
        this.manager.switchTo('lobby', { mode: 'host' });
        break;
      case 'join':
        this.manager.switchTo('lobby', { mode: 'join' });
        break;
    }
  }

  destroy() {}
}
