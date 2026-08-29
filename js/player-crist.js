const CRIST_SPRITE_SHEET = window.assetManager.image('assets/players/crist/crist-16bit-spaced.webp','shared',{defer:true}); // carregado somente quando preview/tutorial precisar
const CRIST_FRAME_FILES = {
  idle: ['assets/players/crist/frames/idle1.webp', 'assets/players/crist/frames/idle2.webp', 'assets/players/crist/frames/idle3.webp', 'assets/players/crist/frames/idle4.webp'],
  walk: ['assets/players/crist/frames/walk1.webp', 'assets/players/crist/frames/walk2.webp', 'assets/players/crist/frames/walk3.webp', 'assets/players/crist/frames/walk4.webp', 'assets/players/crist/frames/walk5.webp', 'assets/players/crist/frames/walk6.webp'],
  run: ['assets/players/crist/frames/run1.webp', 'assets/players/crist/frames/run2.webp', 'assets/players/crist/frames/run3.webp', 'assets/players/crist/frames/run4.webp', 'assets/players/crist/frames/run5.webp', 'assets/players/crist/frames/run6.webp'],
  jump: ['assets/players/crist/frames/jump1.webp', 'assets/players/crist/frames/jump2.webp', 'assets/players/crist/frames/jump3.webp', 'assets/players/crist/frames/jump4.webp'],
  attack: ['assets/players/crist/frames/attack1.webp', 'assets/players/crist/frames/attack2.webp', 'assets/players/crist/frames/attack3.webp', 'assets/players/crist/frames/attack4.webp', 'assets/players/crist/frames/attack5.webp', 'assets/players/crist/frames/attack6.webp'],
  hurt: ['assets/players/crist/frames/hurt1.webp', 'assets/players/crist/frames/hurt2.webp', 'assets/players/crist/frames/hurt3.webp'],
  dead: ['assets/players/crist/frames/dead1.webp', 'assets/players/crist/frames/dead2.webp', 'assets/players/crist/frames/dead3.webp', 'assets/players/crist/frames/dead4.webp', 'assets/players/crist/frames/dead5.webp'],
  dash: ['assets/players/crist/frames/dash1.webp', 'assets/players/crist/frames/dash2.webp', 'assets/players/crist/frames/dash3.webp']
};

const CRIST_FRAMES = Object.fromEntries(
  Object.entries(CRIST_FRAME_FILES).map(([state, list]) => [
    state,
    list.map(src => window.assetManager.image(src,'player:crist',{defer:true}))
  ])
);
window.CharacterAssetRegistry=window.CharacterAssetRegistry||{};
window.CharacterAssetRegistry.crist={
  preview:[...CRIST_FRAME_FILES.idle],
  full:Object.values(CRIST_FRAME_FILES).flat()
};

// Classe específica para o personagem CRIST
class PlayerCrist {
    constructor(x, y, controlPlayer = 1) {
        this.name = 'Crist';
        this.x = x;
        this.w = 48;
        this.h = 72;
        
        // ✅ PADRONIZADO: Mesmo sistema de chão dos inimigos
        this.groundY = y;        // y é a posição do chão
        this.y = y - this.h;     // Ajustar para base tocar o chão
        
        this.speed = 6;
        this.life = 100;
        this.maxLife = 100;
        this.attacking = false;
        this.attackTimer = 0;
        this.attackCooldown = 0;
        this.facingRight = true;
        
        // PATCH 2: hitbox e base refinadas para o novo sprite do Crist.
        // Corpo mais estreito, com pés melhor alinhados ao chão para reduzir
        // sensação de flutuar e evitar colisões injustas nas laterais.
        this.hitbox = {
            offsetX: 8,
            offsetY: 18,
            width: 32,
            height: 50
        };
        this.spriteBaseOffset = 3;
        
        // Controles do SLOT do jogador (independe do personagem escolhido)
        this.controlPlayer = controlPlayer;
        this.controls = sistemControles.obterControles(controlPlayer);
        
        // Sistema de dash/esquiva
        this.dashing = false;
        this.dashTimer = 0;
        this.dashCooldown = 0;
        this.dashSpeed = 15;
        this.dashDuration = 8;
        
        // Cores de Crist (vermelho)
        this.primaryColor = '#e74c3c';
        this.secondaryColor = '#c0392b';
        this.skinColor = '#d4a574';
        
        // Física
        this.jumpPower = 0;
        this.gravity = 0.5;  // ✅ PADRONIZADO: Mesma gravidade dos inimigos
        this.vy = 0;          // ✅ Velocidade vertical para sistema padronizado
        this.isJumping = false;
        
        // Sistema de combate
        this.combo = 0;
        this.invulnerable = 0;
        this.coyoteFrames = 0;
        this.jumpBufferFrames = 0;
        this._jumpHeldLast = false;
        this.walkCycle = 0;
        this.animTimer = 0;
        this.isMoving = false;
        this.moveHoldFrames = 0;
        this.isRunning = false;
        this.comboTimer = 0;
        this.activePowerUps = [];
    }
    
