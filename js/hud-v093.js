// v0.9.4 - HUD de GAMEPLAY. Vida/XP/Nível ficam aqui; nunca é usado como caixa de diálogo.
(() => {
  const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
  const load=(src)=>window.assetManager.image(src,'shared');
  const hudFrames={
    'João':load('assets/ui/hud-joao-frame.webp'),
    'Crist':load('assets/ui/hud-crist-frame.webp'),
    'Chico Fumaça':load('assets/ui/hud-chico-frame.webp')
  };

  function pixelPanel(x,y,w,h,fill='#071b42',stroke='#29a8ff'){
    ctx.fillStyle=fill;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));
    ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.strokeRect(Math.round(x)+1,Math.round(y)+1,Math.round(w)-2,Math.round(h)-2);
  }
  function bar(x,y,w,h,p,kind='life'){
    p=clamp(p);
    ctx.fillStyle='rgba(2,12,30,.92)';ctx.fillRect(x,y,w,h);
    let c='#35e45b';
    if(kind==='xp')c='#35cfff';
    else if(kind==='special')c='#ffe05c';
    else if(p<=.25)c='#ef4242'; else if(p<=.5)c='#f0a42f';
    ctx.fillStyle=c;ctx.fillRect(x+2,y+2,Math.max(0,(w-4)*p),Math.max(1,h-4));
    ctx.strokeStyle='#62c7ff';ctx.lineWidth=1;ctx.strokeRect(x+.5,y+.5,w-1,h-1);
  }
  function heart(x,y,s=12){
    ctx.save();ctx.fillStyle='#ff3045';
    ctx.fillRect(x+s*.15,y,s*.3,s*.3);ctx.fillRect(x+s*.55,y,s*.3,s*.3);
    ctx.fillRect(x,y+s*.15,s,s*.35);ctx.fillRect(x+s*.15,y+s*.5,s*.7,s*.2);ctx.fillRect(x+s*.3,y+s*.7,s*.4,s*.15);ctx.fillRect(x+s*.42,y+s*.85,s*.16,s*.12);
    ctx.restore();
  }
  function evoData(p){
    const e=p?.evolution;
    const lv=e?.level||e?.currentLevel||1;
    const xp=e?.xp??e?.currentXP??0;
    const need=Math.max(1,e?.xpToNextLevel||e?.nextLevelXP||100);
    return {lv,xp,need};
  }
  function secondaryData(p){
    if(p.name==='João'&&typeof p.rangedCooldown==='number'){
      return {label:p.rangedCharging?'CARGA':'TIRO', value:p.rangedCharging?clamp(p.rangedChargeFrames/(p.rangedMaxCharge||90)):clamp(1-p.rangedCooldown/72)};
    }
    return {label:'COMBO',value:clamp((p.combo||0)/10)};
  }
  function drawPlayer(p,index,total){
    if(!p)return;
    const w=326,h=109,y=6,x=(total>1&&index===1)?668:6;
    const frame=hudFrames[p.name]||hudFrames['João'];
    ctx.save();ctx.imageSmoothingEnabled=false;
    if(frame?.complete&&frame.naturalWidth)ctx.drawImage(frame,x,y,w,h);
    else pixelPanel(x,y,w,h);

    // A arte já contém o retrato correto. Os dados abaixo ocupam somente os campos vazios.
    const dataX=x+78;
    const right=x+w-14;
    const {lv,xp,need}=evoData(p);
    ctx.textAlign='left';ctx.fillStyle='#f7fbff';ctx.font='bold 15px Righteous';
    ctx.fillText(`${p.name.toUpperCase()}  •  P${index+1}`,dataX,y+28);
    ctx.fillStyle='#9ee7ff';ctx.font='bold 11px Righteous';ctx.fillText(`NÍVEL ${lv}`,dataX,y+45);

    heart(x+w-106,y+18,13);
    ctx.textAlign='right';ctx.fillStyle='#fff';ctx.font='bold 13px Righteous';
    ctx.fillText(`${Math.max(0,Math.ceil(p.life))}/${Math.max(1,Math.ceil(p.maxLife))}`,right,y+30);

    // Campo grande inferior: VIDA + XP + especial/combo.
    ctx.textAlign='left';ctx.font='bold 9px Righteous';ctx.fillStyle='#dff5ff';ctx.fillText('VIDA',dataX,y+62);
    bar(dataX+34,y+54,w-126,11,p.life/Math.max(1,p.maxLife),'life');
    ctx.fillText('XP',dataX,y+82);
    bar(dataX+34,y+74,118,10,xp/need,'xp');
    ctx.fillStyle='#8fe7ff';ctx.font='8px Righteous';ctx.fillText(`${xp}/${need}`,dataX+157,y+82);

    const sec=secondaryData(p);
    ctx.fillStyle='#fff1a3';ctx.font='bold 8px Righteous';ctx.fillText(sec.label,dataX+205,y+82);
    bar(dataX+205,y+87,Math.max(34,w-299),8,sec.value,'special');
    ctx.restore();
  }

  drawHUD=function(){
    // Segurança: HUD de gameplay só deve existir quando há gameplay/resultado de fase.
    if(typeof gameState!=='undefined' && ![GameState.PLAYING,GameState.LEVEL_COMPLETE].includes(gameState))return;
    ctx.save();ctx.imageSmoothingEnabled=false;
    const total=players.length;players.forEach((p,i)=>drawPlayer(p,i,total));

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
