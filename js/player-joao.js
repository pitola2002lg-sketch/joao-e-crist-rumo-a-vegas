const JOAO_SPRITE_SHEET = window.assetManager.image('assets/players/joao/joao-16bit.webp','shared');
const JOAO_RANGED_SPRITE_SHEET = JOAO_SPRITE_SHEET;
window.CharacterAssetRegistry=window.CharacterAssetRegistry||{};
window.CharacterAssetRegistry.joao={preview:['assets/players/joao/joao-16bit.webp'],full:['assets/players/joao/joao-16bit.webp']};
const JOAO_16_FRAMES = {"idle":[[35,6,70,128],[149,8,69,126],[261,8,69,126],[374,8,70,126]],"walk":[[501,8,86,126],[615,7,83,126],[727,7,82,126],[836,6,81,127],[944,6,83,127],[1057,6,85,128]],"run":[[944,6,83,127],[1057,6,85,128],[1182,8,80,126],[1301,8,70,126],[1419,8,70,126]],"jump":[[21,165,99,122],[127,164,99,122],[236,166,96,120],[348,166,99,121],[456,166,108,125]],"attack":[[20,308,94,124],[118,315,90,117],[222,318,99,116],[323,321,159,115],[118,315,90,117]],"ranged":[[18,478,144,120],[174,480,118,117],[291,485,163,113]],"hurt":[[20,626,94,104],[31,747,94,109],[135,624,95,105]],"dead":[[659,755,142,101],[841,762,142,96],[995,624,126,108],[1031,771,140,91]],"dash":[[31,891,103,104],[152,902,88,91],[268,896,104,96],[405,915,164,76],[611,909,173,83],[813,910,177,86]]};


