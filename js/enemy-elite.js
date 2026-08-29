/**
 * NOVOS INIMIGOS DE ELITE - Expansão para fases 6, 7 e 8
 * EliteEnemy: Inimigo blindado, bloqueia ataques
 * GhostEnemy: Fica invisível e teleporta
 * AssassinEnemy: Rápido, ataca por trás, foge quando ferido
 */

// ═══════════════════════════════════════
// INIMIGO ELITE: GUARDA BLINDADO
// ═══════════════════════════════════════
class EliteEnemy extends Enemy {
    constructor(x, y) {
        super(x, y, 'elite');
        this.w = 55;
        this.h = 72;
        this.groundY = y;
        this.y = y - this.h;

        this.name = 'Elite';
        this.life = 180;
        this.maxLife = 180;
        this.speed = 2.2;
        this.damage = 22;
        this.attackDamage = 22;
        this.score = 250;
        this.color = '#2c3e50';

        // Escudo/bloqueio
        this.isBlocking = false;
        this.blockCooldown = 0;
        this.blockDuration = 0;
        this.blockReady = true;
        this.blockTimer = 0;
        this.hitFlash = 0;
        this.deathAnim = 0;
        this.walkCycle = 0;
        this.attacking = false;
        this.attackTimer = 0;
        this.attackCooldown = 0;
        this.facingRight = false;
        this.aiState = 'idle';
        this.aiTimer = 0;

        this.hitbox = {
            offsetX: 8,
            offsetY: 15,
            width: this.w - 16,
            height: Math.floor(this.h * 0.75)
        };
    }

    takeDamage(amount) {
        // Se estiver bloqueando, absorve 85% do dano
        if (this.isBlocking) {
            amount = Math.ceil(amount * 0.15);
            if (window.particles) {
                window.particles.explosion(this.x + this.w / 2, this.y + this.h / 2, 8, { color: '#aaaaff', speed: 3 });
                window.particles.createText(this.x + this.w / 2, this.y - 15, 'BLOQUEADO!', '#aaaaff', { size: 16 });
            }
        }
        this.life -= amount;
        this.hitFlash = 8;
        if (this.life < 0) this.life = 0;
    }

    update(players, allEnemies) {
        if (this.life <= 0) {
            this.deathAnim++;
            return;
        }

        this.blockTimer++;

        // Ativa bloco a cada 3 segundos por 1 segundo
        if (this.blockTimer > 180) {
            this.isBlocking = true;
        }
        if (this.blockTimer > 240) {
            this.isBlocking = false;
            this.blockTimer = 0;
        }

        super.update(players, allEnemies);
    }

