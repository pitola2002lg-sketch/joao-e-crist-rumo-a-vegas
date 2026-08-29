/** 16-bit sprite renderer v0.9.4-16BIT - frames reais, hitbox independente */
(()=>{
const A='assets/enemies/';
const defs={"capanga":{"file":"capanga-16bit.webp","frames":{"idle":[[14,8,95,164],[124,6,94,166],[237,6,97,166]],"walk":[[360,4,95,168],[478,5,105,167],[604,6,104,166],[737,8,103,164]],"run":[[857,8,165,165],[1005,8,159,164],[1173,11,155,161],[1338,11,163,161]],"attack":[[3,444,129,153],[10,248,110,154],[148,444,151,157],[182,208,109,175],[335,184,118,174]],"hurt":[[12,626,135,159],[22,825,158,147],[158,638,140,147]],"dead":[[199,826,249,146],[958,708,174,74],[1170,722,179,62],[199,826,249,146]],"dash":[[199,826,249,146],[465,833,252,139],[722,841,236,131],[989,831,245,141],[1257,839,260,135]]}},"fast":{"file":"fast-16bit.webp","frames":{"idle":[[19,16,92,157],[129,16,94,157],[243,16,98,157]],"walk":[[389,16,104,157],[514,16,105,157],[640,16,102,157],[771,16,93,158]],"run":[[771,16,93,158],[893,16,150,158],[1045,17,158,158],[1199,18,319,158]],"attack":[[6,601,150,154],[11,420,156,159],[12,225,99,157],[161,599,145,156],[171,418,158,161]],"hurt":[[19,765,123,150],[151,785,174,130],[337,786,572,131]],"dead":[[151,785,174,130],[337,786,572,131],[897,787,193,130],[930,675,186,79]],"dash":[[771,16,93,158],[893,16,150,158],[1045,17,158,158],[1199,18,319,158]]}},"strong":{"file":"strong-16bit.webp","frames":{"idle":[[31,11,97,148],[135,174,129,160],[161,12,98,147]],"walk":[[288,11,99,148],[427,8,122,150],[577,8,109,151],[705,9,105,150]],"run":[[952,21,177,136],[1104,22,153,136],[1246,29,152,130],[1372,29,146,129]],"attack":[[9,558,160,144],[10,390,135,150],[18,229,104,108],[144,388,167,150],[153,559,265,142]],"hurt":[[13,719,108,124],[138,718,104,126],[257,722,113,122]],"dead":[[727,729,133,99],[886,743,136,95],[891,624,119,82],[1224,790,129,54]],"dash":[[392,882,228,113],[608,881,206,117],[812,909,186,90],[1019,909,210,89],[1238,900,287,96]]}},"tank":{"file":"tank-16bit.webp","frames":{"idle":[[28,14,119,170],[176,13,257,171],[457,11,132,173]],"walk":[[594,13,126,171],[744,14,145,170],[890,14,193,170],[1073,14,461,178]],"run":[[594,13,126,171],[744,14,145,170],[890,14,193,170],[1073,14,461,178]],"attack":[[23,207,137,184],[727,250,139,170],[865,258,141,165],[957,442,148,169]],"hurt":[[2,802,180,178],[189,811,225,170],[423,810,222,170]],"dead":[[189,811,225,170],[423,810,222,170],[643,813,227,168],[801,673,173,105]],"dash":[[423,810,222,170],[643,813,227,168],[873,815,214,166],[1090,815,221,166],[1300,817,227,164]]}},"berserker":{"file":"berserker-16bit.webp","frames":{"idle":[[23,20,114,148],[157,20,102,148],[276,20,106,148]],"walk":[[411,19,108,149],[546,19,112,148],[674,21,118,147],[794,22,125,146]],"run":[[917,24,182,145],[1077,28,149,141],[1215,28,159,141],[1361,31,157,140]],"attack":[[10,369,140,145],[19,531,134,140],[23,194,128,156],[161,375,165,141],[162,531,132,140]],"hurt":[[18,684,118,132],[171,684,115,132],[314,692,109,125]],"dead":[[778,737,195,74],[992,734,164,77],[1175,759,161,57],[6,833,210,152]],"dash":[[218,842,232,142],[438,834,247,148],[654,856,259,129],[904,859,252,126],[1159,834,367,170]]}},"cowboy":{"file":"cowboy-16bit.webp","frames":{"idle":[[14,14,108,177],[146,14,108,177],[269,14,103,177]],"walk":[[392,10,116,181],[530,10,121,185],[668,10,150,189],[833,16,145,182]],"run":[[833,16,145,182],[956,16,188,186],[1135,19,194,183],[1310,19,202,182]],"attack":[[6,453,155,177],[14,230,132,175],[158,218,129,202],[166,456,161,174],[309,204,143,177]],"hurt":[[14,654,139,167],[160,653,131,168],[299,660,120,161]],"dead":[[927,720,217,93],[1154,736,201,74],[1362,734,163,79],[11,848,246,140]],"dash":[[11,848,246,140],[236,844,266,144],[493,858,288,134],[768,870,267,122],[1047,839,475,155]]}},"cockroach":{"file":"cockroach-16bit.webp","frames":{"idle":[[15,175,106,144],[36,10,81,144],[154,173,94,145]],"walk":[[156,10,80,146],[276,10,79,146],[295,166,93,130],[400,10,95,147]],"run":[[1146,178,89,170],[1203,8,147,153],[1273,179,96,185],[1354,10,149,152]],"attack":[[27,530,102,140],[29,370,160,140],[170,530,106,140],[193,374,158,136],[311,532,89,138]],"hurt":[[26,680,96,133],[160,680,116,134],[312,714,177,101]],"dead":[[312,714,177,101],[536,755,157,70],[820,708,187,122],[1041,714,217,116]],"dash":[[378,860,200,130],[606,864,216,129],[826,861,236,135],[1057,861,249,135],[1302,861,215,132]]}},"ciclista":{"file":"ciclista-16bit.webp","frames":{"idle":[[450,0,140,190],[595,0,140,190],[745,0,140,190]],"walk":[[0,195,145,195],[150,195,145,195],[300,195,145,195],[450,195,145,195],[600,195,145,195]],"run":[[745,0,140,190],[890,0,140,190],[1035,0,140,190],[1180,0,140,190],[1390,0,140,190]],"attack":[[750,195,145,195],[900,195,145,195],[1050,195,145,195],[1200,195,145,195],[1350,195,145,195]],"hurt":[[0,575,145,145],[150,575,145,145],[300,575,145,145]],"dead":[[0,720,145,150],[150,720,145,150],[300,720,145,150],[450,720,145,150]],"dash":[[0,870,190,154],[205,870,190,154],[440,870,190,154],[665,870,190,154],[880,870,190,154],[1095,870,190,154],[1310,870,190,154]]}}};
const imgs={};for(const [k,d] of Object.entries(defs)){imgs[k]=window.assetManager.placeholder(A+d.file);}
const visual={"capanga":82,"fast":82,"strong":100,"tank":110,"berserker":105,"cowboy":92,"cockroach":96,"ciclista":112};
function keyFor(e){const t=(e.type||'').toLowerCase();if(t==='basic')return'capanga';if(defs[t])return t;const n=(e.name||'').toLowerCase();if(n.includes('capanga'))return'capanga';if(n.includes('brut'))return'strong';if(n.includes('corredor'))return'fast';if(n.includes('tank'))return'tank';if(n.includes('bers'))return'berserker';if(n.includes('cowboy'))return'cowboy';if(n.includes('barata'))return'cockroach';if(n.includes('ciclista'))return'ciclista';return null;}
function state(e){if(e.life<=0||e.dead)return'dead';if(e.hitFlash>0)return'hurt';if(e.attacking||e.groundPounding||e.isGroundPounding||e.aiming)return'attack';if(e._sprMoving)return Math.abs(e._sprDX)>2.5?'run':'walk';return'idle';}
function drawSprite(ctx,e,key){const d=defs[key],im=imgs[key];if(!d||!im.complete||!im.naturalWidth)return false;const st=state(e),frs=d.frames[st]||d.frames.idle;let idx=st==='dead'?Math.min(frs.length-1,Math.floor((e.deathAnim||0)/9)):Math.floor(performance.now()/(st==='attack'?105:st==='run'?85:145))%frs.length;const r=frs[idx];if(!r)return false;const [sx,sy,sw,sh]=r;const ground=Number.isFinite(e.groundY)?e.groundY:e.y+e.h;const baseH=visual[key]||Math.max(70,e.h);let th=st==='dead'?baseH*.78:baseH,tw=th*(sw/sh);if(tw>baseH*1.65){tw=baseH*1.65;th=tw/(sw/sh);}const cx=e.x+e.w/2,bottom=(e.isJumping||Math.abs(e.vy||0)>.1)?e.y+e.h:ground,facing=e._sprFacing||(e.facingRight===true?1:-1);ctx.save();ctx.imageSmoothingEnabled=false;if(facing<0){ctx.translate(cx,0);ctx.scale(-1,1);ctx.translate(-cx,0);}ctx.drawImage(im,sx,sy,sw,sh,cx-tw/2,bottom-th,tw,th);ctx.restore();return true;}
function health(ctx,e,key){if(e.life<=0||e.life>=e.maxLife)return;const w=Math.max(30,Math.min(56,e.w)),x=e.x+e.w/2-w/2,g=Number.isFinite(e.groundY)?e.groundY:e.y+e.h,y=g-(visual[key]||Math.max(60,e.h))-8,p=Math.max(0,e.life/e.maxLife);ctx.fillStyle='rgba(0,0,0,.65)';ctx.fillRect(x-1,y-1,w+2,5);ctx.fillStyle=p>.6?'#31d158':p>.3?'#ffb020':'#ff453a';ctx.fillRect(x,y,w*p,3);}
function install(C,fixedKey=null){if(!C||!C.prototype||C.prototype.__spr16)return;const oldU=C.prototype.update,oldD=C.prototype.draw;if(oldU)C.prototype.update=function(...a){const ox=this.x,r=oldU.apply(this,a);this._sprDX=this.x-ox;this._sprMoving=Math.abs(this._sprDX)>.05;if(Math.abs(this._sprDX)>.01)this._sprFacing=this._sprDX>0?1:-1;return r;};C.prototype.draw=function(ctx){const key=fixedKey||keyFor(this);if(!key||!drawSprite(ctx,this,key)){if(oldD)return oldD.call(this,ctx);return;}const g=Number.isFinite(this.groundY)?this.groundY:this.y+this.h;ctx.save();ctx.fillStyle='rgba(0,0,0,.24)';ctx.beginPath();ctx.ellipse(this.x+this.w/2,g+2,Math.max(11,this.w*.36),3.5,0,0,Math.PI*2);ctx.fill();ctx.restore();health(ctx,this,key);};C.prototype.__spr16=true;}
install(typeof Enemy!=='undefined'?Enemy:null,null);install(typeof BasicEnemy!=='undefined'?BasicEnemy:null,'capanga');install(typeof CapangaEnemy!=='undefined'?CapangaEnemy:null,'capanga');/* Cowboy/Tank/Berserker usam o renderer final logo abaixo para evitar dupla camada. */install(typeof StrongEnemy!=='undefined'?StrongEnemy:null,'strong');install(typeof CiclistaEnemy!=='undefined'?CiclistaEnemy:null,'ciclista');install(typeof CockroachEnemy!=='undefined'?CockroachEnemy:null,'cockroach');install(typeof FastEnemy!=='undefined'?FastEnemy:null,'fast');
})();



