/**
 * PixelRenderer — Clean cyber chic renderer.
 * Frosted glass elements, subtle grid, floating particles.
 * Helvetica Neue Thin font. Elegant grayscale.
 *
 * Internal: 960×540
 */

export const INTERNAL_W = 960;
export const INTERNAL_H = 540;
export const TILE = 32;

const FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif";

export class PixelRenderer {
  constructor() {
    this.buffer = document.createElement('canvas');
    this.buffer.width = INTERNAL_W;
    this.buffer.height = INTERNAL_H;
    this.bctx = this.buffer.getContext('2d');
    this.bctx.imageSmoothingEnabled = true;

    // Particles
    this.particles = [];
    for (let i = 0; i < 50; i++) {
      this.particles.push({
        x: Math.random() * INTERNAL_W,
        y: Math.random() * INTERNAL_H,
        vx: (Math.random() - 0.5) * 6,
        vy: -Math.random() * 3 - 0.5,
        size: Math.random() * 1.5 + 0.3,
        alpha: Math.random() * 0.08 + 0.02,
        life: Math.random() * 100,
      });
    }
  }

  get ctx() { return this.bctx; }

  clear(color = '#0c0c10') {
    this.bctx.fillStyle = color;
    this.bctx.fillRect(0, 0, INTERNAL_W, INTERNAL_H);
  }

  present(mainCtx, canvasW, canvasH) {
    mainCtx.imageSmoothingEnabled = true;
    mainCtx.drawImage(this.buffer, 0, 0, canvasW, canvasH);
  }

  // ─── Cyber chic background ──────────────────────

