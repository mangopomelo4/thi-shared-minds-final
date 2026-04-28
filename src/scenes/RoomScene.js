/**
 * RoomScene — Atmospheric childhood room. Textured, surreal, not flat.
 */
import { network } from '../network/client.js';
import { Events } from '../network/events.js';
import * as R from '../engine/RenderUtils.js';

export class RoomScene {
  init() {
    this.alpha=0; this.time=0; this.selectedIndex=-1;
    this.view='room'; this.doorUnlocked=false;
    this.notification=''; this.notifTimer=0; this.exitFade=0;
    this.objects=[{id:'poster'},{id:'toybox'},{id:'bed'},{id:'shelf'},{id:'clock'}];
    network.off(Events.TERMINAL_UPDATE); network.off(Events.PUZZLE_SOLVED); network.off(Events.PUZZLE_FAILED);
    network.on(Events.TERMINAL_UPDATE,()=>this._notify('// TERMINAL ACTIVITY'));
    network.on(Events.PUZZLE_SOLVED,()=>{this.doorUnlocked=true;this._notify('// ARCHIVE RESTORED');if(this.manager.audio)this.manager.audio.solve();});
    network.on(Events.PUZZLE_FAILED,()=>{this._notify('// ACCESS DENIED');if(this.manager.audio)this.manager.audio.error();});
  }
  _notify(t){this.notification=t;this.notifTimer=3;}
  update(dt){
    this.time+=dt;
    if(this.alpha<1)this.alpha=Math.min(1,this.alpha+dt*0.8);
    if(this.notifTimer>0)this.notifTimer-=dt;
    if(this.exitFade>0){this.exitFade+=dt*0.6;if(this.exitFade>=1)this.manager.switchTo('transition',{nextLevel:2});}
  }
  draw(ctx){
    const w=this.width,h=this.height;
    ctx.save();ctx.globalAlpha=this.alpha*R.getFlicker(this.time);
    if(this.view==='room')this._drawRoom(ctx,w,h);else this._drawZoomed(ctx,w,h);
    if(this.notifTimer>0){ctx.globalAlpha=Math.min(1,this.notifTimer);ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='300 0.55rem JetBrains Mono,monospace';ctx.fillStyle='#999';ctx.fillText(this.notification,w/2,20);}
    if(this.exitFade>0){ctx.globalAlpha=this.exitFade;ctx.fillStyle='#1a1a1a';ctx.fillRect(0,0,w,h);}
    ctx.restore();
  }
  _drawRoom(ctx,w,h){
    const fY=Math.round(h*0.6);
    R.drawTexturedWall(ctx,0,0,w,fY);
    R.drawTexturedFloor(ctx,0,fY,w,h-fY);
    R.drawBaseboard(ctx,0,fY,w);
    R.drawOverheadLight(ctx,w,h,w*0.45,0,h*0.8,0.1);
    ctx.strokeStyle='#aaa';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(w*0.45,0);ctx.lineTo(w*0.45,18);ctx.stroke();
    ctx.fillStyle='#b0b0b0';ctx.fillRect(w*0.45-10,18,20,3);

    // CLOCK
    const ckR=30,ckX=w*0.73,ckY=fY*0.18;
    this._hit(4,ckX-ckR-6,ckY-ckR-6,ckR*2+12,ckR*2+12);
    if(this.selectedIndex===4){ctx.fillStyle='rgba(255,255,240,0.04)';ctx.beginPath();ctx.arc(ckX,ckY,ckR+10,0,Math.PI*2);ctx.fill();}
    ctx.beginPath();ctx.arc(ckX,ckY,ckR+3,0,Math.PI*2);ctx.fillStyle='#a5a5a5';ctx.fill();
    ctx.beginPath();ctx.arc(ckX,ckY,ckR,0,Math.PI*2);ctx.fillStyle='#d0d0d0';ctx.fill();ctx.strokeStyle='#909090';ctx.lineWidth=1;ctx.stroke();
    for(let n=0;n<12;n++){const a=n*Math.PI/6;ctx.beginPath();ctx.moveTo(ckX+Math.cos(a)*ckR*0.8,ckY+Math.sin(a)*ckR*0.8);ctx.lineTo(ckX+Math.cos(a)*ckR*0.92,ckY+Math.sin(a)*ckR*0.92);ctx.strokeStyle='#888';ctx.lineWidth=n%3===0?1.2:0.5;ctx.stroke();}
    ctx.strokeStyle='#555';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(ckX,ckY);ctx.lineTo(ckX+ckR*0.5,ckY);ctx.stroke();
    ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(ckX,ckY);ctx.lineTo(ckX,ckY+ckR*0.65);ctx.stroke();
    ctx.beginPath();ctx.arc(ckX,ckY,2,0,Math.PI*2);ctx.fillStyle='#555';ctx.fill();

    // POSTER
    const poX=w*0.08,poY=fY*0.12,poW=w*0.15,poH=fY*0.52;
    this._hit(0,poX,poY,poW,poH);
    if(this.selectedIndex===0){ctx.fillStyle='rgba(255,255,240,0.03)';ctx.fillRect(poX-6,poY-6,poW+12,poH+12);}
    ctx.save();ctx.translate(poX+poW/2,poY+poH/2);ctx.rotate(-0.015);
    ctx.fillStyle='#bfbfbf';ctx.fillRect(-poW/2,-poH/2,poW,poH);
    ctx.strokeStyle='#a0a0a0';ctx.lineWidth=0.6;ctx.strokeRect(-poW/2,-poH/2,poW,poH);
    const ds=poW*0.11;
    ctx.strokeStyle='#8a8a8a';ctx.lineWidth=0.7;
    [[-poW*0.25,0],[0,-ds*0.3],[poW*0.25,0]].forEach(([px,py])=>{ctx.beginPath();ctx.arc(px,py+poH*0.08,ds,0,Math.PI*2);ctx.stroke();});
    ctx.beginPath();ctx.moveTo(-poW*0.25-ds*0.4,-ds+poH*0.08);ctx.lineTo(-poW*0.25-ds*0.5,-ds*2.5+poH*0.08);ctx.stroke();
    ctx.beginPath();ctx.moveTo(-poW*0.25+ds*0.4,-ds+poH*0.08);ctx.lineTo(-poW*0.25+ds*0.5,-ds*2.5+poH*0.08);ctx.stroke();
    ctx.beginPath();ctx.moveTo(ds,-ds*0.3+poH*0.08);ctx.lineTo(ds*1.8,-ds*0.6+poH*0.08);ctx.stroke();
    ctx.beginPath();ctx.moveTo(poW*0.25-ds*0.6,-ds*0.5+poH*0.08);ctx.lineTo(poW*0.25-ds*0.7,ds*0.4+poH*0.08);ctx.stroke();
    ctx.beginPath();ctx.moveTo(poW*0.25+ds*0.6,-ds*0.5+poH*0.08);ctx.lineTo(poW*0.25+ds*0.7,ds*0.4+poH*0.08);ctx.stroke();
    ctx.fillStyle='#999';ctx.beginPath();ctx.arc(0,-poH/2+5,2,0,Math.PI*2);ctx.fill();
    ctx.restore();

    // SHELF
    const shX=w*0.34,shY=fY*0.14,shW=w*0.22,shH=fY*0.38;
    this._hit(3,shX,shY,shW,shH);
    if(this.selectedIndex===3){ctx.fillStyle='rgba(255,255,240,0.03)';ctx.fillRect(shX-4,shY-4,shW+8,shH+8);}
    ctx.save();ctx.globalAlpha=0.04;ctx.fillStyle='#000';ctx.fillRect(shX+3,shY+3,shW,shH);ctx.restore();
    ctx.fillStyle='#b0b0b0';ctx.fillRect(shX,shY,shW,shH);
    ctx.strokeStyle='#909090';ctx.lineWidth=0.8;ctx.strokeRect(shX,shY,shW,shH);
    const s3=shW/3;
    ctx.beginPath();ctx.moveTo(shX+s3,shY);ctx.lineTo(shX+s3,shY+shH);ctx.moveTo(shX+s3*2,shY);ctx.lineTo(shX+s3*2,shY+shH);ctx.stroke();
    ctx.beginPath();ctx.moveTo(shX,shY+shH*0.5);ctx.lineTo(shX+shW,shY+shH*0.5);ctx.stroke();
    for(let s=0;s<3;s++){for(let r=0;r<2;r++){const bx=shX+s*s3+3,by=shY+r*shH*0.5+2,bw2=s3-6,bh2=shH*0.5-4;
    for(let i=0;i<4;i++){const w2=bw2/4-1,h2=bh2*(0.4+((i*7+s*3)%5)/8);ctx.fillStyle=['#a0a0a0','#a8a8a8','#989898','#a4a4a4'][i%4];ctx.fillRect(bx+i*(w2+1),by+bh2-h2,w2,h2);}}}

    // BED
    const bdW=w*0.38,bdH=(h-fY)*0.55,bdX=w*0.55,bdY=fY+8;
    this._hit(2,bdX,bdY-18,bdW,bdH+20);
    if(this.selectedIndex===2){ctx.fillStyle='rgba(255,255,240,0.025)';ctx.fillRect(bdX-5,bdY-22,bdW+10,bdH+26);}
    ctx.save();ctx.globalAlpha=0.05;ctx.fillStyle='#000';ctx.fillRect(bdX+4,bdY+bdH,bdW-4,6);ctx.restore();
    ctx.fillStyle='#959595';ctx.fillRect(bdX,bdY-18,7,bdH+18);
    ctx.fillStyle='#a8a8a8';ctx.fillRect(bdX,bdY,bdW,bdH);ctx.strokeStyle='#8e8e8e';ctx.lineWidth=0.8;ctx.strokeRect(bdX,bdY,bdW,bdH);
    ctx.fillStyle='#bfbfbf';ctx.fillRect(bdX+8,bdY+4,bdW-10,bdH-8);
    ctx.fillStyle='#ccc';ctx.beginPath();ctx.ellipse(bdX+8+bdW*0.1,bdY+4+bdH*0.25,bdW*0.09,bdH*0.2,0,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#b5b5b5';ctx.lineWidth=0.3;ctx.stroke();
    ctx.strokeStyle='#aaa';ctx.lineWidth=0.5;ctx.beginPath();ctx.moveTo(bdX+8+bdW*0.25,bdY+4);ctx.lineTo(bdX+8+bdW*0.25,bdY+bdH-8);ctx.stroke();

    // TOY BOX
    const tbW=w*0.075,tbH=(h-fY)*0.35,tbX=w*0.18,tbY=fY+8+(h-fY)*0.35;
    this._hit(1,tbX-3,tbY-5,tbW+6,tbH+8);
    if(this.selectedIndex===1){ctx.fillStyle='rgba(255,255,240,0.03)';ctx.fillRect(tbX-6,tbY-8,tbW+12,tbH+14);}
    ctx.save();ctx.globalAlpha=0.04;ctx.fillStyle='#000';ctx.fillRect(tbX+2,tbY+tbH,tbW-2,4);ctx.restore();
    ctx.fillStyle='#a0a0a0';ctx.fillRect(tbX,tbY,tbW,tbH);ctx.strokeStyle='#888';ctx.lineWidth=0.6;ctx.strokeRect(tbX,tbY,tbW,tbH);
    ctx.fillStyle='#aaa';ctx.fillRect(tbX-2,tbY-4,tbW+4,5);ctx.strokeStyle='#888';ctx.lineWidth=0.4;ctx.strokeRect(tbX-2,tbY-4,tbW+4,5);
    ctx.fillStyle='#888';ctx.fillRect(tbX+tbW/2-2,tbY-2,4,4);

    // DOOR
    const drW=50,drH=fY*0.78,drX=w-drW-w*0.04,drY=fY-drH;
    this._doorHit={x:drX,y:drY,w:drW,h:drH};
    ctx.save();ctx.globalAlpha=0.04;ctx.fillStyle='#000';ctx.fillRect(drX+3,drY+3,drW,drH);ctx.restore();
    ctx.fillStyle='#a8a8a8';ctx.fillRect(drX-4,drY-4,drW+8,drH+4);
    ctx.fillStyle=this.doorUnlocked?'#8a8a8a':'#9e9e9e';ctx.fillRect(drX,drY,drW,drH);
    ctx.strokeStyle='#808080';ctx.lineWidth=0.6;ctx.strokeRect(drX,drY,drW,drH);
    ctx.strokeRect(drX+5,drY+5,drW-10,drH*0.42);ctx.strokeRect(drX+5,drY+drH*0.53,drW-10,drH*0.42);
    ctx.beginPath();ctx.arc(drX+drW-11,drY+drH*0.54,3,0,Math.PI*2);ctx.fillStyle='#777';ctx.fill();
    if(this.doorUnlocked){ctx.fillStyle='rgba(180,170,150,0.15)';ctx.fillRect(drX+2,fY-2,drW-4,3);}

    R.drawFog(ctx,w,h,0.04);
    R.drawNoise(ctx,w,h,0.03);
    R.drawVignette(ctx,w,h,0.35);
  }
  _hit(i,x,y,w,h){const o=this.objects[i];o._hx=x;o._hy=y;o._hw=w;o._hh=h;}
  _drawZoomed(ctx,w,h){
    const obj=this.objects[this.selectedIndex];
    ctx.fillStyle='#c8c8c8';ctx.fillRect(0,0,w,h);
    R.drawNoise(ctx,w,h,0.025);
    ctx.textAlign='center';ctx.textBaseline='middle';
    if(obj.id==='poster'){
      ctx.fillStyle='#d5d5d5';ctx.fillRect(w/2-200,h*0.1,400,h*0.75);ctx.strokeStyle='#aaa';ctx.lineWidth=0.5;ctx.strokeRect(w/2-200,h*0.1,400,h*0.75);
      [{i:'R',x:w/2-110,y:h*0.42,t:'r'},{i:'B',x:w/2,y:h*0.42,t:'b'},{i:'D',x:w/2+110,y:h*0.42,t:'d'}].forEach(a=>{
        ctx.strokeStyle='#777';ctx.lineWidth=1;ctx.beginPath();ctx.arc(a.x,a.y,24,0,Math.PI*2);ctx.stroke();
        if(a.t==='r'){ctx.beginPath();ctx.moveTo(a.x-6,a.y-24);ctx.lineTo(a.x-8,a.y-44);ctx.moveTo(a.x+6,a.y-24);ctx.lineTo(a.x+8,a.y-44);ctx.stroke();}
        else if(a.t==='b'){ctx.beginPath();ctx.moveTo(a.x+24,a.y-2);ctx.lineTo(a.x+36,a.y-6);ctx.moveTo(a.x-14,a.y-10);ctx.lineTo(a.x-26,a.y-20);ctx.lineTo(a.x-18,a.y-10);ctx.stroke();}
        else{ctx.beginPath();ctx.moveTo(a.x+24,a.y);ctx.lineTo(a.x+36,a.y+3);ctx.moveTo(a.x-10,a.y-20);ctx.lineTo(a.x-16,a.y-2);ctx.moveTo(a.x+10,a.y-20);ctx.lineTo(a.x+16,a.y-2);ctx.stroke();}
        ctx.font='300 0.6rem JetBrains Mono,monospace';ctx.fillStyle='#666';ctx.fillText(a.i,a.x+28,a.y-28);
      });
      ctx.strokeStyle='#bbb';ctx.lineWidth=0.4;ctx.beginPath();ctx.moveTo(w/2-130,h*0.6);ctx.lineTo(w/2+130,h*0.6);ctx.stroke();
      ctx.beginPath();ctx.moveTo(w/2+122,h*0.596);ctx.lineTo(w/2+130,h*0.6);ctx.lineTo(w/2+122,h*0.604);ctx.stroke();
    }else if(obj.id==='clock'){
      const cx=w/2,cy=h/2,r=100;
      ctx.beginPath();ctx.arc(cx,cy,r+5,0,Math.PI*2);ctx.fillStyle='#a0a0a0';ctx.fill();
      ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.fillStyle='#d5d5d5';ctx.fill();ctx.strokeStyle='#909090';ctx.lineWidth=1.5;ctx.stroke();
      ctx.font='300 0.7rem JetBrains Mono,monospace';ctx.fillStyle='#777';
      for(let n=1;n<=12;n++){const a=(n-3)*Math.PI/6;ctx.fillText(String(n),cx+Math.cos(a)*76,cy+Math.sin(a)*76+3);}
      ctx.strokeStyle='#444';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+r*0.48,cy);ctx.stroke();
      ctx.lineWidth=1.8;ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx,cy+r*0.65);ctx.stroke();
      ctx.beginPath();ctx.arc(cx,cy,4,0,Math.PI*2);ctx.fillStyle='#444';ctx.fill();
      ctx.font='200 0.5rem Inter,sans-serif';ctx.fillStyle='#999';ctx.fillText('3 : 1 5',w/2,h*0.84);
    }else if(obj.id==='toybox'){
      ctx.fillStyle='#c0c0c0';ctx.fillRect(w/2-160,h*0.16,320,h*0.6);ctx.strokeStyle='#999';ctx.lineWidth=0.5;ctx.strokeRect(w/2-160,h*0.16,320,h*0.6);
      [{l:'R',x:w/2-80,y:h*0.38,b:1},{l:'D',x:w/2+65,y:h*0.44,b:1},{l:'B',x:w/2-10,y:h*0.52,b:1,f:1},{l:'X',x:w/2+20,y:h*0.34,b:0},{l:'Q',x:w/2-50,y:h*0.58,b:0}].forEach(b=>{
        const s=32;ctx.fillStyle=b.b?'#bcbcbc':'#b0b0b0';ctx.fillRect(b.x-s/2,b.y-s/2,s,s);ctx.strokeStyle='#999';ctx.lineWidth=0.4;ctx.strokeRect(b.x-s/2,b.y-s/2,s,s);
        ctx.save();ctx.translate(b.x,b.y);if(b.f)ctx.rotate(Math.PI);ctx.font='400 0.9rem JetBrains Mono,monospace';ctx.fillStyle=b.b?'#555':'#aaa';ctx.fillText(b.l,0,4);ctx.restore();
      });
    }else if(obj.id==='shelf'){
      const sx=w/2-210,sy=h*0.15,sw=420,sh=h*0.6;
      ctx.fillStyle='#bbb';ctx.fillRect(sx,sy,sw,sh);ctx.strokeStyle='#999';ctx.lineWidth=0.8;ctx.strokeRect(sx,sy,sw,sh);
      const t=sw/3;ctx.beginPath();ctx.moveTo(sx+t,sy);ctx.lineTo(sx+t,sy+sh);ctx.moveTo(sx+t*2,sy);ctx.lineTo(sx+t*2,sy+sh);ctx.stroke();
      [{l:'INDEX',x:sx+t/2},{l:'ORDER',x:sx+t+t/2},{l:'IGNORE',x:sx+t*2+t/2}].forEach(b=>{
        const bw=50,bh=sh*0.5;ctx.fillStyle='#a8a8a8';ctx.fillRect(b.x-bw/2,sy+sh*0.25,bw,bh);ctx.strokeStyle='#909090';ctx.lineWidth=0.3;ctx.strokeRect(b.x-bw/2,sy+sh*0.25,bw,bh);
        ctx.font='300 0.5rem JetBrains Mono,monospace';ctx.fillStyle='#666';ctx.fillText(b.l,b.x,sy+sh*0.25+bh/2);
      });
    }else if(obj.id==='bed'){
      ctx.fillStyle='#bbb';ctx.fillRect(w/2-140,h*0.28,280,180);ctx.fillStyle='#ccc';ctx.fillRect(w/2-130,h*0.3,70,60);
      ctx.strokeStyle='#aaa';ctx.lineWidth=0.5;ctx.strokeRect(w/2-140,h*0.28,280,180);
      ctx.font='200 0.45rem Inter,sans-serif';ctx.fillStyle='#bbb';ctx.fillText('nothing notable',w/2,h*0.8);
    }
    R.drawVignette(ctx,w,h,0.25);
  }
  _inspectCurrent(){if(this.selectedIndex<0)return;this.view='zoomed';if(this.manager.audio)this.manager.audio.select();network.clueFound(this.objects[this.selectedIndex].id);}
  onKeyDown(key){
    if(this.view==='zoomed'){if(key==='Backspace'||key==='Escape'){this.view='room';this.selectedIndex=-1;if(this.manager.audio)this.manager.audio.click();}return;}
    if(key==='ArrowRight'||key==='ArrowDown'){this.selectedIndex=(this.selectedIndex+1)%this.objects.length;if(this.manager.audio)this.manager.audio.click();}
    else if(key==='ArrowLeft'||key==='ArrowUp'){this.selectedIndex=(this.selectedIndex-1+this.objects.length)%this.objects.length;if(this.manager.audio)this.manager.audio.click();}
    else if(key==='Enter')this._inspectCurrent();
  }
  onClick(x,y){
    if(this.view==='zoomed'){this.view='room';this.selectedIndex=-1;if(this.manager.audio)this.manager.audio.click();return;}
    for(let i=0;i<this.objects.length;i++){const o=this.objects[i];if(o._hx!==undefined&&x>=o._hx&&x<=o._hx+o._hw&&y>=o._hy&&y<=o._hy+o._hh){this.selectedIndex=i;this._inspectCurrent();return;}}
    if(this.doorUnlocked&&this._doorHit){const d=this._doorHit;if(x>=d.x&&x<=d.x+d.w&&y>=d.y&&y<=d.y+d.h)this.exitFade=0.01;}
  }
  onMouseMove(x,y){
    if(this.view!=='room')return;let f=-1;
    for(let i=0;i<this.objects.length;i++){const o=this.objects[i];if(o._hx!==undefined&&x>=o._hx&&x<=o._hx+o._hw&&y>=o._hy&&y<=o._hy+o._hh){f=i;break;}}
    this.selectedIndex=f;
  }
  destroy(){network.off(Events.TERMINAL_UPDATE);network.off(Events.PUZZLE_SOLVED);network.off(Events.PUZZLE_FAILED);}
}
