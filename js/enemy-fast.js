/**
 * FAST ENEMY - CORREDOR
 * Inimigo rápido e ágil - difícil de acertar
 */

class FastEnemy {
    constructor(x, y) {
        this.x = x;
        this.w = 40;
        this.h = 65;
        this.type = 'fast';
        
        // CORREÇÃO: Ajustar Y e salvar ground
        this.groundY = y;
        this.y = y - this.h;
        
        // ✅ HITBOX PADRONIZADA - Sistema unificado
        this.hitbox = {
            offsetX: Math.floor(this.w * 0.15),  // 15% de margem lateral
            offsetY: Math.floor(this.h * 0.25),  // 25% do topo (cabeça)
            width: Math.floor(this.w * 0.70),    // 70% da largura (corpo)
            height: Math.floor(this.h * 0.65)    // 65% da altura (torso+pernas)
        };
        
        if(window.DEV) console.log('✅ Corredor criado em:', this.x, this.y, 'Ground:', this.groundY, 
                    'Hitbox:', `${this.hitbox.width}×${this.hitbox.height}`);
        
        // Atributos
        this.life = 35;
        this.maxLife = 35;
        this.speed = 4.5;  // MUITO rápido!
        this.damage = 10;
        this.name = 'Corredor';
        this.score = 150;
        
        // Cores (atlético - roupa esportiva)
        this.shirtColor = '#f39c12';  // Laranja vibrante
        this.pantsColor = '#2c3e50';  // Calça esportiva
        this.shoeColor = '#e74c3c';   // Tênis vermelho
        this.skinColor = '#d4a069';
        
        // Estado
        this.attacking = false;
        this.attackTimer = 0;
        this.attackCooldown = 0;
        this.facingRight = false;
        this.aiState = 'chase';  // Sempre em movimento!
        this.aiTimer = 0;
        this.hitFlash = 0;
        this.deathAnim = 0;
        this.walkCycle = 0;
        this.dashCooldown = 0;
        this.dashing = false;
        this.dashTimer = 0;
    }

    draw(ctx) {
        if (this.life <= 0 && this.deathAnim >= 30) return;

        ctx.save();

        // Animação de morte
        if (this.life <= 0) {
            ctx.globalAlpha = 1 - (this.deathAnim / 30);
            ctx.translate(this.x + this.w / 2, this.y + this.h);
            ctx.rotate(this.deathAnim * 0.15);  // Rotação rápida
            ctx.translate(-(this.x + this.w / 2), -(this.y + this.h));
        }

        // Flip horizontal
        if (this.facingRight) {
            ctx.translate(this.x + this.w, this.y);
            ctx.scale(-1, 1);
            ctx.translate(-this.x, -this.y);
        }

        // Sombra (alongada durante corrida)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.beginPath();
        const shadowStretch = this.dashing ? 1.5 : 1;
        ctx.ellipse(
            this.x + this.w / 2, 
            this.y + this.h + 2, 
            (this.w / 2) * shadowStretch, 
            5, 
            0, 0, Math.PI * 2
        );
        ctx.fill();

        // Flash ao ser atingido
        if (this.hitFlash > 0) {
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#f39c12';
            this.hitFlash--;
        }

        // Rastro de velocidade durante dash
        if (this.dashing) {
            ctx.globalAlpha = 0.3;
            for (let i = 1; i <= 3; i++) {
                ctx.fillStyle = this.shirtColor;
                const trailX = this.facingRight ? this.x - i * 8 : this.x + i * 8;
                ctx.fillRect(trailX + 5, this.y + 18, 30, 40);
            }
            ctx.globalAlpha = 1;
        }

        // === PERNAS === (movimento exagerado de corrida)
        const legSwing = Math.sin(this.walkCycle * 2) * 12;  // Movimento amplo
        
        // Calça legging esportiva
        ctx.fillStyle = this.pantsColor;
        // Perna esquerda (em movimento)
        ctx.fillRect(this.x + 10, this.y + this.h - 38, 10, 32 + legSwing);
        // Perna direita (em movimento oposto)
        ctx.fillRect(this.x + 20, this.y + this.h - 38, 10, 32 - legSwing);
        
        // Detalhes de faixas laterais (estilo esportivo)
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.x + 12, this.y + this.h - 35);
        ctx.lineTo(this.x + 12, this.y + this.h - 5 + legSwing);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(this.x + 22, this.y + this.h - 35);
        ctx.lineTo(this.x + 22, this.y + this.h - 5 - legSwing);
        ctx.stroke();

        // Tênis de corrida (modernos)
        ctx.fillStyle = this.shoeColor;
        // Pé esquerdo
        ctx.fillRect(this.x + 8, this.y + this.h - 6 + legSwing, 14, 8);
        ctx.fillStyle = '#fff';  // Detalhe branco
        ctx.fillRect(this.x + 10, this.y + this.h - 5 + legSwing, 3, 6);
        