  drawBackground(time, skin) {
    const ctx = this.bctx;
    const dark = skin === 'digital';

    // Base gradient
    const grad = ctx.createLinearGradient(0, 0, 0, INTERNAL_H);
    if (dark) {
      grad.addColorStop(0, '#0a0e12');
      grad.addColorStop(0.5, '#0c1014');
      grad.addColorStop(1, '#080c10');
    } else {
      grad.addColorStop(0, '#0e0e0e');
      grad.addColorStop(0.5, '#101010');
      grad.addColorStop(1, '#0c0c0c');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, INTERNAL_W, INTERNAL_H);

    // Subtle grid (cyber feel)
    const gridSize = 60;
    const gridAlpha = dark ? 0.035 : 0.03;
    ctx.strokeStyle = `rgba(255,255,255,${gridAlpha})`;
    ctx.lineWidth = 0.5;
    const drift = (time * 2) % gridSize;
    for (let x = -drift; x < INTERNAL_W + gridSize; x += gridSize) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, INTERNAL_H); ctx.stroke();
    }
    for (let y = 0; y < INTERNAL_H; y += gridSize) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(INTERNAL_W, y); ctx.stroke();
    }

    // Cross nodes at grid intersections (very subtle)
    ctx.fillStyle = `rgba(255,255,255,${gridAlpha * 1.5})`;
    for (let x = 0; x < INTERNAL_W; x += gridSize) {
      for (let y = 0; y < INTERNAL_H; y += gridSize) {
        ctx.fillRect(x - 1, y - 1, 2, 2);
      }
    }

    // Floating particles (rising, subtle)
    for (const p of this.particles) {
      p.x += p.vx * 0.016;
      p.y += p.vy * 0.016;
      p.life += 0.016;
      if (p.y < -5) { p.y = INTERNAL_H + 5; p.x = Math.random() * INTERNAL_W; }
      if (p.x < -5) p.x = INTERNAL_W + 5;
      if (p.x > INTERNAL_W + 5) p.x = -5;

      const pulse = p.alpha + Math.sin(time + p.life) * 0.01;
      ctx.globalAlpha = Math.max(0, pulse);
      ctx.fillStyle = dark ? '#4a8a6a' : '#aaaaaa';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Horizon line (frosted)
    const horizY = INTERNAL_H * 0.78;
    ctx.save();
    ctx.globalAlpha = 0.04;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, horizY);
    ctx.lineTo(INTERNAL_W, horizY);
    ctx.stroke();
    ctx.restore();

    // Vignette
    const vg = ctx.createRadialGradient(
      INTERNAL_W / 2, INTERNAL_H / 2, INTERNAL_H * 0.25,
      INTERNAL_W / 2, INTERNAL_H / 2, INTERNAL_H * 0.85
    );
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, INTERNAL_W, INTERNAL_H);
  }

  // ─── Frosted glass panel ────────────────────────

  drawFrostedPanel(x, y, w, h, alpha = 0.1) {
    const ctx = this.bctx;
    const r = 6;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();

    // Fill
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // Border
    ctx.globalAlpha = alpha * 0.6;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 0.5;
    ctx.stroke();
    ctx.restore();
  }

  // ─── Tile drawing ───────────────────────────────

  drawTile(c, r, color, camX = 0, camY = 0) {
    const x = c * TILE - camX;
    const y = r * TILE - camY;
    if (x > INTERNAL_W || y > INTERNAL_H || x + TILE < 0 || y + TILE < 0) return;
    this.bctx.fillStyle = color;
    this.bctx.fillRect(Math.round(x), Math.round(y), TILE, TILE);
  }

  drawDetailedTile(c, r, baseColor, detailColor, style, camX = 0, camY = 0) {
    const x = Math.round(c * TILE - camX);
    const y = Math.round(r * TILE - camY);
    if (x > INTERNAL_W || y > INTERNAL_H || x + TILE < 0 || y + TILE < 0) return;

    const ctx = this.bctx;

    // Base fill
    ctx.fillStyle = baseColor;
    ctx.fillRect(x, y, TILE, TILE);

    if (style === 'stone') {
      // Elegant stone: top highlight, subtle noise
      ctx.fillStyle = detailColor;
      ctx.fillRect(x, y, TILE, 1);
      ctx.fillRect(x, y, 1, TILE);
      // Dark bottom/right edge
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.fillRect(x, y + TILE - 1, TILE, 1);
      ctx.fillRect(x + TILE - 1, y, 1, TILE);
    } else if (style === 'digital') {
      // Digital: clean grid lines, corner glow
      ctx.fillStyle = detailColor;
      ctx.fillRect(x + TILE - 1, y, 1, TILE);
      ctx.fillRect(x, y + TILE - 1, TILE, 1);
      // Subtle inner glow
      const seed = (c * 11 + r * 3) % 13;
      if (seed < 3) {
        ctx.fillStyle = 'rgba(80,200,120,0.08)';
        ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
      }
    }
  }

  // ─── Player cube ────────────────────────────────

  drawPlayerCube(x, y, w, h, skin, camX = 0, camY = 0) {
    const px = Math.round(x - camX);
    const py = Math.round(y - camY);
    const ctx = this.bctx;

    if (skin === 'palace') {
      // Clean grayscale cube
      ctx.fillStyle = '#b0b0b0';
      ctx.fillRect(px, py, w, h);
      ctx.fillStyle = '#cccccc';
      ctx.fillRect(px, py, w, 2);
      ctx.fillRect(px, py, 2, h);
      ctx.fillStyle = '#888888';
      ctx.fillRect(px, py + h - 2, w, 2);
      ctx.fillRect(px + w - 2, py, 2, h);
      // Eye
      ctx.fillStyle = '#333';
      ctx.fillRect(px + w - 7, py + 6, 3, 3);
    } else {
      // Digital cube with green accent
      ctx.fillStyle = '#2a4a3a';
      ctx.fillRect(px, py, w, h);
      ctx.fillStyle = '#4a6a5a';
      ctx.fillRect(px, py, w, 2);
      ctx.fillRect(px, py, 2, h);
      ctx.fillStyle = '#1a3a2a';
      ctx.fillRect(px, py + h - 2, w, 2);
      ctx.fillRect(px + w - 2, py, 2, h);
      // Indicator
      ctx.fillStyle = '#6aaa7a';
      ctx.fillRect(px + w - 7, py + 6, 3, 3);
    }
  }

  // ─── Text ────────────────────────────────────────

  drawText(text, x, y, color = '#888', size = 14) {
    const ctx = this.bctx;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = `100 ${size}px ${FONT}`;
    ctx.fillStyle = color;
    ctx.fillText(text, Math.round(x), Math.round(y));
  }

  drawCenteredText(text, y, color = '#888', size = 18) {
    const ctx = this.bctx;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `100 ${size}px ${FONT}`;
    ctx.fillStyle = color;
    ctx.fillText(text, INTERNAL_W / 2, Math.round(y));
  }
}
