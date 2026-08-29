/**
 * ENEMY.JS - VERSÃO MELHORADA E CORRIGIDA
 * Sistema de inimigos consolidado e otimizado
 */

class Enemy {
    constructor(x, y, type = 'basic') {
        this.x = x;
        this.type = type;
        this.w = 45;
        this.h = 65;
        
        // CORREÇÃO CRÍTICA: Ajustar Y e salvar ground
        // y é a posição do chão, precisamos ajustar para a base do inimigo
        this.groundY = y;  // Salvar ground dinâmico
        this.y = y - this.h;  // Ajustar para base tocar o chão
        
        // Atributos baseados no tipo
        this.initializeStats(type);
        
        // IMPORTANTE: Re-ajustar Y após initializeStats (caso h tenha mudado)
        this.y = this.groundY - this.h;
        
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
        
        // Física
        this.vy = 0;
        this.gravity = 0.5;
        this.dead = false;
        
        // PATCH: Hitbox ajustada para corpo real
        this.hitbox = {
            offsetX: 8,
            offsetY: 20,
            width: this.w - 16,
            height: Math.floor(this.h * 0.65)  // 65% da altura
        };
        
        // Variação visual
        this.variant = Math.floor(Math.random() * 3);
        this.spriteCache = null;  // Para otimização
        
        if (window.DEBUG_GAME) if(window.DEV) console.log(`✅ ${this.name || this.type} criado em X:${this.x}, Y:${this.y}, Ground:${this.groundY}`);
    }
    
    initializeStats(type) {
        const stats = {
            basic: {
                life: 50, maxLife: 50, speed: 2, damage: 8,
                color: '#c0392b', secondaryColor: '#a93226',
                name: 'Capanga', score: 100, w: 45, h: 65
            },
            strong: {
                life: 100, maxLife: 100, speed: 1.2, damage: 15,
                color: '#8e44ad', secondaryColor: '#6c3483',
                name: 'Brutamontes', score: 200, w: 60, h: 80
            },
            fast: {
                life: 35, maxLife: 35, speed: 5, damage: 10,
                color: '#f39c12', secondaryColor: '#d68910',
                name: 'Corredor', score: 150, w: 40, h: 60
            },
            tank: {
                life: 200, maxLife: 200, speed: 1.2, damage: 25,
                color: '#2c3e50', secondaryColor: '#1a252f',
                name: 'TANK', score: 300, w: 75, h: 95,
                armor: 0.5  // 50% redução de dano
            },
            berserker: {
                life: 80, maxLife: 80, speed: 3, damage: 20,
                color: '#e74c3c', secondaryColor: '#c0392b',
                name: 'Berserker', score: 250, w: 60, h: 80,
                rageThreshold: 0.3  // Entra em rage com 30% HP
            }
        };
        
        const config = stats[type] || stats.basic;
        Object.assign(this, config);
    }

    /**
     * NOVO: Método takeDamage unificado
     * Resolve o bug de armor não funcionar
     */
    takeDamage(damage, source = null) {
        if (this.life <= 0) return false;
        
        // Aplicar armor se tiver
        const actualDamage = this.armor 
            ? Math.floor(damage * (1 - this.armor))
            : damage;
        
        this.life = Math.max(0, this.life - actualDamage);
        this.hitFlash = 10;
        
        // Feedback visual de dano
        if (window.particles) {
            const color = this.armor ? '#aaa' : '#fff';
            window.particles.push({
                x: this.x + this.w/2,
                y: this.y,
                vx: (Math.random() - 0.5) * 4,
                vy: -3,
                life: 30,
                maxLife: 30,
                color: color,
                text: `-${actualDamage}`,
                size: 16
            });
        }
        
        // Som de dano
        if (window.soundSystem) {
            window.soundSystem.playSound('enemyHit');
        }
        
        // Verificar morte
        if (this.life <= 0) {
            this.dead = true;  // PATCH: Marcar como morto
            this.die();
            return true;
        }
        
        // Berserker entra em rage
        if (this.type === 'berserker' && !this.rageMode) {
            if (this.life / this.maxLife < this.rageThreshold) {
                this.enterRageMode();
            }
        }
        
        return false;
    }
    
    /**
     * NOVO: Modo rage para Berserker
     */
    enterRageMode() {
        this.rageMode = true;
        this.speed *= 1.5;
        this.damage *= 1.5;
        this.color = '#8B0000';  // Vermelho escuro
        
        if (window.particles) {
            for (let i = 0; i < 20; i++) {
                window.particles.push({
                    x: this.x + this.w/2,
                    y: this.y + this.h/2,
                    vx: (Math.random() - 0.5) * 8,
                    vy: (Math.random() - 0.5) * 8,
                    life: 30,
                    maxLife: 30,
                    color: '#ff0000',
                    size: 4
                });
            }
        }
    }
    
