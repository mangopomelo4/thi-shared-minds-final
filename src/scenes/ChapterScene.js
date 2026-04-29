import { network } from '../network/client.js';
import { Events } from '../network/events.js';

const FONT_UI = "'JetBrains Mono', monospace";
const FONT_NARRATIVE = "'JetBrains Mono', monospace";

const CHAPTER_CONFIGS = {
  1: {
    instruction: {
      room: "> ANALYZE SCRAMBLED DATA",
      terminal: "> TYPE TO REVEAL. WRONG KEYS DISTORT."
    },
    narrative: ["we are disconnected", "find the words"],
    initState: () => ({
      target: "AWAKEN",
      typed: "",
      noise: 1.0
    })
  },
  2: {
    instruction: {
      room: "> DIRECT THEIR HAND. YOU CAN SEE THE NODES.",
      terminal: "> USE [W/A/S/D] TO MOVE, [SPACE] TO CONNECT. YOU ARE BLIND."
    },
    narrative: ["form the structure", "trust my vision"],
    initState: () => ({
      dots: [
        {x: 0, y: -100}, {x: 100, y: 0}, {x: 0, y: 100}, {x: -100, y: 0}
      ],
      connections: [],
      targetConnections: [[0,1], [1,2], [2,3], [3,0]],
      termX: 0, termY: 0,
      activeStart: -1
    })
  },
  3: {
    instruction: {
      room: "> INITIATE MOVEMENT [SPACE]",
      terminal: "> USE CURSOR AS A PHYSICAL BARRIER"
    },
    narrative: ["the blocks are drifting", "guide them into place"],
    initState: () => ({
      blockX: -200, blockY: 0,
      targetX: 0, targetY: 0,
      moving: false,
      termCursorX: 200, termCursorY: 0,
      termLoaded: false
    })
  },
  4: {
    instruction: {
      room: "> DICTATE THE ARCHITECTURE",
      terminal: "> TYPE TO BUILD. BACKSPACE TO DESTROY."
    },
    narrative: ["build what i see", "erase the errors"],
    initState: () => ({
      targetSentence: "RECONSTRUCT",
      typed: ""
    })
  },
  5: {
    instruction: {
      room: "> MONITOR STABILITY",
      terminal: "> HOLD [SPACE] TO STABILIZE. TAP [ENTER] TO ADVANCE."
    },
    narrative: ["the core is fluctuating", "find the rhythm"],
    initState: () => ({
      stability: 0, // 0 = unstable, 1 = stable
      progress: 0,
      isHolding: false
    })
  },
  6: {
    instruction: "> HOLD STEADY",
    narrative: ["we are almost one", "hold steady"],
    initState: () => ({
      roomX: -150, roomY: 0,
      termX: 150, termY: 0,
      termLocked: false,
      alignTimer: 0,
      termLoaded: false,
      roomLoaded: true
    })
  },
  7: {
    instruction: "",
    narrative: [],
    initState: () => ({
      phase: 0,
      timer: 0
    })
  }
};

export class ChapterScene {
  init(data) {
    this.chapter = data?.chapter || 1;
    this.role = data?.role || 'room';
    
    const config = CHAPTER_CONFIGS[this.chapter];
    if (typeof config.instruction === 'object') {
      this.instruction = config.instruction[this.role] || "";
    } else {
      this.instruction = config.instruction;
    }
    this.narrative = config.narrative;
    this.state = config.initState();
    this.keys = {};
    
    this.alpha = 0;
    this.exitFade = 0;
    this.time = 0;
    this.narrativeTimer = 0;
    this.narrativeIndex = 0;
    this.narrativeAlpha = 0;
    this.completed = false;
    this.cyberDeco = [];

    network.on(Events.SYNC_STATE, this.onSyncState.bind(this));
    network.on(Events.CHAPTER_COMPLETE, this.onChapterComplete.bind(this));

    if (this.manager.audio) {
      this.manager.audio.init();
    }
  }

  onSyncState(data) {
    if (data.chapter === this.chapter) {
      this.state = { ...this.state, ...data.state };
    }
  }

