/**
 * DoorScene — Two doors with symbols. RenderUtils atmosphere.
 */
import { network } from '../network/client.js';
import { Events } from '../network/events.js';
import * as R from '../engine/RenderUtils.js';

export class DoorScene {
  init() {
    this.alpha = 0; this.time = 0; this.selectedIndex = -1;
    this.chosen = false; this.locked = false;
    this.doorOpenAlpha = 0; this.transitioning = false;

    network.off(Events.ROLE_CONFIRMED); network.off(Events.ROLE_CONFLICT); network.off(Events.ROLE_SELECTED);
    network.on(Events.ROLE_CONFIRMED, () => { this.locked = true; if (this.manager.audio) this.manager.audio.solve(); this.transitioning = true; });
    network.on(Events.ROLE_CONFLICT, () => { this.chosen = false; if (this.manager.audio) this.manager.audio.error(); });
    network.on(Events.ROLE_SELECTED, (data) => {
      if (!this.chosen && data.playerId !== network.playerId) {
        const other = data.role === 'room' ? 'terminal' : 'room';
        this.selectedIndex = other === 'room' ? 0 : 1;
        this.chosen = true; network.selectRole(other);
      }
    });
  }
  update(dt) {
    this.time += dt;
    if (this.alpha < 1) this.alpha = Math.min(1, this.alpha + dt * 0.8);
    if (this.transitioning) { this.doorOpenAlpha += dt * 0.5; if (this.doorOpenAlpha >= 1) this.manager.switchTo('intro', { role: network.role }); }
  }
  draw(ctx) {
    const w = this.width, h = this.height;
    ctx.save(); ctx.globalAlpha = this.alpha * R.getFlicker(this.time);

    const fY = Math.round(h * 0.62);
    R.drawTexturedWall(ctx, 0, 0, w, fY);
    R.drawTexturedFloor(ctx, 0, fY, w, h - fY);
    R.drawBaseboard(ctx, 0, fY, w);
    R.drawOverheadLight(ctx, w, h, w * 0.5, 0, h * 0.7, 0.08);

    const dW = 90, dH = fY * 0.72;
    const doors = [
      { x: w * 0.32 - dW / 2, y: fY - dH },
      { x: w * 0.68 - dW / 2, y: fY - dH },
    ];
    this._doorRects = doors.map(d => ({ x: d.x, y: d.y, w: dW, h: dH }));

    doors.forEach((d, i) => {
      const sel = i === this.selectedIndex;
      ctx.save(); ctx.globalAlpha = 0.05; ctx.fillStyle = '#000'; ctx.fillRect(d.x + 3, d.y + 3, dW, dH); ctx.restore();
      ctx.fillStyle = '#b0b0b0'; ctx.fillRect(d.x - 5, d.y - 5, dW + 10, dH + 5);
      ctx.fillStyle = sel ? '#a0a0a0' : '#b0b0b0';
      ctx.fillRect(d.x, d.y, dW, dH);
      ctx.strokeStyle = sel ? '#888' : '#aaa'; ctx.lineWidth = 0.8;
      ctx.strokeRect(d.x, d.y, dW, dH);
      const pH = dH * 0.4, pM = 6;
      ctx.strokeStyle = sel ? '#808080' : '#a0a0a0'; ctx.lineWidth = 0.5;
      ctx.strokeRect(d.x + pM, d.y + pM, dW - pM * 2, pH);
      ctx.strokeRect(d.x + pM, d.y + pH + pM * 2, dW - pM * 2, pH);
      ctx.beginPath(); ctx.arc(d.x + dW - 14, d.y + dH / 2 + 8, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = sel ? '#666' : '#888'; ctx.fill();

      const symX = d.x + dW / 2, symY = d.y + pM + pH / 2;
      ctx.strokeStyle = sel ? '#555' : '#888'; ctx.lineWidth = 1;
      if (i === 0) {
        ctx.beginPath();
        ctx.moveTo(symX - 18, symY);
        ctx.quadraticCurveTo(symX, symY - 12, symX + 18, symY);
        ctx.quadraticCurveTo(symX, symY + 12, symX - 18, symY);
        ctx.stroke();
        ctx.beginPath(); ctx.arc(symX, symY, 5, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(symX, symY, 2, 0, Math.PI * 2); ctx.fillStyle = sel ? '#555' : '#888'; ctx.fill();
      } else {
        const g = 7;
        for (let gx = -1; gx <= 1; gx++) for (let gy = -1; gy <= 1; gy++) {
          ctx.strokeRect(symX + gx * g - 2, symY + gy * g - 2, 4, 4);
        }
      }

      if (sel && !this.locked) {
        ctx.fillStyle = 'rgba(180,180,180,0.15)';
        ctx.fillRect(d.x + 2, fY - 2, dW - 4, 2);
      }
    });

    R.drawFog(ctx, w, h, 0.04);
    R.drawNoise(ctx, w, h, 0.03);
    R.drawVignette(ctx, w, h, 0.35);
    if (this.doorOpenAlpha > 0) { ctx.globalAlpha = this.doorOpenAlpha; ctx.fillStyle = '#1a1a1a'; ctx.fillRect(0, 0, w, h); }
    ctx.restore();
  }
  _confirm() {
    if (this.locked || this.chosen || this.selectedIndex < 0) return;
    this.chosen = true;
    if (this.manager.audio) this.manager.audio.select();
    network.selectRole(this.selectedIndex === 0 ? 'room' : 'terminal');
  }
  onKeyDown(key) {
    if (this.locked || this.chosen) return;
    if (key === 'ArrowLeft') { this.selectedIndex = 0; if (this.manager.audio) this.manager.audio.click(); }
    else if (key === 'ArrowRight') { this.selectedIndex = 1; if (this.manager.audio) this.manager.audio.click(); }
    else if (key === 'Enter') this._confirm();
  }
  onClick(x, y) {
    if (this.locked || this.chosen || !this._doorRects) return;
    this._doorRects.forEach((d, i) => {
      if (x >= d.x && x <= d.x + d.w && y >= d.y && y <= d.y + d.h) { this.selectedIndex = i; this._confirm(); }
    });
  }
  onMouseMove(x, y) {
    if (this.locked || this.chosen || !this._doorRects) return;
    let found = -1;
    this._doorRects.forEach((d, i) => { if (x >= d.x && x <= d.x + d.w && y >= d.y && y <= d.y + d.h) found = i; });
    this.selectedIndex = found;
  }
  destroy() { network.off(Events.ROLE_CONFIRMED); network.off(Events.ROLE_CONFLICT); network.off(Events.ROLE_SELECTED); }
}
