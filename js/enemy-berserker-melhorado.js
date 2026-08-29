/**
 * BERSERKER MELHORADO - VERSÃO 2.0
 * Inimigo berserker aprimorado com mecânicas adicionais e comportamento mais inteligente
 * 
 * MELHORIAS IMPLEMENTADAS:
 * 1. Sistema de Fúria em 3 estágios (Calm → Enraged → Berserk)
 * 2. Ataques especiais baseados no nível de fúria
 * 3. Regeneração de vida durante modo berserk
 * 4. Sistema de combo attacks
 * 5. Dash attack quando em modo enraged
 * 6. Roar que causa knockback
 * 7. Ground pound AoE attack
 * 8. Berserker pode contra-atacar quando bloqueado
 * 9. Partículas e efeitos visuais aprimorados
 * 10. IA mais agressiva e imprevisível
 */

class BerserkerEnemy extends Enemy {
    constructor(x, y) {
        super(x, y, 'berserker');
        
        // Substituir stats base
        this.life = 100;
        this.maxLife = 100;
        this.speed = 2.5;
        this.damage = 18;
        this.score = 300;
        
        // Sistema de Fúria em 3 níveis
        this.rageLevel = 0; // 0 = Calm, 1 = Enraged, 2 = Berserk
        this.rageThresholds = [0.7, 0.4, 0.2]; // HP % para cada nível
        this.previousRageLevel = 0;
        
        // Modificadores por nível de fúria
        this.rageMultipliers = {
            0: { speed: 1.0, damage: 1.0, color: '#e74c3c' },      // Calm
            1: { speed: 1.4, damage: 1.3, color: '#c0392b' },      // Enraged
            2: { speed: 1.8, damage: 1.7, color: '#8B0000' }       // Berserk
        };
        
        // Mecânicas especiais
        this.dashCooldown = 0;
        this.dashDuration = 0;
        this.isDashing = false;
        this.dashSpeed = 12;
        this.dashDirection = 1;
        
        this.roarCooldown = 0;
        this.isRoaring = false;
        this.roarDuration = 0;
        
        this.groundPoundCooldown = 0;
        this.isGroundPounding = false;
        this.groundPoundPhase = 0; // 0 = jump, 1 = fall, 2 = impact
        this.jumpHeight = 0;
        
        // Sistema de combo
        this.comboCounter = 0;
        this.comboTimer = 0;
        this.lastAttackTime = 0;
        
        // Regeneração no modo berserk
        this.regenTimer = 0;
        this.regenRate = 0.5; // HP por frame quando berserk
        
        // Counter-attack
        this.canCounterAttack = false;
        this.counterAttackWindow = 0;
        
        // Partículas e efeitos
        this.auraParticles = [];
        this.trailParticles = [];
        this.shockwaveRadius = 0;
        
        // Visual enhancements
        this.pulseIntensity = 0;
        this.eyeGlow = 0;
        this.bodyShake = 0;
        
        // PATCH: Hitbox ajustada para corpo real do Berserker (60×80px)
        // Berserker é agressivo, então hitbox um pouco maior (55% da área)
        this.hitbox = {
            offsetX: Math.floor(this.w * 0.15),      // 9px de margem
            offsetY: Math.floor(this.h * 0.20),      // 16px do topo
            width: Math.floor(this.w * 0.70),        // 42px (70% de 60)
            height: Math.floor(this.h * 0.70)        // 56px (70% de 80)
        };
        
        if(window.DEV) console.log('💀 BERSERKER MELHORADO criado!');
        if(window.DEV) console.log(`✅ Berserker hitbox: ${this.hitbox.width}×${this.hitbox.height} (${Math.round((this.hitbox.width * this.hitbox.height) / (this.w * this.h) * 100)}% da área)`);
        
        // ✅ VALIDAÇÃO: Re-calcular Y se mudou altura (depois de super e alterações)
        if (this.groundY) {
            this.y = this.groundY - this.h;
        }
    }
    
    /**
     * NOVO: Atualizar nível de fúria baseado no HP
     */
    updateRageLevel() {
        const hpPercent = this.life / this.maxLife;
        let newRageLevel = 0;
        
        if (hpPercent <= this.rageThresholds[2]) {
            newRageLevel = 2; // Berserk
        } else if (hpPercent <= this.rageThresholds[1]) {
            newRageLevel = 1; // Enraged
        }
        
        // Trigger transformação se mudou de nível
        if (newRageLevel > this.previousRageLevel) {
            this.triggerRageTransformation(newRageLevel);
        }
        
        this.previousRageLevel = this.rageLevel;
        this.rageLevel = newRageLevel;
        
        // Aplicar multiplicadores
        const mult = this.rageMultipliers[this.rageLevel];
        this.color = mult.color;
        this.baseSpeed = this.speed; // Guardar velocidade base
    }
    