  onChapterComplete(data) {
    if (data.chapter === this.chapter && !this.completed) {
      this.completed = true;
      this.exitFade = 0.01;
      if (this.manager.audio) this.manager.audio.solve();
    }
  }

  sync() {
    network.syncState({ chapter: this.chapter, state: this.state });
  }

  complete() {
    if (!this.completed) {
      this.completed = true;
      this.exitFade = 0.01;
      network.chapterComplete({ chapter: this.chapter });
      if (this.manager.audio) this.manager.audio.solve();
    }
  }

  setupML5() {
    if (this.ml5Setup) return;
    this.ml5Setup = true;
    const video = document.createElement('video');
    video.width = 320; video.height = 240;
    video.style.display = 'none';
    document.body.appendChild(video);
    this.videoElement = video;

    navigator.mediaDevices.getUserMedia({ video: true }).then(stream => {
      video.srcObject = stream;
      video.play();
      if (window.ml5) {
        this.handpose = window.ml5.handpose(video, () => {
          if (this.chapter === 6 && this.role === 'terminal') {
            this.state.termLoaded = true;
            this.sync();
          }
        });
        this.handpose.on('predict', results => {
          if (results.length > 0 && !this.completed) {
            const index = results[0].annotations.indexFinger[3];
            const thumb = results[0].annotations.thumb[3];
            const targetX = ((320 - index[0]) / 320 - 0.5) * 800; 
            const targetY = (index[1] / 240 - 0.5) * 600;
            const pinchDist = Math.hypot(index[0]-thumb[0], index[1]-thumb[1]);

            if (this.chapter === 6 && this.role === 'terminal') {
              if (pinchDist > 30) {
                this.state.termX += (targetX - this.state.termX) * 0.3;
                this.state.termY += (targetY - this.state.termY) * 0.3;
                this.state.termLocked = false;
              } else {
                this.state.termLocked = true;
              }
              this.sync();
            }
          }
        });
      }
    }).catch(e => {
      console.warn("Webcam access denied, fallback active");
    });
  }

  update(dt) {
    this.time += dt;
    if (this.alpha < 1) this.alpha = Math.min(1, this.alpha + dt * 0.8);

    if (Math.random() < 0.1) {
      this.cyberDeco = Array(5).fill(0).map(() => `0x${Math.floor(Math.random() * 0xFFFF).toString(16).toUpperCase().padStart(4, '0')}`);
    }

    if (this.chapter === 1 && !this.completed && this.role === 'room') {
      this.state.noise = Math.max(0, this.state.noise - dt * 2.0);
      if (this.state.typed === this.state.target && this.state.noise === 0) this.complete();
      this.sync();
    }

    if (this.chapter === 2 && !this.completed && this.role === 'room') {
      if (this.state.connections.length === this.state.targetConnections.length) this.complete();
    }

    if (this.chapter === 3 && !this.completed && this.role === 'room') {
      if (this.state.moving) {
        this.state.blockX += dt * 150;
        const dx = this.state.blockX - this.state.termCursorX;
        const dy = this.state.blockY - this.state.termCursorY;
        if (Math.hypot(dx, dy) < 40) {
          this.state.moving = false;
          if (Math.abs(this.state.blockX - this.state.targetX) < 10) this.complete();
          else { this.state.blockX = -200; if(this.manager.audio) this.manager.audio.error(); }
        } else if (this.state.blockX > 300) {
          this.state.moving = false;
          this.state.blockX = -200;
        }
        this.sync();
      }
    }

    if (this.chapter === 4 && !this.completed && this.role === 'room') {
      if (this.state.typed === this.state.targetSentence) this.complete();
    }

    if (this.chapter === 5 && !this.completed && this.role === 'room') {
      if (this.state.isHolding) {
        this.state.stability = Math.min(1.0, this.state.stability + dt * 0.5);
        this.state.progress = Math.max(0, this.state.progress - dt * 0.1);
      } else {
        this.state.stability = Math.max(0, this.state.stability - dt * 1.0);
      }
      if (this.state.progress >= 1.0 && this.state.stability > 0.8) this.complete();
      this.sync();
    }

    if (this.chapter === 6 && !this.completed) {
      this.setupML5();
      if (this.role === 'room' && this.state.termLoaded) {
        const dx = this.state.roomX - this.state.termX;
        const dy = this.state.roomY - this.state.termY;
        if (Math.hypot(dx, dy) < 20 && this.state.termLocked) {
          this.state.alignTimer += dt;
          if (this.state.alignTimer > 3.0) this.complete();
        } else {
          this.state.alignTimer = 0;
        }
        this.sync();
      }
    }

    if (this.chapter === 7 && !this.completed) {
      this.state.timer += dt;
      if (this.state.timer > 15) this.complete();
    }

    // Narrative timing
    if (this.narrativeTimer < 6) {
      this.narrativeTimer += dt;
      this.narrativeAlpha = Math.min(1, this.narrativeTimer * 1.5);
    } else if (this.narrativeIndex < this.narrative.length - 1) {
      this.narrativeIndex++;
      this.narrativeTimer = 0;
      this.narrativeAlpha = 0;
    }

    if (this.exitFade > 0) {
      this.exitFade += dt * 0.5;
      if (this.exitFade >= 1) {
        if (this.chapter < 7) {
          this.manager.switchTo('chapter', { chapter: this.chapter + 1, role: this.role });
        } else {
          this.manager.switchTo('outro');
        }
      }
    }
  }