    draw(ctx) {
        if (this.life <= 0 && this.deathAnim >= 30) return;

        ctx.save();

        if (this.life <= 0) {
            ctx.globalAlpha = 1 - (this.deathAnim / 30);
            ctx.translate(this.x + this.w / 2, this.y + this.h);
            ctx.rotate(this.deathAnim * 0.1);
            ctx.translate(-(this.x + this.w / 2), -(this.y + this.h));
        }

        if (this.hitFlash > 0) {
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#fff';
            this.hitFlash--;
        }

        // Sombra
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(this.x + this.w / 2, this.y + this.h + 5, this.w / 2, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Pernas
        ctx.fillStyle = '#1a252f';
        ctx.fillRect(this.x + 10, this.y + this.h - 22, 14, 22);
        ctx.fillRect(this.x + 31, this.y + this.h - 22, 14, 22);

        // Corpo blindado
        const bodyColor = this.isBlocking ? '#4a90d9' : '#2c3e50';
        ctx.fillStyle = bodyColor;
        ctx.fillRect(this.x + 5, this.y + 20, this.w - 10, this.h - 42);

        // Placa peitoral
        ctx.fillStyle = this.isBlocking ? '#6bb5f0' : '#3d566e';
        ctx.fillRect(this.x + 10, this.y + 25, this.w - 20, 20);

        // Capacete
        ctx.fillStyle = this.isBlocking ? '#5a9fd4' : '#1a252f';
        ctx.beginPath();
        ctx.arc(this.x + this.w / 2, this.y + 15, 18, Math.PI, 0, false);
        ctx.fillRect(this.x + this.w / 2 - 18, this.y + 10, 36, 8);
        ctx.fill();

        // Viseira
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(this.x + 12, this.y + 10, this.w - 24, 8);

        // Escudo (se bloqueando)
        if (this.isBlocking) {
            ctx.fillStyle = '#4a90d9';
            ctx.strokeStyle = '#6bb5f0';
            ctx.lineWidth = 3;
            const shieldX = this.facingRight ? this.x + this.w : this.x - 18;
            ctx.fillRect(shieldX, this.y + 20, 18, 40);
            ctx.strokeRect(shieldX, this.y + 20, 18, 40);

            // Símbolo no escudo
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('🛡', shieldX + 9, this.y + 44);
        }

        // Barra de vida
        const barW = 50;
        const lifePercent = this.life / this.maxLife;
        ctx.fillStyle = '#333';
        ctx.fillRect(this.x, this.y - 10, barW, 6);
        ctx.fillStyle = lifePercent > 0.5 ? '#2ecc71' : lifePercent > 0.25 ? '#f39c12' : '#e74c3c';
        ctx.fillRect(this.x, this.y - 10, barW * lifePercent, 6);

        // Nome
        ctx.fillStyle = this.isBlocking ? '#4a90d9' : '#aaa';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.isBlocking ? '🛡 ELITE' : 'ELITE', this.x + this.w / 2, this.y - 15);

        ctx.restore();
    }

    getCollisionBox() {
        return {
            x: this.x + this.hitbox.offsetX,
            y: this.y + this.hitbox.offsetY,
            w: this.hitbox.width,
            h: this.hitbox.height
        };
    }

    isDead() {
        return this.life <= 0 && this.deathAnim >= 30;
    }
}

// ═══════════════════════════════════════
// INIMIGO FANTASMA: ESQUIVA INVISÍVEL
// ═══════════════════════════════════════
class GhostEnemy extends Enemy {
    constructor(x, y) {
        super(x, y, 'ghost');
        this.w = 40;
        this.h = 60;
        this.groundY = y;
        this.y = y - this.h;

        this.name = 'Fantasma';
        this.life = 90;
        this.maxLife = 90;
        this.speed = 3.5;
        this.damage = 18;
        this.attackDamage = 18;
        this.score = 200;
        this.color = '#9b59b6';

        // Invisibilidade
        this.isInvisible = false;
        this.invisibleTimer = 0;
        this.invisibleCooldown = 0;
        this.phaseTimer = 0;
        this.alpha = 1;

        this.hitFlash = 0;
        this.deathAnim = 0;
        this.walkCycle = 0;
        this.attacking = false;
        this.attackTimer = 0;
        this.attackCooldown = 0;
        this.facingRight = false;
        this.aiState = 'idle';
        this.aiTimer = 0;

        this.hitbox = {
            offsetX: 5,
            offsetY: 10,
            width: this.w - 10,
            height: Math.floor(this.h * 0.8)
        };
    }

    takeDamage(amount) {
        // Se invisível, 50% chance de esquivar completamente
        if (this.isInvisible && Math.random() < 0.5) {
            if (window.particles) {
                window.particles.createText(this.x + this.w / 2, this.y - 15, 'ESQUIVOU!', '#9b59b6', { size: 16 });
            }
            return;
        }
        // Ao ser atingido, sai do modo invisível
        this.isInvisible = false;
        this.alpha = 1;
        this.invisibleTimer = 0;
        this.life -= amount;
        this.hitFlash = 8;
        if (this.life < 0) this.life = 0;
    }

