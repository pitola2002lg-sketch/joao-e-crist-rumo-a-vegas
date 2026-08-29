/* NPC da fazenda: cachorra amigável da Fase 1 */
(function(){
  'use strict';

  const loadImage = (src) => window.assetManager.placeholder(src);

  const DOG_FRAMES = {
    idleFront: [
      loadImage('assets/npc/pantera/idle1.webp'),
      loadImage('assets/npc/pantera/idle2.webp')
    ],
    walkSide: [
      loadImage('assets/npc/pantera/walk1.webp'),
      loadImage('assets/npc/pantera/walk2.webp'),
      loadImage('assets/npc/pantera/walk3.webp')
    ],
    sit: [
      loadImage('assets/npc/pantera/idle1.webp'),
      loadImage('assets/npc/pantera/idle2.webp')
    ]
  };

  const DOGHOUSE_SPRITE = loadImage('assets/npc/pantera/food-bowl.webp');
  const FOOD_BOWL_SPRITE = loadImage('assets/npc/pantera/doghouse.webp');

  function drawImageAsset(ctx, img, dx, dy, dw, dh, flip=false){
    if (!img?.complete || !img.naturalWidth) return false;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (flip) {
      ctx.translate(dx + dw, dy);
      ctx.scale(-1, 1);
      ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, 0, 0, dw, dh);
    } else {
      ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, dx, dy, dw, dh);
    }
    ctx.restore();
    return true;
  }

  class FarmDogNPC {
    constructor(x, groundY){
      this.name = 'Pantera';
      this.x = x;
      this.w = 74;
      this.h = 76;
      this.groundY = groundY;
      this.y = groundY - this.h;
      this.baseX = x;
      this.leftBound = x - 220;
      this.rightBound = x + 220;
      this.speed = 0.42;
      this.followSpeed = 0.72;
      this.dir = 1;
      this.animTimer = 0;
      this.idleHold = 0;
      this.petTimer = 0;
      this.heartTimer = 0;
      this.followTimer = 0;
      this.followTarget = null;
      this.recentlyPettedBy = null;
      this.promptForPlayer = null;
      this.houseX = this.baseX + 120;
      this.bowlX = this.houseX + 42;
      this._attackPrev = {1:false,2:false};
      this._barkCooldown = 0;
    }

    update(players, keys){
      this.animTimer += 1;
      if (this._barkCooldown > 0) this._barkCooldown--;
      if (this.petTimer > 0) {
        this.petTimer--;
      } else if (this.followTimer > 0 && this.followTarget && this.followTarget.life > 0) {
        this.followTimer--;
        const tx = Math.max(this.leftBound, Math.min(this.rightBound, this.followTarget.x + (this.followTarget.facingRight ? 18 : -18)));
        const dx = tx - this.x;
        if (Math.abs(dx) > 6) {
          this.dir = dx >= 0 ? 1 : -1;
          this.x += Math.sign(dx) * this.followSpeed;
        } else {
          this.idleHold = 4;
        }
      } else if (this.idleHold > 0) {
        this.idleHold--;
      } else {
        this.followTarget = null;
        this.x += this.speed * this.dir;
        if (this.x <= this.leftBound) { this.x = this.leftBound; this.dir = 1; this.idleHold = 28; }
        if (this.x >= this.rightBound) { this.x = this.rightBound; this.dir = -1; this.idleHold = 28; }
      }
      if (this.heartTimer > 0) this.heartTimer--;

      this.promptForPlayer = null;
      this.recentlyPettedBy = null;

      for (const player of (players || [])) {
        if (!player || player.life <= 0) continue;
        const slot = player.controlPlayer || 1;
        const playerCx = player.x + (player.w || 0) * 0.5;
        const dogCx = this.x + this.w * 0.5;
        const near = Math.abs(playerCx - dogCx) < 78 && Math.abs((player.groundY || (player.y + player.h)) - this.groundY) < 18;
        const attackDown = !!window.sistemControles?.acaoAtiva?.(slot, 'attack', keys);

        if (near && !this.promptForPlayer) this.promptForPlayer = player;
        if (near && attackDown && !this._attackPrev[slot]) {
          this.petTimer = 68;
          this.heartTimer = 96;
          this.idleHold = 32;
          this.followTimer = 240;
          this.followTarget = player;
          this.dir = playerCx < dogCx ? -1 : 1;
          this.recentlyPettedBy = player;
          if (typeof window.createTextPopup === 'function') {
            window.createTextPopup(this.x + this.w * 0.5, this.y - 12, `${this.name} adorou! <3`, '#ff8ccf');
          }
          if (window.soundSystem?.playSound) {
            window.soundSystem.playSound('dogPet');
          }
          if (window.GameDebugConsole) window.GameDebugConsole.log('[DOG] Cachorra recebeu carinho na Fase 1');
        }
        this._attackPrev[slot] = attackDown;
      }
    }

    drawPrompt(ctx){
      if (!this.promptForPlayer || this.petTimer > 0) return;
      const slot = this.promptForPlayer.controlPlayer || 1;
      const keyName = window.sistemControles?.nomeTecla?.(window.sistemControles?.obterControles?.(slot)?.attack || ' ') || 'ATAQUE';
      const label = `${keyName} = CARINHO`;
      const px = this.x + this.w * 0.5;
      const py = this.y - 16;
      ctx.save();
      ctx.font = 'bold 14px Righteous';
      const tw = Math.ceil(ctx.measureText(label).width) + 20;
      ctx.fillStyle = 'rgba(0,0,0,.72)';
      ctx.fillRect(px - tw/2, py - 18, tw, 22);
      ctx.strokeStyle = '#ffd68a';
      ctx.strokeRect(px - tw/2, py - 18, tw, 22);
      ctx.fillStyle = '#fff4d1';
      ctx.textAlign = 'center';
      ctx.fillText(label, px, py - 2);
      ctx.restore();
    }


    drawName(ctx){
      const label = this.name;
      const px = this.x + this.w * 0.5;
      const py = this.y - 34;
      ctx.save();
      ctx.font = 'bold 15px Righteous';
      const tw = Math.ceil(ctx.measureText(label).width) + 18;
      ctx.fillStyle = 'rgba(39, 24, 12, 0.72)';
      ctx.fillRect(px - tw/2, py - 16, tw, 20);
      ctx.strokeStyle = '#d9b46a';
      ctx.strokeRect(px - tw/2, py - 16, tw, 20);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff5d8';
      ctx.fillText(label, px, py - 1);
      ctx.restore();
    }

    drawProps(ctx){
      const hx = Math.round(this.houseX), hy = Math.round(this.groundY - 94);
      drawImageAsset(ctx, DOGHOUSE_SPRITE, hx, hy, 110, 94, false);
      const bx = Math.round(this.bowlX), by = Math.round(this.groundY + 4);
      drawImageAsset(ctx, FOOD_BOWL_SPRITE, bx, by, 24, 19, false);
    }

    drawHearts(ctx){
      if (this.heartTimer <= 0) return;
      const heartCount = 3;
      for (let i = 0; i < heartCount; i++) {
        const drift = ((this.heartTimer + i * 13) % 30) / 30;
        const hx = this.x + 18 + i * 15;
        const hy = this.y - 12 - drift * 14 - (i % 2) * 5;
        ctx.save();
        ctx.fillStyle = i === 1 ? '#ff6bb2' : '#ff8ccf';
        ctx.beginPath();
        ctx.arc(hx - 4, hy, 4, 0, Math.PI * 2);
        ctx.arc(hx + 4, hy, 4, 0, Math.PI * 2);
        ctx.moveTo(hx - 9, hy + 2);
        ctx.lineTo(hx, hy + 12);
        ctx.lineTo(hx + 9, hy + 2);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }

    draw(ctx){
      this.drawProps(ctx);
      const isPetting = this.petTimer > 0;
      const isIdle = this.idleHold > 0 || isPetting;
      const drawX = Math.round(this.x);
      const drawY = Math.round(this.y - 4);
      if (isPetting) {
        const idle = DOG_FRAMES.idleFront[Math.floor((this.animTimer / 18) % DOG_FRAMES.idleFront.length)];
        drawImageAsset(ctx, idle, drawX + 4, drawY - 2, 64, 80, false);
      } else if (isIdle) {
        const sit = DOG_FRAMES.sit[Math.floor((this.animTimer / 24) % DOG_FRAMES.sit.length)] || DOG_FRAMES.idleFront[0];
        drawImageAsset(ctx, sit, drawX + 8, drawY + 18, 54, 52, false);
      } else {
        const walk = DOG_FRAMES.walkSide[Math.floor((this.animTimer / 10) % DOG_FRAMES.walkSide.length)] || DOG_FRAMES.walkSide[0];
        drawImageAsset(ctx, walk, drawX - 4, drawY + 8, 82, 58, this.dir < 0);
      }
      this.drawHearts(ctx);
      this.drawName(ctx);
      this.drawPrompt(ctx);
      // pequena sombra no chão
      ctx.save();
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.ellipse(this.x + this.w/2, this.groundY + 2, 26, 7, 0, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();
    }
  }

  class FarmDogNPCManager {
    constructor(){ this.current = null; }
    initForLevel(level){
      if (level?.id === 1) {
        const ground = typeof level.getGround === 'function' ? level.getGround() : 510;
        this.current = new FarmDogNPC(860, ground);
      } else {
        this.current = null;
      }
    }
    reset(){ this.current = null; }
    update(players, keys){ this.current?.update?.(players, keys); }
    draw(ctx){ this.current?.draw?.(ctx); }
  }

  window.farmDogNPCManager = new FarmDogNPCManager();
})();
