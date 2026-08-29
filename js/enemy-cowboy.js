/**
 * COWBOY ENEMY - Inimigo que atira a distância
 * VERSÃO CORRIGIDA - Spawn e posicionamento funcionando
 */

class CowboyEnemy extends Enemy {
    constructor(x, y) {
        super(x, y, 'cowboy');
        
        // Stats
        this.w = 45;
        this.h = 75; // CORRIGIDO: 65→75 para cobrir chapéu completo (desenho vai de y-10 até y+65 = 75px)
        this.life = 80;
        this.maxLife = 80;
        this.speed = 1.5;
        this.damage = 25;
        this.score = 200;
        this.color = '#8B4513'; // Marrom (couro)
        this.name = 'Cowboy';
        
        // CORREÇÃO: Posicionamento correto
        this.y = y - this.h; // Ajustar Y para base tocar o chão
        this.groundY = y; // Salvar posição do chão
        
        // ✅ HITBOX PADRONIZADA - Sistema unificado
        this.hitbox = {
            offsetX: Math.floor(this.w * 0.15),  // 15% de margem lateral
            offsetY: Math.floor(this.h * 0.25),  // 25% do topo (chapéu)
            width: Math.floor(this.w * 0.70),    // 70% da largura (corpo)
            height: Math.floor(this.h * 0.65)    // 65% da altura (torso+pernas)
        };
        
        if(window.DEV) console.log('🤠 Cowboy criado em:', x, this.y, 'Ground:', this.groundY, 'Altura:', this.h, 
                    'Hitbox:', `${this.hitbox.width}×${this.hitbox.height}`);
        
        // Mecânicas de tiro
        this.shootRange = 400; // Alcance do tiro
        this.shootCooldown = 2000; // 2 segundos entre tiros
        this.lastShot = 0;
        this.aiming = false;
        this.aimTime = 800; // Tempo de mira (ms)
        this.aimStartTime = 0;
        this.bullets = [];
        
        // Mecânica de esquiva
        this.dodgeCooldown = 3000;
        this.lastDodge = 0;
        this.dodging = false;
        this.dodgeTimer = 0;
        this.dodgeSpeed = 8;
        this.dodgeDirection = 0;
        
        // Animação do chapéu
        this.hatBounce = 0;
        this.hatBounceSpeed = 0.15;
        
        // Visual
        this.gunFlash = 0;
        
        // ✅ VALIDAÇÃO: Re-calcular Y se mudou altura (depois de super e alterações)
        if (this.groundY) {
            this.y = this.groundY - this.h;
        }
        
        // Garantir que não está morto ao spawnar
        this.dead = false;
        this.hitFlash = 0;
        this.deathAnim = 0; // BUG FIX: necessário para isDead() funcionar
    }
    
