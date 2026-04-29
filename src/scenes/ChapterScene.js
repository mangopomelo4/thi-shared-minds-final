import { network } from '../network/client.js';
import { Events } from '../network/events.js';

const FONT_UI = "'JetBrains Mono', monospace";
const FONT_NARRATIVE = "'JetBrains Mono', monospace";

const CHAPTER_CONFIGS = {
  1: {
    instruction: {
      room: "> HOLD SLIDER AT 50 FOR 3 SECONDS [LEFT/RIGHT ARROWS]",
      terminal: "> MOVING YOUR MOUSE CAUSES JITTER."
    },
    narrative: ["the signal is unstable", "find the balance"],
    initState: () => ({
      slider: 0,
      holdTimer: 0
    })
  },
  2: {
    instruction: "> TOUCH THE MOVING CIRCLE AT THE EXACT SAME TIME. [MOUSE]",
    narrative: ["catch the drift", "we must converge"],
    initState: () => ({
      cx: 0, cy: 0,
      vx: 2, vy: 2,
      roomX: -200, roomY: 0,
      termX: 200, termY: 0
    })
  },
  3: {
    instruction: {
      room: "> ALIGN LETTERS HORIZONTALLY [LEFT/RIGHT ARROWS]",
      terminal: "> ALIGN LETTERS VERTICALLY [MOUSE UP/DOWN]"
    },
    narrative: ["the fragments are scattered", "bring them together"],
    initState: () => ({
      text: "ALIGNMENT",
      roomShiftX: 0,
      termShiftY: 0,
      offsets: [ // Parallax offsets to make them align only at shift=100
        {x: 2, y: -1}, {x: -1.5, y: 2}, {x: 3, y: 0.5},
        {x: -2, y: -2}, {x: 1, y: 1.5}, {x: -3, y: 3},
        {x: 2.5, y: -1.5}, {x: -1, y: 1}, {x: 0.5, y: -2.5}
      ]
    })
  },
  4: {
    instruction: {
      room: "> REPRODUCE THE SHAPE. [CLICK] TO DRAW.",
      terminal: "> PREVENT ERRORS. [CLICK] TO ERASE. (0.5s DELAY)"
    },
    narrative: ["build the structure", "clear the noise"],
    initState: () => ({
      grid: Array(400).fill(false),
      targetGrid: Array(400).fill(false),
      history: [] // For 0.5s delay
    })
  },
  5: {
    instruction: "> PRESS [1-4]. SEQUENCE MUST ALTERNATE (A -> B -> A -> B). CAUTION: SYSTEM MAY SWAP INPUT OWNERSHIP.",
    narrative: ["who is pressing", "who is in control"],
    initState: () => ({
      sequence: [],
      swapped: false,
      swapTimer: 2.0
    })
  },
  6: {
    instruction: {
      room: "> ALIGN CIRCLE WITH SQUARE. [MOUSE]",
      terminal: "> ALIGN SQUARE WITH CIRCLE. [ML5 HAND] PINCH TO LOCK."
    },
    narrative: ["hold steady", "process complete"],
    initState: () => ({
      roomX: -100, roomY: 0,
      termX: 100, termY: 0,
      termLocked: false,
      alignTimer: 0,
      termLoaded: false
    })
  },
  7: {
    instruction: "",
    narrative: [],
    initState: () => ({
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
      if (this.state.slider >= 48 && this.state.slider <= 52) {
        this.state.holdTimer += dt;
        if (this.state.holdTimer >= 3.0) this.complete();
      } else {
        this.state.holdTimer = 0;
      }
      this.sync();
    }

    if (this.chapter === 2 && !this.completed && this.role === 'room') {
      this.state.cx += this.state.vx;
      this.state.cy += this.state.vy;
      
      if (this.state.cx > 300 || this.state.cx < -300) this.state.vx *= -1;
      if (this.state.cy > 200 || this.state.cy < -200) this.state.vy *= -1;

      const dRoom = Math.hypot(this.state.cx - this.state.roomX, this.state.cy - this.state.roomY);
      const dTerm = Math.hypot(this.state.cx - this.state.termX, this.state.cy - this.state.termY);

      if (dRoom < 30 && dTerm < 30) {
        this.complete();
      } else if (dRoom < 30 || dTerm < 30) {
        this.state.vx *= 1.05;
        this.state.vy *= 1.05;
      }
      this.sync();
    }

    if (this.chapter === 3 && !this.completed && this.role === 'room') {
      if (this.state.roomShiftX === 100 && this.state.termShiftY === 100) {
        this.complete();
      }
    }

    if (this.chapter === 4 && !this.completed) {
      if (this.role === 'room') {
        // Build target shape once
        if (!this.targetBuilt) {
          this.targetBuilt = true;
          for(let x=5; x<15; x++) {
            for(let y=5; y<15; y++) {
              if (x===5 || x===14 || y===5 || y===14) this.state.targetGrid[y*20+x] = true;
            }
          }
        }
        
        let match = true;
        for(let i=0; i<400; i++) {
          if (this.state.grid[i] !== this.state.targetGrid[i]) match = false;
        }
        if (match) this.complete();
      }
      
      if (this.role === 'terminal') {
        // Terminal syncs history to delayedGrid
        const now = Date.now();
        while (this.state.history.length > 0 && now - this.state.history[0].time > 500) {
          const action = this.state.history.shift();
          this.state.grid[action.idx] = action.val;
        }
      }
    }

    if (this.chapter === 5 && !this.completed && this.role === 'room') {
      this.state.swapTimer -= dt;
      if (this.state.swapTimer <= 0) {
        this.state.swapped = !this.state.swapped;
        this.state.swapTimer = 1.0 + Math.random() * 2.0;
        this.sync();
      }
      if (this.state.sequence.length >= 8) {
        this.complete();
      }
    }

    if (this.chapter === 6 && !this.completed) {
      this.setupML5();
      if (this.role === 'room' && this.state.termLoaded) {
        const dx = this.state.roomX - this.state.termX;
        const dy = this.state.roomY - this.state.termY;
        if (Math.hypot(dx, dy) < 20 && this.state.termLocked) {
          this.state.alignTimer += dt;
          if (this.state.alignTimer > 2.0) this.complete();
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
    // Slider base
    ctx.fillStyle = '#333';
    ctx.fillRect(-200, -10, 400, 20);
    
    // Target zone
    ctx.fillStyle = 'rgba(0,255,0,0.3)';
    ctx.fillRect(-8, -15, 16, 30);

    // Slider knob
    const knobX = -200 + (this.state.slider / 100) * 400;
    ctx.fillStyle = (this.state.slider >= 48 && this.state.slider <= 52) ? '#0f0' : '#fff';
    ctx.fillRect(knobX - 4, -20, 8, 40);

    ctx.fillStyle = '#fff';
    ctx.font = `300 1.5rem 'JetBrains Mono', monospace`;
    ctx.fillText(Math.floor(this.state.slider), 0, -50);

    if (this.state.holdTimer > 0) {
      ctx.fillStyle = `rgba(255, 255, 255, ${this.state.holdTimer / 3})`;
      ctx.fillRect(-100, 50, 200, 5);
    }
  }

  drawChapter2(ctx) {
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(this.state.cx, this.state.cy, 30, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = this.role === 'room' ? '#0f0' : 'rgba(0,255,0,0.3)';
    ctx.beginPath(); ctx.arc(this.state.roomX, this.state.roomY, 10, 0, Math.PI*2); ctx.fill();

    ctx.fillStyle = this.role === 'terminal' ? '#0cf' : 'rgba(0,204,255,0.3)';
    ctx.beginPath(); ctx.arc(this.state.termX, this.state.termY, 10, 0, Math.PI*2); ctx.fill();
  }

  drawChapter3(ctx) {
    ctx.fillStyle = '#fff';
    ctx.font = `300 2.5rem 'JetBrains Mono', monospace`;
    
    const spacing = 40;
    const startX = -(this.state.text.length * spacing) / 2;
    
    for (let i = 0; i < this.state.text.length; i++) {
      const off = this.state.offsets[i];
      // When roomShiftX = 100, dx = 0.
      const dx = (this.state.roomShiftX - 100) * off.x;
      const dy = (this.state.termShiftY - 100) * off.y;
      
      ctx.fillText(this.state.text[i], startX + i * spacing + dx, dy);
    }
  }

  drawChapter4(ctx) {
    const cs = 15;
    const ox = -150, oy = -150;
    
    if (this.role === 'room') {
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      for (let y = 0; y < 20; y++) {
        for (let x = 0; x < 20; x++) {
          if (this.state.targetGrid[y*20+x]) {
            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            ctx.fillRect(ox + x*cs, oy + y*cs, cs, cs);
          }
        }
      }
    }

    for (let y = 0; y < 20; y++) {
      for (let x = 0; x < 20; x++) {
        ctx.strokeStyle = '#222';
        ctx.strokeRect(ox + x * cs, oy + y * cs, cs, cs);
        if (this.state.grid[y*20+x]) {
          ctx.fillStyle = '#fff';
          ctx.fillRect(ox + x * cs + 2, oy + y * cs + 2, cs - 4, cs - 4);
        }
      }
    }
  }

  drawChapter5(ctx) {
    if (this.state.swapped) {
      ctx.fillStyle = '#f00';
      ctx.font = `300 1.5rem 'JetBrains Mono', monospace`;
      ctx.fillText("[ SYSTEM SWAP ACTIVE ]", 0, -100);
    }

    const seqStr = this.state.sequence.map(v => v.role + v.key).join(" ");
    ctx.fillStyle = '#fff';
    ctx.font = `300 2rem 'JetBrains Mono', monospace`;
    ctx.fillText(`> ${seqStr}_`, 0, 0);

    ctx.fillStyle = '#888';
    ctx.font = `300 1rem 'JetBrains Mono', monospace`;
    ctx.fillText("EXPECTED: ROOM -> TERM -> ROOM -> TERM...", 0, 100);
  }

  drawChapter6(ctx) {
    if ((this.role === 'room' && !this.state.roomLoaded) || (this.role === 'terminal' && !this.state.termLoaded)) {
      ctx.font = `200 0.9rem 'JetBrains Mono', monospace`;
      ctx.fillStyle = '#888';
      ctx.fillText("calibrating ML5 hand tracking...", 0, -150);
    }

    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(this.state.roomX, this.state.roomY, 30, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = this.state.termLocked ? '#0f0' : '#888';
    ctx.lineWidth = 3;
    ctx.strokeRect(this.state.termX - 30, this.state.termY - 30, 60, 60);

    if (this.state.alignTimer > 0) {
      ctx.fillStyle = `rgba(255, 255, 255, ${this.state.alignTimer / 2})`;
      ctx.fillRect(-200, 150, 400 * (this.state.alignTimer / 2), 10);
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
    else if (this.state.timer > 10 && this.state.timer < 14) ctx.fillText("thank you", 0, 0);
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

    if (this.chapter === 1 && this.role === 'room') {
      if (key === 'ArrowLeft') { this.state.slider = Math.max(0, this.state.slider - 1); updated = true; }
      if (key === 'ArrowRight') { this.state.slider = Math.min(100, this.state.slider + 1); updated = true; }
    }

    if (this.chapter === 3 && this.role === 'room') {
      if (key === 'ArrowLeft') { this.state.roomShiftX -= 5; updated = true; }
      if (key === 'ArrowRight') { this.state.roomShiftX += 5; updated = true; }
    }

    if (this.chapter === 5) {
      if (['1','2','3','4'].includes(key)) {
        let inputRole = this.role;
        if (this.state.swapped) {
          inputRole = this.role === 'room' ? 'terminal' : 'room';
        }

        const expectedRole = this.state.sequence.length % 2 === 0 ? 'room' : 'terminal';
        
        if (inputRole === expectedRole) {
          this.state.sequence.push({ role: inputRole === 'room' ? 'A' : 'B', key: key });
          if (this.manager.audio) this.manager.audio.click();
        } else {
          this.state.sequence = [];
          if (this.manager.audio) this.manager.audio.error();
        }
        updated = true;
      }
    }

    if (updated && !this.completed) this.sync();
  }

  onKeyUp(key, e) {
    this.keys[key] = false;
  }

  onMouseMove(x, y) {
    if (this.completed) return;
    const cx = x - this.width / 2;
    const cy = y - this.height / 2;

    if (this.chapter === 1 && this.role === 'terminal') {
      const jitter = (Math.random() - 0.5) * 6;
      this.state.slider = Math.max(0, Math.min(100, this.state.slider + jitter));
      this.sync();
    }

    if (this.chapter === 2) {
      if (this.role === 'room') { this.state.roomX = cx; this.state.roomY = cy; }
      else { this.state.termX = cx; this.state.termY = cy; }
      this.sync();
    }

    if (this.chapter === 3 && this.role === 'terminal') {
      this.state.termShiftY += (cy - this.state.termShiftY) * 0.1;
      this.sync();
    }
    
    if (this.chapter === 6 && this.role === 'room') {
      this.state.roomX = cx;
      this.state.roomY = cy;
      this.sync();
    }
  }

  onClick(x, y) {
    if (this.completed) return;
    const cx = x - this.width / 2;
    const cy = y - this.height / 2;

    if (this.chapter === 4) {
      const gx = Math.floor((cx + 150) / 15);
      const gy = Math.floor((cy + 150) / 15);
      if (gx >= 0 && gx < 20 && gy >= 0 && gy < 20) {
        const idx = gy * 20 + gx;
        if (this.role === 'room') {
          this.state.grid[idx] = true;
          this.sync();
        } else {
          this.state.history.push({ time: Date.now(), idx: idx, val: false });
        }
      }
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