/* João e Crist v0.9.4 16-bit — Cowboy/Berserker/Tank final renderer */
(() => {
  const BASE = 'assets/enemies/';

  const cfg = {
    cowboy: {
      file: 'cowboy-16bit.webp',
      height: 92,
      frames: {
        idle:   [[14,14,108,177],[146,14,108,177],[269,14,103,177]],
        walk:   [[392,10,116,181],[530,10,121,185],[668,10,150,189]],
        run:    [[833,8,170,188],[1000,8,170,188],[1170,8,170,188],[1350,8,180,188]],
        attack: [[8,410,150,185],[165,410,155,185],[325,410,165,185],[490,410,180,185]],
        hurt:   [[6,615,150,180],[158,615,140,180],[298,615,138,180]],
        dead:   [[925,690,220,120],[1148,705,205,110],[1358,705,170,110]],
        dash:   [[12,835,240,155],[255,835,245,155],[505,835,245,155],[760,835,245,155]]
      }
    },
    berserker: {
      file: 'berserker-16bit.webp',
      height: 108,
      frames: {
        idle:   [[23,20,114,148],[157,20,102,148],[276,20,106,148]],
        walk:   [[411,19,108,149],[546,19,112,148],[674,21,118,147]],
        run:    [[890,10,170,175],[1045,10,170,175],[1200,10,170,175],[1360,10,175,175]],
        attack: [[10,370,145,190],[160,370,150,190],[310,370,165,190],[475,370,175,190]],
        hurt:   [[18,630,140,170],[160,630,145,170],[305,630,145,170]],
        dead:   [[775,690,200,120],[985,690,175,120],[1165,705,175,110]],
        dash:   [[10,820,215,180],[225,820,230,180],[455,820,235,180],[690,820,235,180]]
      }
    },
    tank: {
      file: 'tank-16bit.webp',
      height: 112,
      frames: {
        // Only clean, isolated body frames here. This avoids the old giant merged crops.
        idle:   [[28,14,119,170],[176,13,132,171],[309,13,124,171]],
        walk:   [[457,11,132,173],[594,13,126,171],[744,14,145,170]],
        run:    [[890,5,165,185],[1045,5,165,185],[1200,5,165,185],[1365,5,170,185]],
        attack: [[727,205,145,185],[870,205,145,185],[1010,205,160,185],[1170,205,175,185],[1350,205,180,185]],
        hurt:   [[6,605,145,190],[150,605,145,190],[295,605,145,190]],
        dead:   [[800,665,180,130],[990,665,180,130],[1180,665,180,130]],
        dash:   [[5,805,180,190],[190,805,220,190],[425,805,220,190],[650,805,220,190]]
      }
    }
  };

  const images = {};
  Object.entries(cfg).forEach(([key, c]) => {
    images[key] = window.assetManager.placeholder(BASE + c.file);
  });

  function stateFor(e, key) {
    if (e.life <= 0 || e.dead) return 'dead';
    if ((e.hitFlash || 0) > 0) return 'hurt';

    if (key === 'berserker' && (e.isDashing || e.dashDuration > 0)) return 'dash';
    if (key === 'cowboy' && e.dodging) return 'dash';

    if (key === 'cowboy' && (e.aiming || e.gunFlash > 0 || e.attacking)) return 'attack';
    if (key === 'tank' && e.attacking) return 'attack';
    if (key === 'berserker' && (e.attacking || e.isGroundPounding || e.groundPounding)) return 'attack';

    const moving = Math.abs(e.__spr16dx || 0) > 0.05;
    if (moving) return Math.abs(e.__spr16dx) > 2.4 ? 'run' : 'walk';
    return 'idle';
  }

  function drawHealth(ctx, e, c, bottom) {
    if (!e.maxLife || e.life <= 0 || e.life >= e.maxLife) return;
    const w = Math.max(34, Math.min(58, e.w || 48));
    const x = e.x + (e.w || 48)/2 - w/2;
    const y = bottom - c.height - 10;
    const p = Math.max(0, Math.min(1, e.life / e.maxLife));
    ctx.fillStyle = 'rgba(0,0,0,.7)';
    ctx.fillRect(x-2,y-2,w+4,7);
    ctx.fillStyle = p > .55 ? '#59d65d' : p > .25 ? '#f1c34e' : '#e55245';
    ctx.fillRect(x,y,w*p,3);
  }

  function install(ClassRef, key) {
    if (!ClassRef || !ClassRef.prototype || ClassRef.prototype.__spr16Final) return;
    ClassRef.prototype.__spr16Final = true;

    const oldUpdate = ClassRef.prototype.update;
    ClassRef.prototype.update = function(...args) {
      const ox = this.x;
      const r = oldUpdate ? oldUpdate.apply(this, args) : undefined;
      this.__spr16dx = this.x - ox;
      if (Math.abs(this.__spr16dx) > 0.01) this.__spr16face = this.__spr16dx > 0 ? 1 : -1;
      return r;
    };

    ClassRef.prototype.draw = function(ctx) {
      const c = cfg[key], img = images[key];
      if (!img || !img.complete || !img.naturalWidth) return;

      const state = stateFor(this, key);
      const frames = c.frames[state] || c.frames.idle;
      const now = performance.now();

      // Relógio por inimigo e por estado. Evita que uma animação comece no meio
      // só porque performance.now() já estava avançado quando o inimigo entrou
      // em attack/dash/hurt. Isso deixa especialmente o Berserker bem mais estável.
      if (this.__spr16State !== state) {
        this.__spr16State = state;
        this.__spr16StateStart = now;
      }
      const stateAge = Math.max(0, now - (this.__spr16StateStart || now));
      let idx;

      if (state === 'dead') {
        idx = Math.min(frames.length - 1, Math.floor((this.deathAnim || 0) / 9));
      } else {
        const speed = state === 'attack' ? 70
                    : state === 'dash' ? 75
                    : state === 'hurt' ? 85
                    : state === 'run' ? 90
                    : state === 'walk' ? 135
                    : 220;
        idx = Math.floor(stateAge / speed) % frames.length;

        // Ataques devem percorrer a sequência uma vez, sem voltar ao primeiro
        // frame antes do estado terminar.
        if (state === 'attack') {
          idx = Math.min(frames.length - 1, Math.floor(stateAge / speed));
        }
      }

      const [sx,sy,sw,sh] = frames[idx];
      const baseH = c.height;
      let dh = state === 'dead' ? baseH * .72 : baseH;
      let dw = dh * (sw / sh);

      // Prevent effect-heavy frames from visually exploding in size.
      const maxW = key === 'tank' ? baseH * 1.55 : baseH * 1.65;
      if (dw > maxW) {
        dw = maxW;
        dh = dw / (sw/sh);
      }

      const cx = this.x + (this.w || 48)/2;
      // Visual follows actual Y if enemy ever jumps/gets displaced; otherwise remains foot-anchored.
      const staticGround = Number.isFinite(this.groundY) ? this.groundY : this.y + (this.h || 70);
      const displaced = Number.isFinite(this.groundY) && Math.abs((this.y + (this.h || 70)) - this.groundY) > 2;
      const bottom = displaced ? this.y + (this.h || 70) : staticGround;

      ctx.save();
      ctx.imageSmoothingEnabled = false;

      ctx.fillStyle = 'rgba(0,0,0,.28)';
      ctx.beginPath();
      ctx.ellipse(cx, staticGround + 2, Math.max(13,(this.w||48)*.38), 4, 0, 0, Math.PI*2);
      ctx.fill();

      let face = this.__spr16face;
      if (!face) face = this.facingRight === true ? 1 : -1;
      if (face < 0) {
        ctx.translate(cx,0);
        ctx.scale(-1,1);
        ctx.translate(-cx,0);
      }

      ctx.drawImage(img, sx,sy,sw,sh, cx-dw/2, bottom-dh, dw,dh);
      ctx.restore();

      drawHealth(ctx,this,c,bottom);
    };
  }

  // Explicit class overrides, loaded last so no generic renderer can steal them.
  install(typeof CowboyEnemy !== 'undefined' ? CowboyEnemy : null, 'cowboy');
  install(typeof BerserkerEnemy !== 'undefined' ? BerserkerEnemy : null, 'berserker');
  install(typeof TankEnemy !== 'undefined' ? TankEnemy : null, 'tank');
})();
