/**
 * RenderUtils — Atmospheric rendering: noise, vignette, grain, lighting, fog.
 * Shared across all scenes for consistent visual language.
 */

let _noiseCanvas = null;
let _noiseCtx = null;

/** Generate a static noise texture (cached) */
function getNoiseCanvas(w, h) {
  if (_noiseCanvas && _noiseCanvas.width === w && _noiseCanvas.height === h) return _noiseCanvas;
  _noiseCanvas = document.createElement('canvas');
  _noiseCanvas.width = w; _noiseCanvas.height = h;
  _noiseCtx = _noiseCanvas.getContext('2d');
  const img = _noiseCtx.createImageData(w, h);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.random() * 255;
    img.data[i] = img.data[i+1] = img.data[i+2] = v;
    img.data[i+3] = 255;
  }
  _noiseCtx.putImageData(img, 0, 0);
  return _noiseCanvas;
}

/** Draw noise grain overlay */
export function drawNoise(ctx, w, h, opacity = 0.035) {
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.globalCompositeOperation = 'overlay';
  ctx.drawImage(getNoiseCanvas(w, h), 0, 0);
  ctx.restore();
}

/** Draw vignette (dark corners) */
export function drawVignette(ctx, w, h, strength = 0.4) {
  const cx = w / 2, cy = h / 2;
  const r = Math.max(w, h) * 0.7;
  const grad = ctx.createRadialGradient(cx, cy, r * 0.3, cx, cy, r);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(0.7, `rgba(0,0,0,${strength * 0.3})`);
  grad.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

/** Draw directional overhead light */
export function drawOverheadLight(ctx, w, h, lx, ly, radius, intensity = 0.12) {
  const grad = ctx.createRadialGradient(lx, ly, 0, lx, ly, radius);
  grad.addColorStop(0, `rgba(255,255,240,${intensity})`);
  grad.addColorStop(0.5, `rgba(255,255,240,${intensity * 0.3})`);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

/** Draw textured wall with grain and tonal variation */
export function drawTexturedWall(ctx, x, y, w, h) {
  // Base gradient (slightly uneven)
  const grad = ctx.createLinearGradient(x, y, x, y + h);
  grad.addColorStop(0, '#c8c8c8');
  grad.addColorStop(0.3, '#cdcdcd');
  grad.addColorStop(0.6, '#c5c5c5');
  grad.addColorStop(1, '#c0c0c0');
  ctx.fillStyle = grad; ctx.fillRect(x, y, w, h);

  // Horizontal texture lines (very subtle)
  ctx.save();
  ctx.globalAlpha = 0.04;
  for (let ly = y; ly < y + h; ly += 3 + Math.random() * 2) {
    ctx.strokeStyle = Math.random() > 0.5 ? '#999' : '#ddd';
    ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(x, ly); ctx.lineTo(x + w, ly); ctx.stroke();
  }
  ctx.restore();

  // Stains / tonal patches
  ctx.save();
  ctx.globalAlpha = 0.025;
  const stains = [[0.1, 0.2, 80, 100], [0.6, 0.15, 60, 70], [0.3, 0.5, 90, 60], [0.8, 0.6, 50, 80]];
  stains.forEach(([sx, sy, sw, sh]) => {
    ctx.fillStyle = '#888';
    ctx.fillRect(x + w * sx, y + h * sy, sw, sh);
  });
  ctx.restore();
}

/** Draw textured floor (concrete/matte) */
export function drawTexturedFloor(ctx, x, y, w, h) {
  const grad = ctx.createLinearGradient(x, y, x, y + h);
  grad.addColorStop(0, '#a8a8a8');
  grad.addColorStop(0.5, '#a2a2a2');
  grad.addColorStop(1, '#9a9a9a');
  ctx.fillStyle = grad; ctx.fillRect(x, y, w, h);

  // Concrete texture
  ctx.save();
  ctx.globalAlpha = 0.03;
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? '#777' : '#bbb';
    const fx = x + Math.random() * w;
    const fy = y + Math.random() * h;
    ctx.fillRect(fx, fy, Math.random() * 20 + 5, Math.random() * 3 + 1);
  }
  ctx.restore();
}

/** Draw fog / haze layer */
export function drawFog(ctx, w, h, opacity = 0.05) {
  ctx.save();
  ctx.globalAlpha = opacity;
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#c0c0c0');
  grad.addColorStop(0.5, 'transparent');
  grad.addColorStop(1, '#999');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/** Subtle light flicker — returns opacity multiplier */
export function getFlicker(time) {
  const f1 = Math.sin(time * 1.7) * 0.008;
  const f2 = Math.sin(time * 4.3) * 0.004;
  const spike = Math.random() < 0.002 ? -0.04 : 0;
  return 1 + f1 + f2 + spike;
}

/** Draw baseboard with shadow */
export function drawBaseboard(ctx, x, y, w) {
  // Shadow above baseboard
  ctx.save();
  ctx.globalAlpha = 0.06;
  ctx.fillStyle = '#000';
  ctx.fillRect(x, y - 8, w, 8);
  ctx.restore();
  // Baseboard
  ctx.fillStyle = '#a0a0a0';
  ctx.fillRect(x, y - 4, w, 8);
  ctx.strokeStyle = '#909090'; ctx.lineWidth = 0.5;
  ctx.beginPath(); ctx.moveTo(x, y - 4); ctx.lineTo(x + w, y - 4); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x, y + 4); ctx.lineTo(x + w, y + 4); ctx.stroke();
}
