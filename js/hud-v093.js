// v0.9.4 - HUD 16-bit com moldura visual e dados 100% dinâmicos.
(() => {
  const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
  const load=(src)=>window.assetManager.image(src,'shared');
  const hudFrames={
    'João':load('assets/ui/hud-joao-frame.webp'),
    'Crist':load('assets/ui/hud-crist-frame.webp'),
    'Chico Fumaça':load('assets/ui/hud-chico-frame.webp')
  };
  const portraits={
    'João':load('assets/ui/portrait-joao.webp'),
    'Crist':load('assets/ui/portrait-crist.webp'),
    'Chico Fumaça':load('assets/ui/portrait-chico.webp')
  };

  function pixelPanel(x,y,w,h,fill='#071b42',stroke='#29a8ff'){
    ctx.fillStyle=fill;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));
    ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.strokeRect(Math.round(x)+1,Math.round(y)+1,Math.round(w)-2,Math.round(h)-2);
  }
  function bar(x,y,w,h,p,kind='life'){
    p=clamp(p);
    ctx.fillStyle='#07142d';ctx.fillRect(x,y,w,h);
    ctx.fillStyle='#142542';ctx.fillRect(x+2,y+2,w-4,h-4);
    let c='#35e45b';
    if(kind==='xp') c='#35cfff';
    else if(kind==='ranged') c='#65edf0';
    else if(p<=.25)c='#ef4242'; else if(p<=.5)c='#f0a42f';
    ctx.fillStyle=c;ctx.fillRect(x+3,y+3,Math.max(0,(w-6)*p),Math.max(1,h-6));
    if(kind==='ranged'){
      const fill=Math.max(0,(w-6)*p);ctx.fillStyle='#fff17a';ctx.fillRect(x+3+fill*.65,y+3,fill*.35,Math.max(1,h-6));
    }
    ctx.strokeStyle='#65bfff';ctx.lineWidth=1;ctx.strokeRect(x+.5,y+.5,w-1,h-1);
  }
  function drawHeart(x,y,s=11){
    ctx.save();ctx.fillStyle='#ff2638';
    ctx.fillRect(x+s*.15,y,s*.3,s*.3);ctx.fillRect(x+s*.55,y,s*.3,s*.3);
    ctx.fillRect(x,y+s*.15,s,s*.35);ctx.fillRect(x+s*.15,y+s*.5,s*.7,s*.2);ctx.fillRect(x+s*.3,y+s*.7,s*.4,s*.15);ctx.fillRect(x+s*.42,y+s*.85,s*.16,s*.12);
    ctx.restore();
  }

  function clearDynamicPrintedAreas(x,y,w,h){
    // Cobre textos e barras impressos na arte para evitar HUD duplicado/sobreposto.
    const fill='#0a2f73';
    const line='#2ba9ff';
    pixelPanel(x+76,y+12,132,26,fill,line);      // nome / slot
    pixelPanel(x+w-120,y+12,108,26,fill,line);   // coração / vida numérica
    pixelPanel(x+73,y+40,w-86,25,fill,line);     // barra de vida impressa
    pixelPanel(x+73,y+68,44,24,fill,line);       // caixa NV
    pixelPanel(x+120,y+68,92,19,fill,line);      // barra XP
    pixelPanel(x+215,y+68,71,19,fill,line);      // barra secundária
    pixelPanel(x+286,y+68,28,19,fill,line);      // rótulo TIRO/COMBO
  }

  function drawPlayer(p,index,total){
    const w=320,h=106,y=6,x=(total>1&&index===1)?674:6;
    const frame=hudFrames[p.name]||hudFrames['João'];
    if(frame?.complete&&frame.naturalWidth){ctx.save();ctx.imageSmoothingEnabled=false;ctx.drawImage(frame,x,y,w,h);ctx.restore();}
    else {pixelPanel(x,y,w,h);}

    // João e Crist recebem retrato dinâmico. No Chico, o retrato já faz parte da HUD oficial enviada pelo usuário.
    if(p.name!=='Chico Fumaça'){
      pixelPanel(x+9,y+15,58,76,'#0a4a91','#73c8ff');
      const portrait=portraits[p.name];
      if(portrait?.complete&&portrait.naturalWidth){
        ctx.save();ctx.imageSmoothingEnabled=false;
        const scale=Math.min(52/portrait.naturalWidth,68/portrait.naturalHeight);
        const pw=Math.round(portrait.naturalWidth*scale),ph=Math.round(portrait.naturalHeight*scale);
        ctx.drawImage(portrait,x+38-pw/2,y+53-ph/2,pw,ph);ctx.restore();
      }
    }

    // Nome e slot são dinâmicos: João pode ser P1 ou P2, e Crist também.
    ctx.textAlign='left';ctx.fillStyle='#fff';ctx.font='bold 18px Righteous';
    ctx.fillText(`${p.name.toUpperCase()}  P${index+1}`,x+84,y+32);

    // Vida atual/máxima dinâmica.
    drawHeart(x+w-98,y+18,13);
    ctx.textAlign='right';ctx.fillStyle='#fff';ctx.font='bold 13px Righteous';
    ctx.fillText(`${Math.max(0,Math.ceil(p.life))}/${Math.max(1,Math.ceil(p.maxLife))}`,x+w-14,y+31);
    bar(x+76,y+43,w-84,18,p.life/Math.max(1,p.maxLife),'life');

    // Nível e XP sempre lidos do sistema de evolução atual.
    let lv=1,xp=0,need=1;
    if(p.evolution){
      lv=p.evolution.level||p.evolution.currentLevel||1;
      xp=p.evolution.xp??p.evolution.currentXP??0;
      need=p.evolution.xpToNextLevel||p.evolution.nextLevelXP||Math.max(1,xp||1);
    }
    ctx.textAlign='left';ctx.fillStyle='#fff';ctx.font='bold 11px Righteous';ctx.fillText(`NV ${lv}`,x+78,y+84);
    bar(x+122,y+72,88,13,need?xp/need:0,'xp');

    // Barra secundária: tiro do João; no Crist acompanha energia de combate/combo.
    let secondary=0,label='ESPECIAL';
    if(p.name==='João'&&typeof p.rangedCooldown==='number'){
      secondary=p.rangedCharging?clamp(p.rangedChargeFrames/(p.rangedMaxCharge||90)):clamp(1-p.rangedCooldown/72);
      label=p.rangedCharging?'CARGA':'TIRO';
    } else {
      secondary=clamp((p.combo||0)/10);label='COMBO';
    }
    bar(x+219,y+72,62,13,secondary,'ranged');
    ctx.textAlign='right';ctx.fillStyle='#e8faff';ctx.font='bold 9px Righteous';ctx.fillText(label,x+w-10,y+84);
  }

  drawHUD=function(){
    ctx.save();ctx.imageSmoothingEnabled=false;
    const total=players.length;players.forEach((p,i)=>drawPlayer(p,i,total));

    // Informações centrais continuam totalmente dinâmicas.
    const alive=enemies.filter(e=>!e.dead&&e.life>0&&!e.isBossMinion);
    const stage=`FASE ${currentLevelIndex+1}/${LEVELS.length}`;
    let center=stage+`  •  ${alive.filter(e=>!e.isBoss).length} INIMIGOS`;
    if(waveSystem&&!waveSystem.allWavesDone)center=`${stage}  •  ONDA ${Math.max(1,waveSystem.currentWave)}/${waveSystem.waves.length}`;
    pixelPanel(340,8,320,38,'rgba(5,15,34,.90)','#2b9fe8');
    ctx.textAlign='center';ctx.fillStyle='#fff';ctx.font='bold 13px Righteous';ctx.fillText(center,500,31);
    ctx.fillStyle='#ffd76a';ctx.font='bold 12px Bebas Neue';ctx.fillText(`SCORE ${score}`,500,58);

    if(bossWarningTimer>0&&!bossSpawned){
      const pulse=.65+Math.sin(performance.now()/100)*.35;pixelPanel(280,118,440,48,'rgba(20,5,5,.88)','#ff5a4d');ctx.globalAlpha=pulse;ctx.fillStyle='#ff5a4d';ctx.font='bold 28px Bebas Neue';ctx.fillText('⚠ BOSS CHEGANDO ⚠',500,151);ctx.globalAlpha=1;
    }
    if(bossSpawned&&!bossDefeated){
      const b=alive.find(e=>e.isBoss||e.type==='boss'||e.type==='final_boss'||e.name==='REI DE VEGAS');
      if(b){pixelPanel(220,572,560,52,'rgba(5,9,16,.88)','#d8a93f');ctx.fillStyle='#ffd76a';ctx.font='bold 15px Bebas Neue';ctx.fillText(b.name||'BOSS',500,592);bar(240,598,520,16,b.life/Math.max(1,b.maxLife),'life');}
    }
    if(window.trophySystem?.updateNotifications)window.trophySystem.updateNotifications();
    if(window.trophySystem?.drawNotifications)window.trophySystem.drawNotifications(ctx);
    ctx.restore();
  };
})();
