/**
 * GameScene — Side-scrolling cooperative platformer.
 * UI text draws direct to canvas (clean). Tiles draw via buffer.
 * Palace = grayscale, Controller = subtle green.
 */
import { network } from '../network/client.js';
import { Events } from '../network/events.js';
import { PixelRenderer, INTERNAL_W, INTERNAL_H, TILE } from '../engine/PixelRenderer.js';
import { Body } from '../engine/Physics.js';
import { LEVELS } from '../levels/LevelData.js';

const MOVE_SPEED = 200;
const JUMP_VEL = -420;
const PLAYER_W = 24;
const PLAYER_H = 28;
const FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif";

export class GameScene {
  init(data) {
    this.levelIndex = (data?.level || 1) - 1;
    this.level = LEVELS[this.levelIndex];
    this.tiles = [...this.level.tiles];
    this.role = data?.role || network.role || 'room';
    this.skin = this.role === 'room' ? 'palace' : 'digital';
    this.otherSkin = this.role === 'room' ? 'digital' : 'palace';

    this.px = new PixelRenderer();

    this.player = new Body(this.level.spawnX * 2, this.level.spawnY * 2, PLAYER_W, PLAYER_H);
    this.input = { left: false, right: false, jump: false };

    this.other = { x: this.level.spawnX * 2 + 48, y: this.level.spawnY * 2, w: PLAYER_W, h: PLAYER_H };

    this.camX = 0;
    this.camY = 0;
    this.alpha = 0;
    this.time = 0;
    this.narrativeIndex = 0;
    this.narrativeAlpha = 0;
    this.narrativeTimer = 0;
    this.completed = false;
    this.exitFade = 0;
    this.placedBlocks = [];
    this.blinkPhase = 0;
    this.invertControls = this.levelIndex === 3 && this.role === 'room';
    this._syncTimer = 0;

    this._setupNetwork();
  }

  _setupNetwork() {
    network.off(Events.PLAYER_MOVE);
    network.off(Events.BLOCK_PLACED);
    network.off(Events.LEVEL_COMPLETE);

    network.on(Events.PLAYER_MOVE, (data) => {
      if (data.playerId !== network.playerId) {
        this.other.x = data.x;
        this.other.y = data.y;
      }
    });

    network.on(Events.BLOCK_PLACED, (data) => {
      this._placeBlock(data.col, data.row, false);
    });

    network.on(Events.LEVEL_COMPLETE, () => {
      if (!this.completed) {
        this.completed = true;
        this.exitFade = 0.01;
      }
    });
  }

  update(dt) {
    this.time += dt;
    if (this.alpha < 1) this.alpha = Math.min(1, this.alpha + dt * 0.8);

    // Narrative
    if (this.narrativeTimer < 5) {
      this.narrativeTimer += dt;
      this.narrativeAlpha = Math.min(1, this.narrativeTimer * 1.5);
    } else if (this.narrativeIndex < this.level.narrative.length - 1) {
      this.narrativeIndex++;
      this.narrativeTimer = 0;
      this.narrativeAlpha = 0;
    }

    // Exit
    if (this.exitFade > 0) {
      this.exitFade += dt * 0.4;
      if (this.exitFade >= 1) {
        if (this.levelIndex < LEVELS.length - 1) {
          this.manager.switchTo('game', { level: this.levelIndex + 2, role: this.role });
        } else {
          this.manager.switchTo('outro');
        }
      }
      return;
    }

    // Movement (both players can move)
    let moveX = 0;
    if (this.input.left) moveX = this.invertControls ? 1 : -1;
    if (this.input.right) moveX = this.invertControls ? -1 : 1;
    this.player.vx = moveX * MOVE_SPEED;

    if (this.input.jump && this.player.grounded) {
      this.player.vy = JUMP_VEL;
      this.input.jump = false;
    }

    this.player.update(dt, this.tiles, TILE, TILE, this.level.cols);

    if (this.player.x < 0) this.player.x = 0;
    if (this.player.y > this.level.rows * TILE) {
      this.player.x = this.level.spawnX * 2;
      this.player.y = this.level.spawnY * 2;
      this.player.vx = 0;
      this.player.vy = 0;
    }

    // Camera
    const targetCamX = this.player.x - INTERNAL_W / 2 + PLAYER_W / 2;
    this.camX += (targetCamX - this.camX) * dt * 4;
    this.camX = Math.max(0, Math.min(this.camX, this.level.cols * TILE - INTERNAL_W));
    this.camY = 0;

    // Blink
    if (this.level.blinkPattern.length > 0) {
      this.blinkPhase = Math.floor(this.time * 2) % this.level.blinkPattern.length;
    }

    this._checkExit();
    this._syncPosition(dt);
  }

