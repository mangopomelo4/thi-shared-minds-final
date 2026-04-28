/**
 * InputManager — Keyboard and mouse input abstraction.
 * Delegates events to the active scene.
 */
export class InputManager {
  constructor(canvas, sceneManager) {
    this.canvas = canvas;
    this.sceneManager = sceneManager;
    this.keys = {};
    this.mouse = { x: 0, y: 0, down: false };

    // Keyboard
    window.addEventListener('keydown', (e) => this._onKeyDown(e));
    window.addEventListener('keyup', (e) => this._onKeyUp(e));

    // Mouse
    canvas.addEventListener('mousemove', (e) => this._onMouseMove(e));
    canvas.addEventListener('click', (e) => this._onClick(e));
    canvas.addEventListener('mousedown', (e) => { this.mouse.down = true; });
    canvas.addEventListener('mouseup', (e) => { this.mouse.down = false; });
  }

  _getScene() {
    return this.sceneManager.activeScene;
  }

  _onKeyDown(e) {
    if (this.keys[e.key]) return; // prevent repeat
    this.keys[e.key] = true;
    const scene = this._getScene();
    if (scene && scene.onKeyDown) {
      scene.onKeyDown(e.key, e);
    }
  }

  _onKeyUp(e) {
    this.keys[e.key] = false;
    const scene = this._getScene();
    if (scene && scene.onKeyUp) {
      scene.onKeyUp(e.key, e);
    }
  }

  _onMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = e.clientX - rect.left;
    this.mouse.y = e.clientY - rect.top;
    const scene = this._getScene();
    if (scene && scene.onMouseMove) {
      scene.onMouseMove(this.mouse.x, this.mouse.y);
    }
  }

  _onClick(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const scene = this._getScene();
    if (scene && scene.onClick) {
      scene.onClick(x, y);
    }
  }

  /** Check if a key is currently pressed */
  isDown(key) {
    return !!this.keys[key];
  }
}
