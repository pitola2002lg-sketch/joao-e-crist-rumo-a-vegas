/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SISTEMA DE COMBOS E IMPACTO MELHORADO
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Implementa:
 * - Combos com timing
 * - Critical hits
 * - Hit stop / freeze frames
 * - Perfect dodge
 * - Feedback visual aprimorado
 */

class CombatSystem {
    constructor() {
        // Configuração de combos
        this.comboWindow = 48; // 0.8s (60fps)
        this.combos = {
            joao: [
                {
                    name: 'Soco Rápido',
                    damage: 15,
                    hitboxRange: 50,
                    frames: 12,
                    knockback: 5,
                    sound: 'punch1',
                    particles: 'light'
                },
                {
                    name: 'Chute Giratório',
                    damage: 25,
                    hitboxRange: 60,
                    frames: 18,
                    knockback: 10,
                    sound: 'kick',
                    particles: 'medium'
                },
                {
                    name: 'Bengalada Devastadora',
                    damage: 40,
                    hitboxRange: 70,
                    frames: 24,
                    knockback: 20,
                    sound: 'heavy',
                    particles: 'heavy',
                    finisher: true
                }
            ],
            crist: [
                {
                    name: 'Golpe de Bengala',
                    damage: 18,
                    hitboxRange: 55,
                    frames: 14,
                    knockback: 8,
                    sound: 'cane1',
                    particles: 'light'
                },
                {
                    name: 'Estocada Dupla',
                    damage: 28,
                    hitboxRange: 65,
                    frames: 20,
                    knockback: 12,
                    sound: 'cane2',
                    particles: 'medium'
                },
                {
                    name: 'Giro Mortal',
                    damage: 45,
                    hitboxRange: 80,
                    frames: 28,
                    knockback: 25,
                    sound: 'cane_ultimate',
                    particles: 'ultimate',
                    finisher: true
                }
            ]
        };
        
        // Estado do combo
        this.playerCombos = new Map();
        
        // Sistema de timing perfeito
        this.perfectWindow = 8; // 0.133s
        
        // Hit stop global
        this.hitStopFrames = 0;
        this.hitStopActive = false;
        
        // Slow motion
        this.slowMotion = false;
        this.slowMotionDuration = 0;
        this.slowMotionFactor = 0.3;
    }
    
    /**
     * Inicializar combo state para um jogador
     */
    initPlayer(player) {
        this.playerCombos.set(player, {
            comboIndex: 0,
            comboTimer: 0,
            lastAttackFrame: 0,
            perfectTimingActive: false,
            canAttack: true
        });
    }
    
    /**
     * Executar ataque
     */
    attack(player, enemies) {
        const state = this.playerCombos.get(player);
        if (!state || !state.canAttack) return false;
        
        // Determinar qual combo usar
        const playerCombos = player.name === 'João' ? this.combos.joao : this.combos.crist;
        const currentCombo = playerCombos[state.comboIndex];
        
        // Verificar timing perfeito
        const timeSinceLastAttack = Date.now() - state.lastAttackFrame;
        const isPerfectTiming = timeSinceLastAttack <= this.perfectWindow * (1000/60) && 
                               state.comboIndex > 0;
        
        // Calcular dano (crítico se perfect timing)
        const baseDamage = currentCombo.damage;
        const finalDamage = isPerfectTiming ? baseDamage * 2 : baseDamage;
        const isCritical = isPerfectTiming || Math.random() < 0.1; // 10% chance normal
        
        // Configurar ataque do player
        player.attacking = true;
        player.attackTimer = currentCombo.frames;
        player.attackCooldown = isPerfectTiming ? 10 : 20; // Cooldown menor em perfect timing
        player.currentComboAttack = currentCombo;
        player.comboIndex = state.comboIndex;
        
        // Atualizar estado
        state.lastAttackFrame = Date.now();
        state.canAttack = false;
        
        // Incrementar combo para próximo ataque
        state.comboIndex = (state.comboIndex + 1) % playerCombos.length;
        state.comboTimer = this.comboWindow;
        
        // Resetar após timeout
        setTimeout(() => {
            state.canAttack = true;
        }, currentCombo.frames * (1000/60));
        
        // Processar hit após wind-up
        const windUpFrames = Math.floor(currentCombo.frames * 0.3);
        setTimeout(() => {
            if (window.gameState && window.gameState !== 'playing') return;
            this.processHit(player, enemies, currentCombo, finalDamage, isCritical);
        }, windUpFrames * (1000/60));
        
        // Efeitos visuais de ataque
        this.createAttackEffects(player, currentCombo, isPerfectTiming);
        
        // Som
        if (window.soundSystem) {
            window.soundSystem.playSound(currentCombo.sound);
            if (isPerfectTiming) {
                window.soundSystem.playSound('perfect');
            }
        }
        
        return true;
    }
    