  _checkExit() {
    const pr = Math.floor((this.player.y + PLAYER_H / 2) / TILE);
    const pc = Math.floor((this.player.x + PLAYER_W / 2) / TILE);
    if (pr >= 0 && pr < this.level.rows && pc >= 0 && pc < this.level.cols) {
      if (this.tiles[pr * this.level.cols + pc] === 9) {
        this.completed = true;
        this.exitFade = 0.01;
        if (network.socket) {
          network.socket.emit(Events.LEVEL_COMPLETE, { level: this.levelIndex + 1 });
        }
      }
    }
  }

  _syncPosition(dt) {
    this._syncTimer += dt;
    if (this._syncTimer > 0.033 && network.socket) { // ~30fps sync
      this._syncTimer = 0;
      network.socket.emit(Events.PLAYER_MOVE, {
        playerId: network.playerId,
        x: this.player.x,
        y: this.player.y,
      });
    }
  }

  _placeBlock(col, row, broadcast = true) {
    if (col < 0 || row < 0 || col >= this.level.cols || row >= this.level.rows) return;
    const idx = row * this.level.cols + col;
    if (this.tiles[idx] === 3 || this.tiles[idx] === 0) {
      this.tiles[idx] = 1;
      this.placedBlocks.push({ col, row });
      if (broadcast && network.socket) {
        network.socket.emit(Events.BLOCK_PLACED, { col, row });
      }
    }
  }

