/* João & Crist v0.9.4 - sistema modular de cutscenes da campanha */
(function(){
'use strict';


const DIALOG_PORTRAITS = {
  'JOÃO':'assets/ui/portrait-joao.webp',
  'CRIST':'assets/ui/portrait-crist.webp',
  'CHICO FUMAÇA':'assets/ui/portrait-chico.webp',
  'O CORONEL':'assets/sprite-pack/colonel_idle.webp',
  'VICTOR':'assets/sprite-pack/vegas_idle.webp',
  'REI DE VEGAS':'assets/sprite-pack/vegas_idle.webp',
  'A SOMBRA':'assets/sprite-pack/shadow_idle.webp',
  'DEUS DAS APOSTAS':'assets/sprite-pack/god_idle.webp',
  'BANDIDO':'assets/enemies/cowboy-16bit.webp'
};

const SCENES = {
  intro: {
    bg:0, title:'UMA ÚLTIMA VIAGEM', actors:'farm',
    lines:[
      ['NARRADOR','Depois de anos longe das grandes brigas, João e Crist vivem dias tranquilos na fazenda.'],
      ['JOÃO','Finalmente um pouco de sossego.'],
      ['CRIST','Você falou isso antes da última confusão.'],
      ['NARRADOR','Pantera corre pelo quintal quando um envelope dourado chega pelo correio.'],
      ['JOÃO','“Torneio Lendário de Las Vegas. Prêmio: dez milhões de dólares.”'],
      ['CRIST','Isso tem cara de armadilha.'],
      ['JOÃO','Então é melhor irmos preparados.'],
      ['NARRADOR','Antes que consigam partir, motores rugem do outro lado da cerca. Uma gangue invade a propriedade.'],
      ['CRIST','Eu avisei.'],
      ['JOÃO','Pantera, fica atrás da gente.']
    ]
  },
  farmFarewell: {
    bg:0, title:'ATÉ LOGO, PANTERA', actors:'farmFarewell',
    lines:[
      ['NARRADOR','Com a fazenda segura, chegou a hora de partir.'],
      ['JOÃO','Cuida da fazenda pra mim, Pantera.'],
      ['CRIST','Ela parece mais preocupada com você do que com a fazenda.'],
      ['NARRADOR','Pantera recebe um último carinho. Ao longe, o ônibus para Vegas espera na cidade.']
    ]
  },
  desertArrival: {
    bg:2, title:'ESTRADA BLOQUEADA', actors:'desert',
    lines:[
      ['NARRADOR','Depois da viagem pela Route 66, o ônibus para diante de uma barreira improvisada no deserto.'],
      ['CRIST','Isso não estava no itinerário.'],
      ['JOÃO','Nem aqueles homens armados.'],
      ['BANDIDO','Ordem do El Colosso. Vocês não passam daqui.'],
      ['CRIST','Agora ficou interessante.']
    ]
  },

  colonelIntro: {
    bg:2, title:'O CORONEL', actors:'colonelDesert',
    lines:[
      ['NARRADOR','Com o último capanga derrotado, passos pesados ecoam pela areia do deserto.'],
      ['CRIST','Escutou isso? Tem alguém vindo. E não parece nada amigável.'],
      ['O CORONEL','Então foram vocês que varreram meus homens da estrada.'],
      ['JOÃO','Se eles eram seus, já deu pra ver que você treina muito mal a tropa.'],
      ['O CORONEL','Eu sou O Coronel. Cada quilômetro até Vegas responde à minha ordem.'],
      ['CRIST','Bonita apresentação. Vai continuar falando ou finalmente vai lutar?'],
      ['O CORONEL','Ajoelhem-se agora... e talvez eu deixe um de vocês sair daqui respirando.'],
      ['JOÃO','A gente não se ajoelha pra tirano. Muito menos no meio do deserto.'],
      ['CRIST','Pode vir, Coronel. Sua barreira termina aqui.']
    ]
  },
  desertClue: {
    bg:2, title:'UMA PISTA', actors:'phone',
    lines:[
      ['NARRADOR','Depois da queda de El Colosso, um telefone escorrega do bolso de um dos capangas.'],
      ['CRIST','Tem uma mensagem aqui.'],
      ['CRIST','“Eles continuam indo para Vegas. — V. BLACKJACK”'],
      ['JOÃO','Então alguém está acompanhando cada passo nosso.'],
      ['CRIST','Vamos descobrir quem é.']
    ]
  },
  vegasArrival: {
    bg:4, title:'LAS VEGAS', actors:'vegas',
    lines:[
      ['NARRADOR','As luzes de Las Vegas finalmente aparecem no horizonte.'],
      ['CRIST','Depois de tudo isso, espero que pelo menos o hotel seja bom.'],
      ['JOÃO','Primeiro descobrimos quem está pagando esses caras.'],
      ['NARRADOR','No alto de um cassino, uma silhueta observa a dupla chegar.']
    ]
  },
  victorReveal: {
    bg:5, title:'VICTOR BLACKJACK', actors:'screen',
    lines:[
      ['VICTOR','Finalmente. João e Crist.'],
      ['CRIST','Então era você.'],
      ['VICTOR','Desde a fazenda. Cada gangue, cada bloqueio, cada luta.'],
      ['JOÃO','Tudo isso por causa de um torneio?'],
      ['VICTOR','O torneio era só a isca. Eu precisava saber se as lendas ainda eram dignas de chegar até mim.'],
      ['CRIST','Você conseguiu nossa atenção.']
    ]
  },
  secretDoor: {
    bg:5, title:'ABAIXO DO CASSINO', actors:'door',
    lines:[
      ['NARRADOR','Com Victor derrotado, uma parede atrás do salão principal se abre.'],
      ['CRIST','Cassinos normalmente não têm portas secretas para catacumbas.'],
      ['JOÃO','Os bons têm.'],
      ['NARRADOR','Documentos marcados com um símbolo negro revelam uma organização: A SOMBRA.'],
      ['CRIST','Victor não era o fim. Era só uma peça.']
    ]
  },
  shadowTruth: {
    bg:6, title:'O JOGO POR TRÁS DO JOGO', actors:'shadow',
    lines:[
      ['A SOMBRA','Blackjack acreditava que controlava Vegas. Ele nunca percebeu quem controlava as probabilidades.'],
      ['JOÃO','E quem seria?'],
      ['A SOMBRA','Aquele que transforma destino em aposta.'],
      ['NARRADOR','Um portal dourado se abre no centro do clube.'],
      ['CRIST','Eu estava começando a sentir falta da fazenda.'],
      ['JOÃO','Vamos terminar isso e voltar pra Pantera.']
    ]
  },
  godIntro: {
    bg:7, title:'O DEUS DAS APOSTAS', actors:'god',
    lines:[
      ['DEUS DAS APOSTAS','Todo homem tem um preço. Toda luta tem uma probabilidade. Toda vitória pode ser comprada.'],
      ['CRIST','Então você calculou nossas chances?'],
      ['DEUS DAS APOSTAS','Desde a fazenda. Vocês tinham 0,01%.'],
      ['JOÃO','Então você errou por pouco.'],
      ['DEUS DAS APOSTAS','Provem.']
    ]
  },
  ending: {
    bg:0, title:'DE VOLTA PARA CASA', actors:'ending',
    lines:[
      ['NARRADOR','Dias depois, a poeira de Vegas fica para trás. João e Crist retornam à fazenda.'],
      ['NARRADOR','Pantera dispara pelo quintal assim que reconhece os dois.'],
      ['CRIST','Dez milhões de dólares, Vegas quase destruída e um deus derrotado.'],
      ['JOÃO','E ela só quer saber se eu trouxe comida.'],
      ['NARRADOR','João se abaixa e faz carinho em Pantera. Pela primeira vez em muito tempo, tudo fica em silêncio.'],
      ['CRIST','Aposentados agora?'],
      ['JOÃO','Até a próxima confusão.'],
      ['NARRADOR','VERDADEIROS HERÓIS NUNCA SE APOSENTAM.']
    ]
  }
};


const __sceneImageCache = {};
function getSceneImage(src){
  if(!__sceneImageCache[src]){
    const group=src.startsWith('assets/ui/')?'shared':(window.levelManager?.currentGroup||'shared');
    __sceneImageCache[src]=window.assetManager.image(src,group);
  }
  return __sceneImageCache[src];
}
function drawSceneSprite(ctx, src, x, y, w, h, flip=false){
  const img = getSceneImage(src);
  if(!img.complete || !img.naturalWidth) return;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if(flip){ ctx.translate(x + w/2, 0); ctx.scale(-1,1); ctx.translate(-(x + w/2),0); }
  ctx.drawImage(img, x, y, w, h);
  ctx.restore();
}

class StoryCutsceneManager {
  constructor(){ this.active=null; this.index=0; this.startedAt=0; this.lineStartedAt=0; this.onComplete=null; this.seen=new Set(); this.flash=0; }
  hasSeen(id){ return this.seen.has(id); }
  start(id,onComplete){
    const scene=SCENES[id]; if(!scene){ onComplete?.(); return false; }
    this.active={id,...scene}; this.index=0; this.startedAt=performance.now(); this.lineStartedAt=this.startedAt; this.onComplete=onComplete||null; this.flash=20; this.seen.add(id);
    window.soundSystem?.playSound?.('menuSelect');
    return true;
  }
  finish(){
    const cb=this.onComplete; const id=this.active?.id; this.active=null; this.onComplete=null; this.index=0; window.soundSystem?.playSound?.('menuSelect'); cb?.();
  }
  advance(){ if(!this.active)return; if(this.index < this.active.lines.length-1){this.index++;this.lineStartedAt=performance.now();window.soundSystem?.playSound?.('menuMove');} else this.finish(); }
  skip(){ if(!this.active)return; this.finish(); }
  handleKey(key){ if(!this.active)return false; if(key==='Escape'){this.skip();return true;} if(key==='Enter'||key===' '){this.advance();return true;} return false; }
  update(){ if(!this.active)return; if(this.flash>0)this.flash--; if(performance.now()-this.lineStartedAt>4600)this.advance(); }
  drawActor(ctx,player,x,y,facingRight=true){
    if(!player?.draw)return; const old={x:player.x,y:player.y,fr:player.facingRight,att:player.attacking,dash:player.dashing};
    player.x=x;player.y=y;player.facingRight=facingRight;player.attacking=false;player.dashing=false; try{player.draw(ctx);}catch(_){ }
    Object.assign(player,{x:old.x,y:old.y,facingRight:old.fr,attacking:old.att,dashing:old.dash});
  }
  drawFarmDog(ctx,x,y){
    const dog=window.farmDogNPCManager?.current; if(!dog?.draw)return; const ox=dog.x, oy=dog.y, og=dog.groundY; dog.x=x;dog.groundY=y+76;dog.y=y;dog.draw(ctx);dog.x=ox;dog.y=oy;dog.groundY=og;
  }
  drawSceneActors(ctx,players,kind){
    const p1=players?.[0],p2=players?.[1];
    if(kind==='farm'||kind==='farmFarewell'||kind==='ending'){
      this.drawActor(ctx,p1,315,445,true); if(p2)this.drawActor(ctx,p2,410,445,true); this.drawFarmDog(ctx,535,454);
      if(kind==='farmFarewell'||kind==='ending'){ctx.save();ctx.fillStyle='#d8b36a';ctx.fillRect(520,540,110,8);ctx.restore();}
    } else if(kind==='desert'||kind==='phone'){
      this.drawActor(ctx,p1,335,445,true); if(p2)this.drawActor(ctx,p2,425,445,true);
      if(kind==='phone'){ctx.save();ctx.fillStyle='#111';ctx.fillRect(535,482,18,28);ctx.fillStyle='#61e5ff';ctx.fillRect(538,486,12,15);ctx.restore();}
    } else if(kind==='colonelDesert'){
      this.drawActor(ctx,p1,245,445,true); if(p2)this.drawActor(ctx,p2,335,445,true);
      const elapsed = performance.now() - this.startedAt;
      const walking = elapsed < 2600;
      const phase = Math.min(1, elapsed / 2600);
      const cx = 1060 - (phase * 350);
      const sprite = walking ? ((Math.floor(performance.now()/180)%2)===0 ? 'colonel_walk1.webp' : 'colonel_walk2.webp') : 'colonel_idle.webp';
      drawSceneSprite(ctx, 'assets/sprite-pack/' + sprite, cx, 282, 196, 204, true);
    } else if(kind==='vegas'||kind==='screen'||kind==='door'||kind==='shadow'||kind==='god'){
      this.drawActor(ctx,p1,300,445,true); if(p2)this.drawActor(ctx,p2,390,445,true);
      ctx.save();
      if(kind==='screen'){ctx.fillStyle='#181818';ctx.fillRect(620,160,240,155);ctx.strokeStyle='#ffcc55';ctx.lineWidth=4;ctx.strokeRect(620,160,240,155);ctx.fillStyle='#d94444';ctx.font='bold 30px Bebas Neue';ctx.textAlign='center';ctx.fillText('V. BLACKJACK',740,245);}
      if(kind==='door'){ctx.fillStyle='#241b18';ctx.fillRect(650,300,145,245);ctx.strokeStyle='#8d6b3b';ctx.lineWidth=5;ctx.strokeRect(650,300,145,245);ctx.fillStyle='#a01818';ctx.beginPath();ctx.arc(723,390,25,0,Math.PI*2);ctx.fill();}
      if(kind==='shadow'){ctx.fillStyle='rgba(0,0,0,.78)';ctx.beginPath();ctx.ellipse(720,420,58,110,0,0,Math.PI*2);ctx.fill();}
      if(kind==='god'){ctx.fillStyle='#e8b833';ctx.shadowBlur=28;ctx.shadowColor='#ffd76b';ctx.beginPath();ctx.arc(735,365,65,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#17131c';ctx.fillRect(690,420,90,125);}
      ctx.restore();
    }
  }
  drawDialogueHud(ctx,speaker,text,scene){
    // CAIXA DE DIÁLOGO: separada do HUD de gameplay (vida/XP).
    const key=String(speaker||'NARRADOR').toUpperCase();
    const portraitSrc=DIALOG_PORTRAITS[key];
    const portrait=portraitSrc?getSceneImage(portraitSrc):null;
    const x=42,y=474,w=916,h=158;
    ctx.save();
    ctx.fillStyle='rgba(3,10,25,.95)';
    ctx.strokeStyle=key==='NARRADOR'?'#d7a84a':'#29a8ff';
    ctx.lineWidth=4;
    ctx.beginPath();ctx.roundRect(x,y,w,h,15);ctx.fill();ctx.stroke();
    // brilho interno azul discreto
    ctx.strokeStyle='rgba(101,196,255,.45)';ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(x+8,y+8,w-16,h-16,10);ctx.stroke();

    let textX=x+28;
    if(portrait?.complete&&portrait.naturalWidth){
      const boxX=x+18,boxY=y+18,boxW=112,boxH=122;
      ctx.fillStyle='#08295f';ctx.fillRect(boxX,boxY,boxW,boxH);
      ctx.strokeStyle='#55c5ff';ctx.lineWidth=2;ctx.strokeRect(boxX+.5,boxY+.5,boxW-1,boxH-1);
      const scale=Math.min((boxW-10)/portrait.naturalWidth,(boxH-10)/portrait.naturalHeight);
      const pw=portrait.naturalWidth*scale,ph=portrait.naturalHeight*scale;
      ctx.imageSmoothingEnabled=false;ctx.drawImage(portrait,boxX+(boxW-pw)/2,boxY+(boxH-ph)/2,pw,ph);
      textX=x+154;
    }
    ctx.textAlign='left';ctx.fillStyle='#ffd76a';ctx.font='bold 23px Bebas Neue';ctx.fillText(speaker,textX,y+38);
    ctx.fillStyle='#f4f8ff';ctx.font='16px Righteous';
    const maxWidth=x+w-textX-30;const words=String(text||'').split(/\s+/);let line='',yy=y+72;
    for(const word of words){const test=line?line+' '+word:word;if(ctx.measureText(test).width>maxWidth&&line){ctx.fillText(line,textX,yy);line=word;yy+=25;}else line=test;}if(line)ctx.fillText(line,textX,yy);
    ctx.fillStyle='#8fdcff';ctx.font='10px Righteous';ctx.textAlign='right';ctx.fillText(`ENTER/ATAQUE: avançar   ESC: pular   ${this.index+1}/${scene.lines.length}`,x+w-22,y+h-18);
    ctx.restore();
  }
  draw(ctx,currentLevel,players,levels){
    if(!this.active)return;
    const scene=this.active; const bg=levels?.[scene.bg]||currentLevel;
    ctx.save(); if(bg?.drawBackground)bg.drawBackground(ctx,0); else {ctx.fillStyle='#111';ctx.fillRect(0,0,1000,650);} ctx.restore();
    ctx.save();ctx.fillStyle='rgba(0,0,0,.22)';ctx.fillRect(0,0,1000,650);ctx.restore();
    this.drawSceneActors(ctx,players,scene.actors);
    const [speaker,text]=scene.lines[Math.min(this.index,scene.lines.length-1)];
    this.drawDialogueHud(ctx,speaker,text,scene);
    ctx.save();
    ctx.fillStyle='#ffe58a';ctx.font='bold 25px Bebas Neue';ctx.textAlign='center';ctx.fillText(scene.title,500,48);
    if(this.flash>0){ctx.globalAlpha=this.flash/20*.35;ctx.fillStyle='#fff';ctx.fillRect(0,0,1000,650);}ctx.restore();
  }
}
window.storyCutscenes=new StoryCutsceneManager();
})();