    update(players, allEnemies) {
        if (this.life <= 0) {
            this.deathAnim++;
            return;
        }

        this.phaseTimer++;

        // Ciclo: visível por 4s, invisível por 2.5s
        if (!this.isInvisible && this.phaseTimer > 240) {
            this.isInvisible = true;
            this.phaseTimer = 0;
        } else if (this.isInvisible && this.phaseTimer > 150) {
            this.isInvisible = false;
            this.phaseTimer = 0;
        }

        // Transição suave de alpha
        const targetAlpha = this.isInvisible ? 0.15 : 1;
        this.alpha += (targetAlpha - this.alpha) * 0.08;

        super.update(players, allEnemies);
    }

    draw(ctx) {
        if (this.life <= 0 && this.deathAnim >= 30) return;

        ctx.save();
        ctx.globalAlpha = this.alpha;

        if (this.life <= 0) {
            ctx.globalAlpha = (1 - (this.deathAnim / 30)) * this.alpha;
        }

        if (this.hitFlash > 0) {
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#9b59b6';
            this.hitFlash--;
        }

        // Efeito fantasmal
        ctx.shadowBlur = 30;
        ctx.shadowColor = 'rgba(155, 89, 182, 0.8)';

        // Corpo flutuante
        const floatY = Math.sin(Date.now() * 0.003) * 5;

        // Corpo semicircular
        ctx.fillStyle = `rgba(155, 89, 182, 0.85)`;
        ctx.beginPath();
        ctx.arc(this.x + this.w / 2, this.y + 25 + floatY, 20, Math.PI, 0, false);
        ctx.lineTo(this.x + this.w, this.y + 55 + floatY);
        // Borda ondulada
        for (let i = this.x + this.w; i >= this.x; i -= 8) {
            ctx.lineTo(i, this.y + 55 + floatY + Math.sin(i * 0.3 + Date.now() * 0.005) * 5);
        }
        ctx.closePath();
        ctx.fill();

        // Olhos brilhantes
        ctx.fillStyle = this.isInvisible ? 'rgba(255,0,255,0.3)' : '#ff00ff';
        ctx.shadowColor = '#ff00ff';
        ctx.beginPath();
        ctx.arc(this.x + 12, this.y + 18 + floatY, 5, 0, Math.PI * 2);
        ctx.arc(this.x + this.w - 12, this.y + 18 + floatY, 5, 0, Math.PI * 2);
        ctx.fill();

        // Partículas de neblina ao redor
        if (!this.isInvisible) {
            ctx.fillStyle = 'rgba(155, 89, 182, 0.3)';
            for (let i = 0; i < 5; i++) {
                const angle = (Date.now() * 0.002 + i * 1.25);
                const r = 28 + Math.sin(Date.now() * 0.003 + i) * 5;
                ctx.beginPath();
                ctx.arc(
                    this.x + this.w / 2 + Math.cos(angle) * r,
                    this.y + 35 + floatY + Math.sin(angle) * r * 0.4,
                    4, 0, Math.PI * 2
                );
                ctx.fill();
            }
        }

        ctx.restore();

        // Barra de vida só aparece quando visível
        if (!this.isInvisible) {
            ctx.save();
            ctx.globalAlpha = 0.8;
            const barW = 40;
            const lifePercent = this.life / this.maxLife;
            ctx.fillStyle = '#333';
            ctx.fillRect(this.x, this.y - 12, barW, 5);
            ctx.fillStyle = '#9b59b6';
            ctx.fillRect(this.x, this.y - 12, barW * lifePercent, 5);
            ctx.restore();
        }
    }

    getCollisionBox() {
        return {
            x: this.x + this.hitbox.offsetX,
            y: this.y + this.hitbox.offsetY,
            w: this.hitbox.width,
            h: this.hitbox.height
        };
    }

    isDead() {
        return this.life <= 0 && this.deathAnim >= 30;
    }
}

