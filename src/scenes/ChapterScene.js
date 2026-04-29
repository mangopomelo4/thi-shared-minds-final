import { network } from '../network/client.js';
import { Events } from '../network/events.js';

const FONT_UI = "'JetBrains Mono', monospace";
const FONT_NARRATIVE = "'JetBrains Mono', monospace";

const CHAPTER_CONFIGS = {
  1: {
    instruction: {
      room: "> TOGGLE HARDWARE DIAGNOSTICS (ARROWS + SPACE)",
      terminal: "> REFERENCE DIAGNOSTIC PROTOCOL"
    },
    narrative: ["the core components are offline", "reboot the logic"],
    initState: () => {
      const components = ["MEM_0", "MEM_1", "CPU_A", "CPU_B", "NET_X", "NET_Y", "SYS_1", "SYS_2", "PWR_0"];
      for (let i = components.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [components[i], components[j]] = [components[j], components[i]];
      }
      return {
          grid: components,
          active: [false, false, false, false, false, false, false, false, false],
          cursorX: 1,
          cursorY: 1,
          rules: [
            "> 1. EXACTLY ONE [CPU] MUST BE ACTIVE",
            "> 2. AT LEAST ONE [MEM] MUST BE ACTIVE",
            "> 3. BOTH [SYS] NODES MUST SHARE THE SAME STATE",
            "> 4. THE CENTER NODE MUST ALWAYS BE ACTIVE",
            "> 5. EXACTLY 4 NODES MUST BE ACTIVE"
          ]
      };
    }
  },
  2: {
    instruction: {
      room: "> TYPE OVERRIDE COMMANDS",
      terminal: "> REFERENCE DECRYPTION MANUAL"
    },
    narrative: ["the system is purging", "we must bypass the kernel"],
    initState: () => ({
      phase: 0, timer: 15, typing: "",
      errors: ["0x4F_BUFFER", "0xA1_PANIC", "0x22_NET"],
      answers: ["sys.flush", "kernel.bypass", "net.reset"]
    })
  },
  3: {
    instruction: {
      room: "> NAVIGATE THE BLIND MAZE (W/A/S/D)",
      terminal: "> GUIDE THEM TO THE EXIT"
    },
    narrative: ["you cannot see the path", "but they can see you"],
    initState: () => ({
      x: 1, y: 1,
      targetX: 8, targetY: 8,
      walls: [
        [2,1],[2,2],[2,3],[4,3],[4,4],[4,5],[4,6],[6,6],[6,7],[6,8],[8,7],[7,2],[8,2],[1,5],[2,5],[1,7],[2,7],[7,4],[8,4]
      ]
    })
  },
  4: {
    instruction: {
      room: "> HOVER CAMERA OVER PROTOCOL TO SNIP (1.5s)",
      terminal: "> REFERENCE DISCONNECT SEQUENCE"
    },
    narrative: ["physical connections remain", "sever the wrong one and we fail"],
    initState: () => ({
      wires: [
        { id: 'A', y: -90, cut: false, pattern: 'solid' },
        { id: 'B', y: -30, cut: false, pattern: 'dashed' },
        { id: 'C', y: 30, cut: false, pattern: 'dotted' },
        { id: 'D', y: 90, cut: false, pattern: 'thick' }
      ],
      cutOrder: ['C', 'A', 'D', 'B'],
      cutIndex: 0,
      hoverWireId: null,
      hoverTimer: 0,
      ml5Loaded: false,
      cursorX: 0, cursorY: 0
    })
  },
  5: {
    instruction: {
      room: "> CONTROL VERTICAL LASER (A/D)",
      terminal: "> CONTROL HORIZONTAL LASER (W/S)"
    },
    narrative: ["we must strike together", "or not at all"],
    initState: () => ({
      roomX: 5, termY: 5,
      targetX: 2, targetY: 8,
      roomSpace: false, termSpace: false,
      hits: 0, targetTimer: 0
    })
  },
  6: {
    instruction: {
      room: "> HOLD [SPACE] TO STABILIZE DATABANK",
      terminal: "> EXTRACT CORE DATA WHEN STABLE"
    },
    narrative: ["the core is shifting", "hold it still for me"],
    initState: () => ({
      sliderX: 0, sweetSpotX: 100,
      roomHolding: false, typing: "",
      targetCode: "A4F9"
    })
  },
  7: {
    instruction: "> ALIGN PHYSICAL VECTORS",
    narrative: ["bring your fragments together", "we are the palace"],
    initState: () => ({
      roomCursorX: -200, roomCursorY: 0,
      termCursorX: 200, termCursorY: 0,
      roomLoaded: false, termLoaded: false,
      progress: 0
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
          if (this.chapter === 7) {
            if (this.role === 'room') this.state.roomLoaded = true;
            if (this.role === 'terminal') this.state.termLoaded = true;
          } else {
            this.state.ml5Loaded = true;
          }
          this.sync();
        });
        this.handpose.on('predict', results => {
          if (results.length > 0 && !this.completed) {
            const thumb = results[0].annotations.thumb[3];
            const index = results[0].annotations.indexFinger[3];
            const dist = Math.hypot(thumb[0] - index[0], thumb[1] - index[1]);
            const isPinching = dist < 60; // Increased threshold for easier pinching
            
            // Increased multiplier so user doesn't have to reach edges of webcam
            const targetX = ((320 - index[0]) / 320 - 0.5) * 1200; 
            const targetY = (index[1] / 240 - 0.5) * 900;

            if (this.chapter === 4 && this.role === 'room') {
               this.state.cursorX += (targetX - this.state.cursorX) * 0.1;
               this.state.cursorY += (targetY - this.state.cursorY) * 0.1;
               this.sync();
            }

            if (this.chapter === 7) {
              if (this.role === 'room') {
                let rx = this.state.roomCursorX + (targetX - this.state.roomCursorX) * 0.1;
                let ry = this.state.roomCursorY + (targetY - this.state.roomCursorY) * 0.1;
                network.syncState({ chapter: 7, state: { roomCursorX: rx, roomCursorY: ry } });
                this.state.roomCursorX = rx;
                this.state.roomCursorY = ry;
              } else if (this.role === 'terminal') {
                let tx = this.state.termCursorX + (targetX - this.state.termCursorX) * 0.1;
                let ty = this.state.termCursorY + (targetY - this.state.termCursorY) * 0.1;
                network.syncState({ chapter: 7, state: { termCursorX: tx, termCursorY: ty } });
                this.state.termCursorX = tx;
                this.state.termCursorY = ty;
              }
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

    if (this.chapter === 2 && this.role === 'room' && !this.completed) {
      this.state.timer -= dt;
      if (this.state.timer <= 0) {
        this.state.phase = 0;
        this.state.timer = 15;
        if (this.manager.audio) this.manager.audio.error();
      }
      this.sync();
    }

    if (this.chapter === 4 && this.role === 'room' && !this.completed) {
      this.setupML5();
      let hoveredId = null;
      for (let i = 0; i < this.state.wires.length; i++) {
        const w = this.state.wires[i];
        if (!w.cut && Math.abs(this.state.cursorY - w.y) < 30) {
           hoveredId = w.id;
           break;
        }
      }

      if (hoveredId) {
        if (this.state.hoverWireId !== hoveredId) {
          this.state.hoverWireId = hoveredId;
          this.state.hoverTimer = 0;
        } else {
          this.state.hoverTimer += dt;
          if (this.state.hoverTimer > 1.5) {
            if (hoveredId === this.state.cutOrder[this.state.cutIndex]) {
              let w = this.state.wires.find(w => w.id === hoveredId);
              w.cut = true;
              this.state.cutIndex++;
              if (this.manager.audio) this.manager.audio.click();
              if (this.state.cutIndex >= 4) this.complete();
            } else {
              if (this.manager.audio) this.manager.audio.error();
              this.state.wires.forEach(wire => wire.cut = false);
              this.state.cutIndex = 0;
            }
            this.state.hoverWireId = null;
            this.state.hoverTimer = 0;
          }
        }
      } else {
        this.state.hoverWireId = null;
        this.state.hoverTimer = 0;
      }
      this.sync();
    }

    if (this.chapter === 5 && !this.completed) {
      this.state.targetTimer -= dt;
      if (this.state.targetTimer <= 0) {
        this.state.targetX = Math.floor(Math.random() * 10);
        this.state.targetY = Math.floor(Math.random() * 10);
        this.state.targetTimer = 3;
        this.sync();
      }
      
      if (this.state.roomX === this.state.targetX && this.state.termY === this.state.targetY) {
        if (this.state.roomSpace && this.state.termSpace) {
          this.state.hits++;
          this.state.targetTimer = 0;
          this.state.roomSpace = false;
          this.state.termSpace = false;
          if (this.manager.audio) this.manager.audio.click();
          if (this.state.hits >= 3) this.complete();
        }
      }
    }

    if (this.chapter === 6 && !this.completed) {
      if (this.role === 'room') {
        this.state.sliderX = Math.sin(this.time * 2) * 200 + Math.cos(this.time * 5) * 50;
        this.sync();
      }
    }

    if (this.chapter === 7 && !this.completed) {
      this.setupML5();
      if (this.role === 'room') {
        const dRoom = Math.hypot(this.state.roomCursorX, this.state.roomCursorY);
        const dTerm = Math.hypot(this.state.termCursorX, this.state.termCursorY);
        const overlap = Math.hypot(this.state.roomCursorX - this.state.termCursorX, this.state.roomCursorY - this.state.termCursorY);
        
        let prog = this.state.progress;
        if (dRoom < 60 && dTerm < 60 && overlap < 60) {
          prog += dt * 0.3;
          if (prog >= 1) this.complete();
        } else {
          prog = Math.max(0, prog - dt * 0.5);
        }
        
        if (prog !== this.state.progress) {
          network.syncState({ chapter: 7, state: { progress: prog } });
          this.state.progress = prog;
        }
      }
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
      ctx.fillStyle = this.chapter === 7 ? '#fff' : '#0a0a0a';
      ctx.fillRect(0, 0, w, h);
    }
  }

  checkChapter1Complete() {
    if (this.completed) return;
    const g = this.state.grid;
    const a = this.state.active;

    let activeCount = a.filter(x => x).length;
    if (activeCount !== 4) return;

    if (!a[4]) return;

    let sys1 = a[g.indexOf('SYS_1')];
    let sys2 = a[g.indexOf('SYS_2')];
    if (sys1 !== sys2) return;

    let cpuA = a[g.indexOf('CPU_A')];
    let cpuB = a[g.indexOf('CPU_B')];
    if ((cpuA && cpuB) || (!cpuA && !cpuB)) return;

    let mem0 = a[g.indexOf('MEM_0')];
    let mem1 = a[g.indexOf('MEM_1')];
    if (!mem0 && !mem1) return;

    this.complete();
  }

  drawChapter1(ctx) {
    if (this.role === 'terminal') {
      ctx.font = `200 1.1rem 'JetBrains Mono', monospace`;
      ctx.fillStyle = '#e8e8e8';
      ctx.textAlign = 'left';
      this.state.rules.forEach((rule, i) => {
        ctx.fillText(rule, -250, (i - 2) * 45);
      });
      ctx.textAlign = 'center';

      ctx.globalAlpha = 0.2;
      for (let y = 0; y < 3; y++) {
        for (let x = 0; x < 3; x++) {
          let idx = y * 3 + x;
          if (this.state.active[idx]) {
            ctx.fillStyle = '#fff';
            ctx.fillRect(-150 + x * 100, -100 + y * 100, 80, 40);
          }
        }
      }
      ctx.globalAlpha = 1;
    } else {
      ctx.font = `300 1.2rem 'JetBrains Mono', monospace`;
      for (let y = 0; y < 3; y++) {
        for (let x = 0; x < 3; x++) {
          let idx = y * 3 + x;
          let px = -200 + x * 150;
          let py = -120 + y * 100;

          ctx.fillStyle = this.state.active[idx] ? '#eee' : '#222';
          ctx.fillRect(px, py, 120, 60);

          if (this.state.cursorX === x && this.state.cursorY === y) {
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.strokeRect(px - 5, py - 5, 130, 70);
          }

          ctx.fillStyle = this.state.active[idx] ? '#000' : '#888';
          ctx.fillText(this.state.grid[idx], px + 60, py + 30);
        }
      }
    }
  }

  drawChapter2(ctx) {
    if (this.role === 'terminal') {
      ctx.font = `300 1.5rem 'JetBrains Mono', monospace`;
      ctx.fillStyle = '#f55';
      ctx.fillText(`ERROR: ${this.state.errors[this.state.phase]}`, 0, -100);

      ctx.fillStyle = '#aaa';
      ctx.font = `200 1rem 'JetBrains Mono', monospace`;
      this.state.errors.forEach((err, i) => {
        ctx.fillText(`IF ${err} -> ${this.state.answers[i]}`, 0, 50 + i * 30);
      });
      
      if (this.state.typing) {
        ctx.globalAlpha = 0.5;
        ctx.fillText(`> ${this.state.typing}_`, 0, -30);
        ctx.globalAlpha = 1;
      }
    } else {
      ctx.font = `300 2rem 'JetBrains Mono', monospace`;
      ctx.fillStyle = '#fff';
      const typed = this.state.typing + (Math.floor(this.time * 2) % 2 === 0 ? '_' : '');
      ctx.fillText(`> ${typed}`, 0, 0);

      ctx.fillStyle = '#666';
      ctx.fillRect(-150, 100, 300, 5);
      ctx.fillStyle = '#fff';
      ctx.fillRect(-150, 100, 300 * (this.state.timer / 15), 5);
    }
  }

  drawChapter3(ctx) {
    const cs = 40;
    const ox = -200;
    const oy = -200;
    ctx.font = `200 1.2rem ${FONT_UI}`;

    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 10; x++) {
        const px = ox + x * cs;
        const py = oy + y * cs;

        let isWall = this.state.walls.some(w => w[0] === x && w[1] === y);
        let isPlayer = this.state.x === x && this.state.y === y;
        let isTarget = this.state.targetX === x && this.state.targetY === y;

        if (this.role === 'room') {
          // Fog of war
          if (Math.abs(this.state.x - x) <= 1 && Math.abs(this.state.y - y) <= 1) {
            ctx.fillStyle = isPlayer ? '#fff' : isTarget ? '#888' : isWall ? '#333' : '#111';
            ctx.fillText(isPlayer ? '@' : isTarget ? 'O' : isWall ? 'X' : '.', px, py);
          }
        } else {
          ctx.fillStyle = isPlayer ? '#fff' : isTarget ? '#888' : isWall ? '#333' : '#111';
          ctx.fillText(isPlayer ? '@' : isTarget ? 'O' : isWall ? 'X' : '.', px, py);
        }
      }
    }
  }

  drawChapter4(ctx) {
    if (this.role === 'room') {
      if (!this.state.ml5Loaded) {
        ctx.font = `200 0.9rem 'JetBrains Mono', monospace`;
        ctx.fillStyle = '#888';
        ctx.fillText("calibrating sensor... fallback: hold SPACE and mouse to snip", 0, -150);
      }
      this.state.wires.forEach(w => {
        ctx.strokeStyle = w.cut ? '#333' : '#aaa';
        ctx.lineWidth = w.pattern === 'thick' ? 5 : 2;
        if (w.pattern === 'dashed') ctx.setLineDash([10, 10]);
        else if (w.pattern === 'dotted') ctx.setLineDash([2, 5]);
        else ctx.setLineDash([]);

        ctx.beginPath();
        ctx.moveTo(-200, w.y);
        ctx.lineTo(200, w.y);
        ctx.stroke();

        ctx.fillStyle = '#555';
        ctx.fillText(w.id, -220, w.y);
      });
      ctx.setLineDash([]);
      
      ctx.fillStyle = this.state.hoverTimer > 0 ? '#fff' : '#555';
      ctx.beginPath();
      ctx.arc(this.state.cursorX, this.state.cursorY, 8 + this.state.hoverTimer * 8, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.font = `200 1.2rem 'JetBrains Mono', monospace`;
      ctx.fillStyle = '#e8e8e8';
      ctx.textAlign = 'left';
      ctx.fillText(`DISCONNECT PROTOCOL:`, -150, -100);
      this.state.cutOrder.forEach((id, i) => {
        ctx.fillStyle = i < this.state.cutIndex ? '#444' : '#eee';
        ctx.fillText(`${i+1}. SEVER CONNECTION ${id}`, -150, -50 + i * 40);
      });
      ctx.textAlign = 'center';
    }
  }

  drawChapter5(ctx) {
    const cs = 40;
    const ox = -200;
    const oy = -200;

    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 10; x++) {
        const px = ox + x * cs;
        const py = oy + y * cs;
        ctx.fillStyle = '#111';
        if (this.role === 'room' && x === this.state.roomX) ctx.fillStyle = '#333';
        if (this.role === 'terminal' && y === this.state.termY) ctx.fillStyle = '#333';
        
        ctx.fillRect(px + 2, py + 2, cs - 4, cs - 4);
      }
    }

    ctx.fillStyle = '#fff';
    ctx.fillText('O', ox + this.state.targetX * cs + cs/2, oy + this.state.targetY * cs + cs/2);

    if (this.role === 'room') {
      ctx.fillStyle = this.state.roomSpace ? '#fff' : '#888';
      ctx.fillRect(ox + this.state.roomX * cs + cs/2 - 2, oy, 4, 400);
    } else {
      ctx.fillStyle = this.state.termSpace ? '#fff' : '#888';
      ctx.fillRect(ox, oy + this.state.termY * cs + cs/2 - 2, 400, 4);
    }
  }

  drawChapter6(ctx) {
    if (this.role === 'room') {
      ctx.strokeStyle = '#444';
      ctx.strokeRect(-200, -20, 400, 40);

      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fillRect(this.state.sweetSpotX - 40, -20, 80, 40);

      ctx.fillStyle = this.state.roomHolding ? '#fff' : '#888';
      ctx.fillRect(this.state.sliderX - 5, -25, 10, 50);
    } else {
      let isStable = this.state.roomHolding && Math.abs(this.state.sliderX - this.state.sweetSpotX) < 40;
      ctx.font = `300 2rem 'JetBrains Mono', monospace`;
      
      if (isStable) {
        ctx.fillStyle = '#fff';
        ctx.fillText(this.state.targetCode, 0, -50);
      } else {
        ctx.fillStyle = '#444';
        const scramble = Array(4).fill(0).map(() => String.fromCharCode(65 + Math.random() * 26)).join('');
        ctx.fillText(scramble, 0, -50);
      }

      ctx.fillStyle = '#eee';
      ctx.fillText(`> ${this.state.typing}_`, 0, 50);
    }
  }

  drawChapter7(ctx) {
    if ((this.role === 'room' && !this.state.roomLoaded) || (this.role === 'terminal' && !this.state.termLoaded)) {
      ctx.font = `200 0.9rem 'JetBrains Mono', monospace`;
      ctx.fillStyle = '#888';
      ctx.fillText("calibrating dual optical sensors...", 0, -150);
    }

    ctx.strokeStyle = '#333';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, 50, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = this.role === 'room' ? '#fff' : 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    ctx.arc(this.state.roomCursorX, this.state.roomCursorY, 20, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = this.role === 'terminal' ? '#fff' : 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    ctx.arc(this.state.termCursorX, this.state.termCursorY, 20, 0, Math.PI * 2);
    ctx.fill();

    if (this.state.progress > 0) {
      ctx.fillStyle = `rgba(255, 255, 255, ${this.state.progress})`;
      ctx.beginPath();
      ctx.arc(0, 0, 50 + this.state.progress * 1000, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  onKeyDown(key, e) {
    this.keys[key] = true;

    if (e && e.shiftKey && e.code && e.code.startsWith('Digit')) {
      const targetChapter = parseInt(e.code.replace('Digit', ''), 10);
      if (targetChapter >= 1 && targetChapter <= 7) {
        this.manager.switchTo('chapter', { chapter: targetChapter, role: this.role });
        return;
      }
      if (targetChapter === 8) {
        this.manager.switchTo('outro');
        return;
      }
    }

    if (this.completed) return;
    if (this.manager.audio) this.manager.audio.init();

    let updated = false;

    if (this.chapter === 1 && this.role === 'room') {
      if (key === 'w' || key === 'ArrowUp') { this.state.cursorY = Math.max(0, this.state.cursorY - 1); updated = true; }
      if (key === 's' || key === 'ArrowDown') { this.state.cursorY = Math.min(2, this.state.cursorY + 1); updated = true; }
      if (key === 'a' || key === 'ArrowLeft') { this.state.cursorX = Math.max(0, this.state.cursorX - 1); updated = true; }
      if (key === 'd' || key === 'ArrowRight') { this.state.cursorX = Math.min(2, this.state.cursorX + 1); updated = true; }
      if (key === ' ' || key === 'Enter') {
        let idx = this.state.cursorY * 3 + this.state.cursorX;
        this.state.active[idx] = !this.state.active[idx];
        if (this.manager.audio) this.manager.audio.click();
        this.checkChapter1Complete();
        updated = true;
      }
    }

    if (this.chapter === 2 && this.role === 'room') {
      if (key === 'Backspace') {
        this.state.typing = this.state.typing.slice(0, -1);
        updated = true;
      } else if (key === 'Enter') {
        if (this.state.typing === this.state.answers[this.state.phase]) {
          this.state.phase++;
          this.state.typing = "";
          this.state.timer = 15;
          if (this.state.phase >= 3) this.complete();
          if (this.manager.audio) this.manager.audio.select();
        } else {
          if (this.manager.audio) this.manager.audio.error();
          this.state.typing = "";
        }
        updated = true;
      } else if (key.length === 1) {
        this.state.typing += key;
        updated = true;
        if (this.manager.audio) this.manager.audio.click();
      }
    }

    if (this.chapter === 3 && this.role === 'room') {
      let nx = this.state.x;
      let ny = this.state.y;
      if (key === 'w' || key === 'ArrowUp') ny--;
      if (key === 's' || key === 'ArrowDown') ny++;
      if (key === 'a' || key === 'ArrowLeft') nx--;
      if (key === 'd' || key === 'ArrowRight') nx++;

      if (nx !== this.state.x || ny !== this.state.y) {
        if (nx >= 0 && nx < 10 && ny >= 0 && ny < 10) {
          let hitWall = this.state.walls.some(w => w[0] === nx && w[1] === ny);
          if (!hitWall) {
            this.state.x = nx;
            this.state.y = ny;
            updated = true;
            if (nx === this.state.targetX && ny === this.state.targetY) this.complete();
          }
        }
      }
    }

    if (this.chapter === 4 && this.role === 'room' && !this.state.ml5Loaded) {
      if (key === ' ' || key === 'Enter') {
        if (!this.state.pinched) {
          this.state.pinched = true;
          updated = true;
          for (let i = 0; i < this.state.wires.length; i++) {
            const w = this.state.wires[i];
            if (!w.cut && Math.abs(this.state.cursorY - w.y) < 20) {
              if (w.id === this.state.cutOrder[this.state.cutIndex]) {
                w.cut = true;
                this.state.cutIndex++;
                if (this.state.cutIndex >= 4) this.complete();
              } else {
                this.state.wires.forEach(wire => wire.cut = false);
                this.state.cutIndex = 0;
              }
              break;
            }
          }
        }
      }
    }

    if (this.chapter === 5) {
      if (this.role === 'room') {
        if (key === 'a' || key === 'ArrowLeft') { this.state.roomX = Math.max(0, this.state.roomX - 1); updated = true; }
        if (key === 'd' || key === 'ArrowRight') { this.state.roomX = Math.min(9, this.state.roomX + 1); updated = true; }
        if (key === ' ' || key === 'Enter') { this.state.roomSpace = true; updated = true; }
      } else {
        if (key === 'w' || key === 'ArrowUp') { this.state.termY = Math.max(0, this.state.termY - 1); updated = true; }
        if (key === 's' || key === 'ArrowDown') { this.state.termY = Math.min(9, this.state.termY + 1); updated = true; }
        if (key === ' ' || key === 'Enter') { this.state.termSpace = true; updated = true; }
      }
    }

    if (this.chapter === 6) {
      if (this.role === 'room' && (key === ' ' || key === 'Enter')) {
        this.state.roomHolding = true;
        updated = true;
      }
      if (this.role === 'terminal') {
        if (key === 'Backspace') {
          this.state.typing = this.state.typing.slice(0, -1);
          updated = true;
        } else if (key === 'Enter') {
          if (this.state.typing.toUpperCase() === this.state.targetCode) {
            this.complete();
          } else {
            this.state.typing = "";
            if (this.manager.audio) this.manager.audio.error();
            updated = true;
          }
        } else if (key.length === 1 && key.match(/[a-zA-Z0-9]/)) {
          this.state.typing += key.toUpperCase();
          if (this.manager.audio) this.manager.audio.click();
          updated = true;
        }
      }
    }

    if (updated && !this.completed) {
      this.sync();
    }
  }

  onKeyUp(key, e) {
    this.keys[key] = false;
    if (this.completed) return;
    let updated = false;

    if (this.chapter === 4 && this.role === 'room' && !this.state.ml5Loaded) {
      if (key === ' ' || key === 'Enter') {
        this.state.pinched = false;
        updated = true;
      }
    }

    if (this.chapter === 5) {
      if (this.role === 'room' && (key === ' ' || key === 'Enter')) { this.state.roomSpace = false; updated = true; }
      if (this.role === 'terminal' && (key === ' ' || key === 'Enter')) { this.state.termSpace = false; updated = true; }
    }

    if (this.chapter === 6 && this.role === 'room') {
      if (key === ' ' || key === 'Enter') {
        this.state.roomHolding = false;
        updated = true;
      }
    }

    if (updated && !this.completed) {
      this.sync();
    }
  }

  onMouseMove(x, y) {
    if (this.completed) return;
    const cx = x - this.width / 2;
    const cy = y - this.height / 2;

    if (this.chapter === 4 && this.role === 'room' && !this.state.ml5Loaded) {
      this.state.cursorX += (cx - this.state.cursorX) * 0.3;
      this.state.cursorY += (cy - this.state.cursorY) * 0.3;
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