    /**
     * NOVO: Transformação visual quando aumenta fúria
     */
    triggerRageTransformation(level) {
        if(window.DEV) console.log(`🔥 BERSERKER → RAGE LEVEL ${level}!`);
        
        // Explosão de partículas
        if (window.particles) {
            const particleCount = level === 2 ? 50 : 30;
            for (let i = 0; i < particleCount; i++) {
                window.particles.push({
                    x: this.x + this.w/2,
                    y: this.y + this.h/2,
                    vx: (Math.random() - 0.5) * 12,
                    vy: (Math.random() - 0.5) * 12,
                    life: 60,
                    maxLife: 60,
                    color: level === 2 ? '#ff0000' : '#ff6600',
                    size: level === 2 ? 6 : 4
                });
            }
        }
        
        // Screen shake
        if (window.screenShake !== undefined) {
            window.screenShake = Math.max(window.screenShake || 0, level === 2 ? 7 : 4);
        }
        
        // Som
        if (window.soundSystem) {
            window.soundSystem.playSound('powerUp');
        }
        
        // Reset cooldowns em transformações
        if (level === 2) {
            this.dashCooldown = 0;
            this.roarCooldown = 0;
            this.groundPoundCooldown = 0;
        }
        
        this.bodyShake = 30;
    }
    
    /**
     * OVERRIDE: takeDamage com counter-attack
     */
    takeDamage(damage, source = null) {
        const killed = super.takeDamage(damage, source);
        
        if (!killed) {
            this.updateRageLevel();
            
            // Counter-attack chance aumenta com rage
            const counterChance = [0.1, 0.25, 0.4][this.rageLevel];
            if (Math.random() < counterChance && !this.attacking) {
                this.canCounterAttack = true;
                this.counterAttackWindow = 20;
            }
        }
        
        return killed;
    }
    
    /**
     * OVERRIDE: Update com novas mecânicas
     */
    update(players, otherEnemies = []) {
        if (this.life <= 0) {
            this.deathAnim = Math.min(this.deathAnim + 1, 30);
            return;
        }
        
        const nearestPlayer = this.getNearestPlayer(players);
        if (!nearestPlayer) return;
        
        const distance = this.distanceTo(nearestPlayer);
        const dx = nearestPlayer.x - this.x;
        
        // Atualizar direção
        this.facingRight = dx > 0;
        
        // Regeneração em modo Berserk
        if (this.rageLevel === 2) {
            this.regenTimer++;
            if (this.regenTimer >= 30) { // Regen a cada 0.5s
                this.life = Math.min(this.maxLife, this.life + this.regenRate);
                this.regenTimer = 0;
                
                // Partícula de cura
                if (window.particles && Math.random() < 0.3) {
                    window.particles.push({
                        x: this.x + Math.random() * this.w,
                        y: this.y + Math.random() * this.h,
                        vx: 0,
                        vy: -2,
                        life: 30,
                        maxLife: 30,
                        color: '#00ff00',
                        text: '+1',
                        size: 12
                    });
                }
            }
        }
        
        // Timers de animação/combate. Este update substitui o update da classe base,
        // portanto attackTimer também precisa ser atualizado aqui. Sem isso o
        // Berserker fica preso eternamente no estado 'attack' do renderer 16-bit.
        if (this.attackTimer > 0) {
            this.attackTimer--;
            if (this.attackTimer <= 0) {
                this.attackTimer = 0;
                this.attacking = false;
            }
        } else if (this.attacking && !this.isGroundPounding) {
            this.attacking = false;
        }

        // Cooldowns
        if (this.attackCooldown > 0) this.attackCooldown--;
        if (this.dashCooldown > 0) this.dashCooldown--;
        if (this.roarCooldown > 0) this.roarCooldown--;
        if (this.groundPoundCooldown > 0) this.groundPoundCooldown--;
        if (this.counterAttackWindow > 0) this.counterAttackWindow--;
        if (this.comboTimer > 0) this.comboTimer--;
        else this.comboCounter = 0;
        
        // Executar ataques especiais
        if (this.isDashing) {
            this.executeDash();
        } else if (this.isRoaring) {
            this.executeRoar(nearestPlayer);
        } else if (this.isGroundPounding) {
            this.executeGroundPound(nearestPlayer);
        } else {
            // IA normal
            this.berserkerAI(nearestPlayer, distance, dx);
        }
        
        // Atualizar partículas de aura
        this.updateAuraParticles();
        
        // ✅ SISTEMA DE GRAVIDADE PADRONIZADO
        if (!this.vy) this.vy = 0;
        if (!this.gravity) this.gravity = 0.5;
        if (!this.groundY) this.groundY = 600;
        
        if (this.y + this.h < this.groundY) {
            this.vy += this.gravity;
            this.y += this.vy;
        } else {
            this.y = this.groundY - this.h;
            this.vy = 0;
        }
        
        // ✅ SISTEMA ANTI-OVERLAP MELHORADO
        this.avoidEnemies(otherEnemies);
        
        // Limites
        this.x = Math.max(0, Math.min(this.x, 4800));
        
        // Efeitos visuais
        if (this.bodyShake > 0) this.bodyShake--;
        this.pulseIntensity = Math.sin(Date.now() / 100) * 0.5 + 0.5;
        this.eyeGlow = Math.sin(Date.now() / 150) * 0.3 + 0.7;
    }
    
