/**
 * INIMIGO TANK
 * Inimigo pesado com armadura - alto HP e resistência a dano
 */

class TankEnemy {
    constructor(x, y) {
        this.x = x;
        this.w = 75;
        this.h = 95;
        this.type = 'tank';
        
        // CORREÇÃO: Ajustar Y e salvar ground
        this.groundY = y;
        this.y = y - this.h;
        
        // Atributos
        this.life = 200;
        this.maxLife = 200;
        this.speed = 1.2;
        this.damage = 30;
        this.armor = 0.5; // 50% redução de dano
        this.color = '#2c3e50';
        this.secondaryColor = '#1a252f';
        this.name = 'TANK';
        this.score = 300;
        
        if(window.DEV) console.log('✅ TANK criado em:', this.x, this.y, 'Ground:', this.groundY);
        
        // Animação e estado
        this.attacking = false;
        this.attackTimer = 0;
        this.attackCooldown = 0;
        this.facingRight = false;
        this.aiState = 'idle';
        this.aiTimer = 0;
        this.hitFlash = 0;
        this.deathAnim = 0;
        this.walkCycle = 0;
        
        // Efeitos especiais
        this.shieldActive = false;
        this.shieldTimer = 0;
        
        // PATCH: Hitbox ajustada para corpo real do Tank (75×95px)
        // 60% da largura, 65% da altura, centralizado
        this.hitbox = {
            offsetX: Math.floor(this.w * 0.20),      // 15px de margem
            offsetY: Math.floor(this.h * 0.25),      // 24px do topo (cabeça)
            width: Math.floor(this.w * 0.60),        // 45px (60% de 75)
            height: Math.floor(this.h * 0.65)        // 62px (65% de 95)
        };
        
        if(window.DEV) console.log(`✅ Tank hitbox: ${this.hitbox.width}×${this.hitbox.height} (${Math.round((this.hitbox.width * this.hitbox.height) / (this.w * this.h) * 100)}% da área)`);
    }

    draw(ctx) {
        if (this.life <= 0 && this.deathAnim >= 30) return;

        ctx.save();

        // Animação de morte
        if (this.life <= 0) {
            ctx.globalAlpha = 1 - (this.deathAnim / 30);
            ctx.translate(this.x + this.w / 2, this.y + this.h);
            ctx.rotate(this.deathAnim * 0.05); // Rotação mais lenta por ser pesado
            ctx.translate(-(this.x + this.w / 2), -(this.y + this.h));
        }

        // Sombra maior
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.ellipse(this.x + this.w / 2, this.y + this.h + 5, this.w / 2 + 5, 10, 0, 0, Math.PI * 2);
        ctx.fill();

        // Flash quando atingido (menos visível pela armadura)
        if (this.hitFlash > 0) {
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#00ffff';
            this.hitFlash--;
        }

        // PERNAS ROBUSTAS - Calça tática reforçada
        const legOffset = Math.sin(this.walkCycle) * 3; // Menos movimento
        const gradient = ctx.createLinearGradient(this.x, this.y + this.h - 35, this.x, this.y + this.h);
        gradient.addColorStop(0, '#1a1a1a');
        gradient.addColorStop(1, '#0a0a0a');
        ctx.fillStyle = gradient;
        ctx.fillRect(this.x + 15, this.y + this.h - 35, 16, 30 + legOffset);
        ctx.fillRect(this.x + 44, this.y + this.h - 35, 16, 30 - legOffset);
        
        // Proteção de joelhos (kevlar)
        ctx.fillStyle = '#34495e';
        ctx.fillRect(this.x + 14, this.y + this.h - 20, 18, 8);
        ctx.fillRect(this.x + 43, this.y + this.h - 20, 18, 8);
        
        // Borda metálica da proteção
        ctx.strokeStyle = '#95a5a6';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x + 14, this.y + this.h - 20, 18, 8);
        ctx.strokeRect(this.x + 43, this.y + this.h - 20, 18, 8);

        // BOTAS DE COMBATE PESADAS
        ctx.fillStyle = '#000';
        ctx.fillRect(this.x + 12, this.y + this.h - 5 + legOffset, 20, 8);
        ctx.fillRect(this.x + 43, this.y + this.h - 5 - legOffset, 20, 8);
        
        // Detalhes das botas (sola)
        ctx.fillStyle = '#555';
        ctx.fillRect(this.x + 12, this.y + this.h + 1 + legOffset, 20, 2);
        ctx.fillRect(this.x + 43, this.y + this.h + 1 - legOffset, 20, 2);
        
