/**
 * INIMIGO BÁSICO: CAPANGA
 * Inimigo padrão do jogo - membro de gangue
 */

class BasicEnemy {
    constructor(x, y) {
        this.x = x;
        this.w = 45;
        this.h = 65;
        this.type = 'basic';
        
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
        
        if(window.DEV) console.log('✅ Capanga criado em:', this.x, this.y, 'Ground:', this.groundY,
                    'Hitbox:', `${this.hitbox.width}×${this.hitbox.height}`);
        
        // Atributos
        this.life = 50;
        this.maxLife = 50;
        this.speed = 2;
        this.damage = 8;
        this.color = '#c0392b';
        this.secondaryColor = '#a93226';
        this.name = 'Capanga';
        this.score = 100;
        
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
        
        // Variação visual
        this.bandanaColor = ['#e74c3c', '#e67e22', '#9b59b6'][Math.floor(Math.random() * 3)];
        this.hasBeard = Math.random() > 0.5;
        this.hasTattoo = Math.random() > 0.7;
    }

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

        // Sombra
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(this.x + this.w / 2, this.y + this.h + 5, this.w / 2, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Flash quando atingido
        if (this.hitFlash > 0) {
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#fff';
            this.hitFlash--;
        }

        // PERNAS - Calça jeans rasgada
        const legOffset = Math.sin(this.walkCycle) * 6;
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(this.x + 12, this.y + this.h - 30, 10, 25 + legOffset);
        ctx.fillRect(this.x + 23, this.y + this.h - 30, 10, 25 - legOffset);
        
        // Rasgos na calça
        ctx.fillStyle = '#1a252f';
        ctx.fillRect(this.x + 12, this.y + this.h - 18, 10, 3);
        ctx.fillRect(this.x + 25, this.y + this.h - 12, 8, 2);

        // BOTAS PRETAS
        ctx.fillStyle = '#000';
        ctx.fillRect(this.x + 10, this.y + this.h - 3 + legOffset, 14, 6);
        ctx.fillRect(this.x + 21, this.y + this.h - 3 - legOffset, 14, 6);
        
        // Fivelas das botas
        ctx.fillStyle = '#888';
        ctx.fillRect(this.x + 11, this.y + this.h - 1 + legOffset, 3, 2);
        ctx.fillRect(this.x + 22, this.y + this.h - 1 - legOffset, 3, 2);

        // CORPO - Jaqueta de couro
        const gradient = ctx.createLinearGradient(this.x, this.y + 20, this.x, this.y + 60);
        gradient.addColorStop(0, this.color);
        gradient.addColorStop(1, this.secondaryColor);
        ctx.fillStyle = gradient;
        ctx.fillRect(this.x + 8, this.y + 20, this.w - 16, this.h - 25);
        
        // Detalhe da jaqueta (zíper)
        ctx.fillStyle = '#555';
        ctx.fillRect(this.x + this.w / 2 - 2, this.y + 22, 4, this.h - 30);
        
        // Bolsos da jaqueta
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(this.x + 10, this.y + 35, 8, 8);
        ctx.strokeRect(this.x + this.w - 18, this.y + 35, 8, 8);
        
        // Gola da jaqueta
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.moveTo(this.x + this.w / 2 - 8, this.y + 20);
        ctx.lineTo(this.x + this.w / 2 - 12, this.y + 15);
        ctx.lineTo(this.x + this.w / 2 - 8, this.y + 25);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(this.x + this.w / 2 + 8, this.y + 20);
        ctx.lineTo(this.x + this.w / 2 + 12, this.y + 15);
        ctx.lineTo(this.x + this.w / 2 + 8, this.y + 25);
        ctx.fill();

        // BRAÇOS
        const armOffset = Math.sin(this.walkCycle) * 4;
        ctx.fillStyle = '#8b4513'; // Tom de pele
        
        if (this.attacking) {
            // Braço de ataque
            const punchX = this.facingRight ? this.x + this.w - 5 : this.x - 25;
            ctx.fillRect(punchX, this.y + 25, 30, 10);
            
            // Manga da jaqueta
            ctx.fillStyle = this.color;
            ctx.fillRect(punchX + (this.facingRight ? 0 : 15), this.y + 25, 15, 10);
            
            // Punho cerrado
            ctx.fillStyle = '#654321';
            const fistX = this.facingRight ? punchX + 25 : punchX;
            ctx.fillRect(fistX, this.y + 24, 8, 12);
            
            // Efeito de impacto vermelho
            ctx.fillStyle = '#ff0000';
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#ff0000';
            const impactX = this.facingRight ? punchX + 33 : punchX - 8;
            ctx.beginPath();
            ctx.arc(impactX, this.y + 30, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            
            // Linhas de impacto
            ctx.strokeStyle = '#ff3333';
            ctx.lineWidth = 2;
            for (let i = 0; i < 3; i++) {
                ctx.beginPath();
                const angle = (Math.PI / 6) * i - Math.PI / 6;
                ctx.moveTo(impactX, this.y + 30);
                ctx.lineTo(
                    impactX + Math.cos(angle) * 15 * (this.facingRight ? 1 : -1),
                    this.y + 30 + Math.sin(angle) * 15
                );
                ctx.stroke();
            }
        } else {
            // Braços normais
            ctx.fillStyle = '#8b4513';
            ctx.fillRect(this.x + 2, this.y + 25 + armOffset, 10, 28);
            ctx.fillRect(this.x + this.w - 12, this.y + 25 - armOffset, 10, 28);
            
            // Mangas da jaqueta
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x + 2, this.y + 25 + armOffset, 10, 15);
            ctx.fillRect(this.x + this.w - 12, this.y + 25 - armOffset, 10, 15);
        }

        // CABEÇA
        ctx.fillStyle = '#d4a574';
        ctx.beginPath();
        ctx.arc(this.x + this.w / 2, this.y + 12, 16, 0, Math.PI * 2);
        ctx.fill();
        
        // Cabelo bagunçado
        ctx.fillStyle = '#2c1810';
        ctx.beginPath();
        ctx.arc(this.x + this.w / 2, this.y + 5, 17, Math.PI, 0);
        ctx.fill();
        // Fios de cabelo
        for (let i = 0; i < 5; i++) {
            ctx.fillRect(this.x + 12 + i * 5, this.y - 2, 3, 8);
        }
        
        // Barba (se tiver)
        if (this.hasBeard) {
            ctx.fillStyle = '#1a1a1a';
            ctx.beginPath();
            ctx.arc(this.x + this.w / 2, this.y + 18, 10, 0, Math.PI);
            ctx.fill();
        }
        
        // Bandana
        ctx.fillStyle = this.bandanaColor;
        ctx.fillRect(this.x + 10, this.y + 4, 30, 6);
        // Nó da bandana
        ctx.fillRect(this.x + this.w / 2 - 3, this.y + 3, 6, 4);
        
        // OLHOS MALVADOS
        ctx.fillStyle = '#fff';
        ctx.fillRect(this.x + this.w / 2 - 10, this.y + 10, 7, 5);
        ctx.fillRect(this.x + this.w / 2 + 3, this.y + 10, 7, 5);
        
        // Pupilas
        ctx.fillStyle = '#ff0000';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ff0000';
        ctx.fillRect(this.x + this.w / 2 - 9, this.y + 11, 4, 3);
        ctx.fillRect(this.x + this.w / 2 + 4, this.y + 11, 4, 3);
        ctx.shadowBlur = 0;
        
        // Sobrancelhas bravas
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.x + this.w / 2 - 12, this.y + 8);
        ctx.lineTo(this.x + this.w / 2 - 5, this.y + 10);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(this.x + this.w / 2 + 12, this.y + 8);
        ctx.lineTo(this.x + this.w / 2 + 5, this.y + 10);
        ctx.stroke();
        