    /**
     * ✅ SISTEMA ANTI-OVERLAP PADRONIZADO
     * Evita que inimigos se sobreponham usando detecção de overlap real
     */
    avoidEnemies(otherEnemies) {
        if (!otherEnemies) return;
        
        otherEnemies.forEach(other => {
            if (other === this || other.life <= 0) return;
            
            // Verificar overlap real das bordas
            const overlapX = Math.min(this.x + this.w, other.x + other.w) - 
                             Math.max(this.x, other.x);
            
            if (overlapX > 0) {
                const pushAmount = Math.min(3, overlapX / 2);
                const pushDir = this.x < other.x ? -1 : 1;
                this.x += pushDir * pushAmount;
            }
        });
    }
    
    /**
     * NOVO: IA melhorada do Berserker
     */
    berserkerAI(player, distance, dx) {
        const mult = this.rageMultipliers[this.rageLevel];
        const effectiveSpeed = this.speed * mult.speed;
        
        // Counter-attack se disponível
        if (this.canCounterAttack && this.counterAttackWindow > 0) {
            this.performCounterAttack(player);
            return;
        }
        
        // Ataques especiais baseados em distância e rage level
        if (this.rageLevel >= 1 && distance < 300 && distance > 100) {
            // Dash attack (Enraged+)
            if (this.dashCooldown === 0 && Math.random() < 0.02) {
                this.startDash();
                return;
            }
        }
        
        if (this.rageLevel >= 1 && distance < 150) {
            // Roar (Enraged+)
            if (this.roarCooldown === 0 && Math.random() < 0.01) {
                this.startRoar();
                return;
            }
        }
        
        if (this.rageLevel === 2 && distance < 200) {
            // Ground Pound (apenas Berserk)
            if (this.groundPoundCooldown === 0 && Math.random() < 0.015) {
                this.startGroundPound();
                return;
            }
        }
        
        // Ataque corpo a corpo
        if (distance < 70 && this.attackCooldown === 0 && !this.attacking) {
            this.performComboAttack(player);
        } else if (distance < 500) {
            // Perseguir agressivamente
            this.x += Math.sign(dx) * effectiveSpeed;
            this.walkCycle += 0.3;
            
            // Trail particles quando correndo
            if (this.rageLevel >= 1 && Math.random() < 0.3) {
                this.trailParticles.push({
                    x: this.x + this.w/2,
                    y: this.y + this.h - 10,
                    life: 20,
                    maxLife: 20,
                    color: this.color,
                    size: 6
                });
            }
        } else {
            // Patrulhar
            this.patrol();
        }
        
        // Limpar partículas antigas
        this.trailParticles = this.trailParticles.filter(p => p.life-- > 0);
    }
    
    /**
     * NOVO: Sistema de combo attacks
     */
    performComboAttack(player) {
        this.attacking = true;
        this.attackTimer = 15;
        this.comboCounter++;
        this.comboTimer = 60; // 1 segundo para próximo combo
        
        // Cooldown menor se em combo
        this.attackCooldown = this.comboCounter > 1 ? 30 : 50;
        
        // Dano aumenta com combo e rage
        const mult = this.rageMultipliers[this.rageLevel];
        const comboDamage = Math.floor(this.damage * mult.damage * (1 + this.comboCounter * 0.2));
        
        setTimeout(() => {
            if (window.gameState && window.gameState !== 'playing') return;
            if (this.life > 0 && this.distanceTo(player) < 90) {
                player.takeDamage(comboDamage);
                
                // Efeito visual de combo
                if (this.comboCounter > 1 && window.particles) {
                    window.particles.push({
                        x: player.x + player.w/2,
                        y: player.y,
                        vx: 0,
                        vy: -3,
                        life: 30,
                        maxLife: 30,
                        color: '#ff0000',
                        text: `COMBO x${this.comboCounter}!`,
                        size: 18
                    });
                }
                
                window.screenShake = Math.max(window.screenShake || 0, 2 + this.comboCounter * 1);
            }
        }, 150);
    }
    