        // Pé direito
        ctx.fillStyle = this.shoeColor;
        ctx.fillRect(this.x + 18, this.y + this.h - 6 - legSwing, 14, 8);
        ctx.fillStyle = '#fff';
        ctx.fillRect(this.x + 20, this.y + this.h - 5 - legSwing, 3, 6);

        // Sola (preto)
        ctx.fillStyle = '#000';
        ctx.fillRect(this.x + 8, this.y + this.h + 1 + legSwing, 14, 2);
        ctx.fillRect(this.x + 18, this.y + this.h + 1 - legSwing, 14, 2);

        // === CORPO === (regata esportiva)
        const bodyGradient = ctx.createLinearGradient(
            this.x, this.y + 18, 
            this.x, this.y + 58
        );
        bodyGradient.addColorStop(0, this.shirtColor);
        bodyGradient.addColorStop(1, this.adjustBrightness(this.shirtColor, -20));
        
        ctx.fillStyle = bodyGradient;
        ctx.fillRect(this.x + 5, this.y + 18, 30, 40);
        
        // Gola em V
        ctx.fillStyle = this.adjustBrightness(this.shirtColor, -30);
        ctx.beginPath();
        ctx.moveTo(this.x + 15, this.y + 18);
        ctx.lineTo(this.x + 20, this.y + 26);
        ctx.lineTo(this.x + 25, this.y + 18);
        ctx.fill();

        // Número nas costas (estilo atleta)
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('88', this.x + this.w / 2, this.y + 38);

        // === BRAÇOS === (movimento de corrida)
        const armSwing = Math.sin(this.walkCycle * 2 + Math.PI) * 15;
        
        // Braço esquerdo
        ctx.fillStyle = this.skinColor;
        ctx.fillRect(this.x + 2, this.y + 22 - armSwing / 2, 8, 25);
        // Mão esquerda
        ctx.fillRect(this.x + 1, this.y + 45 - armSwing / 2, 9, 8);
        
        // Braço direito
        ctx.fillRect(this.x + 30, this.y + 22 + armSwing / 2, 8, 25);
        // Mão direita
        ctx.fillRect(this.x + 29, this.y + 45 + armSwing / 2, 9, 8);

        // Punho cerrado
        ctx.fillStyle = this.adjustBrightness(this.skinColor, -15);
        ctx.fillRect(this.x + 2, this.y + 47 - armSwing / 2, 7, 4);
        ctx.fillRect(this.x + 30, this.y + 47 + armSwing / 2, 7, 4);

        // === CABEÇA ===
        // Pescoço
        ctx.fillStyle = this.skinColor;
        ctx.fillRect(this.x + 15, this.y + 13, 10, 6);
        
        // Cabeça (formato oval)
        ctx.beginPath();
        ctx.ellipse(this.x + this.w / 2, this.y + 6, 11, 13, 0, 0, Math.PI * 2);
        ctx.fillStyle = this.skinColor;
        ctx.fill();
        
        // Cabelo curto e aerodinâmico
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath();
        ctx.ellipse(this.x + this.w / 2, this.y + 1, 12, 9, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Faixa na testa (headband)
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(this.x + 8, this.y + 4, 24, 4);

        // Olhos (focados e determinados)
        ctx.fillStyle = '#fff';
        ctx.fillRect(this.x + 13, this.y + 7, 5, 4);
        ctx.fillRect(this.x + 22, this.y + 7, 5, 4);
        
        // Pupilas (olhando para frente)
        ctx.fillStyle = '#000';
        ctx.fillRect(this.x + 15, this.y + 8, 2, 3);
        ctx.fillRect(this.x + 24, this.y + 8, 2, 3);

        // Sobrancelhas (focadas)
        ctx.fillStyle = '#000';
        ctx.fillRect(this.x + 13, this.y + 5, 6, 2);
        ctx.fillRect(this.x + 21, this.y + 5, 6, 2);

        // Boca (determinação)
        ctx.fillStyle = '#000';
        ctx.fillRect(this.x + 17, this.y + 13, 6, 2);

        // Orelhas
        ctx.fillStyle = this.skinColor;
        ctx.fillRect(this.x + 6, this.y + 8, 3, 5);
        ctx.fillRect(this.x + 31, this.y + 8, 3, 5);

        // Indicador de DASH
        if (this.dashing) {
            ctx.fillStyle = '#f39c12';
            ctx.font = 'bold 10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('DASH!', this.x + this.w / 2, this.y - 15);
        }

        ctx.restore();
        
        // === BARRA DE VIDA (fora do flip para não espelhar) ===
        if (this.life > 0) {
            const barY = this.y - 12;
            // Fundo
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(this.x, barY, this.w, 5);
            
            // Vida
            const healthPercent = this.life / this.maxLife;
            const barColor = healthPercent > 0.5 ? '#2ecc71' : 
                           healthPercent > 0.25 ? '#f39c12' : '#e74c3c';
            ctx.fillStyle = barColor;
            ctx.fillRect(this.x, barY, this.w * healthPercent, 5);
            
            // Borda
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(this.x, barY, this.w, 5);
            
            // Nome
            ctx.save();
            ctx.fillStyle = '#f39c12';
            ctx.font = 'bold 11px Arial';
            ctx.textAlign = 'center';
            ctx.shadowBlur = 6;
            ctx.shadowColor = '#000';
            ctx.fillText(this.name, this.x + this.w / 2, barY - 4);
            ctx.restore();
        }
    }

