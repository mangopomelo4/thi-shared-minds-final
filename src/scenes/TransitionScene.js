/**
 * TransitionScene — Door open animation + level transition.
 */
export class TransitionScene {
  init(data) {
    this.nextLevel = data?.nextLevel || 2;
    this.time = 0;
    this.phase = 'fadeIn';
    this.alpha = 0;
    this.textAlpha = 0;
  }

  update(dt) {
    this.time += dt;
    if (this.phase === 'fadeIn') {
      this.alpha = Math.min(1, this.alpha + dt * 0.8);
      if (this.time > 1) this.textAlpha = Math.min(1, this.textAlpha + dt * 0.8);
      if (this.time > 4) this.phase = 'fadeOut';
    } else if (this.phase === 'fadeOut') {
      this.textAlpha = Math.max(0, this.textAlpha - dt * 1.2);
      if (this.textAlpha <= 0) this.manager.switchTo('ending');
    }
  }

  draw(ctx) {
    const w = this.width, h = this.height;
    ctx.fillStyle = '#d8d8d8';
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.globalAlpha = this.textAlpha;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '200 0.65rem Inter, sans-serif'; ctx.fillStyle = '#888';
    ctx.fillText(`LEVEL ${String(this.nextLevel).padStart(2,'0')}`, w/2, h/2-20);
    const names = { 2:'LANGUAGE ROOM', 3:'PATTERN RECOGNITION', 4:'EMOTIONAL SPILL', 5:'EXECUTIVE CONTROL' };
    ctx.font = '200 1.6rem Inter, sans-serif'; ctx.fillStyle = '#444';
    ctx.fillText(names[this.nextLevel] || 'UNKNOWN', w/2, h/2+15);
    ctx.font = '200 0.55rem Inter, sans-serif'; ctx.fillStyle = '#999';
    ctx.fillText('entering...', w/2, h/2+50);
    ctx.restore();
  }

  destroy() {}
}