    /**
     * Processar hit em inimigos
     */
    processHit(player, enemies, combo, damage, isCritical) {
        const hitboxRange = combo.hitboxRange;
        const hitbox = {
            x: player.facingRight ? player.x + player.w - 10 : player.x - hitboxRange + 10,
            y: player.y + 15,
            w: hitboxRange,
            h: 40
        };
        
        let hitCount = 0;
        
        enemies.forEach(enemy => {
            if (enemy.life <= 0) return;
            
            // Verificar colisão
            const hit = this.checkCollision(hitbox, {
                x: enemy.x,
                y: enemy.y,
                w: enemy.w,
                h: enemy.h
            });
            
            if (hit) {
                hitCount++;
                this.applyDamage(player, enemy, damage, combo.knockback, isCritical);
            }
        });
        
        // Se acertou algum inimigo, trigger feedback
        if (hitCount > 0) {
            this.triggerHitFeedback(player, damage, isCritical, hitCount);
        }
    }
    
    /**
     * Aplicar dano a inimigo
     */
    applyDamage(player, enemy, damage, knockback, isCritical) {
        // Aplicar dano
        const actualDamage = enemy.takeDamage ? enemy.takeDamage(damage) : damage;
        enemy.life = Math.max(0, (enemy.life || 0) - actualDamage);
        
        // Knockback
        const direction = enemy.x > player.x ? 1 : -1;
        enemy.x += direction * knockback;
        
        // Visual de hit
        enemy.hitFlash = isCritical ? 15 : 10;
        
        // Partículas
        this.createHitParticles(enemy, actualDamage, isCritical);
        
        // Dano flutuante
        this.createFloatingDamage(enemy, actualDamage, isCritical);
        
        // Adicionar combo ao player
        if (player.addCombo) {
            player.addCombo();
        }
    }
    
    /**
     * Feedback de impacto
     */
    triggerHitFeedback(player, damage, isCritical, hitCount) {
        // 1. HIT STOP (freeze frames)
        if (isCritical || damage > 30) {
            this.hitStopFrames = isCritical ? 5 : 3;
            this.hitStopActive = true;
        }
        
        // 2. SCREEN SHAKE
        const shakeAmount = Math.min(damage / 15 + hitCount * 1, 8);
        if (window.screenShake !== undefined) {
            window.screenShake = Math.max(window.screenShake || 0, shakeAmount);
        }
        
        // 3. SLOW MOTION (apenas critical)
        if (isCritical) {
            this.slowMotion = true;
            this.slowMotionDuration = 30; // 0.5s
            if (window.gameSpeed !== undefined) {
                window.gameSpeed = this.slowMotionFactor;
            }
        }
        
        // 4. CAMERA ZOOM (finisher)
        if (player.currentComboAttack && player.currentComboAttack.finisher) {
            this.triggerCameraZoom(player, 1.2, 20);
        }
        
        // 5. CHROMATIC ABERRATION (critical)
        if (isCritical) {
            this.triggerChromaticAberration(10);
        }
    }
    