    /**
     * NOVO: Dash Attack
     */
    startDash() {
        this.isDashing = true;
        this.dashDuration = 20;
        this.dashDirection = this.facingRight ? 1 : -1;
        this.dashCooldown = 180; // 3 segundos
        
        if(window.DEV) console.log('⚡ BERSERKER DASH!');
    }
    
    executeDash() {
        this.dashDuration--;
        this.x += this.dashDirection * this.dashSpeed;
        
        // Partículas de dash
        if (window.particles && Math.random() < 0.5) {
            window.particles.push({
                x: this.x + this.w/2,
                y: this.y + this.h/2,
                vx: -this.dashDirection * 3,
                vy: (Math.random() - 0.5) * 4,
                life: 20,
                maxLife: 20,
                color: '#ffaa00',
                size: 8
            });
        }
        
        if (this.dashDuration <= 0) {
            this.isDashing = false;
        }
    }
    
    /**
     * NOVO: Roar Attack (knockback AoE)
     */
    startRoar() {
        this.isRoaring = true;
        this.roarDuration = 40;
        this.roarCooldown = 300; // 5 segundos
        
        if(window.DEV) console.log('🦁 BERSERKER ROAR!');
    }
    
    executeRoar(player) {
        this.roarDuration--;
        
        // Shockwave visual no meio do roar
        if (this.roarDuration === 20) {
            this.shockwaveRadius = 0;
            
            // Knockback em jogadores próximos
            const roarRange = 200;
            const dist = this.distanceTo(player);
            
            if (dist < roarRange && player.life > 0) {
                const knockbackStrength = 15;
                const angle = Math.atan2(
                    player.y - this.y,
                    player.x - this.x
                );
                
                // Aplicar knockback (assumindo que player tem método)
                if (player.applyKnockback) {
                    player.applyKnockback(
                        Math.cos(angle) * knockbackStrength,
                        Math.sin(angle) * knockbackStrength
                    );
                }
                
                // Mini dano
                player.takeDamage(Math.floor(this.damage * 0.5));
                
                window.screenShake = Math.max(window.screenShake || 0, 5);
            }
        }
        
        // Animar shockwave
        if (this.roarDuration < 20) {
            this.shockwaveRadius += 15;
        }
        
        if (this.roarDuration <= 0) {
            this.isRoaring = false;
            this.shockwaveRadius = 0;
        }
    }
    
    /**
     * NOVO: Ground Pound (AoE jump attack)
     */
    startGroundPound() {
        this.isGroundPounding = true;
        this.groundPoundPhase = 0;
        this.groundPoundCooldown = 400; // 6.6 segundos
        this.jumpHeight = 0;
        
        if(window.DEV) console.log('💥 BERSERKER GROUND POUND!');
    }
    
    executeGroundPound(player) {
        switch(this.groundPoundPhase) {
            case 0: // Jump up
                this.jumpHeight += 8;
                if (this.jumpHeight >= 150) {
                    this.groundPoundPhase = 1;
                }
                break;
                
            case 1: // Fall down
                this.jumpHeight -= 12;
                if (this.jumpHeight <= 0) {
                    this.groundPoundPhase = 2;
                    this.groundPoundImpact(player);
                }
                break;
                
            case 2: // Impact recovery
                setTimeout(() => {
                    this.isGroundPounding = false;
                    this.groundPoundPhase = 0;
                }, 200);
                this.groundPoundPhase = 3; // Prevent repeat
                break;
        }
    }
    
    groundPoundImpact(player) {
        const impactRadius = 250;
        const dist = this.distanceTo(player);
        
        // Dano e knockback em área
        if (dist < impactRadius && player.life > 0) {
            const damageRatio = 1 - (dist / impactRadius);
            const damage = Math.floor(this.damage * 2 * damageRatio);
            
            player.takeDamage(damage);
            
            // Knockback
            if (player.applyKnockback) {
                const angle = Math.atan2(player.y - this.y, player.x - this.x);
                player.applyKnockback(
                    Math.cos(angle) * 20 * damageRatio,
                    -10 // Up
                );
            }
        }
        
        // Efeitos visuais
        window.screenShake = Math.max(window.screenShake || 0, 8);
        
        if (window.particles) {
            // Shockwave circular
            for (let i = 0; i < 40; i++) {
                const angle = (i / 40) * Math.PI * 2;
                window.particles.push({
                    x: this.x + this.w/2,
                    y: this.y + this.h,
                    vx: Math.cos(angle) * 10,
                    vy: Math.sin(angle) * 5 - 2,
                    life: 40,
                    maxLife: 40,
                    color: '#8B4513',
                    size: 8
                });
            }
        }
    }
    
