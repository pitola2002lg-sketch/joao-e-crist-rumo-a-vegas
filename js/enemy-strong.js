/**
 * STRONG ENEMY - BRUTAMONTES
 * Inimigo poderoso e resistente - causa muito dano
 */

class StrongEnemy {
    constructor(x, y) {
        this.x = x;
        this.w = 60;
        this.h = 85;
        this.type = 'strong';
        
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
        
        if(window.DEV) console.log('✅ Brutamontes criado em:', this.x, this.y, 'Ground:', this.groundY,
                    'Hitbox:', `${this.hitbox.width}×${this.hitbox.height}`);
        
        // Atributos
        this.life = 100;
        this.maxLife = 100;
        this.speed = 1.2;
        this.damage = 18;
        this.name = 'Brutamontes';
        this.score = 200;
        
        // Cores (robusto e intimidador)
        this.skinColor = '#c68642';
        this.pantsColor = '#34495e';
        this.bootColor = '#1a1a1a';
        this.tattooColor = '#000';
        
        // Estado
        this.attacking = false;
        this.attackTimer = 0;
        this.attackCooldown = 0;
        this.facingRight = false;
        this.aiState = 'idle';
        this.aiTimer = 0;
        this.hitFlash = 0;
        this.deathAnim = 0;
        this.walkCycle = 0;
        this.punchWind = 0;
    }

    draw(ctx) {
        if (this.life <= 0 && this.deathAnim >= 30) return;

        ctx.save();

        // Animação de morte (cai pesadamente)
        if (this.life <= 0) {
            ctx.globalAlpha = 1 - (this.deathAnim / 30);
            ctx.translate(this.x + this.w / 2, this.y + this.h);
            ctx.rotate(this.deathAnim * 0.07);
            ctx.translate(-(this.x + this.w / 2), -(this.y + this.h));
        }

        // Flip horizontal
        if (this.facingRight) {
            ctx.translate(this.x + this.w, this.y);
            ctx.scale(-1, 1);
            ctx.translate(-this.x, -this.y);
        }

        // Sombra grande
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.beginPath();
        ctx.ellipse(
            this.x + this.w / 2, 
            this.y + this.h + 4, 
            this.w / 2 + 3, 
            9, 
            0, 0, Math.PI * 2
        );
        ctx.fill();

        // Flash ao ser atingido
        if (this.hitFlash > 0) {
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#e74c3c';
            this.hitFlash--;
        }

        // === PERNAS MASSIVAS ===
        const legOffset = Math.sin(this.walkCycle) * 4;
        
        // Calça jeans reforçada
        const pantsGradient = ctx.createLinearGradient(
            this.x, this.y + this.h - 40, 
            this.x, this.y + this.h
        );
        pantsGradient.addColorStop(0, this.pantsColor);
        pantsGradient.addColorStop(1, this.adjustBrightness(this.pantsColor, -25));
        
        ctx.fillStyle = pantsGradient;
        // Perna esquerda (mais grossa)
        ctx.fillRect(this.x + 12, this.y + this.h - 40, 16, 35 + legOffset);
        // Perna direita
        ctx.fillRect(this.x + 32, this.y + this.h - 40, 16, 35 - legOffset);
        
        // Cinto largo
        ctx.fillStyle = '#8b7355';
        ctx.fillRect(this.x + 10, this.y + this.h - 42, this.w - 20, 6);
        // Fivela
        ctx.fillStyle = '#d4af37';
        ctx.fillRect(this.x + this.w / 2 - 8, this.y + this.h - 44, 16, 10);
        ctx.strokeStyle = '#b8860b';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x + this.w / 2 - 8, this.y + this.h - 44, 16, 10);

        // Botas de trabalho pesadas
        ctx.fillStyle = this.bootColor;
        ctx.fillRect(this.x + 10, this.y + this.h - 5 + legOffset, 19, 10);
        ctx.fillRect(this.x + 31, this.y + this.h - 5 - legOffset, 19, 10);
        
        // Sola grossa
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(this.x + 9, this.y + this.h + 3 + legOffset, 21, 3);
        ctx.fillRect(this.x + 30, this.y + this.h + 3 - legOffset, 21, 3);
        
