/**
 * SceneManager — Manages scene lifecycle, transitions, and the game loop.
 * Supports opacity fade transitions between scenes.
 */
export class SceneManager {
  constructor(canvas, overlay) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.overlay = overlay;
    this.scenes = {};
    this.activeScene = null;
    this.activeSceneName = null;
    this.transitioning = false;
    this.fadeAlpha = 0;
    this.fadeDuration = 1500; // ms
    this.fadeTimer = 0;
    this.fadeDirection = 'none'; // 'in', 'out', 'none'
    this.pendingScene = null;
    this.lastTime = 0;

    // Resize handling
    this._resize();
    window.addEventListener('resize', () => this._resize());
  }

  _resize() {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.width = window.innerWidth;
    this.height = window.innerHeight;
  }

  /** Register a scene by name */
  register(name, scene) {
    this.scenes[name] = scene;
    scene.manager = this;
    scene.ctx = this.ctx;
    scene.overlay = this.overlay;
    scene.width = this.width;
    scene.height = this.height;
  }

  /** Switch to a scene with a fade transition */
  switchTo(name, data = {}) {
    if (this.transitioning) return;
    if (!this.scenes[name]) {
      console.error(`Scene "${name}" not found`);
      return;
    }

    if (!this.activeScene) {
      // First scene — no transition
      this._activateScene(name, data);
      return;
    }

    // Start fade out
    this.transitioning = true;
    this.pendingScene = { name, data };
    this.fadeDirection = 'out';
    this.fadeTimer = 0;
    this.fadeAlpha = 0;
  }

  /** Activate a scene immediately */
  _activateScene(name, data) {
    if (this.activeScene && this.activeScene.destroy) {
      this.activeScene.destroy();
    }
    this.overlay.innerHTML = '';
    this.activeScene = this.scenes[name];
    this.activeSceneName = name;
    this.activeScene.width = this.width;
    this.activeScene.height = this.height;
    if (this.activeScene.init) {
      this.activeScene.init(data);
    }
  }

  /** Start the game loop */
  start() {
    this.lastTime = performance.now();
    this._loop();
  }

  _loop() {
    const now = performance.now();
    const dt = (now - this.lastTime) / 1000; // seconds
    this.lastTime = now;

    // Update
    this._update(dt);

    // Draw
    this._draw();

    requestAnimationFrame(() => this._loop());
  }

  _update(dt) {
    // Handle fade transitions
    if (this.fadeDirection === 'out') {
      this.fadeTimer += dt * 1000;
      this.fadeAlpha = Math.min(1, this.fadeTimer / (this.fadeDuration / 2));
      if (this.fadeAlpha >= 1) {
        // Fully black — switch scene
        this._activateScene(this.pendingScene.name, this.pendingScene.data);
        this.fadeDirection = 'in';
        this.fadeTimer = 0;
        this.pendingScene = null;
      }
    } else if (this.fadeDirection === 'in') {
      this.fadeTimer += dt * 1000;
      this.fadeAlpha = Math.max(0, 1 - this.fadeTimer / (this.fadeDuration / 2));
      if (this.fadeAlpha <= 0) {
        this.fadeDirection = 'none';
        this.transitioning = false;
      }
    }

    if (this.activeScene && this.activeScene.update) {
      this.activeScene.update(dt);
    }
  }

  _draw() {
    const ctx = this.ctx;

    // Clear
    ctx.clearRect(0, 0, this.width, this.height);

    // Draw active scene
    if (this.activeScene && this.activeScene.draw) {
      this.activeScene.draw(ctx);
    }

    // Draw fade overlay
    if (this.fadeAlpha > 0) {
      ctx.save();
      ctx.globalAlpha = this.fadeAlpha;
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.restore();
    }
  }
}