    update(players, allEnemies) {
        // 16-bit renderer substitui o draw original, então a animação de morte
        // precisa avançar no update. Caso contrário o Cowboy fica para sempre
        // no array de inimigos com deathAnim = 0.
        if (this.dead) {
            this.deathAnim = Math.min((this.deathAnim || 0) + 1, 30);
            return;
        }
        
        const now = Date.now();
        const nearestPlayer = this.getNearestPlayer(players);
        
        if (!nearestPlayer) return;
        
        const dx = nearestPlayer.x - this.x;
        const dy = nearestPlayer.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Animação do chapéu
        this.hatBounce += this.hatBounceSpeed;
        
        // Atualizar balas
        this.bullets = this.bullets.filter(bullet => {
            bullet.x += bullet.vx;
            bullet.y += bullet.vy;
            bullet.life--;
            
            // Verificar colisão com jogadores
            players.forEach(player => {
                if (player.life > 0 && !player.invulnerable &&
                    bullet.x > player.x && bullet.x < player.x + player.w &&
                    bullet.y > player.y && bullet.y < player.y + player.h) {
                    player.takeDamage(this.damage);
                    bullet.life = 0;
                    
                    // Partículas de impacto
                    if (window.particles) {
                        for (let i = 0; i < 5; i++) {
                            window.particles.push({
                                x: bullet.x,
                                y: bullet.y,
                                vx: (Math.random() - 0.5) * 4,
                                vy: (Math.random() - 0.5) * 4,
                                life: 20,
                                maxLife: 20,
                                color: '#ff0000',
                                size: 3
                            });
                        }
                    }
                }
            });
            
            return bullet.life > 0;
        });
        
        // Lógica de esquiva
        if (this.dodging) {
            this.dodgeTimer--;
            this.x += this.dodgeDirection * this.dodgeSpeed;
            
            if (this.dodgeTimer <= 0) {
                this.dodging = false;
            }
            return;
        }
        
        // Tentar esquivar se jogador estiver muito perto
        if (distance < 150 && now - this.lastDodge > this.dodgeCooldown && !this.aiming) {
            this.dodging = true;
            this.dodgeTimer = 15;
            this.dodgeDirection = dx > 0 ? -1 : 1; // Esquiva na direção oposta
            this.lastDodge = now;
            return;
        }
        
        // Lógica de combate - manter distância e atirar
        if (distance > this.shootRange) {
            // Se longe, aproximar
            const moveX = (dx / distance) * this.speed;
            this.x += moveX;
            this.facingRight = dx > 0;
            this.aiming = false;
        } else if (distance < this.shootRange * 0.5) {
            // Se muito perto, recuar
            const moveX = -(dx / distance) * this.speed;
            this.x += moveX;
            this.facingRight = dx > 0;
        } else {
            // Na distância ideal - mirar e atirar
            this.facingRight = dx > 0;
            
            if (!this.aiming && now - this.lastShot > this.shootCooldown) {
                // Começar a mirar
                this.aiming = true;
                this.aimStartTime = now;
            }
            
            if (this.aiming) {
                const aimDuration = now - this.aimStartTime;
                
                if (aimDuration >= this.aimTime) {
                    // Atirar!
                    this.shoot(nearestPlayer);
                    this.aiming = false;
                    this.lastShot = now;
                }
            }
        }
        
        // Reduzir flash do tiro
        if (this.gunFlash > 0) this.gunFlash--;
        
        // ✅ SISTEMA DE GRAVIDADE PADRONIZADO
        if (this.y + this.h < this.groundY) {
            this.vy += this.gravity;
            this.y += this.vy;
        } else {
            this.y = this.groundY - this.h;
            this.vy = 0;
        }
        
        // ✅ SISTEMA ANTI-OVERLAP MELHORADO
        this.avoidEnemies(allEnemies);
        
        // Limites do mapa
        if (this.x < 0) this.x = 0;
        if (this.x > 5000 - this.w) this.x = 5000 - this.w;
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
    
    shoot(target) {
        const bulletX = this.x + (this.facingRight ? this.w : 0);
        const bulletY = this.y + this.h / 2;
        
        // Calcular direção precisa
        const dx = target.x + target.w / 2 - bulletX;
        const dy = target.y + target.h / 2 - bulletY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        const bulletSpeed = 12;
        
        this.bullets.push({
            x: bulletX,
            y: bulletY,
            vx: (dx / distance) * bulletSpeed,
            vy: (dy / distance) * bulletSpeed,
            life: 60
        });
        
        // Efeito visual de tiro
        this.gunFlash = 5;
        
        // Partículas de fumaça do revólver
        if (window.particles) {
            for (let i = 0; i < 10; i++) {
                window.particles.push({
                    x: bulletX,
                    y: bulletY,
                    vx: (this.facingRight ? 1 : -1) * Math.random() * 2 + (dx / distance) * 2,
                    vy: (Math.random() - 0.5) * 2 + (dy / distance) * 0.5,
                    life: 20 + Math.random() * 10,
                    maxLife: 30,
                    color: '#888',
                    size: 4 + Math.random() * 3
                });
            }
        }
        
        // Som de tiro
        if (window.soundSystem) {
            window.soundSystem.playSound('hit');
        }
    }
    
    draw(ctx) {
        // Animação de morte: fade-out com queda
        if (this.dead) {
            if (this.deathAnim < 30) this.deathAnim++;
            if (this.deathAnim >= 30) return;

            ctx.save();
            ctx.globalAlpha = 1 - this.deathAnim / 30;
            ctx.translate(this.x + this.w / 2, this.y + this.h);
            ctx.rotate(this.deathAnim * 0.08);
            ctx.translate(-(this.x + this.w / 2), -(this.y + this.h));
            this._drawBody(ctx);
            ctx.restore();
            return;
        }

        ctx.save(); // BUG FIX: save/restore para isolar setLineDash e outros estados
        
        // ctx já tem translate(-cameraX, 0) aplicado pelo gameLoop
        const screenX = this.x;
        const centerX = screenX + this.w / 2;
        
        // SOMBRA
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(centerX, this.y + this.h + 3, this.w / 2.5, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Flash de hit
        const bodyColor = this.hitFlash > 0 ? '#fff' : this.color;
        if (this.hitFlash > 0) this.hitFlash--;
        
        // PERNAS (calça jeans)
        ctx.fillStyle = '#2c3e50';
        const legWidth = 8;
        const legGap = 4;
        
        // Perna esquerda
        ctx.fillRect(centerX - legWidth - legGap/2, this.y + this.h - 25, legWidth, 25);
        // Perna direita
        ctx.fillRect(centerX + legGap/2, this.y + this.h - 25, legWidth, 25);
        
        // BOTAS
        ctx.fillStyle = '#654321';
        ctx.fillRect(centerX - legWidth - legGap/2, this.y + this.h - 8, legWidth, 8);
        ctx.fillRect(centerX + legGap/2, this.y + this.h - 8, legWidth, 8);
        
        // Saltos das botas
        ctx.fillStyle = '#4a3520';
        ctx.fillRect(centerX - legWidth - legGap/2, this.y + this.h - 4, legWidth, 4);
        ctx.fillRect(centerX + legGap/2, this.y + this.h - 4, legWidth, 4);
        
        // CORPO (colete de couro com gradiente)
        const bodyGradient = ctx.createLinearGradient(screenX, this.y + 10, screenX, this.y + 35);
        bodyGradient.addColorStop(0, bodyColor === '#fff' ? '#fff' : '#a0522d');
        bodyGradient.addColorStop(0.5, bodyColor);
        bodyGradient.addColorStop(1, bodyColor === '#fff' ? '#fff' : '#654321');
        ctx.fillStyle = bodyGradient;
        ctx.fillRect(screenX + 8, this.y + 10, this.w - 16, 25);
        
        // Detalhes do colete (franjas)
        ctx.strokeStyle = '#654321';
        ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
            const fringeX = screenX + 10 + i * 7;
            ctx.beginPath();
            ctx.moveTo(fringeX, this.y + 35);
            ctx.lineTo(fringeX, this.y + 40);
            ctx.stroke();
        }
        
        // Botões do colete
        ctx.fillStyle = '#c0c0c0';
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.arc(centerX, this.y + 15 + i * 7, 2, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // BRAÇO com revólver
        const gunX = this.facingRight ? screenX + this.w : screenX;
        const gunY = this.y + 18;
        
        // Manga da camisa
        ctx.fillStyle = '#e67e22';
        ctx.fillRect(gunX + (this.facingRight ? -18 : 0), gunY, 18, 10);
        
        // Mão
        ctx.fillStyle = '#d4a373';
        ctx.fillRect(gunX + (this.facingRight ? -20 : 15), gunY + 2, 8, 8);
        
        // REVÓLVER detalhado
        ctx.fillStyle = '#2c2c2c';
        // Cano
        ctx.fillRect(gunX + (this.facingRight ? -32 : 20), gunY + 4, 18, 4);
        // Tambor
        ctx.beginPath();
        ctx.arc(gunX + (this.facingRight ? -18 : 22), gunY + 6, 4, 0, Math.PI * 2);
        ctx.fill();
        // Cabo
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(gunX + (this.facingRight ? -15 : 15), gunY + 3, 8, 6);
        
        // Flash de tiro MELHORADO
        if (this.gunFlash > 0) {
            const flashSize = 8 + Math.random() * 4;
            const gunTipX = gunX + (this.facingRight ? -32 : 38);
            
            // Brilho externo
            const flashGrad = ctx.createRadialGradient(gunTipX, gunY + 6, 0, gunTipX, gunY + 6, flashSize * 2);
            flashGrad.addColorStop(0, 'rgba(255, 255, 150, 0.8)');
            flashGrad.addColorStop(0.5, 'rgba(255, 200, 0, 0.5)');
            flashGrad.addColorStop(1, 'rgba(255, 100, 0, 0)');
            ctx.fillStyle = flashGrad;
            ctx.beginPath();
            ctx.arc(gunTipX, gunY + 6, flashSize * 2, 0, Math.PI * 2);
            ctx.fill();
            
            // Flash central
            ctx.fillStyle = '#ffff00';
            ctx.fillRect(gunTipX - flashSize, gunY + 3, flashSize, 6);
        }
        
        // CABEÇA (pele realista)
        ctx.fillStyle = '#d4a373';
        ctx.beginPath();
        ctx.arc(centerX, this.y + 5, 12, 0, Math.PI * 2);
        ctx.fill();
        
        // Pescoço
        ctx.fillRect(centerX - 4, this.y + 10, 8, 8);
        
        // BANDANA vermelha no pescoço
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(centerX - 6, this.y + 12, 12, 4);
        // Nó da bandana
        ctx.fillRect(centerX + 4, this.y + 13, 4, 3);
        
        // CHAPÉU DE COWBOY detalhado
        const hatY = this.y - 10 + Math.sin(this.hatBounce) * 2;
        
        // Sombra do chapéu
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.beginPath();
        ctx.ellipse(centerX, this.y + 2, 18, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Aba do chapéu com gradiente
        const brimGrad = ctx.createLinearGradient(screenX, hatY, screenX + this.w, hatY);
        brimGrad.addColorStop(0, '#4a3520');
        brimGrad.addColorStop(0.5, '#654321');
        brimGrad.addColorStop(1, '#4a3520');
        ctx.fillStyle = brimGrad;
        ctx.beginPath();
        ctx.ellipse(centerX, hatY + 4, 20, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Copa do chapéu
        const crownGrad = ctx.createLinearGradient(centerX - 12, hatY - 10, centerX + 12, hatY - 10);
        crownGrad.addColorStop(0, '#4a3520');
        crownGrad.addColorStop(0.5, '#654321');
        crownGrad.addColorStop(1, '#4a3520');
        ctx.fillStyle = crownGrad;
        ctx.fillRect(centerX - 12, hatY - 10, 24, 10);
        
        // Vinco do chapéu
        ctx.strokeStyle = '#4a3520';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(centerX, hatY - 10);
        ctx.lineTo(centerX, hatY);
        ctx.stroke();
        
        // Fita do chapéu
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(centerX - 12, hatY - 2, 24, 3);
        
        // ROSTO
        // Olhos
        ctx.fillStyle = '#fff';
        ctx.fillRect(centerX - 8, this.y + 3, 4, 4);
        ctx.fillRect(centerX + 4, this.y + 3, 4, 4);
        
        // Pupilas
        ctx.fillStyle = '#000';
        const pupilOffset = this.facingRight ? 1 : -1;
        ctx.fillRect(centerX - 7 + pupilOffset, this.y + 4, 2, 2);
        ctx.fillRect(centerX + 5 + pupilOffset, this.y + 4, 2, 2);
        
        // Bigode
        ctx.strokeStyle = '#4a3520';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(centerX - 8, this.y + 9);
        ctx.lineTo(centerX - 12, this.y + 8);
        ctx.moveTo(centerX + 8, this.y + 9);
        ctx.lineTo(centerX + 12, this.y + 8);
        ctx.stroke();
        
        // Indicador de mira MELHORADO
        if (this.aiming) {
            const aimProgress = (Date.now() - this.aimStartTime) / this.aimTime;
            
            // Círculo externo
            ctx.strokeStyle = `rgba(255, 0, 0, ${aimProgress * 0.5})`;
            ctx.lineWidth = 3;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.arc(centerX, this.y + this.h / 2, 35, 0, Math.PI * 2);
            ctx.stroke();
            
            // Mira interna
            ctx.strokeStyle = `rgba(255, 0, 0, ${aimProgress})`;
            ctx.lineWidth = 2;
            ctx.setLineDash([]);
            ctx.beginPath();
            ctx.arc(centerX, this.y + this.h / 2, 25, 0, Math.PI * 2 * aimProgress);
            ctx.stroke();
            
            // Cruz de mira
            if (aimProgress > 0.5) {
                ctx.beginPath();
                ctx.moveTo(centerX - 10, this.y + this.h / 2);
                ctx.lineTo(centerX + 10, this.y + this.h / 2);
                ctx.moveTo(centerX, this.y + this.h / 2 - 10);
                ctx.lineTo(centerX, this.y + this.h / 2 + 10);
                ctx.stroke();
            }
        }
        
        // Desenhar balas MELHORADAS
        this.bullets.forEach(bullet => {
            const bulletScreenX = bullet.x;
            
            // Brilho da bala
            const bulletGrad = ctx.createRadialGradient(bulletScreenX, bullet.y, 0, bulletScreenX, bullet.y, 5);
            bulletGrad.addColorStop(0, '#ffcc00');
            bulletGrad.addColorStop(0.7, '#ff8800');
            bulletGrad.addColorStop(1, 'rgba(255, 136, 0, 0)');
            ctx.fillStyle = bulletGrad;
            ctx.beginPath();
            ctx.arc(bulletScreenX, bullet.y, 5, 0, Math.PI * 2);
            ctx.fill();
            
            // Bala sólida
            ctx.fillStyle = '#ffaa00';
            ctx.beginPath();
            ctx.arc(bulletScreenX, bullet.y, 3, 0, Math.PI * 2);
            ctx.fill();
            
            // Rastro
            ctx.fillStyle = 'rgba(255, 170, 0, 0.3)';
            ctx.fillRect(bulletScreenX - 8, bullet.y - 1, 6, 2);
        });
        
        // Barra de vida
        this.drawHealthBar(ctx);
        
        // Nome com sombra (abaixo da barra de vida)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.name, centerX + 1, this.y - 36);
        
        ctx.fillStyle = '#ffd700';
        ctx.fillText(this.name, centerX, this.y - 37);
        
        ctx.restore(); // BUG FIX: restaurar estado (remove lineDash leak)
    }
    
    // Helper para reutilizar o desenho na animação de morte
    _drawBody(ctx) {
        const screenX = this.x;
        const centerX = screenX + this.w / 2;
        ctx.fillStyle = this.color;
        ctx.fillRect(screenX + 8, this.y + 10, this.w - 16, 25);
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(centerX - 12, this.y + this.h - 25, 8, 25);
        ctx.fillRect(centerX + 4, this.y + this.h - 25, 8, 25);
        ctx.fillStyle = '#d4a373';
        ctx.beginPath();
        ctx.arc(centerX, this.y + 5, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#654321';
        ctx.fillRect(centerX - 12, this.y - 10, 24, 10);
    }
    
    /**
     * BUG FIX: isDead() para cowboy usar flag .dead + deathAnim
     * Sem isso, cowboy NUNCA é removido do array de inimigos
     */
    isDead() {
        return this.dead && this.deathAnim >= 30;
    }
    
    takeDamage(amount, attacker) {
        if (this.dead) return false;
        
        const actualDamage = Math.max(1, amount - (this.armor || 0));
        this.life = Math.max(0, this.life - actualDamage);
        this.hitFlash = 10;
        
        // Feedback visual
        if (window.particles) {
            window.particles.push({
                x: this.x + this.w / 2,
                y: this.y,
                vx: (Math.random() - 0.5) * 4,
                vy: -3,
                life: 30,
                maxLife: 30,
                color: '#fff',
                text: `-${actualDamage}`,
                size: 16
            });
        }
        
        if (this.life <= 0 && !this.dead) {
            this.die(attacker);
            return true;
        }
        
        if (window.soundSystem) {
            window.soundSystem.playSound('hit');
        }
        
        return false;
    }
    
    die(attacker) {
        this.dead = true;
        
        // Partículas de morte
        if (window.particles) {
            for (let i = 0; i < 20; i++) {
                window.particles.push({
                    x: this.x + this.w / 2,
                    y: this.y + this.h / 2,
                    vx: (Math.random() - 0.5) * 8,
                    vy: -Math.random() * 8,
                    life: 40 + Math.random() * 20,
                    maxLife: 60,
                    color: this.color,
                    size: 4 + Math.random() * 4
                });
            }
            
            // Chapéu voando
            window.particles.push({
                x: this.x + this.w / 2,
                y: this.y - 25,
                vx: (Math.random() - 0.5) * 6,
                vy: -10,
                life: 60,
                maxLife: 60,
                color: '#654321',
                size: 8,
                text: '🤠'
            });
        }
        
        if (attacker) {
            attacker.score += this.score;
        }
        
        if (window.soundSystem) {
            window.soundSystem.playSound('ko');
        }
    }
    
    /**
     * BUG FIX: Override drawHealthBar para posicionar acima do chapéu
     * O chapéu vai até this.y - 10, então a barra deve ficar em this.y - 32
     */
    drawHealthBar(ctx) {
        const barWidth = this.w;
        const barHeight = 6;
        const barX = this.x;
        const barY = this.y - 32; // Acima do chapéu (chapéu está em y-10)

        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeRect(barX, barY, barWidth, barHeight);
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        const lifePercent = this.life / this.maxLife;
        let barColor;
        if (lifePercent > 0.6) barColor = '#2ecc71';
        else if (lifePercent > 0.3) barColor = '#f39c12';
        else barColor = '#e74c3c';

        ctx.fillStyle = barColor;
        ctx.fillRect(barX, barY, barWidth * lifePercent, barHeight);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(barX, barY, barWidth * lifePercent, barHeight / 2);
    }
    
    /**
     * ✅ SISTEMA DE HITBOX PADRONIZADO
     * Retorna a caixa de colisão ajustada (corpo real sem chapéu/extremidades)
     */
    getCollisionBox() {
        return {
            x: this.x + this.hitbox.offsetX,
            y: this.y + this.hitbox.offsetY,
            w: this.hitbox.width,
            h: this.hitbox.height
        };
    }
    
    checkHitPlayer(player) {
        if (!this.attacking || !player || player.life <= 0) {
            return false;
        }
        
        return this.x < player.x + player.w &&
               this.x + this.w > player.x &&
               this.y < player.y + player.h &&
               this.y + this.h > player.y;
    }
}