    update(players, allEnemies) {
        if (this.life <= 0) {
            if (this.deathAnim < 30) this.deathAnim++;
            return;
        }

        // Atualizar ciclo de caminhada (mais rápido)
        this.walkCycle += 0.25;

        // Atualizar dash
        if (this.dashing) {
            this.dashTimer--;
            if (this.dashTimer <= 0) {
                this.dashing = false;
                this.speed = 4.5;
            }
        }

        if (this.dashCooldown > 0) {
            this.dashCooldown--;
        }

        // Atualizar timers de ataque
        if (this.attacking) {
            this.attackTimer--;
            if (this.attackTimer <= 0) {
                this.attacking = false;
            }
        }

        if (this.attackCooldown > 0) {
            this.attackCooldown--;
        }

        // Procurar jogador mais próximo
        let closestPlayer = null;
        let minDist = Infinity;

        players.forEach(p => {
            if (p.life > 0) {
                const dist = Math.hypot(p.x - this.x, p.y - this.y);
                if (dist < minDist) {
                    minDist = dist;
                    closestPlayer = p;
                }
            }
        });

        if (!closestPlayer) return;

        // IA: SEMPRE perseguindo (agressivo)
        this.aiState = 'chase';

        // Usar dash a cada 3 segundos quando longe
        if (minDist > 200 && !this.dashing && this.dashCooldown <= 0) {
            this.dashing = true;
            this.dashTimer = 20;
            this.dashCooldown = 180;  // 3 segundos
            this.speed = 8;  // Dobra a velocidade!
        }

        // Movimento
        if (minDist > 45) {
            if (closestPlayer.x < this.x) {
                this.x -= this.speed;
                this.facingRight = false;
            } else {
                this.x += this.speed;
                this.facingRight = true;
            }
        }

        // Atacar
        if (minDist < 50 && this.attackCooldown <= 0) {
            this.attacking = true;
            this.attackTimer = 15;
            this.attackCooldown = 45;  // Ataque rápido

            // Verificar acerto
            if (closestPlayer.takeDamage) {
                closestPlayer.takeDamage(this.damage);
            }
        }

        // ✅ SISTEMA DE GRAVIDADE PADRONIZADO
        if (!this.vy) this.vy = 0;
        if (!this.gravity) this.gravity = 0.5;
        
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

    takeDamage(damage) {
        if (this.life <= 0) return false;
        
        // Dodge aleatório (10% de chance)
        if (Math.random() < 0.1) {
            // Dash para trás
            this.x += this.facingRight ? -30 : 30;
            // Feedback visual
            if (window.particles) {
                window.particles.push({ x: this.x + this.w/2, y: this.y, vx: 0, vy: -2,
                    life: 40, color: '#f39c12', type: 'text', text: 'DODGE!', size: 16 });
            }
            return false;
        }

        this.life = Math.max(0, this.life - damage);
        this.hitFlash = 6;

        if (window.soundSystem && this.life > 0) {
            window.soundSystem.playSound('enemyHit');
        }

        if (this.life <= 0) {
            this.dead = true;
            this.deathAnim = 1;
            if (window.soundSystem) window.soundSystem.playSound('enemyDeath');
            // Drop de power-up (30% chance)
            if (Math.random() < 0.3 && window.powerUps) {
                const dropTypes = ['health', 'score', 'speed'];
                window.powerUps.push({
                    x: this.x + this.w/2 - 15, y: this.y + this.h/2 - 15,
                    w: 30, h: 30,
                    type: dropTypes[Math.floor(Math.random() * dropTypes.length)],
                    collected: false, bobOffset: 0,
                    baseY: this.y + this.h/2 - 15
                });
            }
            return true;
        }
        return false;
    }

    adjustBrightness(color, amount) {
        const hex = color.replace('#', '');
        const r = Math.max(0, Math.min(255, parseInt(hex.substr(0, 2), 16) + amount));
        const g = Math.max(0, Math.min(255, parseInt(hex.substr(2, 2), 16) + amount));
        const b = Math.max(0, Math.min(255, parseInt(hex.substr(4, 2), 16) + amount));
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
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
    
    isDead() {
        return this.life <= 0 && this.deathAnim >= 30;
    }
    
    /**
     * ✅ SISTEMA DE HITBOX PADRONIZADO
     * Retorna a caixa de colisão ajustada (corpo real sem extremidades)
     */
    getCollisionBox() {
        return {
            x: this.x + this.hitbox.offsetX,
            y: this.y + this.hitbox.offsetY,
            w: this.hitbox.width,
            h: this.hitbox.height
        };
    }
}
