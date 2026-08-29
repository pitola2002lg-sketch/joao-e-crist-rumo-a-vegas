// João & Crist v0.9.4 - infraestrutura incremental de estabilidade + AssetManager 2.0
(() => {
  class AssetManager {
    constructor(){
      this.records=new Map(); // src -> {type,node,groups:Set,status,promise,error}
      this.groups=new Map();  // group -> Set(src)
      this.defaultTimeout=12000;
      this.defaultRetries=1;
    }
    _group(group,src){
      const g=group||'shared';
      if(!this.groups.has(g)) this.groups.set(g,new Set());
      this.groups.get(g).add(src);
      return g;
    }
    _record(src,type='image'){
      let r=this.records.get(src);
      if(!r){
        const node=type==='image'?new Image():null;
        if(node&&type==='image') node.decoding='async';
        r={src,type,node,groups:new Set(),status:'idle',promise:null,error:null};
        this.records.set(src,r);
      }
      return r;
    }
    placeholder(src){ if(!src)return null; return this._record(src,'image').node; }
    image(src,group='shared',opts={}){
      if(!src) return null;
      const r=this._record(src,'image');
      const g=this._group(group,src); r.groups.add(g);
      if(!opts.defer) this.loadImage(src,group,opts).catch(()=>{});
      return r.node;
    }
    async loadImage(src,group='shared',opts={}){
      if(!src) return null;
      const r=this._record(src,'image');
      const g=this._group(group,src); r.groups.add(g);
      if(r.status==='loaded' && r.node?.complete && r.node.naturalWidth) return r.node;
      if(r.promise) return r.promise;
      const retries=Number.isFinite(opts.retries)?opts.retries:this.defaultRetries;
      const timeout=Number.isFinite(opts.timeout)?opts.timeout:this.defaultTimeout;
      r.promise=(async()=>{
        let lastErr=null;
        for(let attempt=0;attempt<=retries;attempt++){
          try{
            await new Promise((resolve,reject)=>{
              const img=r.node||new Image(); r.node=img; img.decoding='async';
              let done=false;
              const finish=(fn,val)=>{if(done)return;done=true;clearTimeout(timer);img.onload=null;img.onerror=null;fn(val);};
              const timer=setTimeout(()=>finish(reject,new Error(`Timeout ao carregar ${src}`)),timeout);
              img.onload=()=>finish(resolve,img);
              img.onerror=()=>finish(reject,new Error(`Falha ao carregar ${src}`));
              // Força nova tentativa apenas após falha anterior.
              img.src=attempt?`${src}${src.includes('?')?'&':'?'}retry=${Date.now()}`:src;
              if(img.complete&&img.naturalWidth) finish(resolve,img);
            });
            r.status='loaded'; r.error=null; return r.node;
          }catch(err){ lastErr=err; r.status='error'; r.error=err; }
        }
        throw lastErr||new Error(`Falha ao carregar ${src}`);
      })().finally(()=>{r.promise=null;});
      return r.promise;
    }
    async loadGroup(group,assets,onProgress,opts={}){
      const unique=[...new Set((assets||[]).filter(Boolean))];
      const total=unique.length;
      if(!total){ onProgress?.(1,{loaded:0,total:0,src:null}); return {loaded:0,total:0}; }
      let loaded=0;
      const failed=[];
      onProgress?.(0,{loaded,total,src:null});
      await Promise.all(unique.map(async src=>{
        try{ await this.loadImage(src,group,opts); }
        catch(error){ failed.push({src,error}); }
        finally{ loaded++; onProgress?.(loaded/total,{loaded,total,src}); }
      }));
      if(failed.length){
        const err=new Error(`Falha em ${failed.length} recurso(s)`); err.failures=failed; throw err;
      }
      return {loaded,total};
    }
    isLoaded(src){ const r=this.records.get(src); return !!(r&&r.status==='loaded'&&r.node?.complete&&r.node.naturalWidth); }
    releaseGroup(group,{force=false}={}){
      const set=this.groups.get(group); if(!set)return;
      for(const src of set){
        const r=this.records.get(src); if(!r)continue;
        r.groups.delete(group);
        // CORE/SHARED nunca são liberados; um arquivo referenciado por outro grupo também não.
        const protectedRef=[...r.groups].some(g=>g==='core'||g==='shared'||g.startsWith('player:'));
        if(force||(!r.groups.size&&!protectedRef)){
          if(r.type==='image'&&r.node){
            try{r.node.onload=null;r.node.onerror=null;r.node.removeAttribute('src');}catch(_){try{r.node.src='';}catch(__){}}
          }
          // Mantém o objeto Image/registro vazio para módulos que guardam referência estável.
          // Os pixels/decoder são liberados, e uma visita futura reutiliza o mesmo objeto.
          r.status='idle';r.error=null;r.promise=null;
        }
      }
      this.groups.delete(group);
    }
    transferGroup(from,to){
      const set=this.groups.get(from); if(!set)return;
      for(const src of set){const r=this.records.get(src);if(r){r.groups.delete(from);r.groups.add(to);this._group(to,src);}}
      this.groups.delete(from);
    }
    preloadLevel(level){ try{return level?.preload?.();}catch(e){if(window.DEV) console.warn('[assets] preload',e);return null;} }
    preloadNext(){ /* AssetManager 2.0: preload automático desativado por padrão para proteger memória em celular. */ }
    stats(){
      const byStatus={idle:0,loading:0,loaded:0,error:0};
      for(const r of this.records.values()) byStatus[r.status]=(byStatus[r.status]||0)+1;
      return {records:this.records.size,groups:this.groups.size,byStatus};
    }
  }

  class SceneManager {
    constructor(){this.current=null;this.previous=null;this.enteredAt=performance.now();}
    enter(name){if(name===this.current)return;this.previous=this.current;this.current=name;this.enteredAt=performance.now();}
  }

  class AttackDirector {
    constructor(){this.maxAttackers1P=2;this.maxAttackers2P=3;}
    assign(enemies,players){
      const aliveP=(players||[]).filter(p=>p&&p.life>0); if(!aliveP.length)return;
      const alive=(enemies||[]).filter(e=>e&&e.life>0&&!e.dead);
      const limit=aliveP.length>1?this.maxAttackers2P:this.maxAttackers1P;
      const active=alive.filter(e=>e.attacking).slice(0,limit);
      const slots=Math.max(0,limit-active.length);
      const ranked=alive.filter(e=>!active.includes(e)).map(e=>({e,d:Math.min(...aliveP.map(p=>Math.abs((p.x||0)-(e.x||0))))})).sort((a,b)=>a.d-b.d);
      const allowed=new Set(active.concat(ranked.slice(0,slots).map(x=>x.e)));
      alive.forEach(e=>{e.__attackAllowed=allowed.has(e); if(!e.__attackAllowed&&!e.attacking&&(e.attackCooldown||0)<=0)e.attackCooldown=8;});
    }
  }

  window.assetManager=window.assetManager||new AssetManager();
  window.sceneManager=window.sceneManager||new SceneManager();
  window.attackDirector=window.attackDirector||new AttackDirector();
  window.GameRuntime=window.GameRuntime||{};
  Object.assign(window.GameRuntime,{
    targetHz:60,
    fixedStepMs:1000/60,
    debugHitboxes:false,
    score:{ add(v){ if(typeof window.addGameScore==='function') window.addGameScore(v); }, get(){return typeof window.getGameScore==='function'?window.getGameScore():0;} }
  });
})();