    /**
     * Update - processar timers e efeitos
     */
    update() {
        // Hit stop
        if (this.hitStopActive && this.hitStopFrames > 0) {
            this.hitStopFrames--;
            if (this.hitStopFrames <= 0) {
                this.hitStopActive = false;
            }
            return; // Pausar lógica durante hit stop
        }
        
        // Slow motion
        if (this.slowMotion && this.slowMotionDuration > 0) {
            this.slowMotionDuration--;
            if (this.slowMotionDuration <= 0) {
                this.slowMotion = false;
                if (window.gameSpeed !== undefined) {
                    window.gameSpeed = 1.0;
                }
            }
        }
        
        // Combo timers
        this.playerCombos.forEach((state, player) => {
            if (state.comboTimer > 0) {
                state.comboTimer--;
                if (state.comboTimer === 0) {
                    // Reset combo
                    state.comboIndex = 0;
                }
            }
        });
    }
    
    /**
     * Desenhar indicadores visuais
     */
    draw(ctx, player) {
        const state = this.playerCombos.get(player);
        if (!state) return;
        
        // Indicador de combo timing
        if (state.comboIndex > 0 && state.comboTimer > 0) {
            this.drawComboTimingIndicator(ctx, player, state);
        }
        
        // Indicador de perfect timing window
        if (state.comboTimer > 0 && state.comboTimer <= this.perfectWindow) {
            this.drawPerfectTimingIndicator(ctx, player);
        }
    }
    
    /**
     * Desenhar indicador de timing do combo
     */
    drawComboTimingIndicator(ctx, player, state) {
        const x = player.x + player.w / 2;
        const y = player.y - 50;
        const radius = 25;
        
        ctx.save();
        
        // Fundo do círculo
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.stroke();
        
        // Progress do timing
        const progress = state.comboTimer / this.comboWindow;
        const endAngle = -Math.PI / 2 + (Math.PI * 2 * progress);
        
        // Cor baseada em urgência
        let color;
        if (progress > 0.5) {
            color = '#2ecc71'; // Verde
        } else if (progress > 0.2) {
            color = '#f39c12'; // Laranja
        } else {
            color = '#e74c3c'; // Vermelho
        }
        
        ctx.strokeStyle = color;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(x, y, radius, -Math.PI / 2, endAngle);
        ctx.stroke();
        
        // Número do combo
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(state.comboIndex + 1, x, y);
        
        ctx.restore();
    }
    
    /**
     * Desenhar indicador de perfect timing
     */
    drawPerfectTimingIndicator(ctx, player) {
        const x = player.x + player.w / 2;
        const y = player.y - 50;
        
        ctx.save();
        
        // Pulso dourado
        const pulse = Math.sin(Date.now() / 50) * 0.3 + 0.7;
        ctx.globalAlpha = pulse;
        
        // Anel dourado
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 4;
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#ffd700';
        ctx.beginPath();
        ctx.arc(x, y, 30, 0, Math.PI * 2);
        ctx.stroke();
        
        // Texto
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('PERFECT!', x, y + 45);
        
        ctx.restore();
    }
    
    /**
     * Criar efeitos visuais de ataque
     */
    createAttackEffects(player, combo, isPerfect) {
        if (!window.particles) return;
        
        const x = player.facingRight ? player.x + player.w : player.x;
        const y = player.y + player.h / 2;
        const direction = player.facingRight ? 1 : -1;
        
        // Linhas de velocidade
        for (let i = 0; i < 5; i++) {
            window.particles.push({
                x: x + direction * (i * 10),
                y: y + (Math.random() - 0.5) * 20,
                vx: direction * (8 + i * 2),
                vy: 0,
                life: 10 - i * 2,
                maxLife: 10 - i * 2,
                color: isPerfect ? '#ffd700' : '#ffffff',
                size: 3,
                shape: 'line',
                length: 20
            });
        }
        
        // Brilho no ponto de impacto (perfect timing)
        if (isPerfect) {
            for (let i = 0; i < 12; i++) {
                const angle = (Math.PI * 2 * i) / 12;
                window.particles.push({
                    x: x + direction * 30,
                    y: y,
                    vx: Math.cos(angle) * 4,
                    vy: Math.sin(angle) * 4,
                    life: 20,
                    maxLife: 20,
                    color: '#ffd700',
                    size: 6
                });
            }
        }
    }
    