    /**
     * NOVO: Sistema de morte com drops
     */
    die() {
        this.deathAnim = 1;
        this.dead = true;  // PATCH: Marcar como morto
        
        // 30% chance de dropar power-up
        if (Math.random() < 0.3 && window.powerUps) {
            const dropTypes = ['health', 'score', 'speed'];
            const dropType = dropTypes[Math.floor(Math.random() * dropTypes.length)];
            
            window.powerUps.push({
                x: this.x + this.w/2 - 15,
                y: this.y + this.h/2 - 15,
                w: 30,
                h: 30,
                type: dropType,
                collected: false,
                bobOffset: 0,
                baseY: this.y + this.h/2 - 15,
                life: 300  // 5 segundos antes de sumir
            });
        }
    }
    
    /**
     * PATCH: Método para obter caixa de colisão real
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
     * NOVO: Método auxiliar para encontrar jogador mais próximo
     */
    getNearestPlayer(players) {
        if (!players || players.length === 0) return null;
        
        const alivePlayers = players.filter(p => p.life > 0);
        if (alivePlayers.length === 0) return null;
        
        let nearestPlayer = alivePlayers[0];
        let minDist = this.distanceTo(nearestPlayer);
        
        alivePlayers.forEach(player => {
            const dist = this.distanceTo(player);
            if (dist < minDist) {
                minDist = dist;
                nearestPlayer = player;
            }
        });
        
        return nearestPlayer;
    }