        // Cadarços
        ctx.strokeStyle = '#888';
        ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.moveTo(this.x + 15, this.y + this.h - 4 + i * 2 + legOffset);
            ctx.lineTo(this.x + 28, this.y + this.h - 4 + i * 2 + legOffset);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(this.x + 46, this.y + this.h - 4 + i * 2 - legOffset);
            ctx.lineTo(this.x + 59, this.y + this.h - 4 + i * 2 - legOffset);
            ctx.stroke();
        }

        // CORPO - Colete tático com armadura
        const bodyGradient = ctx.createLinearGradient(this.x, this.y + 15, this.x, this.y + 60);
        bodyGradient.addColorStop(0, this.color);
        bodyGradient.addColorStop(0.5, this.secondaryColor);
        bodyGradient.addColorStop(1, this.color);
        ctx.fillStyle = bodyGradient;
        ctx.fillRect(this.x + 5, this.y + 15, this.w - 10, this.h - 50);
        
        // PLACAS DE ARMADURA (Peitorais)
        ctx.fillStyle = '#34495e';
        // Placa esquerda
        ctx.fillRect(this.x + 8, this.y + 20, 26, 35);
        // Placa direita
        ctx.fillRect(this.x + 41, this.y + 20, 26, 35);
        
        // Detalhes metálicos das placas
        ctx.strokeStyle = '#7f8c8d';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x + 8, this.y + 20, 26, 35);
        ctx.strokeRect(this.x + 41, this.y + 20, 26, 35);
        
        // Parafusos nas placas
        ctx.fillStyle = '#95a5a6';
        const screwPositions = [
            [12, 24], [28, 24], [12, 48], [28, 48], // Esquerda
            [45, 24], [61, 24], [45, 48], [61, 48]  // Direita
        ];
        screwPositions.forEach(([sx, sy]) => {
            ctx.beginPath();
            ctx.arc(this.x + sx, this.y + sy, 2, 0, Math.PI * 2);
            ctx.fill();
            // Cruz do parafuso
            ctx.strokeStyle = '#7f8c8d';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(this.x + sx - 1.5, this.y + sy);
            ctx.lineTo(this.x + sx + 1.5, this.y + sy);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(this.x + sx, this.y + sy - 1.5);
            ctx.lineTo(this.x + sx, this.y + sy + 1.5);
            ctx.stroke();
        });
        
        // Placa abdominal (meio)
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(this.x + 25, this.y + 45, 25, 18);
        ctx.strokeStyle = '#7f8c8d';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x + 25, this.y + 45, 25, 18);
        
        // Cinto utilitário
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(this.x + 10, this.y + 60, this.w - 20, 8);
        ctx.fillStyle = '#8b7355';
        ctx.fillRect(this.x + this.w / 2 - 8, this.y + 58, 16, 12);
        
        // Bolsas do cinto
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(this.x + 15, this.y + 61, 10, 6);
        ctx.fillRect(this.x + 50, this.y + 61, 10, 6);

        // BRAÇOS MUSCULOSOS
        const armOffset = Math.sin(this.walkCycle) * 2;
        ctx.fillStyle = '#d4a574';
        
        if (this.attacking) {
            // Braço de ataque massivo
            const punchX = this.facingRight ? this.x + this.w - 8 : this.x - 35;
            ctx.fillStyle = '#d4a574';
            ctx.fillRect(punchX, this.y + 25, 40, 18);
            
            // Proteção de antebraço
            ctx.fillStyle = '#34495e';
            ctx.fillRect(punchX + (this.facingRight ? 0 : 20), this.y + 24, 20, 20);
            ctx.strokeStyle = '#7f8c8d';
            ctx.lineWidth = 2;
            ctx.strokeRect(punchX + (this.facingRight ? 0 : 20), this.y + 24, 20, 20);
            
            // Punho massivo
            ctx.fillStyle = '#b8906d';
            const fistX = this.facingRight ? punchX + 32 : punchX;
            ctx.fillRect(fistX, this.y + 26, 12, 16);
            
            // Efeito de impacto devastador
            ctx.fillStyle = '#ff3300';
            ctx.shadowBlur = 25;
            ctx.shadowColor = '#ff3300';
            const impactX = this.facingRight ? punchX + 44 : punchX - 12;
            ctx.beginPath();
            ctx.arc(impactX, this.y + 34, 10, 0, Math.PI * 2);
            ctx.fill();
            
            // Ondas de choque
            for (let i = 1; i <= 3; i++) {
                ctx.strokeStyle = `rgba(255, 51, 0, ${1 - i * 0.3})`;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(impactX, this.y + 34, 10 + i * 8, 0, Math.PI * 2);
                ctx.stroke();
            }
            ctx.shadowBlur = 0;
        } else {
            // Braços normais
            ctx.fillStyle = '#d4a574';
            ctx.fillRect(this.x, this.y + 25 + armOffset, 15, 35);
            ctx.fillRect(this.x + this.w - 15, this.y + 25 - armOffset, 15, 35);
            
            // Proteção de antebraços
            ctx.fillStyle = '#34495e';
            ctx.fillRect(this.x + 1, this.y + 40 + armOffset, 13, 18);
            ctx.fillRect(this.x + this.w - 14, this.y + 40 - armOffset, 13, 18);
        }

        // CABEÇA - Capacete tático
        ctx.fillStyle = '#2c3e50';
        ctx.beginPath();
        ctx.arc(this.x + this.w / 2, this.y + 10, 20, 0, Math.PI * 2);
        ctx.fill();
        
        // Detalhes do capacete
        ctx.fillStyle = '#34495e';
        ctx.fillRect(this.x + this.w / 2 - 18, this.y + 5, 36, 8);
        
        // Riscos do capacete (ventilação)
        ctx.strokeStyle = '#1a252f';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 5; i++) {
            ctx.beginPath();
            ctx.moveTo(this.x + this.w / 2 - 15 + i * 7, this.y + 6);
            ctx.lineTo(this.x + this.w / 2 - 15 + i * 7, this.y + 12);
            ctx.stroke();
        }
        
        // Viseira/Óculos táticos
        ctx.fillStyle = '#000';
        ctx.fillRect(this.x + this.w / 2 - 14, this.y + 8, 28, 8);
        
        // Reflexo na viseira
        ctx.fillStyle = 'rgba(0, 255, 255, 0.3)';
        ctx.fillRect(this.x + this.w / 2 - 13, this.y + 9, 12, 3);
        
        // Olhos brilhantes através da viseira (vermelho ameaçador)
        ctx.fillStyle = '#ff0000';
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ff0000';
        ctx.fillRect(this.x + this.w / 2 - 10, this.y + 11, 6, 3);
        ctx.fillRect(this.x + this.w / 2 + 4, this.y + 11, 6, 3);
        ctx.shadowBlur = 0;
        
        // Protetor de boca (respirador)
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(this.x + this.w / 2 - 8, this.y + 17, 16, 8);
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 1;
        ctx.strokeRect(this.x + this.w / 2 - 8, this.y + 17, 16, 8);
        
        // Filtros do respirador
        ctx.fillStyle = '#555';
        ctx.beginPath();
        ctx.arc(this.x + this.w / 2 - 10, this.y + 21, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(this.x + this.w / 2 + 10, this.y + 21, 3, 0, Math.PI * 2);
        ctx.fill();

        // Shield indicator (quando ativo)
        if (this.shieldActive) {
            ctx.strokeStyle = '#00ffff';
            ctx.lineWidth = 3;
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#00ffff';
            ctx.beginPath();
            ctx.arc(this.x + this.w / 2, this.y + this.h / 2, this.w / 2 + 10, 0, Math.PI * 2);
            ctx.stroke();
            ctx.shadowBlur = 0;
        }

        ctx.restore();

        // Barra de vida
        if (this.life > 0) {
            this.drawHealthBar(ctx);
            this.drawNameTag(ctx);
            this.drawArmorIndicator(ctx);
        }
    }

    drawHealthBar(ctx) {
        const barWidth = this.w;
        const barHeight = 8;
        const barX = this.x;
        const barY = this.y - 22;

        // Borda dupla (mais resistente)
        ctx.strokeStyle = '#34495e';
        ctx.lineWidth = 3;
        ctx.strokeRect(barX - 1, barY - 1, barWidth + 2, barHeight + 2);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeRect(barX, barY, barWidth, barHeight);

        // Fundo
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        // Vida com gradiente azul (armadura)
        const lifePercent = this.life / this.maxLife;
        const gradient = ctx.createLinearGradient(barX, 0, barX + barWidth, 0);
        gradient.addColorStop(0, '#3498db');
        gradient.addColorStop(1, '#2980b9');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(barX, barY, barWidth * lifePercent, barHeight);

        // Brilho metálico
        ctx.fillStyle = 'rgba(52, 152, 219, 0.4)';
        ctx.fillRect(barX, barY, barWidth * lifePercent, barHeight / 2);
        
        // Segmentos de armadura (visual de placas)
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.lineWidth = 1;
        for (let i = 1; i < 4; i++) {
            const segmentX = barX + (barWidth / 4) * i;
            ctx.beginPath();
            ctx.moveTo(segmentX, barY);
            ctx.lineTo(segmentX, barY + barHeight);
            ctx.stroke();
        }
    }

    drawArmorIndicator(ctx) {
        // Ícone de escudo indicando armadura
        ctx.save();
        ctx.fillStyle = '#3498db';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'left';
        ctx.shadowBlur = 5;
        ctx.shadowColor = '#3498db';
        ctx.fillText('🛡', this.x - 5, this.y - 24);
        
        // Percentual de redução
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 8px Arial';
        ctx.fillText(`-${this.armor * 100}%`, this.x + 8, this.y - 24);
        ctx.restore();
    }

    drawNameTag(ctx) {
        ctx.save();
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#000';
        ctx.fillStyle = '#3498db';
        ctx.font = 'bold 13px Righteous';
        ctx.textAlign = 'center';
        ctx.fillText(this.name, this.x + this.w / 2, this.y - 34);
        ctx.restore();
    }

    update(players, otherEnemies = []) {
        // Se morto, incrementar animação de morte e retornar
        if (this.life <= 0) {
            this.deathAnim++;
            return;
        }

        // Atualizar shield timer
        if (this.shieldTimer > 0) {
            this.shieldTimer--;
            if (this.shieldTimer === 0) {
                this.shieldActive = false;
            }
        }

        // Ativar shield quando vida baixa
        if (this.life < this.maxLife * 0.3 && !this.shieldActive && this.shieldTimer === 0) {
            this.shieldActive = true;
            this.shieldTimer = 180; // 3 segundos
            this.armor = 0.7; // 70% redução temporária
        }

        // Encontrar jogador VIVO mais próximo. Evita atacar P1 morto no multiplayer.
        const alivePlayers = Array.isArray(players) ? players.filter(player => player && player.life > 0) : [];
        if (!alivePlayers.length) return;
        let nearestPlayer = alivePlayers[0];
        let minDist = Math.abs(nearestPlayer.x - this.x);
        alivePlayers.forEach(player => {
            const dist = Math.abs(player.x - this.x);
            if (dist < minDist) {
                minDist = dist;
                nearestPlayer = player;
            }
        });

        const dx = nearestPlayer.x - this.x;
        const distance = Math.sqrt(dx * dx);

        this.facingRight = dx > 0;
        this.aiTimer--;
        
        if (distance < 80 && this.attackCooldown === 0) {
            this.attacking = true;
            this.attackTimer = 15;
            this.attackCooldown = 90; // Ataque mais lento mas devastador
            this.aiState = 'attacking';
            this.walkCycle = 0;
        } else if (distance < 400) {
            if (Math.abs(dx) > 15) {
                this.x += Math.sign(dx) * this.speed;
                this.walkCycle += 0.1; // Movimento pesado
            }
            this.aiState = 'chasing';
        }

        if (this.attackCooldown > 0) this.attackCooldown--;
        if (this.attacking) {
            this.attackTimer--;
            if (this.attackTimer <= 0) this.attacking = false;
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
        this.avoidEnemies(otherEnemies);
        
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

    hit(dmg) {
        const reducedDamage = Math.floor(dmg * (1 - this.armor));
        this.life -= reducedDamage;
        this.hitFlash = 8;
        if (this.life < 0) this.life = 0;
        
        // Efeito visual de armadura
        if (window.createTextPopup) {
            window.createTextPopup(this.x + this.w / 2, this.y - 20, `-${reducedDamage}`, '#3498db');
        }
    }

    /**
     * PATCH: Método para obter caixa de colisão do corpo (não confundir com hitbox de ataque)
     */
    getCollisionBox() {
        return {
            x: this.x + this.hitbox.offsetX,
            y: this.y + this.hitbox.offsetY,
            w: this.hitbox.width,
            h: this.hitbox.height
        };
    }

    getHitbox() {
        if (!this.attacking) return null;
        return {
            x: this.facingRight ? this.x + this.w : this.x - 40,
            y: this.y + 20,
            w: 40,
            h: 40
        };
    }

    checkHitPlayer(player) {
        if (!this.attacking || player.life <= 0) return false;
        const hitbox = this.getHitbox();
        if (!hitbox) return false;
        
        return player.x < hitbox.x + hitbox.w &&
               player.x + player.w > hitbox.x &&
               player.y < hitbox.y + hitbox.h &&
               player.y + player.h > hitbox.y;
    }

    isDead() {
        return this.life <= 0 && this.deathAnim >= 30;
    }
}

if (typeof window !== 'undefined') {
    window.TankEnemy = TankEnemy;
}