    /**
     * Criar partículas de impacto
     */
    createHitParticles(enemy, damage, isCritical) {
        if (!window.particles) return;
        
        const count = isCritical ? 30 : 15;
        const color = isCritical ? '#ff0000' : '#ffffff';
        
        for (let i = 0; i < count; i++) {
            window.particles.push({
                x: enemy.x + enemy.w / 2,
                y: enemy.y + enemy.h / 2,
                vx: (Math.random() - 0.5) * 12,
                vy: (Math.random() - 0.5) * 12,
                life: 30,
                maxLife: 30,
                color: color,
                size: isCritical ? 6 : 4,
                gravity: 0.2
            });
        }
        
        // Ring de impacto (critical)
        if (isCritical) {
            window.particles.push({
                x: enemy.x + enemy.w / 2,
                y: enemy.y + enemy.h / 2,
                radius: 10,
                maxRadius: 60,
                life: 20,
                maxLife: 20,
                color: '#ff0000',
                type: 'ring'
            });
        }
    }
    
    /**
     * Criar número de dano flutuante
     */
    createFloatingDamage(enemy, damage, isCritical) {
        if (!window.particles) return;
        
        window.particles.push({
            x: enemy.x + enemy.w / 2,
            y: enemy.y - 10,
            vx: (Math.random() - 0.5) * 2,
            vy: -3,
            life: isCritical ? 60 : 40,
            maxLife: isCritical ? 60 : 40,
            color: isCritical ? '#ff0000' : '#ffffff',
            text: isCritical ? `CRITICAL!\n${damage}` : `-${damage}`,
            size: isCritical ? 24 : 16,
            bold: isCritical,
            outline: true,
            outlineColor: '#000000',
            outlineWidth: 3
        });
    }
    
    /**
     * Verificar colisão entre retângulos
     */
    checkCollision(a, b) {
        return a.x < b.x + b.w &&
               a.x + a.w > b.x &&
               a.y < b.y + b.h &&
               a.y + a.h > b.y;
    }
    
    /**
     * Trigger camera zoom
     */
    triggerCameraZoom(player, zoomLevel, duration) {
        if (!window.camera) return;
        
        window.camera.targetZoom = zoomLevel;
        window.camera.zoomDuration = duration;
        window.camera.focusX = player.x + player.w / 2;
        window.camera.focusY = player.y + player.h / 2;
    }
    
    /**
     * Trigger chromatic aberration
     */
    triggerChromaticAberration(intensity) {
        if (!window.postProcessing) return;
        
        window.postProcessing.chromaticAberration = intensity;
    }
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PERFECT DODGE SYSTEM
 * ═══════════════════════════════════════════════════════════════════════════
 */

class DodgeSystem {
    constructor() {
        this.dodgeWindow = 8; // Frames para perfect dodge
        this.perfectDodgeActive = false;
        this.perfectDodgeDuration = 0;
        this.counterWindowDuration = 60; // 1 segundo após perfect dodge
        this.playerDodgeStates = new Map();
    }
    
    initPlayer(player) {
        this.playerDodgeStates.set(player, {
            dodgeFrame: 0,
            inCounterWindow: false,
            counterWindowTimer: 0
        });
    }
    
    /**
     * Executar dash/dodge
     */
    dodge(player) {
        const state = this.playerDodgeStates.get(player);
        if (!state) return false;
        
        // Executar dash normal
        player.dashing = true;
        player.dashTimer = player.dashDuration;
        player.dashCooldown = 60;
        player.invulnerable = player.dashDuration;
        
        // Registrar frame do dodge
        state.dodgeFrame = Date.now();
        
        // Efeito visual
        this.createDodgeEffects(player);
        
        return true;
    }
    
