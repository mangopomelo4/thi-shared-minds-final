/**
 * Physics — Simple 2D platformer physics.
 * Gravity, velocity, AABB collision with tiles.
 */

const GRAVITY = 980;
const TILE = 16; // pixel-art tile size

export class Body {
  constructor(x, y, w, h) {
    this.x = x; this.y = y;
    this.w = w; this.h = h;
    this.vx = 0; this.vy = 0;
    this.grounded = false;
  }

  update(dt, tiles, tileW, tileH, mapCols) {
    // Apply gravity
    this.vy += GRAVITY * dt;

    // Move X
    this.x += this.vx * dt;
    this._resolveX(tiles, tileW, tileH, mapCols);

    // Move Y
    this.y += this.vy * dt;
    this.grounded = false;
    this._resolveY(tiles, tileW, tileH, mapCols);
  }

  _resolveX(tiles, tw, th, cols) {
    const left = Math.floor(this.x / tw);
    const right = Math.floor((this.x + this.w - 1) / tw);
    const top = Math.floor(this.y / th);
    const bot = Math.floor((this.y + this.h - 1) / th);

    for (let r = top; r <= bot; r++) {
      for (let c = left; c <= right; c++) {
        if (this._solid(tiles, r, c, cols)) {
          if (this.vx > 0) {
            this.x = c * tw - this.w;
          } else if (this.vx < 0) {
            this.x = (c + 1) * tw;
          }
          this.vx = 0;
        }
      }
    }
  }

  _resolveY(tiles, tw, th, cols) {
    const left = Math.floor(this.x / tw);
    const right = Math.floor((this.x + this.w - 1) / tw);
    const top = Math.floor(this.y / th);
    const bot = Math.floor((this.y + this.h - 1) / th);

    for (let r = top; r <= bot; r++) {
      for (let c = left; c <= right; c++) {
        if (this._solid(tiles, r, c, cols)) {
          if (this.vy > 0) {
            this.y = r * th - this.h;
            this.grounded = true;
          } else if (this.vy < 0) {
            this.y = (r + 1) * th;
          }
          this.vy = 0;
        }
      }
    }
  }

  _solid(tiles, r, c, cols) {
    if (r < 0 || c < 0 || c >= cols) return false;
    if (r >= tiles.length / cols) return false;
    const t = tiles[r * cols + c];
    return t === 1 || t === 2 || t === 5;
  }
}

export { GRAVITY, TILE };