// ═══════════════════════════════════════
// INIMIGO ASSASSINO: FURTIVO E LETAL
// ═══════════════════════════════════════
class AssassinEnemy extends Enemy {
    constructor(x, y) {
        super(x, y, 'assassin');
        this.w = 38;
        this.h = 65;
        this.groundY = y;
        this.y = y - this.h;

        this.name = 'Assassino';
        this.life = 70;
        this.maxLife = 70;
        this.speed = 4.5;
        this.damage = 30; // Alto dano, baixa vida
        this.attackDamage = 30;
        this.score = 300;
        this.color = '#1a1a1a';

        // IA especial
        this.circling = true;
        this.circleAngle = Math.random() * Math.PI * 2;
        this.fleeing = false;
        this.fleeTimer = 0;
        this.chargeMode = false;
        this.chargeTimer = 0;

        this.hitFlash = 0;
        this.deathAnim = 0;
        this.walkCycle = 0;
        this.attacking = false;
        this.attackTimer = 0;
        this.attackCooldown = 0;
        this.facingRight = false;
        this.aiState = 'circle';
        this.aiTimer = 0;

        this.hitbox = {
            offsetX: 5,
            offsetY: 10,
            width: this.w - 10,
            height: Math.floor(this.h * 0.78)
        };
    }

    update(players, allEnemies) {
        if (this.life <= 0) {
            this.deathAnim++;
            return;
        }

        const target = players && players.find(p => p.life > 0);
        if (!target) {
            super.update(players, allEnemies);
            return;
        }

        const dx = target.x + target.w / 2 - (this.x + this.w / 2);
        const dy = target.y + target.h / 2 - (this.y + this.h / 2);
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Se HP < 30%, foge
        if (this.life / this.maxLife < 0.3) {
            this.fleeing = true;
        }

        if (this.fleeing) {
            this.fleeTimer++;
            // Foge pelo lado oposto ao jogador
            this.x -= (dx / dist) * this.speed * 1.5;
            this.facingRight = dx < 0;
            if (this.fleeTimer > 60) {
                this.fleeing = false;
                this.fleeTimer = 0;
                // Após fugir, carrega um ataque
                this.chargeMode = true;
                this.chargeTimer = 0;
            }
        } else if (this.chargeMode) {
            this.chargeTimer++;
            // Fica parado preparando o ataque
            if (this.chargeTimer > 90) {
                // Ataque rápido em linha reta
                const speed = 12;
                this.x += (dx / dist) * speed;
                if (Math.abs(dx) < 50) {
                    this.chargeMode = false;
                    this.chargeTimer = 0;
                }
            }
        } else {
            // Circula ao redor do alvo
            this.circleAngle += 0.025;
            const circleR = 120 + Math.sin(this.circleAngle * 0.5) * 40;
            const targetX = target.x + target.w / 2 + Math.cos(this.circleAngle) * circleR - this.w / 2;
            const targetY = this.groundY - this.h;

            const movDx = targetX - this.x;
            this.x += movDx * 0.06;
            this.facingRight = target.x > this.x;

            // A cada 3s, faz uma investida
            this.aiTimer++;
            if (this.aiTimer > 180 && dist < 200) {
                this.aiTimer = 0;
                this.fleeing = true; // Ataque-fuga
            }
        }

        // Manter no chão
        if (this.y !== this.groundY - this.h) {
            this.y = this.groundY - this.h;
        }

        // Atacar quando perto
        if (dist < 55 && !this.fleeing) {
            this.attacking = true;
            this.attackTimer = 10;
        }

        if (this.attackTimer > 0) this.attackTimer--;
        else this.attacking = false;

        if (this.hitFlash > 0) this.hitFlash--;
        this.walkCycle += this.speed * 0.15;
    }

