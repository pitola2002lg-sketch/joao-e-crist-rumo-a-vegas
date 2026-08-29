// João & Crist - LevelManager / Loading real por fase (incremental, compatível com arquitetura atual)
(() => {
  'use strict';
  const vegasFolder={turista:'turista',seguranca:'seguranca',elvis_fan:'elvis-fan',mulher_feia:'mulher-feia',travesti:'travesti'};
  const basicSheets={
    basic:'assets/enemies/capanga-16bit.webp',ciclista:'assets/enemies/ciclista-16bit.webp',fast:'assets/enemies/fast-16bit.webp',
    strong:'assets/enemies/strong-16bit.webp',tank:'assets/enemies/tank-16bit.webp',berserker:'assets/enemies/berserker-16bit.webp',
    cowboy:'assets/enemies/cowboy-16bit.webp',cockroach:'assets/enemies/cockroach-16bit.webp'
  };
  const pack=(name,files)=>files.map(f=>`assets/sprite-pack/${name}_${f}.webp`);
  const packs={
    colonel:pack('colonel',['idle','walk1','walk2','attack1','attack2','attack3','attack4','hurt','dead']),
    vegas:pack('vegas',['idle','walk1','walk2','attack','hurt','dead']),
    engineer:pack('engineer',['idle','walk1','walk2','attack','hurt','dead']),
    shadow:pack('shadow',['idle','walk1','walk2','attack','hurt','dead']),
    god:pack('god',['idle','walk1','walk2','attack','hurt','dead']),
    elite:pack('elite',['idle','walk1','walk2','attack','hurt','dead']),
    ghost:pack('ghost',['idle','walk1','walk2','attack','hurt','dead']),
    assassin:pack('assassin',['idle','walk1','walk2','attack','hurt','dead']),
    drone:pack('drone',['idle','walk1','walk2','attack','hurt','dead'])
  };
  const tips=[
    'DASH também serve para escapar de cercos.',
    'Combos altos podem ativar habilidades da evolução.',
    'Fique atento ao sinal visual antes dos ataques de chefes.',
    'No celular, menos recursos ficam ativos ao mesmo tempo para poupar memória.',
    'Checkpoint e evolução são preservados antes das trocas de fase.'
  ];
  const uniq=a=>[...new Set((a||[]).filter(Boolean))];

  function characterAssets(names){
    const reg=window.CharacterAssetRegistry||{};
    const out=[];
    for(const n of names||[]){
      const key=String(n||'').toLowerCase();
      const r=key.includes('joão')||key.includes('joao')?reg.joao:key.includes('crist')?reg.crist:key.includes('chico')?reg.chico:null;
      if(r?.full) out.push(...r.full);
    }
    return uniq(out);
  }
  function vegasAssets(types){
    const out=[];
    for(const t of types||[]){
      const folder=vegasFolder[t]; if(!folder)continue;
      for(const st of ['idle','walk1','walk2','attack','hurt','dead']) out.push(`assets/enemies/vegas-frames/${folder}/${st}.webp`);
    }
    return out;
  }
  function levelManifest(index,playerNames=[]){
    const level=window.LEVELS_REF?.[index] || (typeof LEVELS!=='undefined'?LEVELS[index]:null);
    if(!level) return {id:index+1,name:`Fase ${index+1}`,images:characterAssets(playerNames),sounds:[]};
    const images=[];
    if(level.backgroundImage) images.push(level.backgroundImage);
    if(level.id===1){
      images.push('assets/backgrounds/fazenda-16bit.webp');
      for(const f of ['idle1','idle2','walk1','walk2','walk3','doghouse','food-bowl']) images.push(`assets/npc/pantera/${f}.webp`);
    }
    for(const t of level.enemyTypes||[]){ if(basicSheets[t]) images.push(basicSheets[t]); }
    images.push(...vegasAssets(level.enemyTypes));
    if(level.id===3) images.push(...packs.colonel);
    if(level.id===5) images.push(...packs.vegas);
    if(level.id===6) images.push(...packs.engineer,...packs.drone,'assets/sprite-pack/orb_electric.webp','assets/sprite-pack/teleport_1.webp','assets/sprite-pack/teleport_2.webp','assets/sprite-pack/teleport_3.webp');
    if(level.id===7) images.push(...packs.elite,...packs.ghost,...packs.assassin,...packs.shadow,'assets/sprite-pack/orb_shadow.webp','assets/sprite-pack/teleport_1.webp','assets/sprite-pack/teleport_2.webp','assets/sprite-pack/teleport_3.webp');
    if(level.id===8) images.push(...packs.elite,...packs.ghost,...packs.assassin,...packs.god,'assets/sprite-pack/orb_gold.webp');
    images.push(...characterAssets(playerNames));
    const sounds=level.id===1?['dogPet','dogBark']:[];
    return {id:level.id,name:level.name,description:level.description||'',images:uniq(images),sounds};
  }
  function fishingManifest(playerNames=[]){
    const images=['assets/backgrounds/fishing-bonus-lake.webp','assets/npc/chico-fumaca/chico-fumaca-idle.webp','assets/ui/dialog-hud-joao.webp','assets/ui/dialog-hud-crist.webp','assets/ui/hud-chico-frame.webp'];
    for(const k of ['idle','walk1','walk2','walk3','attack1','attack2','attack3','special','hurt','dead','roar']) images.push(`assets/bosses/shark/${k}.webp`);
    images.push(...characterAssets(playerNames));
    return {id:'fishing',name:'Pescaria do Chico Fumaça',images:uniq(images),sounds:['punch','hit','enemyHit','enemyDeath','explosion']};
  }
  function busManifest(){
    const images=['assets/backgrounds/bus-bonus-vegas.webp'];
    for(const f of ['idle','andando','andando-2','acelerando','freando','virando-cima','virando-baixo','colisao','danificado','muito-danificado','porta-fechada','porta-abrindo','porta-aberta','porta-fechando','saida','chegada']) images.push(`assets/bus/${f}.webp`);
    for(const f of ['cone-1','cone-2','cone-3','cone-light','pothole-water','pothole-deep','pothole-cracked','moto-red','moto-brown','moto-green']) images.push(`assets/bus/${f}.webp`);
    for(const c of ['red','blue','yellow','green','black','white']) images.push(`assets/bus/cars/car-${c}.webp`);
    for(const f of ['repair','money','star','turbo']) images.push(`assets/bus/items/${f}.webp`);
    images.push('assets/bus/obstacles/rock.webp');
    return {id:'bus',name:'Estrada para Vegas',images:uniq(images),sounds:['busEngine','busAccelerate','busBrake','busHorn','busCollision','busRepair','busMoney','busStar','busTurbo','busCheckpoint','busDoorOpen','busDoorClose','busBroken','busArrival']};
  }

  class LevelManager {
    constructor(assetManager){
      this.assets=assetManager;
      this.currentGroup=null;
      this.currentLevelIndex=null;
      this.pending=null;
      this.serial=0;
      this.currentSounds=[];
      this.bonusSounds=new Map();
      this.mobile=(navigator.deviceMemory&&navigator.deviceMemory<=4)||window.matchMedia?.('(pointer:coarse)')?.matches||false;
    }
    _state(partial){
      window.LevelLoadState=Object.assign({active:false,progress:0,title:'',subtitle:'',tip:tips[0],error:null,failures:[],canRetry:false,type:'level'},window.LevelLoadState||{},partial);
      return window.LevelLoadState;
    }
    async _loadManifest(manifest,group,onProgress){
      const images=manifest.images||[], sounds=manifest.sounds||[];
      const total=images.length+sounds.length;
      let imageDone=0,soundDone=0;
      const report=(src)=>onProgress?.(total?((imageDone+soundDone)/total):1,{loaded:imageDone+soundDone,total,src});
      if(images.length){
        await this.assets.loadGroup(group,images,(p,info)=>{imageDone=info.loaded;report(info.src);},{timeout:12000,retries:1});
      }
      if(sounds.length&&window.soundSystem?.preloadTypes){
        await window.soundSystem.preloadTypes(sounds,(done,soundTotal)=>{soundDone=soundTotal?Math.min(sounds.length,(done/soundTotal)*sounds.length):sounds.length;report(null);});
      } else soundDone=sounds.length;
      report(null);
    }
    async transitionLevel(index,{playerNames=[],beforeLoad,afterLoad,onError}={}){
      const token=++this.serial;
      const manifest=levelManifest(index,playerNames);
      const nextGroup=`level:${manifest.id}`;
      this.pending={kind:'level',index,manifest,opts:{playerNames,beforeLoad,afterLoad,onError}};
      this._state({active:true,type:'level',progress:0,title:`FASE ${manifest.id}`,subtitle:manifest.name,tip:tips[index%tips.length],error:null,failures:[],canRetry:false});
      try{
        await beforeLoad?.({previousGroup:this.currentGroup,nextGroup,manifest});
        if(token!==this.serial)return false;
        if(this.currentGroup&&this.currentGroup!==nextGroup){
          this.assets.releaseGroup(this.currentGroup);
          window.soundSystem?.releaseTypes?.(this.currentSounds);
          this.currentSounds=[];
          const old=window.LEVELS_REF?.[this.currentLevelIndex]; old?.dispose?.();
        }
        await this._loadManifest(manifest,nextGroup,(p)=>this._state({progress:p}));
        if(token!==this.serial)return false;
        this.currentGroup=nextGroup;this.currentLevelIndex=index;this.currentSounds=[...(manifest.sounds||[])];
        this._state({progress:1});
        await afterLoad?.({manifest,group:nextGroup});
        if(token===this.serial) this._state({active:false,progress:1});
        return true;
      }catch(error){
        const failures=error?.failures||[];
        this._state({active:true,error,failures,canRetry:true});
        onError?.(error);
        if(window.DEV) console.error('[LevelManager]',error,failures);
        return false;
      }
    }
    async loadBonus(kind,{playerNames=[],beforeLoad,afterLoad,onError}={}){
      const token=++this.serial;
      const manifest=kind==='bus'?busManifest():fishingManifest(playerNames);
      const group=`bonus:${kind}`;
      this.pending={kind:'bonus',bonus:kind,manifest,opts:{playerNames,beforeLoad,afterLoad,onError}};
      this._state({active:true,type:'bonus',progress:0,title:'BÔNUS',subtitle:manifest.name,tip:tips[(kind==='bus'?1:2)],error:null,failures:[],canRetry:false});
      try{
        await beforeLoad?.({previousGroup:this.currentGroup,nextGroup:group,manifest});
        if(token!==this.serial)return false;
        await this._loadManifest(manifest,group,p=>this._state({progress:p}));
        if(token!==this.serial)return false;
        this.bonusSounds.set(kind,[...(manifest.sounds||[])]);
        this._state({progress:1});
        await afterLoad?.({manifest,group});
        if(token===this.serial)this._state({active:false,progress:1});
        return true;
      }catch(error){this._state({active:true,error,failures:error?.failures||[],canRetry:true});onError?.(error);return false;}
    }
    releaseBonus(kind){this.assets.releaseGroup(`bonus:${kind}`);window.soundSystem?.releaseTypes?.(this.bonusSounds.get(kind)||[]);this.bonusSounds.delete(kind);}
    retry(){
      const p=this.pending;if(!p)return Promise.resolve(false);
      if(p.kind==='level')return this.transitionLevel(p.index,p.opts);
      return this.loadBonus(p.bonus,p.opts);
    }
    memoryStats(){return Object.assign({mobile:this.mobile,currentGroup:this.currentGroup},this.assets.stats());}
  }

  window.LevelAssetManifests={level:levelManifest,bus:busManifest,fishing:fishingManifest};
  window.levelManager=new LevelManager(window.assetManager);
})();
