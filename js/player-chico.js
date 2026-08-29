// Chico Fumaça - personagem desbloqueável após vencer o bônus da pescaria.
// Sprite sheet recortado em frames reais para animações de gameplay.
const CHICO_FRAME_FILES = {
  idle: ['assets/players/chico/frames/idle1.webp','assets/players/chico/frames/idle2.webp','assets/players/chico/frames/idle3.webp','assets/players/chico/frames/idle4.webp'],
  walk: ['assets/players/chico/frames/walk1.webp','assets/players/chico/frames/walk2.webp','assets/players/chico/frames/walk3.webp','assets/players/chico/frames/walk4.webp','assets/players/chico/frames/walk5.webp','assets/players/chico/frames/walk6.webp'],
  run: ['assets/players/chico/frames/run1.webp','assets/players/chico/frames/run2.webp','assets/players/chico/frames/run3.webp','assets/players/chico/frames/run4.webp','assets/players/chico/frames/run5.webp','assets/players/chico/frames/run6.webp'],
  jump: ['assets/players/chico/frames/jump1.webp','assets/players/chico/frames/jump2.webp','assets/players/chico/frames/jump3.webp'],
  attack: ['assets/players/chico/frames/attack1.webp','assets/players/chico/frames/attack2.webp','assets/players/chico/frames/attack3.webp'],
  hurt: ['assets/players/chico/frames/hurt1.webp'],
  dead: ['assets/players/chico/frames/dead1.webp'],
  dash: ['assets/players/chico/frames/dash1.webp','assets/players/chico/frames/dash2.webp','assets/players/chico/frames/dash3.webp']
};
const CHICO_FRAMES = Object.fromEntries(
  Object.entries(CHICO_FRAME_FILES).map(([state,list])=>[
    state,
    list.map(src=>window.assetManager.image(src,'player:chico',{defer:true}))
  ])
);
window.CharacterAssetRegistry=window.CharacterAssetRegistry||{};
window.CharacterAssetRegistry.chico={preview:[...CHICO_FRAME_FILES.idle],full:Object.values(CHICO_FRAME_FILES).flat()};

class PlayerChico extends PlayerCrist {
    constructor(x, y, controlPlayer = 1) {
        super(x, y, controlPlayer);
        this.name = 'Chico Fumaça';
        this.w = 54;
        this.h = 76;
        this.speed = 5.6;
        this.maxLife = 125;
        this.life = this.maxLife;
        this.primaryColor = '#f0a93b';
        this.secondaryColor = '#8c5420';
        this.hitbox = { offsetX: 8, offsetY: 18, width: 38, height: 54 };
        this.spriteBaseOffset = 4;
    }

    getHitbox() {
        if (!this.attacking || this.attackTimer > 10 || this.attackTimer < 4) return null;
        const w = 82, h = 48;
        return {
            x: this.facingRight ? this.x + this.w - 2 : this.x - w + 2,
            y: this.y + 16,
            w, h
        };
    }

    // PlayerCrist.draw() chama drawCristSprite; Chico substitui somente o renderer.
    drawCristSprite(ctx) { this.drawChicoSprite(ctx); }
    drawCrist(ctx) { this.drawChicoSprite(ctx); }

    drawChicoSprite(ctx) {
        let state='idle';
        if(this.life<=0) state='dead';
        else if(this.dashing) state='dash';
        else if(this.attacking) state='attack';
        else if(this.isJumping) state='jump';
        else if(this.invulnerable>15) state='hurt';
        else if(this.isMoving) state=this.isRunning?'run':'walk';

        const frames=CHICO_FRAMES[state]||CHICO_FRAMES.idle;
        if(!frames?.length) return;
        let frame=0;
        if(state==='attack'){
            const progress=1-(Math.max(0,this.attackTimer)/15);
            frame=Math.min(frames.length-1,Math.floor(progress*frames.length));
        } else if(state==='jump'){
            if(this.vy < -3) frame=0;
            else if(this.vy < 4) frame=Math.min(1,frames.length-1);
            else frame=frames.length-1;
        } else if(state==='dash'){
            frame=Math.floor((this.dashDuration-Math.max(0,this.dashTimer))/2)%frames.length;
        } else if(state==='hurt'||state==='dead'){
            frame=0;
        } else {
            const speed=state==='run'?78:state==='walk'?100:190;
            frame=Math.floor(performance.now()/speed)%frames.length;
        }

        const img=frames[frame]||frames[0];
        if(!img?.complete||!img.naturalWidth) return;
        const ratio=img.naturalWidth/img.naturalHeight;
        let drawH=state==='attack'?106:state==='jump'?104:state==='dead'?91:100;
        let drawW=drawH*ratio;
        if(ratio>1.45){drawW=Math.min(188,drawW);drawH=Math.min(110,drawW/ratio);}
        else drawW=Math.max(70,drawW);

        const cx=this.x+this.w/2;
        const bottom=this.y+this.h+this.spriteBaseOffset;
        const dx=cx-drawW/2;
        const dy=bottom-drawH;
        ctx.save();
        ctx.imageSmoothingEnabled=false;
        if(this.invulnerable>0&&Math.floor(this.invulnerable/5)%2===0)ctx.globalAlpha=.55;
        if(!this.facingRight){
            ctx.translate(dx+drawW,0);ctx.scale(-1,1);ctx.drawImage(img,0,dy,drawW,drawH);
        }else ctx.drawImage(img,dx,dy,drawW,drawH);
        ctx.restore();
    }
}