    draw(ctx) {
        if (this.life <= 0 && this.deathAnim >= 30) return;

        ctx.save();

        if (this.life <= 0) {
            ctx.globalAlpha = 1 - (this.deathAnim / 30);
            ctx.translate(this.x + this.w / 2, this.y + this.h);
            ctx.rotate(this.deathAnim * 0.12);
            ctx.translate(-(this.x + this.w / 2), -(this.y + this.h));
        }

        if (this.hitFlash > 0) {
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#ff00ff';
        }

        // Indicador de carga
        if (this.chargeMode && this.chargeTimer < 90) {
            const chargePercent = this.chargeTimer / 90;
            ctx.strokeStyle = `rgba(255, 0, 100, ${chargePercent})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.x + this.w / 2, this.y + this.h / 2, 30 * chargePercent, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Sombra
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(this.x + this.w / 2, this.y + this.h + 5, this.w / 2, 7, 0, 0, Math.PI * 2);
        ctx.fill();

        // Pernas
        ctx.fillStyle = '#111';
        const legOff = Math.sin(this.walkCycle) * 5;
        ctx.fillRect(this.x + 5, this.y + this.h - 22, 12, 22 + legOff);
        ctx.fillRect(this.x + 21, this.y + this.h - 22, 12, 22 - legOff);

        // Corpo (capa preta)
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(this.x + 3, this.y + 20, this.w - 6, this.h - 42);

        // Detalhes vermelhos
        ctx.fillStyle = '#c0392b';
        ctx.fillRect(this.x + 3, this.y + 28, 4, this.h - 50);
        ctx.fillRect(this.x + this.w - 7, this.y + 28, 4, this.h - 50);

        // Cabeça com capuz
        ctx.fillStyle = '#111';
        ctx.beginPath();
        ctx.arc(this.x + this.w / 2, this.y + 14, 14, 0, Math.PI * 2);
        ctx.fill();

        // Capuz sombra
        ctx.fillStyle = '#0a0a0a';
        ctx.beginPath();
        ctx.arc(this.x + this.w / 2, this.y + 12, 12, Math.PI, 0, false);
        ctx.fill();

        // Olhos vermelhos
        ctx.fillStyle = this.chargeMode ? '#ff0000' : '#cc0000';
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = this.chargeMode ? 20 : 10;
        ctx.beginPath();
        ctx.arc(this.x + 9, this.y + 14, 3, 0, Math.PI * 2);
        ctx.arc(this.x + this.w - 9, this.y + 14, 3, 0, Math.PI * 2);
        ctx.fill();

        // Faca (se atacando ou carregando)
        if (this.attacking || this.chargeMode) {
            const knifeX = this.facingRight ? this.x + this.w + 5 : this.x - 15;
            ctx.fillStyle = '#ccc';
            ctx.fillRect(knifeX, this.y + 28, 10, 3);
            ctx.fillStyle = '#888';
            ctx.fillRect(knifeX + (this.facingRight ? 8 : -3), this.y + 26, 3, 7);
        }

        // Barra de vida
        const barW = 38;
        const lifePercent = this.life / this.maxLife;
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#222';
        ctx.fillRect(this.x, this.y - 10, barW, 5);
        ctx.fillStyle = lifePercent > 0.5 ? '#e74c3c' : '#ff0000';
        ctx.fillRect(this.x, this.y - 10, barW * lifePercent, 5);

        // Nome
        ctx.fillStyle = '#cc0000';
        ctx.font = 'bold 9px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('ASSASSINO', this.x + this.w / 2, this.y - 14);

        ctx.restore();
    }

    getCollisionBox() {
        return {
            x: this.x + this.hitbox.offsetX,
            y: this.y + this.hitbox.offsetY,
            w: this.hitbox.width,
            h: this.hitbox.height
        };
    }

    checkHitPlayer(player) {
        if (!this.attacking || player.life <= 0 || player.invulnerable > 0) return false;
        const hitbox = this.getCollisionBox();
        const playerBox = {
            x: player.x, y: player.y,
            w: player.w, h: player.h
        };
        const hit = hitbox.x < playerBox.x + playerBox.w &&
                    hitbox.x + hitbox.w > playerBox.x &&
                    hitbox.y < playerBox.y + playerBox.h &&
                    hitbox.y + hitbox.h > playerBox.y;
        return hit && this.attackTimer === 9;
    }

    isDead() {
        return this.life <= 0 && this.deathAnim >= 30;
    }
}

if(window.DEV) console.log('✅ Inimigos Elite, Fantasma e Assassino carregados!');
