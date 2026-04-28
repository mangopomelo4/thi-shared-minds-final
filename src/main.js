import { SceneManager } from './engine/SceneManager.js';
import { InputManager } from './engine/InputManager.js';
import { AudioManager } from './engine/AudioManager.js';
import { SplashScene } from './scenes/SplashScene.js';
import { LobbyScene } from './scenes/LobbyScene.js';
import { IntroScene } from './scenes/IntroScene.js';
import { ChapterScene } from './scenes/ChapterScene.js';
import { OutroScene } from './scenes/OutroScene.js';

const canvas = document.getElementById('game-canvas');
const overlay = document.getElementById('ui-overlay');
const sceneManager = new SceneManager(canvas, overlay);
const audio = new AudioManager();
sceneManager.audio = audio;

const input = new InputManager(canvas, sceneManager);

sceneManager.register('splash', new SplashScene());
sceneManager.register('lobby', new LobbyScene());
sceneManager.register('intro', new IntroScene());
sceneManager.register('chapter', new ChapterScene());
sceneManager.register('outro', new OutroScene());

sceneManager.switchTo('splash');
sceneManager.start();