        // Tatuagem (se tiver)
        if (this.hasTattoo) {
            ctx.fillStyle = '#000';
            ctx.font = 'bold 8px Arial';
            ctx.fillText('★', this.x + 5, this.y + 35);
        }

        ctx.restore();

        // Barra de vida
        if (this.life > 0) {
            this.drawHealthBar(ctx);
            this.drawNameTag(ctx);
        }
    }

    drawHealthBar(ctx) {
        const barWidth = this.w;
        const barHeight = 6;
        const barX = this.x;
        const barY = this.y - 18;

        // Borda
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeRect(barX, barY, barWidth, barHeight);

        // Fundo
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        // Vida
        const lifePercent = this.life / this.maxLife;
        const gradient = ctx.createLinearGradient(barX, 0, barX + barWidth, 0);
        
        if (lifePercent > 0.6) {
            gradient.addColorStop(0, '#27ae60');
            gradient.addColorStop(1, '#229954');
        } else if (lifePercent > 0.3) {
            gradient.addColorStop(0, '#f39c12');
            gradient.addColorStop(1, '#e67e22');
        } else {
            gradient.addColorStop(0, '#e74c3c');
            gradient.addColorStop(1, '#c0392b');
        }
        
        ctx.fillStyle = gradient;
        ctx.fillRect(barX, barY, barWidth * lifePercent, barHeight);

        // Brilho
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(barX, barY, barWidth * lifePercent, barHeight / 2);
    }

    drawNameTag(ctx) {
        ctx.save();
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#000';
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 11px Righteous';
        ctx.textAlign = 'center';
        ctx.fillText(this.name, this.x + this.w / 2, this.y - 28);
        ctx.restore();
    }

    update(players, otherEnemies = []) {
        // Se morto, apenas incrementar animação de morte e retornar
        // deathAnim incrementado AQUI no update (não no draw)
        if (this.life <= 0) {
            if (this.deathAnim < 30) this.deathAnim++;
            return;
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
        const dy = nearestPlayer.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Atualizar direção
        this.facingRight = dx > 0;

        // IA do inimigo
        this.aiTimer--;
        
        if (distance < 70 && this.attackCooldown === 0 && this.__attackAllowed !== false) {
            // Atacar se próximo
            this.attacking = true;
            this.attackTimer = 12;
            this.attackCooldown = 70;
            this.aiState = 'attacking';
            this.walkCycle = 0;
        } else if (distance < 400) {
            // Perseguir jogador
            if (Math.abs(dx) > 15) {
                this.x += Math.sign(dx) * this.speed;
                this.walkCycle += 0.2;
            }
            this.aiState = 'chasing';
        } else {
            // Patrulhar
            if (this.aiTimer <= 0) {
                this.aiState = Math.random() > 0.5 ? 'patrol_left' : 'patrol_right';
                this.aiTimer = 80 + Math.random() * 80;
            }
            
            if (this.aiState === 'patrol_left') {
                this.x -= this.speed * 0.6;
                this.walkCycle += 0.15;
            } else if (this.aiState === 'patrol_right') {
                this.x += this.speed * 0.6;
                this.walkCycle += 0.15;
            }
        }

        // Atualizar timers de ataque
        if (this.attackCooldown > 0) {
            this.attackCooldown--;
        }
        
        if (this.attacking) {
            this.attackTimer--;
            if (this.attackTimer <= 0) {
                this.attacking = false;
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
        this.life -= dmg;
        this.hitFlash = 8;
        if (this.life < 0) this.life = 0;
    }

    getHitbox() {
        if (!this.attacking) return null;
        const hitboxW = 30;
        const hitboxH = 30;
        return {
            x: this.facingRight ? this.x + this.w : this.x - hitboxW,
            y: this.y + 20,
            w: hitboxW,
            h: hitboxH
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

// Compatibilidade com código existente
if (typeof window !== 'undefined') {
    window.BasicEnemy = BasicEnemy;
}
