(function(){
  if (window.__missingSpritePackLoaded) return;
  window.__missingSpritePackLoaded = true;

  const cache = {};
  function img(name){
    if(!cache[name]){
      const src='assets/sprite-pack/' + name;
      cache[name]=window.assetManager.placeholder(src);
      if(!cache[name].complete||!cache[name].naturalWidth){
        const gid=(window.levelManager?.currentLevelIndex!=null)?`level:${window.levelManager.currentLevelIndex+1}`:'shared';
        window.assetManager.loadImage(src,gid).catch(()=>{});
      }
    }
    return cache[name];
  }
  const effectGet = name => img(name + '.webp');
  window.__extraSpriteEffect = effectGet;

  const PACK = {
    elite:    { frames:{ idle:['elite_idle.webp'], walk:['elite_walk1.webp','elite_walk2.webp'], attack:['elite_attack.webp'], hurt:['elite_hurt.webp'], dead:['elite_dead.webp'] }, w:72, h:92, shadow:16, glow:'#74a9d9', deathFrames:30 },
    ghost:    { frames:{ idle:['ghost_idle.webp'], walk:['ghost_walk1.webp','ghost_walk2.webp'], attack:['ghost_attack.webp'], hurt:['ghost_hurt.webp'], dead:['ghost_dead.webp'] }, w:76, h:90, shadow:0, glow:'#a84cff', alpha:true, floaty:true, deathFrames:30 },
    assassin: { frames:{ idle:['assassin_idle.webp'], walk:['assassin_walk1.webp','assassin_walk2.webp'], attack:['assassin_attack.webp'], hurt:['assassin_hurt.webp'], dead:['assassin_dead.webp'] }, w:68, h:92, shadow:15, glow:'#ff0066', deathFrames:30 },
    drone:    { frames:{ idle:['drone_idle.webp'], walk:['drone_walk1.webp','drone_walk2.webp'], attack:['drone_attack.webp'], hurt:['drone_hurt.webp'], dead:['drone_dead.webp'] }, w:52, h:52, shadow:14, glow:'#00d7ff', deathFrames:30 },
    colonel:  { frames:{ idle:['colonel_idle.webp'], walk:['colonel_walk1.webp','colonel_walk2.webp'], attack:['colonel_attack1.webp','colonel_attack2.webp','colonel_attack3.webp','colonel_attack4.webp'], hurt:['colonel_hurt.webp'], dead:['colonel_dead.webp'] }, w:186, h:198, shadow:34, glow:'#7d3c98', boss:true, deathFrames:30, barColor:'#e74c3c' },
    vegas:    { frames:{ idle:['vegas_idle.webp'], walk:['vegas_walk1.webp','vegas_walk2.webp'], attack:['vegas_attack.webp'], hurt:['vegas_hurt.webp'], dead:['vegas_dead.webp'] }, w:132, h:132, shadow:28, glow:'#ffd700', boss:true, deathFrames:30, barColor:'#ff00aa' },
    engineer: { frames:{ idle:['engineer_idle.webp'], walk:['engineer_walk1.webp','engineer_walk2.webp'], attack:['engineer_attack.webp'], hurt:['engineer_hurt.webp'], dead:['engineer_dead.webp'] }, w:118, h:126, shadow:24, glow:'#00d7ff', boss:true, deathFrames:40, barColor:'#00d7ff' },
    shadow:   { frames:{ idle:['shadow_idle.webp'], walk:['shadow_walk1.webp','shadow_walk2.webp'], attack:['shadow_attack.webp'], hurt:['shadow_hurt.webp'], dead:['shadow_dead.webp'] }, w:108, h:124, shadow:18, glow:'#a84cff', boss:true, deathFrames:40, alpha:true, barColor:'#a84cff' },
    god:      { frames:{ idle:['god_idle.webp'], walk:['god_walk1.webp','god_walk2.webp'], attack:['god_attack.webp'], hurt:['god_hurt.webp'], dead:['god_dead.webp'] }, w:142, h:142, shadow:32, glow:'#ffd700', boss:true, deathFrames:60, barColor:'#ffd700' }
  };

  function stateFor(entity){
    if (entity.life <= 0) return 'dead';
    if ((entity.hitFlash || 0) > 0) return 'hurt';
    if (entity.attacking || (entity.attackTimer || 0) > 0 || entity.shockActive || entity.chargeMode || entity.rageMode || entity.isBlocking) return 'attack';
    const px = entity.__prevSpriteX ?? entity.x;
    const moved = Math.abs(entity.x - px) > 0.2;
    entity.__prevSpriteX = entity.x;
    if (moved) return ((Math.floor(performance.now()/140) % 2) === 0) ? 'walk' : 'walk';
    return 'idle';
  }

  function drawBossBar(ctx, entity, color){
    const width = 112;
    const x = entity.x + entity.w/2 - width/2;
    const y = entity.y - 20;
    const pct = Math.max(0, entity.life / Math.max(1, entity.maxLife || entity.life));
    ctx.save();
    ctx.fillStyle = '#111'; ctx.fillRect(x, y, width, 8);
    ctx.fillStyle = color; ctx.fillRect(x, y, width * pct, 8);
    ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.strokeRect(x, y, width, 8);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 10px Arial'; ctx.textAlign = 'center';
    const phase = entity.phase ? ` [FASE ${entity.phase}]` : '';
    ctx.fillText(`${entity.name || 'BOSS'}${phase}`, x + width/2, y - 4);
    ctx.restore();
  }

  function drawEffectOverlay(ctx, entity, key){
    if(key === 'engineer' && entity.shockActive){
      const orb = effectGet('orb_electric');
      const cx = entity.x + entity.w/2, cy = entity.y + entity.h/2;
      for(let i=0;i<4;i++){
        const a = performance.now()*0.003 + i*Math.PI/2;
        const ox = cx + Math.cos(a)*42, oy = cy + Math.sin(a)*22;
        if(orb.complete) ctx.drawImage(orb, ox-12, oy-12, 24, 24);
      }
    }
    if(key === 'shadow' && (entity.invincibleFrames || 0) > 0){
      const tp = effectGet('teleport_' + ((Math.floor(performance.now()/120)%3)+1));
      if(tp.complete) ctx.drawImage(tp, entity.x - 6, entity.y + 10, entity.w + 12, entity.h + 8);
    }
    if(key === 'god' && entity.shieldActive){
      const orb = effectGet('orb_gold');
      if(orb.complete){
        for(let i=0;i<3;i++){
          const a = performance.now()*0.002 + i*(Math.PI*2/3);
          const ox = entity.x + entity.w/2 + Math.cos(a)*54;
          const oy = entity.y + entity.h/2 + Math.sin(a)*36;
          ctx.drawImage(orb, ox-10, oy-10, 20, 20);
        }
      }
    }
  }

  function renderEntity(ctx, entity, key){
    const cfg = PACK[key];
    if(!cfg) return;
    if (entity.life <= 0 && (entity.deathAnim || 0) >= (cfg.deathFrames || 30)) return;
    const state = stateFor(entity);
    const list = cfg.frames[state] || cfg.frames.idle;
    const animSpeed = state === 'walk' ? 160 : state === 'attack' ? 110 : state === 'hurt' ? 150 : state === 'dead' ? 9999 : 220;
    const frameIndex = list.length > 1 ? (Math.floor(performance.now()/animSpeed) % list.length) : 0;
    const frame = list[frameIndex];
    const sprite = img(frame);
    const centerX = entity.x + entity.w/2;
    const ground = Number.isFinite(entity.groundY) ? entity.groundY : (entity.y + entity.h);
    const bob = cfg.floaty ? Math.sin(performance.now()*0.004)*4 : 0;
    const drawW = cfg.w, drawH = cfg.h;
    const drawX = centerX - drawW/2;
    const drawY = ground - drawH + bob;
    const facingRight = !!entity.facingRight;

    ctx.save();
    let alpha = 1;
    if (cfg.alpha && Number.isFinite(entity.alpha)) alpha *= entity.alpha;
    if (entity.life <= 0) alpha *= Math.max(0, 1 - (entity.deathAnim || 0) / (cfg.deathFrames || 30));
    ctx.globalAlpha *= alpha;

    if (cfg.shadow > 0) {
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.beginPath();
      ctx.ellipse(centerX, ground + 3, cfg.shadow, Math.max(4, cfg.shadow * 0.28), 0, 0, Math.PI*2);
      ctx.fill();
    }

    if (entity.hitFlash > 0 || cfg.glow) {
      ctx.shadowBlur = entity.hitFlash > 0 ? 18 : 10;
      ctx.shadowColor = entity.hitFlash > 0 ? '#fff' : cfg.glow;
    }

    if (facingRight) {
      ctx.translate(centerX, 0);
      ctx.scale(-1, 1);
      ctx.translate(-centerX, 0);
    }
    if (sprite.complete && sprite.naturalWidth) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(sprite, drawX, drawY, drawW, drawH);
    }
    ctx.restore();

    ctx.save();
    drawEffectOverlay(ctx, entity, key);
    if (cfg.boss) drawBossBar(ctx, entity, cfg.barColor || cfg.glow || '#fff');
    ctx.restore();
  }

  function patch(name, key){
    const C = window[name];
    if (!C || !C.prototype || C.prototype.__spritePackPatched) return;
    C.prototype.__spritePackPatched = true;
    C.prototype.draw = function(ctx){ renderEntity(ctx, this, key); };
  }

  patch('EliteEnemy','elite');
  patch('GhostEnemy','ghost');
  patch('AssassinEnemy','assassin');
  patch('BossEnemy','colonel');
  patch('FinalBoss','vegas');
  patch('TechBoss','engineer');
  patch('ShadowBoss','shadow');
  patch('GodBoss','god');

  if (window.FastEnemy && !FastEnemy.prototype.__droneSpritePatch) {
    FastEnemy.prototype.__droneSpritePatch = true;
    const orig = FastEnemy.prototype.draw;
    FastEnemy.prototype.draw = function(ctx){
      if (this.isBossMinion) return renderEntity(ctx, this, 'drone');
      return orig.call(this, ctx);
    };
  }

  if(window.DEV) console.log('✅ Sprite pack extra carregado: Elite/Ghost/Assassin/Bosses/Drone');
})();
