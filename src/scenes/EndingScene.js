/**
 * EndingScene — Prototype ending. Quiet, sterile.
 */
export class EndingScene {
  init() {
    this.alpha = 0; this.time = 0;
  }

  update(dt) {
    this.time += dt;
    if (this.alpha < 1) this.alpha = Math.min(1, this.alpha + dt * 0.4);
  }

  draw(ctx) {
    const w = this.width, h = this.height;
    ctx.fillStyle = '#d8d8d8'; ctx.fillRect(0, 0, w, h);
    ctx.save(); ctx.globalAlpha = this.alpha;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '200 1.2rem Inter, sans-serif'; ctx.fillStyle = '#666';
    ctx.fillText('end of prototype', w/2, h*0.4);
    ctx.font = '200 0.65rem Inter, sans-serif'; ctx.fillStyle = '#999';
    ctx.fillText('the palace continues...', w/2, h*0.4+35);
    const a = 0.3 + Math.sin(this.time*1.5)*0.15;
    ctx.globalAlpha = this.alpha * a;
    ctx.font = '200 0.5rem Inter, sans-serif'; ctx.fillStyle = '#888';
    ctx.fillText('press any key to return', w/2, h*0.85);
    ctx.restore();
  }

  onKeyDown() { if (this.alpha > 0.5) this.manager.switchTo('splash'); }
  onClick() { if (this.alpha > 0.5) this.manager.switchTo('splash'); }
  destroy() {}
}