    /**
     * MELHORADO: Update com validação e colisão entre inimigos
     */
    update(players, otherEnemies = []) {
        // Validação de players
        if (!players || players.length === 0) return;
        
        // Se morto, apenas animar morte (deathAnim só incrementa aqui, não no draw)
        if (this.life <= 0) {
            if (this.deathAnim < 30) this.deathAnim++;
            return;
        }

        // Encontrar jogador vivo mais próximo
        const alivePlayers = players.filter(p => p.life > 0);
        if (alivePlayers.length === 0) return;
        
        let nearestPlayer = alivePlayers[0];
        let minDist = this.distanceTo(nearestPlayer);
        
        alivePlayers.forEach(player => {
            const dist = this.distanceTo(player);
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

        // Reduzir cooldowns
        if (this.attackCooldown > 0) this.attackCooldown--;
        if (this.attackTimer > 0) {
            this.attackTimer--;
            if (this.attackTimer === 0) this.attacking = false;
        }

        // IA baseada em distância
        this.aiTimer--;
        
        if (distance < 70 && this.attackCooldown === 0 && !this.attacking && this.__attackAllowed !== false) {
            // Atacar
            this.performAttack(nearestPlayer);
        } else if (distance < 400) {
            // Perseguir
            this.chase(nearestPlayer, dx);
        } else {
            // Patrulhar
            this.patrol();
        }
        
        // NOVO: Evitar sobreposição com outros inimigos
        this.avoidEnemies(otherEnemies);
        
        // ✅ SISTEMA DE GRAVIDADE PADRONIZADO
        if (this.y + this.h < this.groundY) {
            this.vy += this.gravity;
            this.y += this.vy;
        } else {
            this.y = this.groundY - this.h;
            this.vy = 0;
        }
        
        // Limitar aos bounds da tela
        this.x = Math.max(0, Math.min(this.x, 4800)); // Largura do nível
    }
    
    /**
     * NOVO: Cálculo de distância helper
     */
    distanceTo(target) {
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    /**
     * Sistema de ataque — dano é aplicado pelo main.js via checkHitPlayer
     */
    performAttack(player) {
        this.attacking = true;
        this.attackTimer = 20;
        this.attackCooldown = this.type === 'fast' ? 40 : 70;
        this.aiState = 'attacking';
        this.walkCycle = 0;
    }
    
    /**
     * MELHORADO: Lógica de perseguição
     */
    chase(player, dx) {
        this.aiState = 'chasing';
        
        // Movimentar em direção ao player
        if (Math.abs(dx) > 15) {
            const moveSpeed = this.type === 'fast' 
                ? this.speed * 1.2  // Fast é mais rápido perseguindo
                : this.speed;
            
            this.x += Math.sign(dx) * moveSpeed;
            this.walkCycle += this.type === 'fast' ? 0.4 : 0.2;
        }
    }
    
    /**
     * NOVO: Lógica de patrulha melhorada
     */
    patrol() {
        if (this.aiTimer <= 0) {
            this.aiState = Math.random() > 0.5 ? 'patrol_left' : 'patrol_right';
            this.aiTimer = 80 + Math.random() * 80;
        }
        
        const patrolSpeed = this.speed * 0.6;
        
        if (this.aiState === 'patrol_left') {
            this.x -= patrolSpeed;
            this.walkCycle += 0.15;
            this.facingRight = false;
        } else if (this.aiState === 'patrol_right') {
            this.x += patrolSpeed;
            this.walkCycle += 0.15;
            this.facingRight = true;
        }
    }
    
    /**
     * NOVO: Evitar sobreposição entre inimigos
     */
    /**
     * ✅ SISTEMA ANTI-OVERLAP PADRONIZADO E MELHORADO
     * Evita que inimigos se sobreponham usando detecção de overlap real das bordas
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
     * OTIMIZADO: Desenho com variantes visuais
     */
    draw(ctx) {
        if (this.life <= 0 && this.deathAnim >= 30) return;

        ctx.save();

        // Animação de morte (deathAnim é incrementado no update, não aqui)
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
            ctx.shadowColor = this.armor ? '#00ffff' : '#fff';
            this.hitFlash--;
        }

        // Desenhar corpo baseado no tipo
        this.drawBody(ctx);

        // Barra de vida e nome
        if (this.life > 0) {
            this.drawHealthBar(ctx);
            this.drawNameTag(ctx);
        }
        
        ctx.restore();
    }
    
    /**
     * NOVO: Desenho do corpo com variantes
     */
    drawBody(ctx) {
        // Variações de cor por variant
        const colorShifts = [
            { h: 0, s: 0, l: 0 },      // Normal
            { h: 20, s: -10, l: -5 },  // Mais escuro
            { h: -15, s: 10, l: 5 }    // Mais claro
        ];
        
        const shift = colorShifts[this.variant];
        
        // Corpo básico
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x + 8, this.y + 20, this.w - 16, this.h - 25);
        
        // Detalhe
        ctx.fillStyle = this.secondaryColor;
        ctx.fillRect(this.x + 12, this.y + 25, this.w - 24, this.h - 35);
        
        // Cabeça
        ctx.fillStyle = '#2c1810';
        ctx.beginPath();
        ctx.arc(this.x + this.w / 2, this.y + 12, 16, 0, Math.PI * 2);
        ctx.fill();
        
        // Olhos (vermelho para inimigos, amarelo para rage)
        ctx.fillStyle = this.rageMode ? '#ffff00' : '#ff0000';
        const eyeSize = this.rageMode ? 5 : 4;
        ctx.fillRect(this.x + this.w / 2 - 10, this.y + 8, eyeSize, eyeSize);
        ctx.fillRect(this.x + this.w / 2 + 6, this.y + 8, eyeSize, eyeSize);
        
        // Indicador de armor para Tank
        if (this.type === 'tank' && this.armor) {
            ctx.strokeStyle = '#00ffff';
            ctx.lineWidth = 3;
            ctx.strokeRect(this.x + 5, this.y + 15, this.w - 10, this.h - 20);
        }
        
        // Efeito de rage para Berserker
        if (this.rageMode) {
            const pulseSize = Math.sin(Date.now() / 100) * 3;
            ctx.strokeStyle = `rgba(255, 0, 0, ${0.5 + Math.sin(Date.now() / 100) * 0.3})`;
            ctx.lineWidth = 4;
            ctx.strokeRect(
                this.x + 4 - pulseSize, 
                this.y + 16 - pulseSize, 
                this.w - 8 + pulseSize * 2, 
                this.h - 22 + pulseSize * 2
            );
        }
    }

    drawHealthBar(ctx) {
        const barWidth = this.w;
        const barHeight = 6;
        const barX = this.x;
        const barY = this.y - 18;

        // Fundo
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeRect(barX, barY, barWidth, barHeight);
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        // Barra de vida
        const lifePercent = this.life / this.maxLife;
        
        // Cor baseada em % de vida
        let barColor;
        if (lifePercent > 0.6) barColor = '#2ecc71';
        else if (lifePercent > 0.3) barColor = '#f39c12';
        else barColor = '#e74c3c';
        
        ctx.fillStyle = barColor;
        ctx.fillRect(barX, barY, barWidth * lifePercent, barHeight);

        // Brilho
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(barX, barY, barWidth * lifePercent, barHeight / 2);
    }

    drawNameTag(ctx) {
        ctx.save();
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#000';
        
        // Cor do nome baseada no tipo
        const nameColors = {
            basic: '#fff',
            strong: '#e67e22',
            fast: '#3498db',
            tank: '#00ffff',
            berserker: this.rageMode ? '#ff0000' : '#fff'
        };
        
        ctx.fillStyle = nameColors[this.type] || '#fff';
        ctx.font = 'bold 11px Righteous, Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.name, this.x + this.w / 2, this.y - 28);
        ctx.restore();
    }
    
    /**
     * Verificar se inimigo está atingindo o jogador
     */
    checkHitPlayer(player) {
        if (!this.attacking || !player || player.life <= 0) {
            return false;
        }
        
        // Verificar colisão de bounding box
        const collision = this.x < player.x + player.w &&
                         this.x + this.w > player.x &&
                         this.y < player.y + player.h &&
                         this.y + this.h > player.y;
        
        return collision;
    }
    
    /**
     * Verificar se inimigo está morto
     */
    isDead() {
        return this.life <= 0 && this.deathAnim >= 30;
    }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.Enemy = Enemy;
}
