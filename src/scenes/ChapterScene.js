import { network } from '../network/client.js';
import { Events } from '../network/events.js';

const FONT_UI = "'JetBrains Mono', monospace";
const FONT_NARRATIVE = "'JetBrains Mono', monospace";

const CHAPTER_CONFIGS = {
  1: {
    instruction: {
      room: "> HOLD [A] TO CHARGE NODE 1, [D] TO CHARGE NODE 2",
      terminal: "> HOLD [Left] TO CHARGE NODE 3, [Right] TO CHARGE NODE 4"
    },
    narrative: ["power levels are unstable", "synchronize the charge exactly"],
    initState: () => ({
      c1: 0, c2: 0, c3: 0, c4: 0,
      r1: false, r2: false, t1: false, t2: false
    })
  },
  2: {
    instruction: {
      room: "> HOLD [SPACE] TO SCAN. YOU CANNOT SORT.",
      terminal: "> PRESS [1-5] TO SWAP ADJACENT. YOU CANNOT SCAN."
    },
    narrative: ["the sequence is scrambled", "i can see it, you can fix it"],
    initState: () => ({
      packets: ['E', 'B', 'F', 'A', 'D', 'C'],
      scanning: false,
      swaps: 0
    })
  },
  3: {
    instruction: {
      room: "> MOVE CORE (W/S). YOU CANNOT SEE MINES.",
      terminal: "> MOVE CORE (A/D). YOU CANNOT SEE TARGETS."
    },
    narrative: ["we are blind to the whole", "guide my hand"],
    initState: () => ({
      x: 2, y: 2,
      cores: [
        {x: 0, y: 0, active: true}, {x: 4, y: 0, active: true},
        {x: 0, y: 4, active: true}, {x: 4, y: 4, active: true}
      ],
      mines: [
        {x: 1, y: 1}, {x: 3, y: 1}, {x: 1, y: 3}, {x: 3, y: 3},
        {x: 2, y: 0}, {x: 2, y: 4}, {x: 0, y: 2}, {x: 4, y: 2}
      ],
      score: 0
    })
  },
  4: {
    instruction: "> ALIGN PHYSICAL VECTORS TO FUSE DATA NODES",
    narrative: ["the links are severed", "bridge the gap between us"],
    initState: () => ({
      roomCursorX: -200, roomCursorY: 0,
      termCursorX: 200, termCursorY: 0,
      roomLoaded: false, termLoaded: false,
      nodes: [
        { lx: -150, ly: -100, rx: 150, ry: 50, fused: false },
        { lx: -150, ly: 0, rx: 150, ry: -100, fused: false },
        { lx: -150, ly: 100, rx: 150, ry: 100, fused: false }
      ],
      fuseTimer: 0,
      activeIndex: 0
    })
  },
  5: {
    instruction: {
      room: "> ALIGN VERTICAL LASER TO MATCH TARGET",
      terminal: "> TRACK MOBILE TARGET AND ALIGN HORIZONTAL LASER"
    },
    narrative: ["it keeps moving", "we must catch it"],
    initState: () => ({
      roomX: 5, termY: 5,
      targetX: 2, targetY: 8,
      roomSpace: false, termSpace: false,
      hits: 0, targetTimer: 5
    })
  },
  6: {
    instruction: {
      room: "> REPLICATE SEQUENCE (A, D)",
      terminal: "> REPLICATE SEQUENCE (Left, Right)"
    },
    narrative: ["the pattern is shifting", "memorize the flow together"],
    initState: () => ({
      sequence: [0, 2, 1, 3, 0], // 0: room A, 1: room D, 2: term L, 3: term R
      input: [],
      showing: true,
      showTimer: 0,
      showIndex: 0,
      round: 1
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
          if (this.chapter === 4 || this.chapter === 7) {
            if (this.role === 'room') this.state.roomLoaded = true;
            if (this.role === 'terminal') this.state.termLoaded = true;
          }
          this.sync();
        });
        this.handpose.on('predict', results => {
          if (results.length > 0 && !this.completed) {
            const index = results[0].annotations.indexFinger[3];
            const targetX = ((320 - index[0]) / 320 - 0.5) * 800; 
            const targetY = (index[1] / 240 - 0.5) * 600;

            if (this.chapter === 4 || this.chapter === 7) {
              if (this.role === 'room') {
                let rx = this.state.roomCursorX + (targetX - this.state.roomCursorX) * 0.3;
                let ry = this.state.roomCursorY + (targetY - this.state.roomCursorY) * 0.3;
                network.syncState({ chapter: this.chapter, state: { roomCursorX: rx, roomCursorY: ry } });
                this.state.roomCursorX = rx;
                this.state.roomCursorY = ry;
              } else if (this.role === 'terminal') {
                let tx = this.state.termCursorX + (targetX - this.state.termCursorX) * 0.3;
                let ty = this.state.termCursorY + (targetY - this.state.termCursorY) * 0.3;
                network.syncState({ chapter: this.chapter, state: { termCursorX: tx, termCursorY: ty } });
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

    if (this.chapter === 1 && !this.completed) {
      if (this.role === 'room') {
        const speed = [0.4, 0.6, 0.8, 1.0];
        if (this.state.r1) this.state.c1 = Math.min(100, this.state.c1 + dt * 100 * speed[0]); else this.state.c1 = Math.max(0, this.state.c1 - dt * 100 * 0.5);
        if (this.state.r2) this.state.c2 = Math.min(100, this.state.c2 + dt * 100 * speed[1]); else this.state.c2 = Math.max(0, this.state.c2 - dt * 100 * 0.5);
        if (this.state.t1) this.state.c3 = Math.min(100, this.state.c3 + dt * 100 * speed[2]); else this.state.c3 = Math.max(0, this.state.c3 - dt * 100 * 0.5);
        if (this.state.t2) this.state.c4 = Math.min(100, this.state.c4 + dt * 100 * speed[3]); else this.state.c4 = Math.max(0, this.state.c4 - dt * 100 * 0.5);

        if (this.state.c1 === 100 && this.state.c2 === 100 && this.state.c3 === 100 && this.state.c4 === 100) {
          this.complete();
        }
        this.sync();
      }
    }

    if (this.chapter === 2 && !this.completed) {
      if (this.role === 'room') {
        const sorted = ['A', 'B', 'C', 'D', 'E', 'F'];
        let isSorted = true;
        for(let i=0; i<6; i++) {
          if(this.state.packets[i] !== sorted[i]) isSorted = false;
        }
        if (isSorted) this.complete();
      }
    }

    if (this.chapter === 3 && !this.completed) {
      if (this.role === 'room' && this.state.score >= 4) {
        this.complete();
      }
    }

    if (this.chapter === 6 && !this.completed) {
      if (this.role === 'room' && this.state.showing) {
        this.state.showTimer += dt;
        if (this.state.showTimer > 0.8) {
          this.state.showTimer = 0;
          this.state.showIndex++;
          if (this.state.showIndex >= this.state.round) {
            this.state.showing = false;
            this.state.showIndex = 0;
          }
          if (this.manager.audio) this.manager.audio.click();
          this.sync();
        }
      }
    }

    if (this.chapter === 4 && !this.completed) {
      this.setupML5();
      if (this.role === 'room' && this.state.roomLoaded && this.state.termLoaded) {
        const node = this.state.nodes[this.state.activeIndex];
        if (node) {
          const roomDist = Math.hypot(this.state.roomCursorX - node.lx, this.state.roomCursorY - node.ly);
          const termDist = Math.hypot(this.state.termCursorX - node.rx, this.state.termCursorY - node.ry);
          
          if (roomDist < 30 && termDist < 30) {
            this.state.fuseTimer += dt;
            if (this.state.fuseTimer > 1.5) {
              node.fused = true;
              this.state.fuseTimer = 0;
              this.state.activeIndex++;
              if (this.manager.audio) this.manager.audio.solve();
              if (this.state.activeIndex >= this.state.nodes.length) this.complete();
            }
          } else {
            this.state.fuseTimer = 0;
          }
          this.sync();
        }
      }
    }

    if (this.chapter === 5 && !this.completed) {
      if (this.role === 'room') {
        this.state.targetTimer -= dt;
        if (this.state.targetTimer <= 0) {
          this.state.targetX = Math.floor(Math.random() * 10);
          this.state.targetY = Math.floor(Math.random() * 10);
          this.state.targetTimer = 5;
          if (this.manager.audio) this.manager.audio.error();
          this.sync();
        }
        
        if (this.state.roomX === this.state.targetX && this.state.termY === this.state.targetY) {
          if (this.state.roomSpace && this.state.termSpace) {
            this.state.hits++;
            this.state.targetX = Math.floor(Math.random() * 10);
            this.state.targetY = Math.floor(Math.random() * 10);
            this.state.targetTimer = 5;
            this.state.roomSpace = false;
            this.state.termSpace = false;
            if (this.manager.audio) this.manager.audio.click();
            if (this.state.hits >= 4) this.complete();
            this.sync();
          }
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
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, w, h);
    }
  }

  drawChapter1(ctx) {
    ctx.fillStyle = '#111';
    ctx.fillRect(-200, -100, 400, 200);

    const draws = [
      {c: this.state.c1, active: this.state.r1, label: 'C1'},
      {c: this.state.c2, active: this.state.r2, label: 'C2'},
      {c: this.state.c3, active: this.state.t1, label: 'C3'},
      {c: this.state.c4, active: this.state.t2, label: 'C4'}
    ];

    draws.forEach((d, i) => {
      const x = -150 + i * 100;
      ctx.fillStyle = '#333';
      ctx.fillRect(x - 20, -50, 40, 100);
      
      ctx.fillStyle = d.c === 100 ? '#fff' : (d.active ? '#aaa' : '#666');
      const h = (d.c / 100) * 100;
      ctx.fillRect(x - 20, 50 - h, 40, h);

      ctx.fillStyle = '#eee';
      ctx.font = `200 1rem 'JetBrains Mono', monospace`;
      ctx.fillText(d.label, x, 80);
    });
  }

  drawChapter2(ctx) {
    if (this.role === 'terminal' && !this.state.scanning) {
      ctx.font = `300 1.2rem 'JetBrains Mono', monospace`;
      ctx.fillStyle = '#fff';
      ctx.fillText(`AWAITING SCAN...`, 0, -100);
    }
    
    this.state.packets.forEach((p, i) => {
      const x = -150 + i * 60;
      ctx.fillStyle = '#222';
      ctx.fillRect(x - 25, -25, 50, 50);

      if (this.state.scanning) {
        ctx.fillStyle = '#fff';
        ctx.font = `300 1.5rem 'JetBrains Mono', monospace`;
        ctx.fillText(p, x, 0);
      } else {
        ctx.fillStyle = '#666';
        ctx.fillText('#', x, 0);
      }

      ctx.fillStyle = '#888';
      ctx.font = `200 0.8rem 'JetBrains Mono', monospace`;
      ctx.fillText(`[${i+1}]`, x, 40);
    });
  }

  drawChapter3(ctx) {
    const cs = 60;
    const ox = -150, oy = -150;
    ctx.font = `200 1.5rem 'JetBrains Mono', monospace`;

    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 5; x++) {
        const px = ox + x * cs;
        const py = oy + y * cs;

        let isCore = this.state.cores.some(c => c.x === x && c.y === y && c.active);
        let isMine = this.state.mines.some(m => m.x === x && m.y === y);
        let isPlayer = this.state.x === x && this.state.y === y;

        ctx.strokeStyle = '#222';
        ctx.strokeRect(px, py, cs, cs);

        if (isPlayer) {
          ctx.fillStyle = '#fff';
          ctx.fillText('@', px + cs/2, py + cs/2);
        } else if (isCore && this.role === 'room') {
          ctx.fillStyle = '#0f0';
          ctx.fillText('O', px + cs/2, py + cs/2);
        } else if (isMine && this.role === 'terminal') {
          ctx.fillStyle = '#f00';
          ctx.fillText('X', px + cs/2, py + cs/2);
        }
      }
    }
    
    ctx.fillStyle = '#aaa';
    ctx.fillText(`CORES: ${this.state.score} / 4`, 0, 200);
  }

  drawChapter4(ctx) {
    if ((this.role === 'room' && !this.state.roomLoaded) || (this.role === 'terminal' && !this.state.termLoaded)) {
      ctx.font = `200 0.9rem 'JetBrains Mono', monospace`;
      ctx.fillStyle = '#888';
      ctx.fillText("calibrating dual optical sensors... fallback: use mouse", 0, -150);
    }

    this.state.nodes.forEach((n, i) => {
      ctx.fillStyle = n.fused ? '#fff' : (i === this.state.activeIndex ? '#888' : '#333');
      
      // Left Node
      ctx.beginPath(); ctx.arc(n.lx, n.ly, 15, 0, Math.PI * 2); ctx.fill();
      // Right Node
      ctx.beginPath(); ctx.arc(n.rx, n.ry, 15, 0, Math.PI * 2); ctx.fill();

      // If fused, draw line
      if (n.fused) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(n.lx, n.ly); ctx.lineTo(n.rx, n.ry); ctx.stroke();
      }
    });

    const activeNode = this.state.nodes[this.state.activeIndex];
    if (activeNode && this.state.fuseTimer > 0) {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(this.state.roomCursorX, this.state.roomCursorY);
      ctx.lineTo(this.state.termCursorX, this.state.termCursorY);
      ctx.stroke();
      ctx.setLineDash([]);
      
      ctx.fillStyle = '#fff';
      ctx.fillText(`FUSING... ${Math.floor(this.state.fuseTimer / 1.5 * 100)}%`, 0, -150);
    }

    // Room cursor
    ctx.fillStyle = this.role === 'room' ? '#fff' : 'rgba(255,255,255,0.3)';
    ctx.beginPath(); ctx.arc(this.state.roomCursorX, this.state.roomCursorY, 8, 0, Math.PI * 2); ctx.fill();

    // Term cursor
    ctx.fillStyle = this.role === 'terminal' ? '#fff' : 'rgba(255,255,255,0.3)';
    ctx.beginPath(); ctx.arc(this.state.termCursorX, this.state.termCursorY, 8, 0, Math.PI * 2); ctx.fill();
  }

  drawChapter5(ctx) {
    const cs = 40;
    const ox = -200, oy = -200;

    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1;

    for (let i = 0; i <= 10; i++) {
      ctx.beginPath(); ctx.moveTo(ox + i * cs, oy); ctx.lineTo(ox + i * cs, oy + 400); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ox, oy + i * cs); ctx.lineTo(ox + 400, oy + i * cs); ctx.stroke();
    }

    ctx.strokeStyle = this.state.roomSpace ? '#fff' : '#666';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(ox + this.state.roomX * cs + cs/2, oy);
    ctx.lineTo(ox + this.state.roomX * cs + cs/2, oy + 400);
    ctx.stroke();

    ctx.strokeStyle = this.state.termSpace ? '#fff' : '#666';
    ctx.beginPath();
    ctx.moveTo(ox, oy + this.state.termY * cs + cs/2);
    ctx.lineTo(ox + 400, oy + this.state.termY * cs + cs/2);
    ctx.stroke();

    if (this.role === 'terminal') {
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(ox + this.state.targetX * cs + cs/2, oy + this.state.targetY * cs + cs/2, 10, 0, Math.PI*2);
      ctx.fill();
    }
    
    ctx.fillStyle = '#444';
    ctx.font = `300 1rem 'JetBrains Mono', monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(`HITS: ${this.state.hits} / 4`, 0, 240);
  }

  drawChapter6(ctx) {
    if (this.state.showing) {
      ctx.fillStyle = '#fff';
      ctx.font = `300 2rem 'JetBrains Mono', monospace`;
      if (this.state.showIndex > 0) {
        const val = this.state.sequence[this.state.showIndex - 1];
        let sym = '';
        if (val === 0) sym = '[ROOM: A]';
        if (val === 1) sym = '[ROOM: D]';
        if (val === 2) sym = '[TERM: Left]';
        if (val === 3) sym = '[TERM: Right]';
        ctx.fillText(sym, 0, 0);
      }
    } else {
      ctx.fillStyle = '#888';
      ctx.font = `300 1.5rem 'JetBrains Mono', monospace`;
      ctx.fillText(`INPUT SEQUENCE (${this.state.input.length}/${this.state.round})`, 0, -50);
      
      const inStr = this.state.input.map(v => {
        if (v===0) return 'A'; if (v===1) return 'D';
        if (v===2) return 'L'; if (v===3) return 'R';
      }).join(' ');
      
      ctx.fillStyle = '#fff';
      ctx.fillText(`> ${inStr}_`, 0, 50);
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
      ctx.arc(0, 0, 50, 0, Math.PI * 2);
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

    if (this.chapter === 1) {
      if (this.role === 'room') {
        if (key === 'a' || key === 'ArrowLeft') { this.state.r1 = true; updated = true; }
        if (key === 'd' || key === 'ArrowRight') { this.state.r2 = true; updated = true; }
      } else {
        if (key === 'ArrowLeft' || key === 'a') { this.state.t1 = true; updated = true; }
        if (key === 'ArrowRight' || key === 'd') { this.state.t2 = true; updated = true; }
      }
    }

    if (this.chapter === 2) {
      if (this.role === 'room') {
        if (key === ' ' || key === 'Enter') { this.state.scanning = true; updated = true; }
      } else {
        if (!this.state.scanning) {
          const idx = parseInt(key) - 1;
          if (idx >= 0 && idx < 5) {
            let tmp = this.state.packets[idx];
            this.state.packets[idx] = this.state.packets[idx+1];
            this.state.packets[idx+1] = tmp;
            this.state.swaps++;
            if (this.manager.audio) this.manager.audio.click();
            updated = true;
          }
        }
      }
    }

    if (this.chapter === 3) {
      let nx = this.state.x;
      let ny = this.state.y;
      if (this.role === 'room') {
        if (key === 'w' || key === 'ArrowUp') ny--;
        if (key === 's' || key === 'ArrowDown') ny++;
      } else {
        if (key === 'a' || key === 'ArrowLeft') nx--;
        if (key === 'd' || key === 'ArrowRight') nx++;
      }

      if (nx >= 0 && nx < 5 && ny >= 0 && ny < 5 && (nx !== this.state.x || ny !== this.state.y)) {
        this.state.x = nx;
        this.state.y = ny;
        if (this.manager.audio) this.manager.audio.click();
        
        let hitMine = this.state.mines.some(m => m.x === nx && m.y === ny);
        if (hitMine) {
          this.state.x = 2; this.state.y = 2;
          this.state.score = 0;
          this.state.cores.forEach(c => c.active = true);
          if (this.manager.audio) this.manager.audio.error();
        } else {
          let core = this.state.cores.find(c => c.x === nx && c.y === ny && c.active);
          if (core) {
            core.active = false;
            this.state.score++;
            if (this.manager.audio) this.manager.audio.solve();
          }
        }
        updated = true;
      }
    }

    if (this.chapter === 4 && this.role === 'room') {
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
                if (this.manager.audio) this.manager.audio.click();
                if (this.state.cutIndex >= 4) this.complete();
              } else {
                if (this.manager.audio) this.manager.audio.error();
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

    if (this.chapter === 6 && !this.state.showing) {
      let val = -1;
      if (this.role === 'room') {
        if (key === 'a') val = 0;
        if (key === 'd') val = 1;
      } else {
        if (key === 'ArrowLeft') val = 2;
        if (key === 'ArrowRight') val = 3;
      }

      if (val !== -1) {
        this.state.input.push(val);
        const expected = this.state.sequence[this.state.input.length - 1];
        if (val === expected) {
          if (this.manager.audio) this.manager.audio.click();
          if (this.state.input.length === this.state.round) {
            this.state.round++;
            this.state.input = [];
            this.state.showing = true;
            this.state.showTimer = -0.5; // pause
            if (this.manager.audio) this.manager.audio.solve();
            if (this.state.round > this.state.sequence.length) {
              this.complete();
            }
          }
        } else {
          this.state.input = [];
          this.state.showing = true;
          this.state.showTimer = -0.5;
          if (this.manager.audio) this.manager.audio.error();
        }
        updated = true;
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

    if (this.chapter === 1) {
      if (this.role === 'room') {
        if (key === 'a' || key === 'ArrowLeft') { this.state.r1 = false; updated = true; }
        if (key === 'd' || key === 'ArrowRight') { this.state.r2 = false; updated = true; }
      } else {
        if (key === 'ArrowLeft' || key === 'a') { this.state.t1 = false; updated = true; }
        if (key === 'ArrowRight' || key === 'd') { this.state.t2 = false; updated = true; }
      }
    }

    if (this.chapter === 2 && this.role === 'room') {
      if (key === ' ' || key === 'Enter') { this.state.scanning = false; updated = true; }
    }

    if (this.chapter === 4 && this.role === 'room') {
      if (key === ' ' || key === 'Enter') {
        this.state.pinched = false;
        updated = true;
      }
    }

    if (this.chapter === 5) {
      if (this.role === 'room' && (key === ' ' || key === 'Enter')) { this.state.roomSpace = false; updated = true; }
      if (this.role === 'terminal' && (key === ' ' || key === 'Enter')) { this.state.termSpace = false; updated = true; }
    }

    if (updated && !this.completed) {
      this.sync();
    }
  }

  onMouseMove(x, y) {
    if (this.completed) return;
    const cx = x - this.width / 2;
    const cy = y - this.height / 2;

    if (this.chapter === 4 || this.chapter === 7) {
      if (this.role === 'room' && !this.state.roomLoaded) {
        let rx = this.state.roomCursorX + (cx - this.state.roomCursorX) * 0.3;
        let ry = this.state.roomCursorY + (cy - this.state.roomCursorY) * 0.3;
        network.syncState({ chapter: this.chapter, state: { roomCursorX: rx, roomCursorY: ry } });
        this.state.roomCursorX = rx;
        this.state.roomCursorY = ry;
      } else if (this.role === 'terminal' && !this.state.termLoaded) {
        let tx = this.state.termCursorX + (cx - this.state.termCursorX) * 0.3;
        let ty = this.state.termCursorY + (cy - this.state.termCursorY) * 0.3;
        network.syncState({ chapter: this.chapter, state: { termCursorX: tx, termCursorY: ty } });
        this.state.termCursorX = tx;
        this.state.termCursorY = ty;
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