    /**
     * NOVO: Counter-attack
     */
    performCounterAttack(player) {
        this.canCounterAttack = false;
        this.attacking = true;
        this.attackTimer = 10;
        this.attackCooldown = 20; // Cooldown curto
        
        setTimeout(() => {
            if (window.gameState && window.gameState !== 'playing') return;
            if (this.life > 0 && this.distanceTo(player) < 100) {
                const counterDamage = Math.floor(this.damage * 2);
                player.takeDamage(counterDamage);
                
                if (window.particles) {
                    window.particles.push({
                        x: player.x + player.w/2,
                        y: player.y,
                        vx: 0,
                        vy: -4,
                        life: 40,
                        maxLife: 40,
                        color: '#ffff00',
                        text: 'COUNTER!',
                        size: 20
                    });
                }
                
                window.screenShake = Math.max(window.screenShake || 0, 6);
            }
        }, 100);
    }
    
    /**
     * NOVO: Partículas de aura baseadas em rage
     */
    updateAuraParticles() {
        if (this.rageLevel === 0) return;
        
        // Gerar partículas de aura
        if (Math.random() < 0.3) {
            this.auraParticles.push({
                x: this.x + Math.random() * this.w,
                y: this.y + this.h,
                vx: (Math.random() - 0.5) * 2,
                vy: -3 - Math.random() * 2,
                life: 30,
                maxLife: 30,
                color: this.rageLevel === 2 ? '#ff0000' : '#ff6600',
                size: this.rageLevel === 2 ? 5 : 3
            });
        }
        
        // Atualizar e filtrar
        this.auraParticles = this.auraParticles.filter(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.life--;
            return p.life > 0;
        });
    }
    
    /**
     * OVERRIDE: Draw com efeitos melhorados
     */
    draw(ctx) {
        if (this.life <= 0 && this.deathAnim >= 30) return;
        
        ctx.save();
        
        // Animação de morte
        if (this.life <= 0) {
            ctx.globalAlpha = 1 - (this.deathAnim / 30);
            ctx.translate(this.x + this.w / 2, this.y + this.h);
            ctx.rotate(this.deathAnim * 0.1);
            ctx.translate(-(this.x + this.w / 2), -(this.y + this.h));
        }
        
        // Desenhar partículas de trail
        this.trailParticles.forEach(p => {
            ctx.globalAlpha = p.life / p.maxLife;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1;
        
        // Desenhar partículas de aura
        this.auraParticles.forEach(p => {
            ctx.globalAlpha = p.life / p.maxLife;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1;
        
        // Shockwave do roar
        if (this.shockwaveRadius > 0) {
            ctx.strokeStyle = `rgba(255, 100, 0, ${1 - this.shockwaveRadius / 300})`;
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.arc(
                this.x + this.w/2,
                this.y + this.h/2,
                this.shockwaveRadius,
                0,
                Math.PI * 2
            );
            ctx.stroke();
        }
        
        // Offset de Ground Pound
        let yOffset = 0;
        if (this.isGroundPounding) {
            yOffset = -this.jumpHeight;
        }
        
        // Body shake
        let shakeX = 0;
        if (this.bodyShake > 0) {
            shakeX = (Math.random() - 0.5) * 4;
        }
        
        // Sombra
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.ellipse(
            this.x + this.w / 2 + shakeX,
            this.y + this.h + 5,
            this.w / 2,
            10,
            0, 0, Math.PI * 2
        );
        ctx.fill();
        
        // Flash quando atingido
        if (this.hitFlash > 0) {
            ctx.shadowBlur = 25;
            ctx.shadowColor = '#fff';
            this.hitFlash--;
        }
        
        // Glow baseado em rage
        if (this.rageLevel > 0) {
            ctx.shadowBlur = 15 + this.rageLevel * 10;
            ctx.shadowColor = this.color;
        }
        
        // Corpo
        const bodyY = this.y + yOffset;
        
        // === CORPO MUSCULOSO DETALHADO ===
        
        // Torso principal com gradiente
        const torsoGradient = ctx.createLinearGradient(
            this.x + 8 + shakeX, 
            bodyY + 20, 
            this.x + 8 + shakeX, 
            bodyY + this.h
        );
        torsoGradient.addColorStop(0, this.adjustBrightness(this.color, 20));
        torsoGradient.addColorStop(0.5, this.color);
        torsoGradient.addColorStop(1, this.adjustBrightness(this.color, -30));
        
        ctx.fillStyle = torsoGradient;
        ctx.fillRect(
            this.x + 8 + shakeX,
            bodyY + 20,
            this.w - 16,
            this.h - 25
        );
        
        // Músculos peitorais definidos
        ctx.fillStyle = this.adjustBrightness(this.color, -20);
        const muscleSize = 2 + this.rageLevel * 3;
        
        // Peitoral esquerdo
        ctx.beginPath();
        ctx.ellipse(
            this.x + this.w * 0.35 + shakeX,
            bodyY + 32,
            8 + muscleSize,
            10 + muscleSize,
            0.2, 0, Math.PI * 2
        );
        ctx.fill();
        
        // Peitoral direito
        ctx.beginPath();
        ctx.ellipse(
            this.x + this.w * 0.65 + shakeX,
            bodyY + 32,
            8 + muscleSize,
            10 + muscleSize,
            -0.2, 0, Math.PI * 2
        );
        ctx.fill();
        
        // Abdômen definido (6-pack)
        ctx.strokeStyle = this.adjustBrightness(this.color, -40);
        ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
            const absY = bodyY + 45 + i * 10;
            // Linha horizontal
            ctx.beginPath();
            ctx.moveTo(this.x + 18 + shakeX, absY);
            ctx.lineTo(this.x + this.w - 18 + shakeX, absY);
            ctx.stroke();
            // Linhas verticais
            ctx.beginPath();
            ctx.moveTo(this.x + this.w/2 + shakeX, absY - 4);
            ctx.lineTo(this.x + this.w/2 + shakeX, absY + 6);
            ctx.stroke();
        }
        
        // Veias saltadas quando enraged/berserk
        if (this.rageLevel >= 1) {
            ctx.strokeStyle = this.adjustBrightness(this.color, -60);
            ctx.lineWidth = 1.5 + this.rageLevel * 0.5;
            
            // Veias no braço esquerdo
            ctx.beginPath();
            ctx.moveTo(this.x + 15 + shakeX, bodyY + 30);
            ctx.quadraticCurveTo(
                this.x + 12 + shakeX, bodyY + 40,
                this.x + 10 + shakeX, bodyY + 50
            );
            ctx.stroke();
            
            // Veias no braço direito
            ctx.beginPath();
            ctx.moveTo(this.x + this.w - 15 + shakeX, bodyY + 30);
            ctx.quadraticCurveTo(
                this.x + this.w - 12 + shakeX, bodyY + 40,
                this.x + this.w - 10 + shakeX, bodyY + 50
            );
            ctx.stroke();
            
            // Veias no pescoço
            ctx.beginPath();
            ctx.moveTo(this.x + this.w/2 - 6 + shakeX, bodyY + 18);
            ctx.lineTo(this.x + this.w/2 - 8 + shakeX, bodyY + 25);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(this.x + this.w/2 + 6 + shakeX, bodyY + 18);
            ctx.lineTo(this.x + this.w/2 + 8 + shakeX, bodyY + 25);
            ctx.stroke();
        }
        
        // Braços musculosos
        ctx.fillStyle = this.adjustBrightness(this.color, -15);
        
        // Bíceps esquerdo
        ctx.beginPath();
        ctx.ellipse(
            this.x + 8 + shakeX,
            bodyY + 35,
            7 + muscleSize,
            12 + muscleSize,
            0.3, 0, Math.PI * 2
        );
        ctx.fill();
        
        // Bíceps direito
        ctx.beginPath();
        ctx.ellipse(
            this.x + this.w - 8 + shakeX,
            bodyY + 35,
            7 + muscleSize,
            12 + muscleSize,
            -0.3, 0, Math.PI * 2
        );
        ctx.fill();
        
        // Antebraços
        ctx.fillStyle = this.adjustBrightness(this.color, -10);
        ctx.fillRect(this.x + 6 + shakeX, bodyY + 45, 6 + muscleSize, 18);
        ctx.fillRect(this.x + this.w - 12 - muscleSize + shakeX, bodyY + 45, 6 + muscleSize, 18);
        
        // Punhos cerrados
        ctx.fillStyle = this.adjustBrightness(this.color, -25);
        ctx.beginPath();
        ctx.arc(this.x + 9 + shakeX, bodyY + 66, 5 + muscleSize/2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(this.x + this.w - 9 + shakeX, bodyY + 66, 5 + muscleSize/2, 0, Math.PI * 2);
        ctx.fill();
        
        // Cabeça intimidadora
        ctx.fillStyle = '#2c1810';
        ctx.beginPath();
        ctx.arc(
            this.x + this.w / 2 + shakeX,
            bodyY + 12,
            16 + this.rageLevel * 2,
            0,
            Math.PI * 2
        );
        ctx.fill();
        
        // Sobrancelha furiosa
        ctx.strokeStyle = '#1a0f08';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(this.x + this.w/2 - 12 + shakeX, bodyY + 6);
        ctx.lineTo(this.x + this.w/2 - 6 + shakeX, bodyY + 8);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(this.x + this.w/2 + 12 + shakeX, bodyY + 6);
        ctx.lineTo(this.x + this.w/2 + 6 + shakeX, bodyY + 8);
        ctx.stroke();
        
        // Olhos intensos com glow pulsante
        const eyeColor = this.rageLevel === 2 ? '#ffff00' : this.rageLevel === 1 ? '#ff4400' : '#ff0000';
        const eyeSize = 5 + this.rageLevel;
        
        ctx.shadowBlur = 15 * this.eyeGlow + this.rageLevel * 5;
        ctx.shadowColor = eyeColor;
        ctx.fillStyle = eyeColor;
        
        // Olho esquerdo
        ctx.fillRect(
            this.x + this.w / 2 - 11 + shakeX,
            bodyY + 8,
            eyeSize,
            eyeSize
        );
        // Olho direito
        ctx.fillRect(
            this.x + this.w / 2 + 6 + shakeX,
            bodyY + 8,
            eyeSize,
            eyeSize
        );
        
        // Brilho nos olhos
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fillRect(this.x + this.w/2 - 10 + shakeX, bodyY + 9, 2, 2);
        ctx.fillRect(this.x + this.w/2 + 7 + shakeX, bodyY + 9, 2, 2);
        
        ctx.shadowBlur = 0;
        
        // Boca/dentes quando rugindo
        if (this.isRoaring || this.rageLevel >= 2) {
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(this.x + this.w/2 + shakeX, bodyY + 16, 4, 0, Math.PI);
            ctx.fill();
            
            // Dentes
            ctx.fillStyle = '#fff';
            ctx.fillRect(this.x + this.w/2 - 3 + shakeX, bodyY + 16, 2, 3);
            ctx.fillRect(this.x + this.w/2 + 1 + shakeX, bodyY + 16, 2, 3);
        }
        
        // Chifres demoníacos quando berserk
        if (this.rageLevel === 2) {
            ctx.fillStyle = '#1a0f08';
            ctx.beginPath();
            ctx.moveTo(this.x + this.w/2 - 14 + shakeX, bodyY + 4);
            ctx.lineTo(this.x + this.w/2 - 18 + shakeX, bodyY - 4);
            ctx.lineTo(this.x + this.w/2 - 12 + shakeX, bodyY + 2);
            ctx.fill();
            
            ctx.beginPath();
            ctx.moveTo(this.x + this.w/2 + 14 + shakeX, bodyY + 4);
            ctx.lineTo(this.x + this.w/2 + 18 + shakeX, bodyY - 4);
            ctx.lineTo(this.x + this.w/2 + 12 + shakeX, bodyY + 2);
            ctx.fill();
        }
        
        // Aura flamejante pulsante
        if (this.rageLevel > 0) {
            const pulseSize = this.pulseIntensity * (3 + this.rageLevel * 3);
            const auraAlpha = 0.4 + this.pulseIntensity * 0.4;
            
            // Aura interna
            ctx.strokeStyle = `rgba(255, ${150 - this.rageLevel * 50}, 0, ${auraAlpha})`;
            ctx.lineWidth = 4 + this.rageLevel * 2;
            ctx.strokeRect(
                this.x + 4 - pulseSize + shakeX,
                bodyY + 16 - pulseSize,
                this.w - 8 + pulseSize * 2,
                this.h - 22 + pulseSize * 2
            );
            
            // Aura externa
            ctx.strokeStyle = `rgba(255, ${100 - this.rageLevel * 40}, 0, ${auraAlpha * 0.5})`;
            ctx.lineWidth = 2 + this.rageLevel;
            ctx.strokeRect(
                this.x + 2 - pulseSize * 1.5 + shakeX,
                bodyY + 14 - pulseSize * 1.5,
                this.w - 4 + pulseSize * 3,
                this.h - 18 + pulseSize * 3
            );
            
            // Chamas da aura
            for (let i = 0; i < 3 + this.rageLevel; i++) {
                const flameX = this.x + 10 + Math.random() * (this.w - 20) + shakeX;
                const flameY = bodyY + 20 + Math.random() * (this.h - 30);
                ctx.fillStyle = `rgba(255, ${100 + Math.random() * 100}, 0, ${0.3 + Math.random() * 0.3})`;
                ctx.fillRect(flameX, flameY, 2, 4 + Math.random() * 6);
            }
        }
        
        // Indicador de dash
        if (this.isDashing) {
            ctx.strokeStyle = '#ffaa00';
            ctx.lineWidth = 4;
            for (let i = 0; i < 3; i++) {
                ctx.strokeRect(
                    this.x + 2 - i * 8 * this.dashDirection + shakeX,
                    bodyY + 10,
                    this.w - 4,
                    this.h - 15
                );
            }
        }
        
        // Barra de vida
        if (this.life > 0) {
            this.drawHealthBar(ctx, yOffset);
            this.drawNameTag(ctx, yOffset);
            
            // Rage level indicator
            if (this.rageLevel > 0) {
                this.drawRageIndicator(ctx, yOffset);
            }
        }
        
        ctx.restore();
    }
    
    /**
     * NOVO: Indicador visual de nível de rage
     */
    drawRageIndicator(ctx, yOffset = 0) {
        const rageTexts = ['', '⚡ ENRAGED', '💀 BERSERK'];
        const rageColors = ['', '#ff6600', '#ff0000'];
        
        if (this.rageLevel === 0) return;
        
        ctx.save();
        ctx.shadowBlur = 10;
        ctx.shadowColor = rageColors[this.rageLevel];
        ctx.fillStyle = rageColors[this.rageLevel];
        ctx.font = 'bold 10px Righteous, Arial';
        ctx.textAlign = 'center';
        ctx.fillText(
            rageTexts[this.rageLevel],
            this.x + this.w / 2,
            this.y - 38 + yOffset
        );
        ctx.restore();
    }
    
    drawHealthBar(ctx, yOffset = 0) {
        const barWidth = this.w;
        const barHeight = 6;
        const barX = this.x;
        const barY = this.y - 18 + yOffset;
        
        // Fundo
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeRect(barX, barY, barWidth, barHeight);
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        
        // Barra de vida com gradiente de rage
        const lifePercent = this.life / this.maxLife;
        
        const gradient = ctx.createLinearGradient(barX, 0, barX + barWidth * lifePercent, 0);
        if (this.rageLevel === 2) {
            gradient.addColorStop(0, '#ff0000');
            gradient.addColorStop(1, '#8B0000');
        } else if (this.rageLevel === 1) {
            gradient.addColorStop(0, '#ff6600');
            gradient.addColorStop(1, '#c0392b');
        } else {
            gradient.addColorStop(0, '#2ecc71');
            gradient.addColorStop(1, '#27ae60');
        }
        
        ctx.fillStyle = gradient;
        ctx.fillRect(barX, barY, barWidth * lifePercent, barHeight);
        
        // Brilho
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(barX, barY, barWidth * lifePercent, barHeight / 2);
    }
    
    drawNameTag(ctx, yOffset = 0) {
        ctx.save();
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#000';
        
        const nameColor = this.rageLevel === 2 ? '#ff0000' : 
                         this.rageLevel === 1 ? '#ff6600' : '#fff';
        
        ctx.fillStyle = nameColor;
        ctx.font = 'bold 12px Righteous, Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.name, this.x + this.w / 2, this.y - 28 + yOffset);
        ctx.restore();
    }
    
    /**
     * PATCH: Método para obter caixa de colisão real do corpo
     */
    getCollisionBox() {
        return {
            x: this.x + this.hitbox.offsetX,
            y: this.y + this.hitbox.offsetY,
            w: this.hitbox.width,
            h: this.hitbox.height
        };
    }
    
    /**
     * PATCH: Verificar se está atingindo o jogador com a hitbox real
     */
    checkHitPlayer(player) {
        if (!this.attacking || !player || player.life <= 0) {
            return false;
        }
        
        const box = this.getCollisionBox();
        return player.x < box.x + box.w &&
               player.x + player.w > box.x &&
               player.y < box.y + box.h &&
               player.y + player.h > box.y;
    }
    
    /**
     * Função auxiliar para ajustar brilho de cores
     */
    adjustBrightness(color, amount) {
        const hex = color.replace('#', '');
        const r = Math.max(0, Math.min(255, parseInt(hex.substr(0, 2), 16) + amount));
        const g = Math.max(0, Math.min(255, parseInt(hex.substr(2, 2), 16) + amount));
        const b = Math.max(0, Math.min(255, parseInt(hex.substr(4, 2), 16) + amount));
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.BerserkerEnemy = BerserkerEnemy;
}