    // ===== MÉTODOS DE POWER-UPS =====
    activatePowerUp(type, duration) {
        this.activePowerUps = this.activePowerUps.filter(p => p.type !== type);
        this.activePowerUps.push({
            type: type,
            duration: duration,
            timer: 0
        });
    }
    
    hasActivePowerUp(type) {
        return this.activePowerUps.some(p => p.type === type);
    }
    
    // ===== MÉTODO DE DESENHO =====
    draw(ctx) {
        // Piscar quando invulnerável
        if (this.invulnerable > 0 && Math.floor(this.invulnerable / 5) % 2 === 0) {
            ctx.globalAlpha = 0.5;
        }
        
        // Efeito de rastro durante dash
        if (this.dashing) {
            for (let i = 0; i < 3; i++) {
                ctx.globalAlpha = 0.3 - (i * 0.1);
                const offsetX = this.facingRight ? -i * 10 : i * 10;
                
                ctx.fillStyle = 'rgba(231, 76, 60, 0.5)'; // Vermelho para Crist
                ctx.beginPath();
                ctx.ellipse(this.x + this.w / 2 + offsetX, this.y + this.h / 2, 
                           this.w / 2, this.h / 2, 0, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
        }

        // Sombra
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(this.x + this.w / 2, this.groundY + 2, this.w / 2, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Desenhar Crist
        this.drawCristSprite(ctx);

        ctx.globalAlpha = 1;

        // Nome do personagem
        ctx.save();
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.primaryColor;
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px Righteous';
        ctx.textAlign = 'center';
        ctx.fillText(this.name, this.x + this.w / 2, this.y - 25);
        ctx.restore();

        // Barra de vida
        this.drawHealthBar(ctx);
        
        // Indicador de combo
        if (this.combo > 1) {
            ctx.save();
            ctx.shadowBlur = 15;
            
            const comboTimePercent = this.comboTimer / 120;
            let comboColor = '#ffff00';
            
            if (comboTimePercent > 0.75) {
                comboColor = Math.floor(Date.now() / 100) % 2 === 0 ? '#ff0000' : '#ff8800';
            } else if (comboTimePercent > 0.5) {
                comboColor = '#ff8800';
            }
            
            ctx.shadowColor = comboColor;
            ctx.fillStyle = comboColor;
            ctx.font = 'bold 12px Righteous';
            ctx.textAlign = 'center';
            ctx.fillText(`COMBO x${this.combo}`, this.x + this.w / 2, this.y - 45);
            ctx.restore();
        }
        
        // Indicador de dash disponível
        if (this.dashCooldown === 0 && !this.dashing) {
            const pulse = Math.abs(Math.sin(Date.now() / 200));
            ctx.globalAlpha = 0.5 + pulse * 0.5;
            ctx.fillStyle = '#00ffff';
            ctx.beginPath();
            ctx.arc(this.x + this.w + 5, this.y + 10, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }
    }

    drawCristSprite(ctx) {
        let state = 'idle';
        if (this.life <= 0) state = 'dead';
        else if (this.dashing) state = 'dash';
        else if (this.attacking) state = 'attack';
        else if (this.isJumping) state = 'jump';
        else if (this.invulnerable > 15) state = 'hurt';
        else if (this.isMoving) state = this.isRunning ? 'run' : 'walk';

        const frames = CRIST_FRAMES[state] || CRIST_FRAMES.idle;
        if (!frames || !frames.length || !frames[0].complete) { this.drawCrist(ctx); return; }

        let frame = 0;
        if (state === 'attack') {
            const progress = 1 - (Math.max(0, this.attackTimer) / 15);
            frame = Math.min(frames.length - 1, Math.floor(progress * frames.length));
        } else if (state === 'jump') {
            if (this.vy < -6) frame = 0;
            else if (this.vy < -1) frame = 1;
            else if (this.vy < 6) frame = 2;
            else frame = 3;
        } else if (state === 'dash') {
            frame = Math.floor((this.dashDuration - Math.max(0, this.dashTimer)) / 2) % frames.length;
        } else if (state === 'hurt') {
            frame = Math.floor(performance.now() / 95) % frames.length;
        } else if (state === 'dead') {
            frame = Math.min(frames.length - 1, 2 + (Math.floor(performance.now()/220)%Math.max(1, frames.length-2)));
        } else {
            const speed = state === 'run' ? 72 : state === 'walk' ? 95 : 180;
            frame = Math.floor(performance.now() / speed) % frames.length;
        }

        const img = frames[frame];
        if (!img || !img.complete || !img.naturalWidth) { this.drawCrist(ctx); return; }

        const ratio = img.naturalWidth / img.naturalHeight;
        let h = state === 'jump' ? 106 : 96;
        let w = Math.max(66, h * ratio);
        if (ratio > 1.4) { w = Math.min(165, h * ratio); h = Math.min(108, w / ratio); }

        const cx = this.x + this.w / 2;
        const bottom = this.y + this.h + this.spriteBaseOffset;
        const dx = cx - w / 2;
        const dy = bottom - h;

        ctx.save();
        ctx.imageSmoothingEnabled = false;
        if (this.invulnerable > 0 && Math.floor(this.invulnerable / 5) % 2 === 0) ctx.globalAlpha = 0.55;
        if (!this.facingRight) {
            ctx.translate(dx + w, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(img, 0, dy, w, h);
        } else {
            ctx.drawImage(img, dx, dy, w, h);
        }
        ctx.restore();
    }

    drawCrist(ctx) {
        const armOffset = Math.sin(this.walkCycle) * 5;
        const legOffset = Math.sin(this.walkCycle) * 8;
        
        // Pernas - Calça marrom
        ctx.fillStyle = '#6b4423';
        ctx.fillRect(this.x + 14, this.y + 50, 10, 25 + legOffset);
        ctx.fillRect(this.x + 26, this.y + 50, 10, 25 - legOffset);

        // Sapatos pretos
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(this.x + 12, this.y + 73 + legOffset, 14, 7);
        ctx.fillRect(this.x + 24, this.y + 73 - legOffset, 14, 7);

        // Camisa vermelha
        ctx.fillStyle = '#c0392b';
        ctx.fillRect(this.x + 10, this.y + 25, 30, 28);
        
        // Detalhe da camisa
        ctx.fillStyle = '#a93226';
        ctx.fillRect(this.x + 23, this.y + 25, 4, 28);
        
        // Botões da camisa
        ctx.fillStyle = '#2c2c2c';
        ctx.beginPath();
        ctx.arc(this.x + 25, this.y + 30, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(this.x + 25, this.y + 40, 2, 0, Math.PI * 2);
        ctx.fill();

        // Braço esquerdo (sempre segura a bengala)
        ctx.fillStyle = '#d4a574';
        ctx.fillRect(this.x + 5, this.y + 28 + armOffset, 10, 26);
        
        // Manga vermelha
        ctx.fillStyle = '#c0392b';
        ctx.fillRect(this.x + 5, this.y + 28 + armOffset, 10, 12);

        // Bengala
        ctx.strokeStyle = '#4a2f1a';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(this.x + 10, this.y + 52 + armOffset);
        ctx.lineTo(this.x + 8, this.y + 75);
        ctx.stroke();
        
        // Cabo curvo da bengala
        ctx.beginPath();
        ctx.arc(this.x + 12, this.y + 27 + armOffset, 5, Math.PI, Math.PI * 1.5);
        ctx.stroke();
        
        // Ponteira metálica da bengala
        ctx.fillStyle = '#c0c0c0';
        ctx.beginPath();
        ctx.arc(this.x + 8, this.y + 75, 3, 0, Math.PI * 2);
        ctx.fill();

        // Braço direito
        if (this.attacking) {
            // Braço de soco
            const punchX = this.facingRight ? this.x + this.w - 5 : this.x - 20;
            ctx.fillStyle = '#d4a574';
            ctx.fillRect(punchX, this.y + 28, 30, 10);
            
            // Manga vermelha
            ctx.fillStyle = '#c0392b';
            ctx.fillRect(punchX + (this.facingRight ? 0 : 18), this.y + 28, 12, 10);
            
            // Efeito de impacto
            ctx.fillStyle = '#ffff00';
            const impactX = this.facingRight ? punchX + 30 : punchX - 10;
            ctx.beginPath();
            ctx.arc(impactX, this.y + 33, 8, 0, Math.PI * 2);
            ctx.fill();
            
            // Linhas de velocidade
            ctx.strokeStyle = '#ffff00';
            ctx.lineWidth = 2;
            for (let i = 0; i < 3; i++) {
                const lineX = this.facingRight ? impactX - 15 - i * 8 : impactX + 15 + i * 8;
                ctx.beginPath();
                ctx.moveTo(lineX, this.y + 28 + i * 3);
                ctx.lineTo(lineX + (this.facingRight ? -10 : 10), this.y + 28 + i * 3);
                ctx.stroke();
            }
        } else {
            ctx.fillStyle = '#d4a574';
            ctx.fillRect(this.x + 35, this.y + 28 - armOffset, 10, 26);
            
            // Manga vermelha
            ctx.fillStyle = '#c0392b';
            ctx.fillRect(this.x + 35, this.y + 28 - armOffset, 10, 12);
        }

        // Cabeça calva - pele de velho
        ctx.fillStyle = '#d4a574';
        ctx.beginPath();
        ctx.arc(this.x + 25, this.y + 13, 14, 0, Math.PI * 2);
        ctx.fill();
        
        // Brilho na careca
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.beginPath();
        ctx.arc(this.x + 23, this.y + 8, 6, 0, Math.PI * 2);
        ctx.fill();
        
        // Cabelo nas laterais (grisalho)
        ctx.fillStyle = '#9a9a9a';
        ctx.beginPath();
        ctx.arc(this.x + 13, this.y + 15, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(this.x + 37, this.y + 15, 4, 0, Math.PI * 2);
        ctx.fill();
        
        // Olhos
        ctx.fillStyle = '#000';
        ctx.fillRect(this.x + 18, this.y + 11, 4, 4);
        ctx.fillRect(this.x + 28, this.y + 11, 4, 4);
        
        // Óculos
        ctx.strokeStyle = '#2c2c2c';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.x + 20, this.y + 13, 5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(this.x + 30, this.y + 13, 5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(this.x + 25, this.y + 13);
        ctx.lineTo(this.x + 26, this.y + 13);
        ctx.stroke();
        
        // Sobrancelhas grossas
        ctx.fillStyle = '#7a7a7a';
        ctx.fillRect(this.x + 17, this.y + 9, 6, 2);
        ctx.fillRect(this.x + 27, this.y + 9, 6, 2);
        
        // Rugas (detalhes de velho)
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(this.x + 16, this.y + 18);
        ctx.lineTo(this.x + 12, this.y + 20);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(this.x + 34, this.y + 18);
        ctx.lineTo(this.x + 38, this.y + 20);
        ctx.stroke();
    }

    drawHealthBar(ctx) {
        const barWidth = this.w;
        const barHeight = 8;
        const barX = this.x;
        const barY = this.y - 15;

        // Borda externa
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(barX - 1, barY - 1, barWidth + 2, barHeight + 2);

        // Fundo da barra
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        // Vida atual com gradiente
        const lifePercent = this.life / this.maxLife;
        const gradient = ctx.createLinearGradient(barX, 0, barX + barWidth, 0);
        
        if (lifePercent > 0.5) {
            gradient.addColorStop(0, '#00ff00');
            gradient.addColorStop(1, '#00cc00');
        } else if (lifePercent > 0.25) {
            gradient.addColorStop(0, '#ffaa00');
            gradient.addColorStop(1, '#ff8800');
        } else {
            gradient.addColorStop(0, '#ff0000');
            gradient.addColorStop(1, '#cc0000');
        }
        
        ctx.fillStyle = gradient;
        ctx.fillRect(barX, barY, barWidth * lifePercent, barHeight);

        // Brilho na barra
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(barX, barY, barWidth * lifePercent, barHeight / 2);
    }

    // ===== MÉTODO DE ATUALIZAÇÃO (MOVIMENTAÇÃO) =====
    update(keys) {
        // Sistema de Dash (tecla configurável; padrão: ↓ no Jogador 2)
        if (sistemControles.acaoAtiva(this.controlPlayer, 'dash', keys) && !this.dashing && this.dashCooldown === 0 && !this.attacking) {
            this.dashing = true;
            this.dashTimer = this.dashDuration;
            this.dashCooldown = this.evolution?.getDashCooldown?.(60) ?? 60;
            this.invulnerable = this.dashDuration;
        }
        
        // Processar dash
        if (this.dashing) {
            this.dashTimer--;
            const dashDirection = this.facingRight ? 1 : -1;
            this.x += this.dashSpeed * dashDirection;
            
            if (this.dashTimer <= 0) {
                this.dashing = false;
            }
        }
        
        // Reduzir cooldown do dash
        if (this.dashCooldown > 0) {
            this.dashCooldown--;
        }
        
        // Movimento horizontal
        let moving = false;
        let currentSpeed = this.speed;
        
        // Aplicar power-up de velocidade
        if (this.hasActivePowerUp('speed')) {
            currentSpeed *= 1.5;
        }
        
        if (!this.dashing && !this.attacking) {
            if (sistemControles.acaoAtiva(this.controlPlayer, 'left', keys)) {
                this.x -= currentSpeed;
                this.facingRight = false;
                moving = true;
            }
            if (sistemControles.acaoAtiva(this.controlPlayer, 'right', keys)) {
                this.x += currentSpeed;
                this.facingRight = true;
                moving = true;
            }
        }

        // Animação de movimento. O atlas do Crist possui linhas separadas
        // para ANDANDO e CORRENDO; usamos a corrida quando há boost de velocidade.
        this.isMoving = moving && !this.isJumping && !this.dashing && !this.attacking;
        this.moveHoldFrames = this.isMoving ? (this.moveHoldFrames || 0) + 1 : 0;
        this.isRunning = this.isMoving && (this.moveHoldFrames > 22 || currentSpeed > this.speed + 0.01);
        if (this.isMoving) {
            this.animTimer = (this.animTimer + 1) % 100000;
            this.walkCycle += this.isRunning ? 0.5 : 0.3;
        } else {
            this.walkCycle = 0;
            if (!this.isJumping) this.animTimer = 0;
        }

        // Pulo com jump-buffer (~100ms) e coyote-time (~100ms).
        const jumpHeld = sistemControles.acaoAtiva(this.controlPlayer, 'up', keys);
        if (jumpHeld && !this._jumpHeldLast) this.jumpBufferFrames = 6;
        this._jumpHeldLast = jumpHeld;
        if (this.jumpBufferFrames > 0) this.jumpBufferFrames--;
        const groundedNow = this.y + this.h >= this.groundY - 1;
        if (groundedNow) this.coyoteFrames = 6; else if (this.coyoteFrames > 0) this.coyoteFrames--;
        if (this.jumpBufferFrames > 0 && this.coyoteFrames > 0 && !this.dashing) {
            this.jumpPower = -18;
            this.isJumping = true;
            this.jumpBufferFrames = 0;
            this.coyoteFrames = 0;
            window.soundSystem?.playSound?.('jump');
        }

        // Aplicar gravidade
        this.y += this.jumpPower;
        this.jumpPower += this.gravity;

        // Colisão com chão (base do personagem)
        if (this.y + this.h >= this.groundY) {
            this.y = this.groundY - this.h;
            this.jumpPower = 0;
            this.isJumping = false;
        }

        // Ataque
        if (this.attackCooldown > 0) {
            this.attackCooldown--;
        }

        if (sistemControles.acaoAtiva(this.controlPlayer, 'attack', keys) && !this.attacking && this.attackCooldown === 0 && !this.dashing) {
            this.attacking = true;
            this.attackTimer = 15;
            this.attackCooldown = this.evolution?.getAttackCooldown?.(20) ?? 20;
        }

        if (this.attacking) {
            this.attackTimer--;
            if (this.attackTimer <= 0) {
                this.attacking = false;
            }
        }

        // Invulnerabilidade
        if (this.invulnerable > 0) {
            this.invulnerable--;
        }

        // Sistema de combo
        if (this.combo > 0) {
            this.comboTimer++;
            if (this.comboTimer > 120) {
                this.combo = 0;
                this.comboTimer = 0;
            }
        }
        
        // Atualizar power-ups
        this.activePowerUps = this.activePowerUps.filter(powerUp => {
            powerUp.timer++;
            
            if (powerUp.type === 'invincible') {
                this.invulnerable = 2;
            }
            
            return powerUp.timer < powerUp.duration;
        });

        // Limites da tela
        if (this.x < 0) this.x = 0;
        const worldMaxX = Math.max(0, ((typeof currentLevel !== 'undefined' && currentLevel?.width) || 5000) - this.w);
        if (this.x > worldMaxX) this.x = worldMaxX;
    }

    // ===== MÉTODOS DE COMBATE =====
    getHitbox() {
        // Dano só nos frames ativos do golpe: evita acertar antes/depois do bastão encostar.
        if (!this.attacking || this.attackTimer > 10 || this.attackTimer < 6) return null;
        const hitboxW = 62;
        const hitboxH = 40;
        return {
            x: this.facingRight ? this.x + this.w - 2 : this.x - hitboxW + 2,
            y: this.y + 20,
            w: hitboxW,
            h: hitboxH
        };
    }

    takeDamage(damage) {
        if (this.invulnerable > 0 || this.hasActivePowerUp('invincible')) return false;
        if (this.evolution?.tryEvade?.()) return false;
        if (this.evolution?.tryShield?.()) return false;
        const actualDamage = Math.max(1, Math.round(this.evolution?.calculateDamageReduction?.(damage) ?? damage));
        this.life -= actualDamage;
        if (window.gamepadSystem?.rumble) window.gamepadSystem.rumble(this.controlPlayer || 1, 130, 0.7, 0.35);
        this.invulnerable = 40;
        this.combo = Math.floor(this.combo / 2);
        this.comboTimer = 0;
        if (this.life < 0) this.life = 0;
        if (this.life === 0 && this.evolution?.tryRevive?.()) return true;
        if (this.life === 0) if(window.DEV) console.log(`💀 ${this.name} MORREU!`);
        return true;
    }

    heal(amount) {
        this.life += amount;
        if (this.life > this.maxLife) this.life = this.maxLife;
    }

    getBodyBounds() {
        return {
            x: this.x + this.hitbox.offsetX,
            y: this.y + this.hitbox.offsetY,
            w: this.hitbox.width,
            h: this.hitbox.height
        };
    }

    addCombo() {
        this.combo++;
        this.comboTimer = 0;
        
        if (this.combo === 10) {
            this.heal(10);
        } else if (this.combo === 20) {
            this.heal(20);
        } else if (this.combo === 30) {
            this.heal(30);
        }
    }

    resetForNewLevel() {
        this.x = 150;
        this.y = this.groundY - this.h;  // ✅ Base no chão
        this.jumpPower = 0;
        this.isJumping = false;
        this.attacking = false;
        this.attackTimer = 0;
        this.attackCooldown = 0;
        this.invulnerable = 0;
        this.combo = 0;
        this.comboTimer = 0;
        this.dashing = false;
        this.dashTimer = 0;
        this.dashCooldown = 0;
        this.animTimer = 0;
        this.isMoving = false;
        this.isRunning = false;
        this.heal(30);
    }
}