        // Detalhes das botas
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.moveTo(this.x + 12, this.y + this.h - 3 + i * 2 + legOffset);
            ctx.lineTo(this.x + 27, this.y + this.h - 3 + i * 2 + legOffset);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(this.x + 33, this.y + this.h - 3 + i * 2 - legOffset);
            ctx.lineTo(this.x + 48, this.y + this.h - 3 + i * 2 - legOffset);
            ctx.stroke();
        }

        // === CORPO MUSCULOSO === (sem camisa)
        // Torso com músculos definidos
        const torsoGradient = ctx.createLinearGradient(
            this.x, this.y + 15, 
            this.x, this.y + this.h - 40
        );
        torsoGradient.addColorStop(0, this.adjustBrightness(this.skinColor, 10));
        torsoGradient.addColorStop(0.5, this.skinColor);
        torsoGradient.addColorStop(1, this.adjustBrightness(this.skinColor, -15));
        
        ctx.fillStyle = torsoGradient;
        ctx.fillRect(this.x + 8, this.y + 15, this.w - 16, this.h - 55);
        
        // Músculos peitorais
        ctx.fillStyle = this.adjustBrightness(this.skinColor, -20);
        ctx.beginPath();
        // Peitoral esquerdo
        ctx.ellipse(this.x + 18, this.y + 28, 10, 12, 0.2, 0, Math.PI * 2);
        ctx.fill();
        // Peitoral direito
        ctx.beginPath();
        ctx.ellipse(this.x + 42, this.y + 28, 10, 12, -0.2, 0, Math.PI * 2);
        ctx.fill();
        
        // Abdômen definido (tanquinho)
        ctx.fillStyle = this.adjustBrightness(this.skinColor, -25);
        for (let i = 0; i < 3; i++) {
            // Lado esquerdo
            ctx.fillRect(this.x + 20, this.y + 42 + i * 10, 8, 8);
            // Lado direito
            ctx.fillRect(this.x + 32, this.y + 42 + i * 10, 8, 8);
        }

        // Tatuagens (tribal)
        ctx.fillStyle = this.tattooColor;
        ctx.lineWidth = 3;
        // Tatuagem no ombro esquerdo
        ctx.beginPath();
        ctx.moveTo(this.x + 10, this.y + 20);
        ctx.lineTo(this.x + 15, this.y + 25);
        ctx.lineTo(this.x + 12, this.y + 30);
        ctx.lineTo(this.x + 18, this.y + 35);
        ctx.stroke();
        // Tatuagem no ombro direito
        ctx.beginPath();
        ctx.moveTo(this.x + 50, this.y + 20);
        ctx.lineTo(this.x + 45, this.y + 25);
        ctx.lineTo(this.x + 48, this.y + 30);
        ctx.lineTo(this.x + 42, this.y + 35);
        ctx.stroke();

        // === BRAÇOS MUSCULOSOS ===
        const armSwing = Math.sin(this.walkCycle) * 6;
        const punchPower = this.attacking ? Math.min(this.attackTimer * 2, 25) : 0;
        
        // Braço esquerdo
        ctx.fillStyle = this.skinColor;
        ctx.fillRect(this.x, this.y + 20 - armSwing, 12, 35);
        // Bíceps esquerdo (volume)
        ctx.fillStyle = this.adjustBrightness(this.skinColor, -10);
        ctx.beginPath();
        ctx.ellipse(this.x + 6, this.y + 28 - armSwing, 8, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        // Mão esquerda
        ctx.fillStyle = this.adjustBrightness(this.skinColor, -5);
        ctx.fillRect(this.x - 2, this.y + 53 - armSwing, 14, 12);
        
        // Braço direito (soco poderoso)
        ctx.fillStyle = this.skinColor;
        ctx.fillRect(this.x + 48, this.y + 20 + armSwing, 12, 35);
        // Bíceps direito
        ctx.fillStyle = this.adjustBrightness(this.skinColor, -10);
        ctx.beginPath();
        ctx.ellipse(this.x + 54, this.y + 28 + armSwing, 8, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        // Punho direito (cerrado e grande)
        ctx.fillStyle = this.adjustBrightness(this.skinColor, -5);
        ctx.fillRect(this.x + 46 + punchPower, this.y + 53 + armSwing, 16, 14);
        
        // Dedos do punho
        ctx.fillStyle = this.adjustBrightness(this.skinColor, -15);
        ctx.fillRect(this.x + 47 + punchPower, this.y + 57 + armSwing, 14, 4);
        ctx.fillRect(this.x + 47 + punchPower, this.y + 62 + armSwing, 14, 3);

        // Efeito de vento do soco
        if (this.attacking && punchPower > 15) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth = 3;
            for (let i = 0; i < 3; i++) {
                ctx.beginPath();
                ctx.moveTo(this.x + 62 + punchPower, this.y + 58 + armSwing + i * 4);
                ctx.lineTo(this.x + 75 + punchPower, this.y + 58 + armSwing + i * 4);
                ctx.stroke();
            }
        }

        // === CABEÇA ===
        // Pescoço grosso
        ctx.fillStyle = this.skinColor;
        ctx.fillRect(this.x + 20, this.y + 10, 20, 8);
        
        // Cabeça (quadrada e robusta)
        ctx.fillStyle = this.skinColor;
        ctx.fillRect(this.x + 15, this.y - 15, 30, 28);
        
        // Cabelo raspado/curto
        ctx.fillStyle = '#2c2c2c';
        ctx.fillRect(this.x + 15, this.y - 15, 30, 12);
        
        // Cicatriz na testa
        ctx.strokeStyle = this.adjustBrightness(this.skinColor, -40);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.x + 25, this.y - 8);
        ctx.lineTo(this.x + 32, this.y - 3);
        ctx.stroke();

        // Olhos (intensos)
        ctx.fillStyle = '#fff';
        ctx.fillRect(this.x + 21, this.y - 3, 6, 6);
        ctx.fillRect(this.x + 33, this.y - 3, 6, 6);
        
        // Pupilas (olhar penetrante)
        ctx.fillStyle = '#000';
        const pupilX = this.facingRight ? 3 : 1;
        ctx.fillRect(this.x + 22 + pupilX, this.y - 2, 3, 4);
        ctx.fillRect(this.x + 34 + pupilX, this.y - 2, 3, 4);

        // Sobrancelhas grossas (franzidas)
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(this.x + 20, this.y - 6, 8, 3);
        ctx.fillRect(this.x + 32, this.y - 6, 8, 3);

        // Nariz quebrado
        ctx.fillStyle = this.adjustBrightness(this.skinColor, -20);
        ctx.fillRect(this.x + 28, this.y + 2, 4, 7);

        // Boca (careta intimidadora)
        ctx.fillStyle = '#000';
        ctx.fillRect(this.x + 24, this.y + 7, 12, 3);
        // Dente faltando
        ctx.fillStyle = '#fff';
        ctx.fillRect(this.x + 26, this.y + 7, 2, 3);
        ctx.fillRect(this.x + 32, this.y + 7, 2, 3);

        // Barba por fazer
        ctx.fillStyle = 'rgba(26, 26, 26, 0.3)';
        ctx.fillRect(this.x + 18, this.y + 6, 24, 8);

        // Orelhas
        ctx.fillStyle = this.skinColor;
        ctx.fillRect(this.x + 12, this.y, 4, 8);
        ctx.fillRect(this.x + 44, this.y, 4, 8);

        ctx.restore();
        
        // === BARRA DE VIDA (fora do flip para não espelhar) ===
        if (this.life > 0) {
            const barY = this.y - 14;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(this.x, barY, this.w, 6);
            
            const healthPercent = this.life / this.maxLife;
            const barColor = healthPercent > 0.5 ? '#2ecc71' : 
                           healthPercent > 0.25 ? '#f39c12' : '#e74c3c';
            ctx.fillStyle = barColor;
            ctx.fillRect(this.x, barY, this.w * healthPercent, 6);
            
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.fillRect(this.x, barY, this.w * healthPercent, 3);
            
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(this.x, barY, this.w, 6);
            
            // Nome
            ctx.save();
            ctx.fillStyle = '#8e44ad';
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

        // Atualizar ciclo de caminhada (lento e pesado)
        this.walkCycle += 0.08;

        // Atualizar ataque
        if (this.attacking) {
            this.attackTimer++;
            if (this.attackTimer > 20) {
                this.attackTimer = 0;
                this.attacking = false;
            }
        }

        if (this.attackCooldown > 0) {
            this.attackCooldown--;
        }

        // IA
        this.aiTimer++;
        if (this.aiTimer > 90) {
            this.aiState = ['chase', 'idle', 'chase', 'chase'][Math.floor(Math.random() * 4)];
            this.aiTimer = 0;
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

        // Movimento (lento mas implacável)
        if (this.aiState === 'chase' && minDist > 55) {
            if (closestPlayer.x < this.x) {
                this.x -= this.speed;
                this.facingRight = false;
            } else {
                this.x += this.speed;
                this.facingRight = true;
            }
        }

        // Atacar (soco poderoso)
        if (minDist < 65 && this.attackCooldown <= 0) {
            this.attacking = true;
            this.attackCooldown = 90;  // Cooldown longo

            // Verificar acerto
            if (Math.abs(closestPlayer.x - this.x) < 60) {
                if (closestPlayer.takeDamage) {
                    closestPlayer.takeDamage(this.damage);
                    
                    // Knockback pesado
                    const knockbackDir = closestPlayer.x > this.x ? 1 : -1;
                    closestPlayer.x += knockbackDir * 20;
                }
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
        if (this.life <= 0) return;
        
        this.life = Math.max(0, this.life - damage);
        this.hitFlash = 10;

        // Efeito de dano
        if (typeof createDamageText === 'function') {
            createDamageText(this.x + this.w / 2, this.y, `-${damage}`, '#fff');
        }

        if (window.soundSystem && this.life > 0) {
            window.soundSystem.playSound('enemyHit');
        }

        if (this.life <= 0 && window.soundSystem) {
            window.soundSystem.playSound('enemyDeath');
        }
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