// Classe específica para o personagem JOÃO
class PlayerJoao {
    constructor(x, y, controlPlayer = 1) {
        this.name = 'João';
        this.x = x;
        this.w = 50;
        this.h = 70;
        
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
        
        // PATCH: Hitbox ajustada para corpo real
        this.hitbox = {
            offsetX: 5,
            offsetY: 25,
            width: 40,
            height: 45  // 65% da altura
        };
        
        // Controles do SLOT do jogador (independe do personagem escolhido)
        this.controlPlayer = controlPlayer;
        this.controls = sistemControles.obterControles(controlPlayer);
        
        // Sistema de dash/esquiva
        this.dashing = false;
        this.dashTimer = 0;
        this.dashCooldown = 0;
        this.dashSpeed = 15;
        this.dashDuration = 8;
        
        // Cores de João (azul)
        this.primaryColor = '#3498db';
        this.secondaryColor = '#2980b9';
        this.skinColor = '#ffdbac';
        
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
        this.comboTimer = 0;
        this.activePowerUps = [];
        this.isMoving = false;
        this.isRunning = false;
        this.moveHoldFrames = 0;

        // Ataque à distância exclusivo do João
        this.rangedCharging = false;
        this.rangedChargeFrames = 0;
        this.rangedCooldown = 0;
        this.rangedRecovery = 0;
        this.rangedWasDown = false;
        this.rangedInputBuffer = 0; // evita perder o comando se o botão for apertado perto do fim de outro golpe
        this.rangedShotSerial = 0;
        this.lastRangedCharged = false;
        this.rangedChargeThreshold = 42;
        this.rangedMaxCharge = 90;
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
                
                ctx.fillStyle = 'rgba(52, 152, 219, 0.5)'; // Azul para João
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

        // Desenhar João
        if (this.rangedCharging || this.rangedRecovery > 0) this.drawRangedSprite(ctx);
        else this.drawJoaoSprite(ctx);

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

    drawJoaoSprite(ctx) {
        const sheet = JOAO_SPRITE_SHEET;
        if (!sheet.complete || !sheet.naturalWidth) { this.drawJoao(ctx); return; }
        let state='idle';
        if (this.dashing) state='dash';
        else if (this.attacking) state='attack';
        else if (this.isJumping) state='jump';
        else if (this.invulnerable > 15) state='hurt';
        else if (this.isMoving || this.walkCycle !== 0) state=this.isRunning?'run':'walk';
        const frames=JOAO_16_FRAMES[state]||JOAO_16_FRAMES.idle;
        let frame=0;
        if(state==='attack') frame=Math.min(frames.length-1,Math.floor((15-Math.max(0,this.attackTimer))/3));
        else if(state==='jump') frame=Math.min(frames.length-1,Math.max(0,Math.floor((this.vy+12)/6)));
        else if(state==='dash') frame=Math.floor((this.dashDuration-Math.max(0,this.dashTimer))/2)%frames.length;
        else frame=Math.floor(performance.now()/(state==='run'?85:state==='walk'?125:190))%frames.length;
        this._draw16Frame(ctx,sheet,frames[frame],88,100);
    }

    _draw16Frame(ctx,sheet,rect,drawW,drawH) {
        if(!rect) return;
        const [sx,sy,sw,sh]=rect;
        const ratio=sw/sh; let h=drawH,w=Math.max(drawW*0.72,h*ratio);
        if(ratio>1.45){ w=Math.min(150,h*ratio); h=Math.min(drawH,w/ratio); }
        const cx=this.x+this.w/2;
        // Corpo acompanha a física; sombra continua presa ao chão.
        const bottom=this.y+this.h+5;
        const dx=cx-w/2,dy=bottom-h;
        ctx.save();ctx.imageSmoothingEnabled=false;
        if(this.invulnerable>0&&Math.floor(this.invulnerable/5)%2===0)ctx.globalAlpha=.55;
        if(!this.facingRight){ctx.translate(dx+w,0);ctx.scale(-1,1);ctx.drawImage(sheet,sx,sy,sw,sh,0,dy,w,h);}else ctx.drawImage(sheet,sx,sy,sw,sh,dx,dy,w,h);
        ctx.restore();
    }

    drawRangedSprite(ctx) {
        const sheet = JOAO_RANGED_SPRITE_SHEET;
        if (!sheet.complete || !sheet.naturalWidth) { this.drawJoaoSprite(ctx); return; }

        // A folha 16-bit possui três poses próprias para o tiro.
        // Não misturar com os frames do soco, pois isso fazia João "piscar"/pular de pose.
        const frames = JOAO_16_FRAMES.ranged;
        let frame = 0;

        if (this.rangedCharging) {
            const charge = Math.min(1, this.rangedChargeFrames / Math.max(1, this.rangedMaxCharge));
            frame = charge >= 0.58 ? 1 : 0;
        } else {
            // Recuperação: mostra a pose de disparo e volta suavemente para a pose de preparo.
            const totalRecovery = this.lastRangedCharged ? 18 : 14;
            const elapsed = totalRecovery - Math.max(0, this.rangedRecovery);
            if (elapsed < 5) frame = 2;
            else if (elapsed < 10) frame = 1;
            else frame = 0;
        }

        this._draw16Frame(ctx, sheet, frames[frame], 94, 104);

        if (this.rangedCharging && this.rangedChargeFrames >= this.rangedChargeThreshold) {
            ctx.save();
            const pulse = 0.55 + Math.abs(Math.sin(performance.now() / 90)) * 0.35;
            ctx.globalAlpha = pulse;
            ctx.fillStyle = '#ffd23f';
            ctx.beginPath();
            ctx.arc(this.x + this.w / 2 + (this.facingRight ? 40 : -40), this.y + 31, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    fireRangedAttack(charged = false) {
        const direction = this.facingRight ? 1 : -1;
        const baseDamage = charged ? 42 : 18;
        const damage = Math.max(1, Math.round(baseDamage * (this.evolution?.getRangedDamageMultiplier?.() || 1)));
        const speed = charged ? 18 : 14;
        const muzzleX = this.x + this.w/2 + direction * 34;
        const muzzleY = this.y + 31;
        if (!Array.isArray(window.projectiles)) {
            console.error('[TIRO JOAO] ERRO: lista global de projeteis indisponivel');
            return false;
        }
        const shotId = ++this.rangedShotSerial;
        const projectileData = {
            type: 'player_projectile', shotId, owner: this, x: muzzleX, y: muzzleY,
            vx: speed * direction, vy: 0, w: charged ? 18 : 10, h: charged ? 10 : 6,
            life: charged ? 95 : 75, damage, charged, pierce: charged ? 3 : 1,
            hitEnemies: new Set(), color: charged ? '#ffd23f' : '#f4f1df'
        };
        window.projectiles.push(window.acquireProjectile ? window.acquireProjectile(projectileData) : projectileData);
        if(window.DEV) console.log(`[TIRO JOAO] CRIADO id=${shotId} carregado=${charged ? 'sim' : 'nao'} x=${Math.round(muzzleX)} y=${Math.round(muzzleY)} dir=${direction > 0 ? 'direita' : 'esquerda'} dano=${damage}`);
        if (window.soundSystem?.playSound) window.soundSystem.playSound('hit');
        if (window.gamepadSystem?.rumble) window.gamepadSystem.rumble(this.controlPlayer || 1, charged ? 110 : 60, charged ? .45 : .2, charged ? .2 : .08);
        return true;
    }

    drawJoao(ctx) {
        const armOffset = Math.sin(this.walkCycle) * 5;
        const legOffset = Math.sin(this.walkCycle) * 8;

        // Pernas - Calça azul
        ctx.fillStyle = '#2b5ca8';
        ctx.fillRect(this.x + 14, this.y + 50, 10, 25 + legOffset);
        ctx.fillRect(this.x + 26, this.y + 50, 10, 25 - legOffset);

        // Botinas marrons
        ctx.fillStyle = '#6b4423';
        ctx.fillRect(this.x + 12, this.y + 73 + legOffset, 14, 8);
        ctx.fillRect(this.x + 24, this.y + 73 - legOffset, 14, 8);
        
        // Detalhes das botinas
        ctx.fillStyle = '#4a2f1a';
        ctx.fillRect(this.x + 12, this.y + 73 + legOffset, 14, 3);
        ctx.fillRect(this.x + 24, this.y + 73 - legOffset, 14, 3);

        // Camisa verde
        ctx.fillStyle = '#4a7c2e';
        ctx.fillRect(this.x + 10, this.y + 25, 30, 28);
        
        // Detalhe da camisa
        ctx.fillStyle = '#3a6224';
        ctx.fillRect(this.x + 23, this.y + 25, 4, 28);

        // Suspensórios
        ctx.strokeStyle = '#2c2c2c';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(this.x + 17, this.y + 25);
        ctx.lineTo(this.x + 17, this.y + 50);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(this.x + 33, this.y + 25);
        ctx.lineTo(this.x + 33, this.y + 50);
        ctx.stroke();
        
        // Fivelas dos suspensórios
        ctx.fillStyle = '#8b7355';
        ctx.fillRect(this.x + 15, this.y + 48, 4, 4);
        ctx.fillRect(this.x + 31, this.y + 48, 4, 4);

        // Braços
        ctx.fillStyle = '#d4a574';
        
        if (this.attacking) {
            // Braço de soco
            const punchX = this.facingRight ? this.x + this.w - 5 : this.x - 20;
            ctx.fillRect(punchX, this.y + 28, 30, 10);
            
            // Manga verde
            ctx.fillStyle = '#4a7c2e';
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
            // Braços normais
            ctx.fillRect(this.x + 5, this.y + 28 + armOffset, 10, 26);
            ctx.fillRect(this.x + 35, this.y + 28 - armOffset, 10, 26);
            
            // Mangas verdes
            ctx.fillStyle = '#4a7c2e';
            ctx.fillRect(this.x + 5, this.y + 28 + armOffset, 10, 12);
            ctx.fillRect(this.x + 35, this.y + 28 - armOffset, 10, 12);
        }

        // Cabeça
        ctx.fillStyle = '#d4a574';
        ctx.beginPath();
        ctx.arc(this.x + 25, this.y + 13, 14, 0, Math.PI * 2);
        ctx.fill();
        
        // Chapéu de palha
        ctx.fillStyle = '#8b7355';
        ctx.beginPath();
        ctx.ellipse(this.x + 25, this.y + 5, 18, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(this.x + 15, this.y - 5, 20, 10);
        ctx.fillRect(this.x + 18, this.y - 8, 14, 8);
        
        // Detalhe do chapéu
        ctx.fillStyle = '#6b5844';
        ctx.fillRect(this.x + 15, this.y + 3, 20, 3);

        // Olhos
        ctx.fillStyle = '#fff';
        ctx.fillRect(this.x + 17, this.y + 9, 6, 6);
        ctx.fillRect(this.x + 27, this.y + 9, 6, 6);
        
        ctx.fillStyle = '#000';
        const eyeOffsetX = this.facingRight ? 3 : 1;
        ctx.fillRect(this.x + 17 + eyeOffsetX, this.y + 10, 3, 4);
        ctx.fillRect(this.x + 27 + eyeOffsetX, this.y + 10, 3, 4);

        // Sobrancelhas grossas
        ctx.fillStyle = '#8b7355';
        ctx.fillRect(this.x + 16, this.y + 7, 7, 2);
        ctx.fillRect(this.x + 27, this.y + 7, 7, 2);
        
        // Bigode característico
        ctx.fillStyle = '#8b7355';
        ctx.fillRect(this.x + 15, this.y + 18, 8, 4);
        ctx.fillRect(this.x + 27, this.y + 18, 8, 4);
        ctx.fillRect(this.x + 20, this.y + 17, 10, 3);
        
        // Sorriso discreto
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.x + 25, this.y + 20, 6, 0.2, Math.PI - 0.2);
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
        // DEBUG: Proteção contra estados indefinidos
        if (this.attackTimer === undefined || this.attackTimer === null || this.attackTimer < 0) {
            this.attacking = false;
            this.attackTimer = 0;
        }
        if (this.dashTimer === undefined || this.dashTimer === null || this.dashTimer < 0) {
            this.dashing = false;
            this.dashTimer = 0;
        }
        
        // Sistema de Dash (tecla configurável; padrão: SHIFT no Jogador 1)
        if (sistemControles.acaoAtiva(this.controlPlayer, 'dash', keys) && !this.dashing && this.dashCooldown === 0 && !this.attacking && !this.rangedCharging && this.rangedRecovery === 0) {
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
        
        if (!this.dashing && !this.attacking && !this.rangedCharging && this.rangedRecovery === 0) {
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

        // Caminhada vira corrida depois de alguns frames segurando direção.
        this.isMoving = moving && !this.isJumping && !this.dashing && !this.attacking && !this.rangedCharging && this.rangedRecovery === 0;
        this.moveHoldFrames = this.isMoving ? (this.moveHoldFrames || 0) + 1 : 0;
        this.isRunning = this.isMoving && (this.moveHoldFrames > 22 || currentSpeed > this.speed + 0.01);
        if (this.isMoving) this.walkCycle += this.isRunning ? 0.5 : 0.3; else this.walkCycle = 0;

        // Pulo com jump-buffer (~100ms) e coyote-time (~100ms).
        const jumpHeld = sistemControles.acaoAtiva(this.controlPlayer, 'up', keys);
        if (jumpHeld && !this._jumpHeldLast) this.jumpBufferFrames = 6;
        this._jumpHeldLast = jumpHeld;
        if (this.jumpBufferFrames > 0) this.jumpBufferFrames--;
        const groundedNow = this.y + this.h >= this.groundY - 1;
        if (groundedNow) this.coyoteFrames = 6; else if (this.coyoteFrames > 0) this.coyoteFrames--;
        if (this.jumpBufferFrames > 0 && this.coyoteFrames > 0 && !this.dashing && !this.rangedCharging && this.rangedRecovery === 0) {
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

        if (sistemControles.acaoAtiva(this.controlPlayer, 'attack', keys) && !this.attacking && this.attackCooldown === 0 && !this.dashing && !this.rangedCharging && this.rangedRecovery === 0) {
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

        // Ataque à distância do João: segure para carregar e solte para disparar.
        // Há um pequeno buffer de entrada para o comando não sumir quando pressionado
        // exatamente no fim de um soco/dash/recuperação.
        if (this.rangedCooldown > 0) this.rangedCooldown--;
        if (this.rangedRecovery > 0) this.rangedRecovery--;
        if (this.rangedInputBuffer > 0) this.rangedInputBuffer--;

        const rangedDown = sistemControles.acaoAtiva(this.controlPlayer, 'ranged', keys);
        const rangedPressed = rangedDown && !this.rangedWasDown;
        const rangedReleased = !rangedDown && this.rangedWasDown;

        if (rangedPressed) this.rangedInputBuffer = 8;

        const canStartRanged = !this.attacking && !this.dashing &&
            this.rangedCooldown === 0 && this.rangedRecovery === 0;

        // Pode iniciar no frame do toque OU alguns frames depois.
        // Se o jogador apenas tocou e soltou enquanto João ainda terminava outra ação,
        // o tiro fica no buffer e é disparado assim que o personagem puder atirar.
        if (!this.rangedCharging && this.rangedInputBuffer > 0 && canStartRanged) {
            if (rangedDown) {
                this.rangedCharging = true;
                this.rangedChargeFrames = 0;
                this.lastRangedCharged = false;
                this.rangedInputBuffer = 0;
            } else {
                this.lastRangedCharged = false;
                const fired = this.fireRangedAttack(false);
                this.rangedInputBuffer = 0;
                if (fired !== false) {
                    this.rangedRecovery = 14;
                    this.rangedCooldown = 42;
                }
            }
        }

        if (this.rangedCharging && rangedDown) {
            this.rangedChargeFrames = Math.min(this.rangedMaxCharge, this.rangedChargeFrames + 1);
        }

        if (this.rangedCharging && rangedReleased) {
            const charged = this.rangedChargeFrames >= this.rangedChargeThreshold;
            this.lastRangedCharged = charged;
            this.fireRangedAttack(charged);
            this.rangedCharging = false;
            this.rangedChargeFrames = 0;
            this.rangedRecovery = charged ? 18 : 14;
            this.rangedCooldown = charged ? 72 : 42;
        }

        // Segurança: se o controle perder o evento de soltura (touch/gamepad),
        // nunca deixe João preso eternamente no estado de carregamento.
        if (this.rangedCharging && !rangedDown && !rangedReleased) {
            const charged = this.rangedChargeFrames >= this.rangedChargeThreshold;
            this.lastRangedCharged = charged;
            this.fireRangedAttack(charged);
            this.rangedCharging = false;
            this.rangedChargeFrames = 0;
            this.rangedRecovery = charged ? 18 : 14;
            this.rangedCooldown = charged ? 72 : 42;
        }

        this.rangedWasDown = rangedDown;

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
        // Janela ativa sincronizada com a animação do soco.
        if (!this.attacking || this.attackTimer > 10 || this.attackTimer < 6) return null;
        const hitboxW = 46;
        const hitboxH = 38;
        return {
            x: this.facingRight ? this.x + this.w - 8 : this.x - hitboxW + 8,
            y: this.y + 18,
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
        this.rangedCharging = false;
        this.rangedChargeFrames = 0;
        this.rangedCooldown = 0;
        this.rangedRecovery = 0;
        this.rangedWasDown = false;
        this.lastRangedCharged = false;
        this.heal(30);
    }
}