  draw(ctx) {
    const w = this.width, h = this.height;
    const px = this.px;

    // Draw world to buffer
    px.drawBackground(this.time, this.skin);
    this._drawTiles(px);
    px.drawPlayerCube(this.other.x, this.other.y, this.other.w, this.other.h, this.otherSkin, this.camX, this.camY);
    px.drawPlayerCube(this.player.x, this.player.y, PLAYER_W, PLAYER_H, this.skin, this.camX, this.camY);

    // Present world buffer
    ctx.save();
    ctx.globalAlpha = this.alpha;
    px.present(ctx, w, h);

    // Draw UI text DIRECTLY to main canvas (clean, full-res)
    this._drawUI(ctx, w, h);

    // Exit fade
    if (this.exitFade > 0) {
      ctx.globalAlpha = Math.min(1, this.exitFade);
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, w, h);
    }
    ctx.restore();
  }

  _drawTiles(px) {
    const startC = Math.max(0, Math.floor(this.camX / TILE));
    const endC = Math.min(this.level.cols, Math.ceil((this.camX + INTERNAL_W) / TILE) + 1);

    for (let r = 0; r < this.level.rows; r++) {
      for (let c = startC; c < endC; c++) {
        const tile = this.tiles[r * this.level.cols + c];
        if (tile === 0) continue;

        if (tile === 1) {
          if (this.skin === 'palace') {
            px.drawDetailedTile(c, r, '#3a3a3a', '#4a4a4a', 'stone', this.camX, this.camY);
          } else {
            px.drawDetailedTile(c, r, '#1a2e22', '#2a3e32', 'digital', this.camX, this.camY);
          }
        } else if (tile === 2) {
          if (this.skin === 'palace') {
            px.drawDetailedTile(c, r, '#282828', '#333333', 'stone', this.camX, this.camY);
          } else {
            px.drawDetailedTile(c, r, '#141e18', '#1c2820', 'digital', this.camX, this.camY);
          }
        } else if (tile === 3) {
          const x = Math.round(c * TILE - this.camX);
          const y = Math.round(r * TILE - this.camY);
          const gc = px.ctx;
          gc.strokeStyle = this.skin === 'palace' ? 'rgba(200,200,200,0.12)' : 'rgba(80,180,100,0.12)';
          gc.lineWidth = 1;
          gc.setLineDash([4, 4]);
          gc.strokeRect(x + 1, y + 1, TILE - 2, TILE - 2);
          gc.setLineDash([]);
        } else if (tile === 5) {
          const show = this.level.blinkPattern.length > 0
            ? this.level.blinkPattern[this.blinkPhase] : 1;
          if (show) {
            if (this.skin === 'palace') {
              px.drawDetailedTile(c, r, '#444444', '#555555', 'stone', this.camX, this.camY);
            } else {
              px.drawDetailedTile(c, r, '#1a4030', '#2a5040', 'digital', this.camX, this.camY);
            }
          }
        } else if (tile === 9) {
          const x = Math.round(c * TILE - this.camX);
          const y = Math.round(r * TILE - this.camY);
          const pulse = 0.2 + Math.sin(this.time * 2) * 0.1;
          const gc = px.ctx;
          gc.fillStyle = this.skin === 'palace'
            ? `rgba(220,220,220,${pulse})`
            : `rgba(80,200,110,${pulse})`;
          gc.fillRect(x, y, TILE, TILE);
        }
      }
    }
  }

  _drawUI(ctx, w, h) {
    // Draw directly to main canvas — crisp text

    // Instruction (top-left)
    ctx.globalAlpha = 0.6;
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.font = `100 0.8rem ${FONT}`;
    ctx.fillStyle = '#ccc';
    ctx.fillText(this.level.instruction, 20, 18);
    ctx.globalAlpha = 1;

    // Level indicator (top-right)
    ctx.textAlign = 'right'; ctx.textBaseline = 'top';
    ctx.font = `100 0.7rem ${FONT}`;
    ctx.fillStyle = '#777';
    ctx.fillText(`${this.level.id} / ${LEVELS.length}`, w - 20, 18);

    // Narrative (bottom center)
    if (this.level.narrative.length > 0 && this.narrativeIndex < this.level.narrative.length) {
      ctx.globalAlpha = this.narrativeAlpha * 0.7;
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.font = `100 0.85rem ${FONT}`;
      ctx.fillStyle = '#ccc';
      ctx.fillText(this.level.narrative[this.narrativeIndex], w / 2, h - 28);
      ctx.globalAlpha = 1;
    }
  }

  onKeyDown(key) {
    if (key === 'ArrowLeft' || key === 'a') this.input.left = true;
    if (key === 'ArrowRight' || key === 'd') this.input.right = true;
    if (key === 'ArrowUp' || key === 'w' || key === ' ') this.input.jump = true;
  }

  onKeyUp(key) {
    if (key === 'ArrowLeft' || key === 'a') this.input.left = false;
    if (key === 'ArrowRight' || key === 'd') this.input.right = false;
  }

  onClick(x, y) {
    // Both players can place blocks in level 1
    if (this.levelIndex === 0) {
      const scaleX = INTERNAL_W / this.width;
      const scaleY = INTERNAL_H / this.height;
      const worldX = x * scaleX + this.camX;
      const worldY = y * scaleY + this.camY;
      const col = Math.floor(worldX / TILE);
      const row = Math.floor(worldY / TILE);
      this._placeBlock(col, row, true);
    }
  }

  destroy() {
    network.off(Events.PLAYER_MOVE);
    network.off(Events.BLOCK_PLACED);
    network.off(Events.LEVEL_COMPLETE);
  }
}