  draw(ctx) {
    const w = this.width, h = this.height;

    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.globalAlpha = this.alpha;

    ctx.strokeStyle = 'rgba(255,255,255,0.02)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x < w; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y < h; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

    if (this.cyberDeco && this.cyberDeco.length > 0) {
      ctx.globalAlpha = 0.15;
      ctx.textAlign = 'left';
      ctx.font = `10px 'JetBrains Mono', monospace`;
      ctx.fillStyle = '#fff';
      this.cyberDeco.forEach((str, i) => {
        ctx.fillText(str, 15, h - 25 - i * 16);
      });
      ctx.textAlign = 'right';
      this.cyberDeco.forEach((str, i) => {
        ctx.fillText(str, w - 15, h - 25 - i * 16);
      });
    }

    ctx.globalAlpha = 0.9;
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.font = `300 0.9rem 'JetBrains Mono', monospace`;
    ctx.fillStyle = '#eee';
    const dispInst = this.instruction.startsWith('>') ? this.instruction.toUpperCase() : `> ${this.instruction.toUpperCase()}`;
    ctx.fillText(dispInst, 20, 20);

    ctx.textAlign = 'right';
    ctx.font = `300 0.8rem 'JetBrains Mono', monospace`;
    ctx.fillStyle = '#666';
    ctx.fillText(`[ SEQ_${this.chapter.toString().padStart(2, '0')} // ACTV ]`, w - 20, 20);
    
    ctx.textAlign = 'left';
    ctx.font = `300 0.65rem 'JetBrains Mono', monospace`;
    ctx.fillStyle = '#444';
    ctx.fillText(`[ ADMIN_OVRD : SHIFT + 1-8 TO JUMP ]`, 20, h - 25);
    ctx.globalAlpha = 1;

    if (this.narrative.length > 0 && this.narrativeIndex < this.narrative.length) {
      ctx.globalAlpha = this.narrativeAlpha * 0.8;
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.font = `italic 1.2rem ${FONT_NARRATIVE}`;
      ctx.fillStyle = '#bbb';
      ctx.fillText(this.narrative[this.narrativeIndex], w / 2, h - 30);
      ctx.globalAlpha = 1;
    }

    ctx.translate(w / 2, h / 2);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (this.chapter === 1) this.drawChapter1(ctx);
    if (this.chapter === 2) this.drawChapter2(ctx);
    if (this.chapter === 3) this.drawChapter3(ctx);
    if (this.chapter === 4) this.drawChapter4(ctx);
    if (this.chapter === 5) this.drawChapter5(ctx);
    if (this.chapter === 6) this.drawChapter6(ctx);
    if (this.chapter === 7) this.drawChapter7(ctx);

    ctx.restore();

    if (this.exitFade > 0) {
      ctx.globalAlpha = Math.min(1, this.exitFade);
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, w, h);
    }
  }

  drawChapter1(ctx) {
    if (this.role === 'room') {
      ctx.font = `300 2rem 'JetBrains Mono', monospace`;
      let disp = "";
      for (let i = 0; i < this.state.target.length; i++) {
        if (i < this.state.typed.length) {
          disp += this.state.target[i];
        } else {
          if (this.state.noise > 0 || Math.random() < 0.1) {
            disp += String.fromCharCode(65 + Math.floor(Math.random() * 26));
          } else {
            disp += '_';
          }
        }
      }
      ctx.fillStyle = this.state.noise > 0 ? '#f55' : '#fff';
      if (this.state.noise > 0) {
        ctx.translate((Math.random()-0.5)*10, (Math.random()-0.5)*10);
      }
      ctx.fillText(disp, 0, 0);
    } else {
      ctx.font = `300 2rem 'JetBrains Mono', monospace`;
      ctx.fillStyle = '#888';
      ctx.fillText(`> ${this.state.typed}_`, 0, 0);
    }
  }

  drawChapter2(ctx) {
    if (this.role === 'room') {
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1;
      this.state.targetConnections.forEach(c => {
        const d1 = this.state.dots[c[0]], d2 = this.state.dots[c[1]];
        ctx.beginPath(); ctx.moveTo(d1.x, d1.y); ctx.lineTo(d2.x, d2.y); ctx.stroke();
      });
      this.state.dots.forEach((d, i) => {
        ctx.fillStyle = '#888';
        ctx.beginPath(); ctx.arc(d.x, d.y, 10, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#222';
        ctx.font = `10px monospace`;
        ctx.fillText(i.toString(), d.x, d.y + 4);
      });
    }

    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    this.state.connections.forEach(c => {
      const d1 = this.state.dots[c[0]], d2 = this.state.dots[c[1]];
      ctx.beginPath(); ctx.moveTo(d1.x, d1.y); ctx.lineTo(d2.x, d2.y); ctx.stroke();
    });

    if (this.state.isDragging && this.state.activeStart !== -1) {
      const start = this.state.dots[this.state.activeStart];
      ctx.beginPath(); ctx.moveTo(start.x, start.y); ctx.lineTo(this.state.termX, this.state.termY); ctx.stroke();
    }

    if (this.role === 'terminal') {
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(this.state.termX, this.state.termY, 5, 0, Math.PI*2); ctx.fill();
    }
  }

  drawChapter3(ctx) {
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 2;
    ctx.strokeRect(this.state.targetX - 25, -25, 50, 50);

    ctx.fillStyle = '#fff';
    ctx.fillRect(this.state.blockX - 10, this.state.blockY - 10, 20, 20);

    if (this.role === 'terminal' || this.state.termLoaded) {
      ctx.fillStyle = '#888';
      ctx.fillRect(this.state.termCursorX - 5, this.state.termCursorY - 50, 10, 100);
    }
  }

  drawChapter4(ctx) {
    if (this.role === 'room') {
      ctx.font = `300 2rem 'JetBrains Mono', monospace`;
      ctx.fillStyle = '#fff';
      ctx.fillText(this.state.targetSentence, 0, -50);
    }
    
    const blockWidth = 20;
    const startX = -(this.state.typed.length * blockWidth) / 2;
    for (let i = 0; i < this.state.typed.length; i++) {
      ctx.fillStyle = this.state.typed[i] === this.state.targetSentence[i] ? '#fff' : '#f00';
      ctx.fillRect(startX + i * blockWidth, 20, blockWidth - 2, 40);
    }
    if (this.role === 'terminal') {
      ctx.font = `300 1rem 'JetBrains Mono', monospace`;
      ctx.fillStyle = '#666';
      ctx.fillText(`> ${this.state.typed}_`, 0, 100);
    }
  }

  drawChapter5(ctx) {
    const r = 50 + this.state.progress * 100;
    
    const noise = (1 - this.state.stability) * 20;
    const currentR = r + (Math.random() - 0.5) * noise;

    ctx.strokeStyle = this.state.stability > 0.8 ? '#0f0' : '#fff';
    ctx.lineWidth = 2 + this.state.stability * 3;
    
    ctx.beginPath();
    ctx.arc(0, 0, currentR, 0, Math.PI * 2);
    ctx.stroke();

    if (this.role === 'terminal') {
      ctx.fillStyle = '#444';
      ctx.fillRect(-100, 180, 200, 10);
      ctx.fillStyle = '#fff';
      ctx.fillRect(-100, 180, this.state.stability * 200, 10);
      ctx.font = `300 1rem 'JetBrains Mono', monospace`;
      ctx.fillText('STABILITY', 0, 210);
    }
  }

  drawChapter6(ctx) {
    if ((this.role === 'room' && !this.state.roomLoaded) || (this.role === 'terminal' && !this.state.termLoaded)) {
      ctx.font = `200 0.9rem 'JetBrains Mono', monospace`;
      ctx.fillStyle = '#888';
      ctx.fillText("calibrating ML5 hand tracking...", 0, -150);
    }

    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.state.roomX, this.state.roomY, 20, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = this.state.termLocked ? '#fff' : '#888';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(this.state.termX, this.state.termY, 25, 0, Math.PI * 2);
    ctx.stroke();

    if (this.state.alignTimer > 0) {
      ctx.fillStyle = `rgba(255, 255, 255, ${this.state.alignTimer / 3})`;
      ctx.beginPath();
      ctx.arc((this.state.roomX + this.state.termX)/2, (this.state.roomY + this.state.termY)/2, 30 + this.state.alignTimer * 10, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawChapter7(ctx) {
    const p = Math.min(1, this.state.timer / 15);
    
    ctx.fillStyle = `rgba(255, 255, 255, ${p})`;
    ctx.beginPath();
    ctx.arc(0, 0, 100 + p * 500, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `rgba(0, 0, 0, ${p > 0.8 ? 1 : p * 1.5})`;
    ctx.font = `300 2rem 'JetBrains Mono', monospace`;
    
    if (this.state.timer > 2 && this.state.timer < 5) ctx.fillText("process complete", 0, 0);
    else if (this.state.timer > 6 && this.state.timer < 9) ctx.fillText("corruption resolved", 0, 0);
    else if (this.state.timer > 10 && this.state.timer < 13) ctx.fillText("thank you", 0, 0);
    else if (this.state.timer >= 14) ctx.fillText("the system continues", 0, 0);
  }

  onKeyDown(key, e) {
    this.keys[key] = true;
    if (e && e.shiftKey && e.code && e.code.startsWith('Digit')) {
      const targetChapter = parseInt(e.code.replace('Digit', ''), 10);
      if (targetChapter >= 1 && targetChapter <= 7) {
        this.manager.switchTo('chapter', { chapter: targetChapter, role: this.role });
        return;
      }
    }
    if (this.completed) return;
    if (this.manager.audio) this.manager.audio.init();

    let updated = false;

    if (this.chapter === 1 && this.role === 'terminal') {
      if (key.length === 1 && key.match(/[a-zA-Z0-9 ]/)) {
        const nextChar = this.state.target[this.state.typed.length];
        if (key.toUpperCase() === nextChar) {
          this.state.typed += key.toUpperCase();
          if (this.manager.audio) this.manager.audio.click();
        } else {
          this.state.typed = "";
          this.state.noise = 1.0;
          if (this.manager.audio) this.manager.audio.error();
        }
        updated = true;
      }
    }

    if (this.chapter === 2) {
      if (this.role === 'terminal' && (key === ' ' || key === 'Enter')) {
        let closest = -1; let minDist = Infinity;
        this.state.dots.forEach((d, i) => {
          const dist = Math.hypot(d.x - this.state.termX, d.y - this.state.termY);
          if (dist < 40 && dist < minDist) { minDist = dist; closest = i; }
        });
        if (closest !== -1) {
          this.state.isDragging = true;
          this.state.activeStart = closest;
          if (this.manager.audio) this.manager.audio.click();
          updated = true;
        }
      }
    }

    if (this.chapter === 3 && this.role === 'room') {
      if (key === ' ' || key === 'Enter') {
        this.state.moving = true;
        updated = true;
      }
    }

    if (this.chapter === 4 && this.role === 'terminal') {
      if (key === 'Backspace') {
        this.state.typed = this.state.typed.slice(0, -1);
        if (this.manager.audio) this.manager.audio.click();
        updated = true;
      } else if (key.length === 1 && key.match(/[a-zA-Z0-9 ]/)) {
        if (this.state.typed.length < this.state.targetSentence.length) {
          this.state.typed += key.toUpperCase();
          if (this.manager.audio) this.manager.audio.click();
          updated = true;
        }
      }
    }

    if (this.chapter === 5 && this.role === 'terminal') {
      if (key === ' ') {
        this.state.isHolding = true;
        updated = true;
      }
      if (key === 'Enter') {
        this.state.progress = Math.min(1.0, this.state.progress + 0.1);
        if (this.manager.audio) this.manager.audio.click();
        updated = true;
      }
    }

    if (this.chapter === 6 && this.role === 'room') {
      if (key === 'w' || key === 'ArrowUp') { this.state.roomY -= 10; updated = true; }
      if (key === 's' || key === 'ArrowDown') { this.state.roomY += 10; updated = true; }
      if (key === 'a' || key === 'ArrowLeft') { this.state.roomX -= 10; updated = true; }
      if (key === 'd' || key === 'ArrowRight') { this.state.roomX += 10; updated = true; }
    }

    if (updated && !this.completed) this.sync();
  }

  onKeyUp(key, e) {
    this.keys[key] = false;
    if (this.completed) return;
    let updated = false;

    if (this.chapter === 2 && this.role === 'terminal') {
      if (key === ' ' || key === 'Enter') {
        if (this.state.isDragging && this.state.activeStart !== -1) {
          let closest = -1; let minDist = Infinity;
          this.state.dots.forEach((d, i) => {
            const dist = Math.hypot(d.x - this.state.termX, d.y - this.state.termY);
            if (dist < 40 && dist < minDist) { minDist = dist; closest = i; }
          });
          if (closest !== -1 && closest !== this.state.activeStart) {
            const exists = this.state.connections.some(c => (c[0]===this.state.activeStart && c[1]===closest) || (c[1]===this.state.activeStart && c[0]===closest));
            if (!exists) {
              this.state.connections.push([this.state.activeStart, closest]);
              if (this.manager.audio) this.manager.audio.solve();
            }
          }
        }
        this.state.isDragging = false;
        this.state.activeStart = -1;
        updated = true;
      }
    }

    if (this.chapter === 5 && this.role === 'terminal') {
      if (key === ' ') {
        this.state.isHolding = false;
        updated = true;
      }
    }

    if (updated && !this.completed) this.sync();
  }

  onMouseMove(x, y) {
    if (this.completed) return;
    const cx = x - this.width / 2;
    const cy = y - this.height / 2;

    if (this.chapter === 2 && this.role === 'terminal') {
      this.state.termX = cx;
      this.state.termY = cy;
      this.sync();
    }
    if (this.chapter === 3 && this.role === 'terminal') {
      this.state.termCursorX = cx;
      this.state.termCursorY = cy;
      this.state.termLoaded = true;
      this.sync();
    }
  }

  destroy() {
    network.offAll();
    if (this.handpose) {
      this.handpose = null;
    }
    if (this.videoElement) {
      this.videoElement.pause();
      this.videoElement.srcObject?.getTracks().forEach(track => track.stop());
      this.videoElement.remove();
      this.videoElement = null;
    }
  }
}
