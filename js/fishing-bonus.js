// Bônus independente: Pescaria do Chico Fumaça + Boss Tubarão
(() => {
  'use strict';
  const W=1000,H=650,GROUND=530;
  const farmBg=window.assetManager.placeholder('assets/backgrounds/fishing-bonus-lake.webp');
  const chico=window.assetManager.placeholder('assets/npc/chico-fumaca/chico-fumaca-idle.webp');
  const dialogPortraitJoao=window.assetManager.placeholder('assets/ui/portrait-joao.webp');
  const dialogPortraitCrist=window.assetManager.placeholder('assets/ui/portrait-crist.webp');
  const dialogPortraitChico=window.assetManager.placeholder('assets/ui/portrait-chico.webp');
  const sharkImgs={};
  let bonusAssetsLoaded=false;
  function ensureBonusAssets(){
    if(bonusAssetsLoaded)return; bonusAssetsLoaded=true;
    ['idle','walk1','walk2','walk3','attack1','attack2','attack3','special','hurt','dead','roar'].forEach(k=>{sharkImgs[k]=window.assetManager.placeholder(`assets/bosses/shark/${k}.webp`);});
  }

  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const rects=(a,b)=>a.x<a.x+a.w&&a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;

  class FishingBonusController{
    constructor(){this.active=false;this.state='intro';this.players=[];this.chicoNpc=null;this.chicoJustUnlocked=false;this._unlockProcessed=false;this.dialogIndex=0;this.dialogTime=0;this.progress=0;this.tension=25;this.pull=0;this.shark=null;this.resultTimer=0;this.last=performance.now();this.score=0;this.splash=0;this._acceptLast=false;this.fishingTime=0;this.lineBreaks=0;this.reelBursts=0;this.lastReelSound=0;this.castPlayed=false;this.fightTime=0;this.playerDamageTaken=0;this.shake=0;}
    start(count=1){
      ensureBonusAssets();
      this.active=true;this.state='intro';this.dialogIndex=0;this.dialogTime=performance.now();this.progress=0;this.tension=24;this.pull=0;this.score=0;this.splash=0;this.resultTimer=0;this.last=performance.now();this.fishingTime=0;this.lineBreaks=0;this.reelBursts=0;this.lastReelSound=0;this.castPlayed=false;this.fightTime=0;this.playerDamageTaken=0;this.shake=0;
      this.players=[];this.chicoJustUnlocked=false;this._unlockProcessed=false;this._bossXpAwarded=false;
      this.chicoNpc={x:105,y:GROUND-150,w:115,h:150,facingRight:true,attackTimer:0,cooldown:25,hitDone:false,bob:0};
      const p1=new PlayerJoao(240,GROUND,1);p1.x=245;p1.groundY=GROUND;p1.y=GROUND-p1.h;
      p1.evolution=new PlayerEvolution(p1);p1.evolution.load(window.saveSystem?.loadPlayerProgress?.('João'));
      p1.life=p1.maxLife;this.players.push(p1);
      if(count>1){
        const p2=new PlayerCrist(330,GROUND,2);p2.x=335;p2.groundY=GROUND;p2.y=GROUND-p2.h;
        p2.evolution=new PlayerEvolution(p2);p2.evolution.load(window.saveSystem?.loadPlayerProgress?.('Crist'));
        p2.life=p2.maxLife;this.players.push(p2);
      }
      this.shark={x:760,y:GROUND-165,w:150,h:165,life:count>1?1050:760,maxLife:count>1?1050:760,state:'idle',timer:0,cooldown:80,facingRight:false,flash:0,phase:1,chargeV:0,waveTimer:0,deadTimer:0,telegraph:null,telegraphTimer:0,attackHit:false,targetX:0};
      window.soundSystem?.stopMusic?.();
      window.GameDebugConsole?.info?.('[BÔNUS] Pescaria do Chico Fumaça iniciada');
    }
    action(pl,act,keys,gp,controls){return !!(controls?.acaoAtiva?.(pl,act,keys)||gp?.isActionDown?.(pl,act));}
    accept(keys,gp,controls){return !!keys?.enter||this.action(1,'attack',keys,gp,controls)||this.action(1,'ranged',keys,gp,controls);}
    drawBackdrop(ctx){
      if(farmBg.complete&&farmBg.naturalWidth){
        ctx.save();
        ctx.imageSmoothingEnabled=false;
        ctx.drawImage(farmBg,0,0,W,H);
        ctx.restore();
      } else {
        ctx.fillStyle='#5ca4d6'; ctx.fillRect(0,0,W,H);
      }
      // brilho sutil na água para dar vida ao lago sem esconder o background
      ctx.save();
      ctx.globalAlpha=0.12;
      ctx.fillStyle='#ffffff';
      const shimmerY=[322,346,370,394,418,442];
      for(let i=0;i<shimmerY.length;i++){
        const offset=(performance.now()*0.05 + i*53) % 180;
        for(let x=-30;x<W+30;x+=180){
          ctx.fillRect(x+offset, shimmerY[i], 58, 2);
        }
      }
      ctx.restore();
    }
    drawScenePlayer(ctx,p){
      if(!p)return;
      ctx.save();
      ctx.fillStyle='rgba(0,0,0,.26)';ctx.beginPath();ctx.ellipse(p.x+p.w/2,p.groundY+2,p.w/2,4,0,0,Math.PI*2);ctx.fill();
      if(p.name==='João'){
        if(p.rangedCharging||p.rangedRecovery>0)p.drawRangedSprite?.(ctx);else p.drawJoaoSprite?.(ctx);
      }else if(p.name==='Crist'){
        p.drawCristSprite?.(ctx);
      }else{
        p.draw?.(ctx);
      }
      ctx.restore();
    }
    drawPlayerHud(ctx,p,index,total){
      if(!p)return;
      const x=total>1&&index===1?672:10,y=10,w=318,h=92;
      const accent=p.name==='João'?'#2b9fe8':'#e9574a';
      ctx.save();
      ctx.fillStyle='rgba(4,11,24,.90)';ctx.strokeStyle=accent;ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(x,y,w,h,10);ctx.fill();ctx.stroke();
      ctx.textAlign='left';ctx.fillStyle='#fff4dc';ctx.font='bold 16px Righteous';ctx.fillText(`${p.name.toUpperCase()}  P${index+1}`,x+15,y+23);
      const lv=p.evolution?.level||1,xp=p.evolution?.xp||0,need=Math.max(1,p.evolution?.xpToNextLevel||100);
      ctx.textAlign='right';ctx.font='bold 12px Righteous';ctx.fillText(`${Math.max(0,Math.ceil(p.life))}/${Math.max(1,Math.ceil(p.maxLife))}`,x+w-14,y+23);
      const bar=(bx,by,bw,bh,ratio,color)=>{ctx.fillStyle='#101b2a';ctx.fillRect(bx,by,bw,bh);ctx.fillStyle=color;ctx.fillRect(bx+2,by+2,Math.max(0,(bw-4)*clamp(ratio,0,1)),bh-4);ctx.strokeStyle='rgba(255,255,255,.35)';ctx.strokeRect(bx+.5,by+.5,bw-1,bh-1);};
      ctx.textAlign='left';ctx.fillStyle='#d8eaff';ctx.font='10px Righteous';ctx.fillText('VIDA',x+15,y+43);bar(x+52,y+33,w-67,13,p.life/Math.max(1,p.maxLife),p.life/p.maxLife<.3?'#ef4a43':'#48df69');
      ctx.fillText(`NV ${lv}`,x+15,y+68);bar(x+52,y+58,w-67,12,xp/need,'#35cfff');
      ctx.textAlign='right';ctx.fillStyle='#8edfff';ctx.fillText(`XP ${xp}/${need}`,x+w-14,y+80);
      ctx.restore();
    }
    drawFightHud(ctx){
      const total=this.players.length;
      this.players.forEach((p,i)=>this.drawPlayerHud(ctx,p,i,total));
    }
    awardBossXp(){
      if(this._bossXpAwarded)return;this._bossXpAwarded=true;
      const reward=500;
      this.players.forEach(p=>{
        if(!p?.evolution)return;
        p.evolution.addXP?.(reward,{boss:true,source:'fishing_bonus'});
        window.saveSystem?.savePlayerProgress?.(p.name,p.evolution.save());
      });
      window.GameDebugConsole?.info?.(`[BÔNUS] XP do Tubarão salvo: +${reward} por jogador`);
    }
    getChicoFrame(state='idle',speed=180){
      try{
        const frames=CHICO_FRAMES?.[state]||CHICO_FRAMES?.idle||[];
        if(frames.length)return frames[Math.floor(performance.now()/speed)%frames.length]||frames[0];
      }catch(_){}
      return chico;
    }
    drawChico(ctx){
      const img=this.getChicoFrame('idle',190);
      if(img?.complete&&img.naturalWidth){
        const h=150,w=Math.min(125,img.naturalWidth*(h/img.naturalHeight));
        ctx.save();ctx.imageSmoothingEnabled=false;ctx.drawImage(img,112-w/2,348,w,h);ctx.restore();
      }
      ctx.fillStyle='#fff2c8';ctx.font='bold 14px Righteous';ctx.textAlign='center';ctx.fillText('CHICO FUMAÇA',112,338);
    }
    drawFishingRod(ctx,reel){
      const t=performance.now()/1000;
      const bend=(reel?22:8)+Math.sin(t*5)*3+this.tension*.10;
      const handX=320,handY=454;
      const tipX=430+bend,tipY=392-Math.min(20,this.tension*.10);
      const bobX=605+Math.sin(this.pull*1.7)*10,bobY=390+Math.sin(t*4.2)*4;
      ctx.save();
      ctx.strokeStyle='#53351d';ctx.lineWidth=6;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(handX,handY);ctx.quadraticCurveTo(370,418,tipX,tipY);ctx.stroke();
      ctx.strokeStyle='#e9eef2';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(tipX,tipY);ctx.quadraticCurveTo(500,360,bobX,bobY);ctx.stroke();
      ctx.fillStyle='#f6f6f6';ctx.beginPath();ctx.arc(bobX,bobY,7,0,Math.PI*2);ctx.fill();ctx.fillStyle='#e64f3a';ctx.beginPath();ctx.arc(bobX,bobY-2,6,Math.PI,Math.PI*2);ctx.fill();
      const rings=2+Math.floor(this.progress/34);
      ctx.strokeStyle='rgba(180,235,255,.42)';ctx.lineWidth=2;
      for(let i=0;i<rings;i++){const rr=16+i*12+((t*24)%10);ctx.globalAlpha=.42-i*.08;ctx.beginPath();ctx.ellipse(bobX,bobY+6,rr,rr*.28,0,0,Math.PI*2);ctx.stroke();}
      // Sombra crescendo do "peixe" para antecipar o tubarão sem revelar cedo demais.
      const shadowAlpha=clamp((this.progress-28)/72,0,.34);
      if(shadowAlpha>0){ctx.globalAlpha=shadowAlpha;ctx.fillStyle='#08263c';ctx.beginPath();ctx.ellipse(bobX+18,bobY+42,45+this.progress*.72,12+this.progress*.13,-.10,0,Math.PI*2);ctx.fill();}
      ctx.restore();
      return {bobX,bobY};
    }
    updateChicoNpc(dt){
      const n=this.chicoNpc,s=this.shark;if(!n||!s||s.life<=0)return;
      const targetX=clamp(s.x-(n.w+52),35,850);
      const dx=targetX-n.x;
      n.facingRight=(s.x+s.w/2)>(n.x+n.w/2);
      n.bob+=dt*9;
      if(n.attackTimer>0){
        n.attackTimer-=dt*60;
        if(n.attackTimer<=7&&!n.hitDone){n.hitDone=true;this.damageShark(s.phase===2?14:12);this.score+=45;window.soundSystem?.playSound?.('punch2');}
      } else {
        n.cooldown-=dt*60;
        if(Math.abs(dx)>14)n.x+=Math.sign(dx)*Math.min(Math.abs(dx),115*dt);
        if(Math.abs((s.x+s.w/2)-(n.x+n.w/2))<145&&n.cooldown<=0){n.attackTimer=15;n.cooldown=48;n.hitDone=false;}
      }
      n.x=clamp(n.x,20,850);
    }
    drawChicoNpc(ctx){
      const n=this.chicoNpc;if(!n)return;
      const attack=n.attackTimer>0;
      const bob=attack?0:Math.sin(n.bob)*2;
      const lean=attack?(n.facingRight?10:-10):0;
      const x=n.x+lean,y=n.y+bob;
      ctx.save();ctx.imageSmoothingEnabled=false;
      ctx.globalAlpha=.24;ctx.fillStyle='#000';ctx.beginPath();ctx.ellipse(x+n.w/2,GROUND+1,43,7,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
      const img=this.getChicoFrame(attack?'attack':(Math.abs((this.shark?.x||0)-(n.x+n.w/2))>160?'walk':'idle'),attack?105:120);
      if(img?.complete&&img.naturalWidth){
        const ratio=img.naturalWidth/img.naturalHeight,dh=attack?154:150,dw=Math.min(155,dh*ratio),dx=x+n.w/2-dw/2,dy=y+n.h-dh;
        if(!n.facingRight){ctx.translate(dx+dw,0);ctx.scale(-1,1);ctx.drawImage(img,0,dy,dw,dh);}else ctx.drawImage(img,dx,dy,dw,dh);
      }
      if(attack&&n.attackTimer<=11&&n.attackTimer>=5){ctx.globalAlpha=.35;ctx.strokeStyle='#ffd25e';ctx.lineWidth=8;ctx.beginPath();const cx=n.facingRight?x+n.w+16:x-16;ctx.arc(cx,y+72,28,n.facingRight?-1.2:2.05,n.facingRight?1.15:4.25);ctx.stroke();}
      ctx.restore();
      ctx.fillStyle='#ffe28b';ctx.font='bold 12px Righteous';ctx.textAlign='center';ctx.fillText('CHICO • NPC',x+n.w/2,y-6);
    }
    drawDialog(ctx,name,text){
      const speaker=(name||'').toLowerCase();
      const portrait=(speaker.includes('joão')||speaker.includes('joao'))?dialogPortraitJoao:(speaker.includes('crist')?dialogPortraitCrist:(speaker.includes('chico')?dialogPortraitChico:null));
      const x=55,y=490,w=890,h=142;
      ctx.save();
      ctx.fillStyle='rgba(3,10,25,.95)';ctx.strokeStyle='#29a8ff';ctx.lineWidth=4;
      ctx.beginPath();ctx.roundRect(x,y,w,h,15);ctx.fill();ctx.stroke();
      let tx=x+28;
      if(portrait?.complete&&portrait.naturalWidth){
        const bx=x+16,by=y+14,bw=100,bh=112;
        ctx.fillStyle='#08295f';ctx.fillRect(bx,by,bw,bh);ctx.strokeStyle='#55c5ff';ctx.lineWidth=2;ctx.strokeRect(bx+.5,by+.5,bw-1,bh-1);
        const sc=Math.min((bw-8)/portrait.naturalWidth,(bh-8)/portrait.naturalHeight);const pw=portrait.naturalWidth*sc,ph=portrait.naturalHeight*sc;
        ctx.imageSmoothingEnabled=false;ctx.drawImage(portrait,bx+(bw-pw)/2,by+(bh-ph)/2,pw,ph);tx=x+136;
      }
      ctx.fillStyle='#ffd76a';ctx.font='bold 22px Bebas Neue';ctx.textAlign='left';ctx.fillText(name,tx,y+34);
      ctx.fillStyle='#f4f8ff';ctx.font='15px Righteous';
      const maxWidth=x+w-tx-24,words=String(text||'').split(/\s+/);let line='',yy=y+68;
      for(const word of words){const test=line?line+' '+word:word;if(ctx.measureText(test).width>maxWidth&&line){ctx.fillText(line,tx,yy);line=word;yy+=23;}else line=test;}if(line)ctx.fillText(line,tx,yy);
      ctx.fillStyle='#8fdcff';ctx.font='10px Righteous';ctx.textAlign='right';ctx.fillText('ATAQUE / ENTER para avançar',x+w-20,y+h-15);
      ctx.restore();
    }
    updateIntro(ctx,keys,gp,controls){
      const lines=[
        ['CHICO FUMAÇA','O açude tá calmo hoje... mas eu não confiaria demais nisso.'],
        ['JOÃO','Depois da estrada inteira, eu só quero pescar em paz.'],
        ['CRIST','Se for tilápia, já valeu a viagem.'],
        ['CHICO FUMAÇA','Só não puxa com força demais se o anzol agarrar em alguma coisa grande...']
      ];
      const accept=this.accept(keys,gp,controls);if(accept&&!this._acceptLast){this.dialogIndex++;window.soundSystem?.playSound?.('menuSelect');if(this.dialogIndex>=lines.length){this.state='fishing';this.dialogIndex=0;this.castPlayed=true;window.soundSystem?.playSound?.('fishingCast');window.soundSystem?.startMusic?.('slow');}}
      this._acceptLast=accept;
      this.drawBackdrop(ctx);this.drawChico(ctx);this.players.forEach(p=>this.drawScenePlayer(ctx,p));if(this.state==='intro'){const l=lines[this.dialogIndex];this.drawDialog(ctx,l[0],l[1]);}
    }
    updateFishing(ctx,dt,keys,gp,controls){
      this.fishingTime+=dt;
      this.drawBackdrop(ctx);this.drawChico(ctx);this.players.forEach(p=>this.drawScenePlayer(ctx,p));
      const reel=this.accept(keys,gp,controls);
      this.pull+=dt*(.8+Math.random()*.9);const fishForce=35+Math.sin(this.pull*2.1)*24+Math.sin(this.pull*.73)*13;
      this.tension+=dt*(reel?34:-24)+dt*(fishForce-35)*.25;this.tension=clamp(this.tension,0,110);
      if(reel&&this.tension<92){this.progress+=dt*(12+(92-this.tension)*.08);this.reelBursts+=dt;const now=performance.now();if(now-this.lastReelSound>180){this.lastReelSound=now;window.soundSystem?.playSound?.('fishingReel');}}
      else this.progress-=dt*(this.tension>98?16:2.5);
      this.progress=clamp(this.progress,0,100);
      if(this.tension>104){this.progress=Math.max(0,this.progress-18);this.tension=62;this.lineBreaks++;this.shake=8;window.soundSystem?.playSound?.('hit');window.gamepadSystem?.rumble?.(1,160,.55,.25);}

      this.drawFishingRod(ctx,reel);
      if(this.progress>55){
        const alpha=clamp((this.progress-55)/45,0,.45);
        ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle='#d9f6ff';ctx.font='bold 15px Righteous';ctx.textAlign='center';ctx.fillText(this.progress>85?'TEM ALGO MUITO GRANDE AÍ...':'A LINHA ESTÁ PESADA!',605,458);ctx.restore();
      }
      if(this.shake>0){this.shake=Math.max(0,this.shake-dt*18);ctx.save();ctx.globalAlpha=.12;ctx.fillStyle='#fff';ctx.fillRect(0,0,W,H);ctx.restore();}

      ctx.fillStyle='rgba(5,7,10,.88)';ctx.strokeStyle='#d5a247';ctx.lineWidth=3;ctx.beginPath();ctx.roundRect(205,72,590,138,15);ctx.fill();ctx.stroke();ctx.fillStyle='#fff4d4';ctx.font='bold 31px Bebas Neue';ctx.textAlign='center';ctx.fillText('PESCARIA DO CHICO FUMAÇA',500,108);
      ctx.font='12px Righteous';ctx.fillStyle='#bfeeff';ctx.fillText('SEGURE ATAQUE para puxar • solte para aliviar a linha',500,132);
      const bx=285,bw=430;ctx.fillStyle='#1b2230';ctx.fillRect(bx,153,bw,14);ctx.fillStyle=this.tension>90?'#ff4a43':this.tension>68?'#ffc34b':'#55db7a';ctx.fillRect(bx,153,bw*(this.tension/110),14);ctx.fillStyle='#fff';ctx.font='10px Righteous';ctx.textAlign='left';ctx.fillText('TENSÃO',bx,147);
      ctx.fillStyle='#1b2230';ctx.fillRect(bx,181,bw,12);ctx.fillStyle='#53c7ff';ctx.fillRect(bx,181,bw*(this.progress/100),12);ctx.fillStyle='#fff';ctx.fillText('PEIXE',bx,177);
      if(this.lineBreaks>0){ctx.textAlign='right';ctx.fillStyle='#ffb86b';ctx.fillText(`LINHA ESTOUROU ${this.lineBreaks}x`,bx+bw,147);}

      if(this.progress>=100){
        this.state='reveal';this.resultTimer=0;this.splash=1;this.shake=14;
        window.soundSystem?.stopMusic?.();window.soundSystem?.playSound?.('fishingSplash');window.soundSystem?.playSound?.('sharkRoar');
        window.gamepadSystem?.rumble?.(1,420,.95,.65);
      }
    }
    drawShark(ctx,imgKey,x,y,w=170,h=180,flip=false){const im=sharkImgs[imgKey]||sharkImgs.idle;if(!im?.complete||!im.naturalWidth)return;ctx.save();ctx.imageSmoothingEnabled=false;if(flip){ctx.translate(x+w,0);ctx.scale(-1,1);ctx.drawImage(im,0,y,w,h);}else ctx.drawImage(im,x,y,w,h);ctx.restore();}
    updateReveal(ctx,dt){
      this.resultTimer+=dt;this.drawBackdrop(ctx);this.drawChico(ctx);this.players.forEach(p=>this.drawScenePlayer(ctx,p));
      const t=clamp(this.resultTimer/3.4,0,1);
      const shakeAmt=t<.72?Math.sin(this.resultTimer*48)*Math.min(8,this.resultTimer*4):0;
      ctx.save();ctx.translate(shakeAmt,0);
      // água entra em turbulência antes do salto
      ctx.globalAlpha=Math.min(1,t*2);
      for(let i=0;i<14;i++){const a=i*.73+this.resultTimer*3;const rr=24+i*7+t*80;ctx.strokeStyle=`rgba(150,230,255,${.34*(1-t*.35)})`;ctx.lineWidth=2+(i%3);ctx.beginPath();ctx.ellipse(620+Math.cos(a)*18,410+Math.sin(a)*5,rr,rr*.22,0,0,Math.PI*2);ctx.stroke();}
      if(t>.18){const st=clamp((t-.18)/.42,0,1);ctx.globalAlpha=.16+.30*st;ctx.fillStyle='#092638';ctx.beginPath();ctx.ellipse(625,430,60+st*125,18+st*30,-.08,0,Math.PI*2);ctx.fill();}
      if(t>.42){
        const jump=clamp((t-.42)/.48,0,1);const sy=455-Math.sin(Math.min(1,jump)*Math.PI)*245;
        ctx.globalAlpha=1;this.drawShark(ctx,'roar',545,sy,245,245,false);
        for(let i=0;i<18;i++){ctx.fillStyle=`rgba(185,239,255,${.55*(1-jump*.35)})`;ctx.beginPath();ctx.arc(650+Math.cos(i*.91)*jump*115,430-Math.sin(i*.77)*jump*155,7+(i%4)*4,0,Math.PI*2);ctx.fill();}
      }
      ctx.restore();
      ctx.fillStyle='#fff';ctx.shadowColor='#167db5';ctx.shadowBlur=14;ctx.font='bold 40px Bebas Neue';ctx.textAlign='center';
      ctx.fillText(t<.32?'A LINHA NÃO PARA DE PUXAR!':t<.62?'CHICO... ISSO É ENORME!':'TUBARÃO DO AÇUDE',500,96);ctx.shadowBlur=0;
      if(this.resultTimer>3.4){
        this.state='fight';this.resultTimer=0;this.fightTime=0;this.shark.x=745;this.shark.y=GROUND-165;this.shark.cooldown=95;this.shark.telegraph=null;this.shark.attackHit=false;
        window.soundSystem?.startMusic?.('fast');
      }
    }
    updatePlayerFight(p,pl,dt,keys,gp,controls){
      if(p.life<=0)return;
      const left=this.action(pl,'left',keys,gp,controls),right=this.action(pl,'right',keys,gp,controls),jump=this.action(pl,'up',keys,gp,controls),attack=this.action(pl,'attack',keys,gp,controls),dash=this.action(pl,'dash',keys,gp,controls);
      if(dash&&!p.dashing&&p.dashCooldown<=0&&!p.attacking){
        p.dashing=true;p.dashTimer=p.dashDuration||8;p.dashCooldown=p.evolution?.getDashCooldown?.(60)??60;p.invulnerable=p.dashDuration||8;p._fishingDashHit=false;
      }
      if(p.dashing){
        p.dashTimer--;p.x+=(p.facingRight?1:-1)*(p.dashSpeed||15);
        if(p.dashTimer<=0){p.dashing=false;p._fishingDashHit=false;}
      }
      if(!p.attacking&&!p.dashing){if(left){p.x-=p.speed*60*dt;p.facingRight=false;p.isMoving=true;}else if(right){p.x+=p.speed*60*dt;p.facingRight=true;p.isMoving=true;}else p.isMoving=false;}
      p.x=clamp(p.x,15,925-p.w);
      if(jump&&!p.isJumping&&!p.dashing){p.isJumping=true;p.jumpPower=-16;}
      if(p.isJumping){p.y+=p.jumpPower;p.jumpPower+=.8;if(p.y+p.h>=GROUND){p.y=GROUND-p.h;p.jumpPower=0;p.isJumping=false;}}
      if(attack&&!p.attacking&&p.attackCooldown<=0&&!p.dashing){p.attacking=true;p.attackTimer=15;p.attackCooldown=p.evolution?.getAttackCooldown?.(20)??20;p._fishingHitDone=false;window.soundSystem?.playSound?.('punch');}
      if(p.attacking){p.attackTimer--;if(p.attackTimer<=0){p.attacking=false;p._fishingHitDone=false;}}
      if(p.attackCooldown>0)p.attackCooldown--;if(p.dashCooldown>0)p.dashCooldown--;if(p.invulnerable>0)p.invulnerable--;
      p.evolution?.update?.();
    }
    bossBody(){const s=this.shark;return{x:s.x+20,y:s.y+20,w:s.w-35,h:s.h-20};}
    damageShark(amount){const s=this.shark;if(s.life<=0)return;s.life=Math.max(0,s.life-amount);s.flash=8;window.soundSystem?.playSound?.('enemyHit');if(s.life<=s.maxLife*.55)s.phase=2;if(s.life<=0){s.state='dead';s.deadTimer=0;window.soundSystem?.playSound?.('enemyDeath');}}
    updateBoss(dt){
      const s=this.shark;if(s.flash>0)s.flash--;if(s.life<=0){s.deadTimer+=dt;return;}
      const living=this.players.filter(p=>p.life>0);if(!living.length)return;
      const target=living.sort((a,b)=>Math.abs(a.x-s.x)-Math.abs(b.x-s.x))[0];const dx=target.x-s.x;const dist=Math.abs(dx);s.facingRight=dx>0;

      if(s.state==='warn-charge'||s.state==='warn-special'||s.state==='warn-bite'){
        s.telegraphTimer-=dt;
        if(s.telegraphTimer<=0){
          s.attackHit=false;
          if(s.state==='warn-charge'){s.state='charge';s.timer=.82;s.chargeV=(s.facingRight?1:-1)*(s.phase===2?410:335);window.soundSystem?.playSound?.('sharkCharge');}
          else if(s.state==='warn-special'){s.state='special';s.timer=1.25;s.waveTimer=.55;window.soundSystem?.playSound?.('sharkWave');}
          else{s.state='bite';s.timer=.62;window.soundSystem?.playSound?.('sharkBite');}
        }
        return;
      }
      if(s.state==='charge'){s.x+=s.chargeV*dt;s.timer-=dt;if(s.timer<=0||s.x<20||s.x>820){s.state='idle';s.cooldown=s.phase===2?58:82;}return;}
      if(s.state==='special'){s.timer-=dt;if(s.timer<=0){s.state='idle';s.cooldown=s.phase===2?68:86;}return;}
      if(s.state==='bite'){s.timer-=dt;if(s.timer<=0){s.state='idle';s.cooldown=s.phase===2?48:60;}return;}

      s.cooldown-=dt*60;
      if(s.cooldown<=0){
        const r=Math.random();
        if(r<.34){s.state='warn-charge';s.telegraphTimer=s.phase===2?.48:.62;s.targetX=target.x;window.soundSystem?.playSound?.('sharkRoar');}
        else if(r<.62){s.state='warn-special';s.telegraphTimer=s.phase===2?.58:.72;s.targetX=target.x;window.soundSystem?.playSound?.('sharkRoar');}
        else{s.state='warn-bite';s.telegraphTimer=s.phase===2?.34:.48;s.targetX=target.x;window.soundSystem?.playSound?.('sharkRoar');}
        return;
      }
      if(dist>120){s.x+=Math.sign(dx)*(s.phase===2?96:72)*dt;}s.x=clamp(s.x,30,820);
    }
    damagePlayer(p,amount){
      if(!p||p.life<=0)return;
      const before=p.life;
      p.takeDamage?.(amount);
      this.playerDamageTaken+=Math.max(0,before-p.life);
    }
    resolveCombat(){
      const s=this.shark;if(s.life<=0)return;const body=this.bossBody();
      this.players.forEach(p=>{
        if(p.life<=0)return;
        if(p.dashing&&p.evolution?.hasSkill?.('Dash Mortal')&&!p._fishingDashHit){
          const pb=p.getBodyBounds?.()||{x:p.x,y:p.y,w:p.w,h:p.h};
          if(pb.x<body.x+body.w&&pb.x+pb.w>body.x&&pb.y<body.y+body.h&&pb.y+pb.h>body.y){
            p._fishingDashHit=true;
            const mult=p.evolution?.getOutgoingDamageMultiplier?.()||1;
            const dd=Math.round((24+(p.evolution?.getMeleeDamageBonus?.()||0)*.65)*mult);
            this.damageShark(dd);this.score+=75;
          }
        }
        if(p.attacking&&!p._fishingHitDone&&p.attackTimer<=10&&p.attackTimer>=6){
          const hb=p.getHitbox?.();
          if(hb&&hb.x<body.x+body.w&&hb.x+hb.w>body.x&&hb.y<body.y+body.h&&hb.y+hb.h>body.y){
            p._fishingHitDone=true;
            const mult=p.evolution?.getOutgoingDamageMultiplier?.()||1;
            const base=(p.name==='Crist'?22:p.name==='Chico Fumaça'?25:19)+(p.evolution?.getMeleeDamageBonus?.()||0);
            const count=p.evolution?.getComboHitCount?.()||1;
            const scales=count>=3?[1,.55,.45]:count===2?[1,.60]:[1];
            let total=0;scales.forEach(sc=>{const d=Math.max(1,Math.round(base*sc*mult));total+=d;this.damageShark(d);p.addCombo?.();});
            if(p.evolution?.shouldTriggerComboExplosion?.(p.combo||0)){const wave=Math.max(10,Math.round(total*.35));this.damageShark(wave);this.score+=wave*2;}
            this.score+=100;
          }
        }
      });
      if(s.state==='bite'&&!s.attackHit&&s.timer<.35&&s.timer>.12){
        s.attackHit=true;this.players.forEach(p=>{if(Math.abs((p.x+p.w/2)-(s.x+s.w/2))<115&&Math.abs((p.y+p.h/2)-(s.y+s.h/2))<90)this.damagePlayer(p,18);});
        this.shake=10;window.gamepadSystem?.rumble?.(1,150,.55,.32);
      }
      if(s.state==='charge'&&!s.attackHit){
        let hit=false;this.players.forEach(p=>{if(p.x<body.x+body.w&&p.x+p.w>body.x&&p.y<body.y+body.h&&p.y+p.h>body.y){this.damagePlayer(p,14);hit=true;}});
        if(hit){s.attackHit=true;this.shake=12;window.gamepadSystem?.rumble?.(1,180,.7,.4);}
      }
      if(s.state==='special'&&s.waveTimer>0){s.waveTimer-=1/60;if(s.waveTimer<=0&&!s.attackHit){s.attackHit=true;this.players.forEach(p=>{if(Math.abs((p.x+p.w/2)-(s.x+s.w/2))<330)this.damagePlayer(p,16);});this.shake=14;window.gamepadSystem?.rumble?.(1,220,.7,.45);}}
    }
    drawFight(ctx){
      const shakeX=this.shake>0?(Math.random()*2-1)*this.shake:0;
      const shakeY=this.shake>0?(Math.random()*2-1)*this.shake*.45:0;
      ctx.save();ctx.translate(shakeX,shakeY);
      this.drawBackdrop(ctx);this.drawChicoNpc(ctx);this.players.forEach(p=>this.drawScenePlayer(ctx,p));
      const s=this.shark;let key='idle';
      if(s.life<=0)key='dead';else if(s.flash>0)key='hurt';else if(s.state==='special'||s.state==='warn-special')key='special';else if(s.state==='bite'||s.state==='warn-bite')key='attack3';else if(s.state==='charge'||s.state==='warn-charge')key='attack1';else key=['walk1','walk2','walk3'][Math.floor(performance.now()/150)%3];
      this.drawShark(ctx,key,s.x,s.y,s.w,s.h,!s.facingRight);

      // Telegraphs claros: vermelho=charge, amarelo=mordida, azul=onda.
      if(s.state==='warn-charge'){
        const pulse=.45+.35*Math.sin(performance.now()/55);ctx.save();ctx.globalAlpha=pulse;ctx.strokeStyle='#ff514b';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(s.x+s.w/2,s.y+s.h/2);ctx.lineTo(s.facingRight?W:0,s.y+s.h/2);ctx.stroke();ctx.fillStyle='#ff514b';ctx.font='bold 24px Bebas Neue';ctx.textAlign='center';ctx.fillText('CARGA!',s.x+s.w/2,s.y-8);ctx.restore();
      }else if(s.state==='warn-bite'){
        ctx.save();ctx.globalAlpha=.5+.3*Math.sin(performance.now()/45);ctx.strokeStyle='#ffd65a';ctx.lineWidth=6;ctx.beginPath();ctx.arc(s.x+s.w/2,s.y+s.h/2,105,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#ffd65a';ctx.font='bold 22px Bebas Neue';ctx.textAlign='center';ctx.fillText('MORDIDA!',s.x+s.w/2,s.y-8);ctx.restore();
      }else if(s.state==='warn-special'){
        ctx.save();ctx.globalAlpha=.38+.25*Math.sin(performance.now()/70);ctx.strokeStyle='#56d7ff';ctx.lineWidth=9;ctx.beginPath();ctx.arc(s.x+s.w/2,s.y+s.h/2,140,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.arc(s.x+s.w/2,s.y+s.h/2,250,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#8fe8ff';ctx.font='bold 22px Bebas Neue';ctx.textAlign='center';ctx.fillText('ONDA!',s.x+s.w/2,s.y-8);ctx.restore();
      }
      if(s.state==='special'&&s.life>0){ctx.strokeStyle='rgba(65,195,255,.75)';ctx.lineWidth=14;ctx.beginPath();ctx.arc(s.x+s.w/2,s.y+s.h/2,115,-1.2,1.2);ctx.stroke();}
      ctx.restore();
      this.shake=Math.max(0,this.shake-.8);

      // HUD dos jogadores só durante a batalha.
      this.drawFightHud(ctx);
      ctx.fillStyle='rgba(4,7,12,.9)';ctx.strokeStyle='#58c9ff';ctx.lineWidth=3;ctx.beginPath();ctx.roundRect(260,112,480,54,12);ctx.fill();ctx.stroke();ctx.fillStyle='#fff4d5';ctx.font='bold 20px Bebas Neue';ctx.textAlign='center';ctx.fillText('TUBARÃO DO AÇUDE',500,134);ctx.fillStyle='#1a2430';ctx.fillRect(292,143,416,11);ctx.fillStyle=s.phase===2?'#ff4b3e':'#4fc7ff';ctx.fillRect(292,143,416*(s.life/s.maxLife),11);
      ctx.fillStyle='#fff';ctx.font='11px Righteous';ctx.textAlign='center';ctx.fillText(`BÔNUS • SCORE ${this.score} • ${Math.floor(this.fightTime)}s`,500,178);
      if(s.phase===2&&s.life>0){ctx.fillStyle='#ffb15a';ctx.font='bold 13px Righteous';ctx.fillText('FASE 2 • TUBARÃO ENFURECIDO',500,198);}
    }
    updateFight(ctx,dt,keys,gp,controls){
      this.fightTime+=dt;
      this.players.forEach((p,i)=>this.updatePlayerFight(p,i+1,dt,keys,gp,controls));
      this.updateBoss(dt);this.updateChicoNpc(dt);this.resolveCombat();this.drawFight(ctx);
      if(this.players.every(p=>p.life<=0)){this.state='lose';this.resultTimer=0;window.soundSystem?.stopMusic?.();window.soundSystem?.playSound?.('gameOver');return;}
      if(this.shark.life<=0&&this.shark.deadTimer>2.2){this.awardBossXp();this.state='win';this.resultTimer=0;this.score+=2000;window.soundSystem?.stopMusic?.();window.soundSystem?.playSound?.('victory');}
    }
    getResultRank(){
      const totalTime=this.fishingTime+this.fightTime;
      let pts=100;
      pts-=Math.min(35,this.lineBreaks*10);
      pts-=Math.min(35,this.playerDamageTaken*.25);
      pts-=Math.max(0,totalTime-45)*.55;
      if(this.players.every(p=>p.life>0))pts+=8;
      if(pts>=88)return'S';if(pts>=72)return'A';if(pts>=55)return'B';return'C';
    }
    updateWin(ctx,dt,keys,gp,controls){
      this.resultTimer+=dt;
      if(!this._unlockProcessed){this._unlockProcessed=true;this.chicoJustUnlocked=!!window.saveSystem?.unlockChico?.();window.GameDebugConsole?.info?.(this.chicoJustUnlocked?'[BÔNUS] Chico Fumaça desbloqueado como personagem jogável':'[BÔNUS] Chico Fumaça já estava desbloqueado');}
      this.drawBackdrop(ctx);this.drawChicoNpc(ctx);this.players.forEach(p=>this.drawScenePlayer(ctx,p));this.drawShark(ctx,'dead',650,GROUND-120,190,90,false);
      const rank=this.getResultRank();
      ctx.fillStyle='rgba(0,0,0,.76)';ctx.beginPath();ctx.roundRect(155,92,690,330,18);ctx.fill();ctx.strokeStyle='#f0bd55';ctx.lineWidth=4;ctx.stroke();
      ctx.fillStyle='#ffe07a';ctx.font='bold 42px Bebas Neue';ctx.textAlign='center';ctx.fillText('LENDAS DO AÇUDE!',500,148);
      ctx.fillStyle=rank==='S'?'#7dffb0':rank==='A'?'#8fdcff':'#ffd36c';ctx.font='bold 62px Bebas Neue';ctx.fillText(`RANK ${rank}`,500,212);
      ctx.fillStyle='#fff';ctx.font='14px Righteous';
      ctx.fillText(`Pescaria: ${this.fishingTime.toFixed(1)}s   •   Luta: ${this.fightTime.toFixed(1)}s`,500,248);
      ctx.fillText(`Dano recebido: ${Math.round(this.playerDamageTaken)}   •   Linha estourou: ${this.lineBreaks}x`,500,275);
      ctx.fillStyle='#8fdcff';ctx.fillText(`SCORE FINAL • ${this.score} pontos   •   +500 XP por jogador`,500,304);
      ctx.fillStyle='#79ef9a';ctx.font='bold 17px Bebas Neue';ctx.fillText(this.chicoJustUnlocked?'NOVO LUTADOR DESBLOQUEADO: CHICO FUMAÇA!':'CHICO FUMAÇA JÁ ESTÁ DISPONÍVEL',500,338);
      ctx.fillStyle='#fff1c8';ctx.font='13px Righteous';ctx.fillText('CHICO: “Eu avisei que esse açude não era normal...”',500,366);
      ctx.fillStyle='#f5c04a';ctx.fillText('ATAQUE / ENTER para voltar ao seletor',500,398);
      const acc=this.accept(keys,gp,controls);if(acc&&!this._acceptLast&&this.resultTimer>.7){this.active=false;return'DONE';}this._acceptLast=acc;return null;
    }
    updateLose(ctx,dt,keys,gp,controls){
      this.resultTimer+=dt;this.drawBackdrop(ctx);this.drawChicoNpc(ctx);this.players.forEach(p=>this.drawScenePlayer(ctx,p));this.drawShark(ctx,'roar',650,GROUND-170,185,185,false);
      ctx.fillStyle='rgba(0,0,0,.78)';ctx.beginPath();ctx.roundRect(190,150,620,230,18);ctx.fill();ctx.strokeStyle='#ff654f';ctx.lineWidth=4;ctx.stroke();
      ctx.fillStyle='#ff7865';ctx.font='bold 42px Bebas Neue';ctx.textAlign='center';ctx.fillText('O TUBARÃO VENCEU!',500,214);
      ctx.fillStyle='#fff1d6';ctx.font='15px Righteous';ctx.fillText('CHICO: “Levanta! Esse bicho não vai levar meu açude!”',500,256);
      ctx.fillStyle='#8fdcff';ctx.font='13px Righteous';ctx.fillText('ATAQUE / ENTER: tentar novamente   •   PAUSE: voltar ao menu',500,310);
      const acc=this.accept(keys,gp,controls);if(acc&&!this._acceptLast&&this.resultTimer>.7){const count=this.players.length;this.start(count);return null;}this._acceptLast=acc;return null;
    }
    updateDraw(ctx,keys,gp,controls){if(!this.active)return'DONE';const now=performance.now();const dt=Math.min(.033,Math.max(.001,(now-this.last)/1000));this.last=now;if(this.state==='intro'){this.updateIntro(ctx,keys,gp,controls);return null;}if(this.state==='fishing'){this.updateFishing(ctx,dt,keys,gp,controls);return null;}if(this.state==='reveal'){this.updateReveal(ctx,dt);return null;}if(this.state==='fight'){this.updateFight(ctx,dt,keys,gp,controls);return null;}if(this.state==='win')return this.updateWin(ctx,dt,keys,gp,controls);if(this.state==='lose')return this.updateLose(ctx,dt,keys,gp,controls);return null;}
  }
  window.FishingBonusController=FishingBonusController;window.fishingBonus=new FishingBonusController();
})();