    /**
     * Verificar se dodge foi perfeito (evadiu ataque inimigo no timing certo)
     */
    checkPerfectDodge(player, enemyAttackTime) {
        const state = this.playerDodgeStates.get(player);
        if (!state) return false;
        
        const timeDiff = Math.abs(state.dodgeFrame - enemyAttackTime);
        const frameTime = 1000 / 60; // 60fps
        
        if (timeDiff <= this.dodgeWindow * frameTime) {
            // PERFECT DODGE!
            this.triggerPerfectDodge(player, state);
            return true;
        }
        
        return false;
    }
    
    /**
     * Ativar perfect dodge
     */
    triggerPerfectDodge(player, state) {
        if(window.DEV) console.log('💫 PERFECT DODGE!');
        
        // Slow motion
        if (window.gameSpeed !== undefined) {
            window.gameSpeed = 0.3;
        }
        this.perfectDodgeActive = true;
        this.perfectDodgeDuration = 60; // 1 segundo
        
        // Counter window
        state.inCounterWindow = true;
        state.counterWindowTimer = this.counterWindowDuration;
        
        // Efeitos visuais intensos
        this.createPerfectDodgeEffects(player);
        
        // Som
        if (window.soundSystem) {
            window.soundSystem.playSound('perfectDodge');
        }
    }
    
    update() {
        // Perfect dodge duration
        if (this.perfectDodgeActive && this.perfectDodgeDuration > 0) {
            this.perfectDodgeDuration--;
            if (this.perfectDodgeDuration <= 0) {
                this.perfectDodgeActive = false;
                if (window.gameSpeed !== undefined) {
                    window.gameSpeed = 1.0;
                }
            }
        }
        
        // Counter windows
        this.playerDodgeStates.forEach((state, player) => {
            if (state.inCounterWindow && state.counterWindowTimer > 0) {
                state.counterWindowTimer--;
                if (state.counterWindowTimer <= 0) {
                    state.inCounterWindow = false;
                }
            }
        });
    }
    
    draw(ctx, player) {
        const state = this.playerDodgeStates.get(player);
        if (!state || !state.inCounterWindow) return;
        
        // Indicador de counter window
        ctx.save();
        
        const x = player.x + player.w / 2;
        const y = player.y - 60;
        const radius = 20;
        
        // Anel azul pulsante
        const pulse = Math.sin(Date.now() / 100) * 0.3 + 0.7;
        ctx.globalAlpha = pulse;
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 4;
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#00ffff';
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.stroke();
        
        // Texto COUNTER
        ctx.fillStyle = '#00ffff';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('COUNTER!', x, y);
        
        ctx.restore();
    }
    
    createDodgeEffects(player) {
        if (!window.particles) return;
        
        // After-image
        for (let i = 0; i < 3; i++) {
            window.particles.push({
                type: 'afterimage',
                x: player.x,
                y: player.y,
                w: player.w,
                h: player.h,
                life: 15 - i * 5,
                maxLife: 15 - i * 5,
                alpha: 0.5 - i * 0.15,
                color: player.primaryColor
            });
        }
    }
    
    createPerfectDodgeEffects(player) {
        if (!window.particles) return;
        
        // Explosão azul
        for (let i = 0; i < 30; i++) {
            const angle = (Math.PI * 2 * i) / 30;
            window.particles.push({
                x: player.x + player.w / 2,
                y: player.y + player.h / 2,
                vx: Math.cos(angle) * 8,
                vy: Math.sin(angle) * 8,
                life: 40,
                maxLife: 40,
                color: '#00ffff',
                size: 6
            });
        }
        
        // Texto PERFECT DODGE
        window.particles.push({
            x: player.x + player.w / 2,
            y: player.y - 20,
            vx: 0,
            vy: -1,
            life: 60,
            maxLife: 60,
            color: '#00ffff',
            text: 'PERFECT DODGE!',
            size: 20,
            bold: true,
            outline: true
        });
    }
}

// Exportar
if (typeof window !== 'undefined') {
    window.CombatSystem = CombatSystem;
    window.DodgeSystem = DodgeSystem;
}
