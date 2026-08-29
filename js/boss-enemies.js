/**
 * BOSS-ENEMIES.JS - Bosses do jogo
 * Boss fase 3: BossEnemy (O Coronel)
 * Boss fase 5: FinalBoss (Rei de Vegas)
 *
 * CORREÇÃO CRÍTICA: w/h são definidos ANTES e groundY é usado para reposicionar Y
 */

class BossEnemy extends Enemy {
    constructor(x, y, level = 1) {
        super(x, y, 'boss');

        // FLAG OBRIGATÓRIA - identifica como boss para o sistema de fase
        this.isBoss = true;

        // Sobrescrever dimensões (base Enemy usa h=65)
        this.w = 120;
        this.h = 150;

        // Reposicionar Y corretamente após mudar h
        // groundY é salvo pelo construtor base: this.groundY = y
        this.y = this.groundY - this.h;

        // Stats
        this.life = 500 * level;
        this.maxLife = 500 * level;
        this.speed = 2.5;
        this.damage = 40 + (level * 10);
        this.attackDamage = this.damage;
        this.color = '#8e44ad';
        this.score = 1000 * level;
        this.level = level;
        this.name = 'O CORONEL';

        // Habilidades especiais
        this.canTeleport = true;
        this.lastTeleport = 0;
        this.teleportCooldown = 5000;

        this.canSummon = true;
        this.lastSummon = 0;
        this.summonCooldown = 12000;
        this.minionsAlive = 0;
        this.maxMinions = 3;

        this.specialAttackCharge = 0;
        this.specialAttackReady = false;

        // Fases do boss
        this.phase = 1;

        // Hitbox ajustada
        this.hitbox = {
            offsetX: 10,
            offsetY: 20,
            width: this.w - 20,
            height: Math.floor(this.h * 0.7)
        };

        if(window.DEV) console.log('👹 BossEnemy criado - X:' + this.x + ' Y:' + this.y + ' ground:' + this.groundY + ' H:' + this.h);
    }

    update(players, allEnemies) {
        const now = Date.now();

        const hpPercent = this.life / this.maxLife;
        if (hpPercent <= 0.66 && this.phase === 1) this.enterPhase2();
        else if (hpPercent <= 0.33 && this.phase === 2) this.enterPhase3();

        if (this.canTeleport && now - this.lastTeleport >= this.teleportCooldown) {
            if (Math.random() < 0.3) {
                this.teleport(players);
                this.lastTeleport = now;
            }
        }

        if (this.canSummon && now - this.lastSummon >= this.summonCooldown) {
            this.updateMinionCount(); // Sincronizar contagem real
            if (this.minionsAlive < this.maxMinions) {
                this.summonMinions();
                this.lastSummon = now;
            }
        }

        this.specialAttackCharge++;
        if (this.specialAttackCharge >= 300 && players && players.length > 0) {
            this.performSpecialAttack(players);
        }

        super.update(players, allEnemies);
    }

    enterPhase2() {
        this.phase = 2;
        this.speed *= 1.3;
        this.damage *= 1.2;
        this.attackDamage = this.damage;
        this.color = '#9b59b6';
        if (window.particles) {
            window.particles.explosion(this.x + this.w/2, this.y + this.h/2, 40, { color: '#9b59b6', speed: 7 });
            window.particles.createText(this.x + this.w/2, this.y - 30, 'FASE 2!', '#9b59b6', { size: 36 });
        }
        if (window.screenShake !== undefined) window.screenShake = 8;
    }

    enterPhase3() {
        this.phase = 3;
        this.speed *= 1.5;
        this.damage *= 1.5;
        this.attackDamage = this.damage;
        this.color = '#6c3483';
        this.teleportCooldown = 3000;
        if (window.particles) {
            window.particles.explosion(this.x + this.w/2, this.y + this.h/2, 60, { color: '#6c3483', speed: 9 });
            window.particles.createText(this.x + this.w/2, this.y - 30, 'FASE FINAL!', '#ff0000', { size: 42 });
        }
        if (window.screenShake !== undefined) window.screenShake = 12;
    }

    teleport(players) {
        if (!players) return;
        const alivePlayers = players.filter(p => p.life > 0);
        if (alivePlayers.length === 0) return;
        if (window.particles) window.particles.explosion(this.x + this.w/2, this.y + this.h/2, 20, { color: '#9b59b6', speed: 6, type: 'spark' });
        const target = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
        const side = Math.random() < 0.5 ? -1 : 1;
        this.x = target.x + (side * 220);
        this.y = this.groundY - this.h;
        if (window.particles) window.particles.explosion(this.x + this.w/2, this.y + this.h/2, 20, { color: '#e74c3c', speed: 6, type: 'spark' });
        if (window.soundSystem) window.soundSystem.playSound('dash');
    }

    summonMinions() {
        if (!window.enemies) return;
        const m1 = new Enemy(this.x - 120, this.groundY, 'basic');
        const m2 = new Enemy(this.x + this.w + 80, this.groundY, 'fast');
        m1.isBossMinion = true;
        m2.isBossMinion = true;
        window.enemies.push(m1, m2);
        this.minionsAlive += 2;
        if (window.particles) {
            window.particles.explosion(m1.x + m1.w/2, m1.y + m1.h/2, 15, { color: '#9b59b6' });
            window.particles.explosion(m2.x + m2.w/2, m2.y + m2.h/2, 15, { color: '#9b59b6' });
        }
    }
    
    updateMinionCount() {
        // Reconta minions vivos reais para manter minionsAlive correto
        if (!window.enemies) return;
        this.minionsAlive = window.enemies.filter(e => e.isBossMinion && e.life > 0).length;
    }

    performSpecialAttack(players) {
        this.specialAttackReady = false;
        this.specialAttackCharge = 0;
        if (window.particles) {
            window.particles.explosion(this.x + this.w/2, this.y + this.h/2, 50, { color: '#e74c3c', speed: 10 });
            for (let i = 0; i < 8; i++) {
                const angle = (Math.PI * 2 * i) / 8;
                window.particles.jet(this.x + this.w/2, this.y + this.h/2, angle, 15, { color: '#ff0000', speed: 8, type: 'spark' });
            }
        }
        players.forEach(player => {
            const dist = Math.hypot(
                (player.x + player.w/2) - (this.x + this.w/2),
                (player.y + player.h/2) - (this.y + this.h/2)
            );
            if (dist < 300 && player.life > 0) {
                player.takeDamage(this.damage * 2);
            }
        });
        if (window.soundSystem) window.soundSystem.playSound('hit');
        if (window.screenShake !== undefined) window.screenShake = 10;
    }

    draw(ctx) {
        if (this.life <= 0 && this.deathAnim >= 30) return;

        ctx.save();

        if (this.life <= 0) {
            ctx.globalAlpha = 1 - (this.deathAnim / 30);
            ctx.translate(this.x + this.w/2, this.y + this.h);
            ctx.rotate(this.deathAnim * 0.1);
            ctx.translate(-(this.x + this.w/2), -(this.y + this.h));
        }

        // Aura de boss
        const auraAlpha = 0.2 + Math.abs(Math.sin(Date.now() * 0.003)) * 0.15;
        ctx.globalAlpha = auraAlpha;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.ellipse(this.x + this.w/2, this.y + this.h * 0.6, this.w * 0.9, this.h * 0.65, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        if (this.hitFlash > 0) {
            ctx.shadowBlur = 25;
            ctx.shadowColor = '#fff';
            this.hitFlash--;
        }

        // Sombra chão
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(this.x + this.w/2, this.groundY + 5, this.w/2, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Pernas
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(this.x + 18, this.y + this.h - 55, 32, 55);
        ctx.fillRect(this.x + this.w - 50, this.y + this.h - 55, 32, 55);

        // Corpo
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y + 45, this.w, this.h - 90);

        // Peitoral
        ctx.fillStyle = this.phase === 3 ? '#7d0000' : '#7d3c98';
        ctx.fillRect(this.x + 18, this.y + 50, this.w - 36, 40);

        // Cabeça
        ctx.fillStyle = '#7d3c98';
        ctx.fillRect(this.x + 18, this.y + 2, 84, 50);

        // Chifres
        ctx.fillStyle = '#1a1a2e';
        // Chifre esquerdo
        ctx.beginPath();
        ctx.moveTo(this.x + 20, this.y + 8);
        ctx.lineTo(this.x + 5, this.y - 38);
        ctx.lineTo(this.x + 30, this.y + 18);
        ctx.closePath();
        ctx.fill();
        // Chifre direito
        ctx.beginPath();
        ctx.moveTo(this.x + 100, this.y + 8);
        ctx.lineTo(this.x + 115, this.y - 38);
        ctx.lineTo(this.x + 90, this.y + 18);
        ctx.closePath();
        ctx.fill();

        // Olhos
        const eyeColor = this.phase === 3 ? '#ff0000' : '#ffff00';
        ctx.fillStyle = eyeColor;
        ctx.shadowBlur = 15;
        ctx.shadowColor = eyeColor;
        ctx.fillRect(this.x + 32, this.y + 14, 20, 18);
        ctx.fillRect(this.x + 68, this.y + 14, 20, 18);

        // Pupilas
        ctx.fillStyle = '#000';
        ctx.shadowBlur = 0;
        ctx.fillRect(this.x + 38, this.y + 18, 9, 11);
        ctx.fillRect(this.x + 74, this.y + 18, 9, 11);

        // Boca
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(this.x + 36, this.y + 36, 48, 12);
        ctx.fillStyle = '#fff';
        for (let i = 0; i < 5; i++) ctx.fillRect(this.x + 38 + i*10, this.y + 36, 7, 8);

        // Braços
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - 30, this.y + 50, 33, 70);
        ctx.fillRect(this.x + this.w - 3, this.y + 50, 33, 70);

        // Punhos
        ctx.fillStyle = '#1a1a2e';
        ctx.shadowBlur = 8;
        ctx.shadowColor = eyeColor;
        ctx.beginPath();
        ctx.arc(this.x - 13, this.y + 118, 24, 0, Math.PI * 2);
        ctx.arc(this.x + this.w + 13, this.y + 118, 24, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Indicador de fase
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 13px Arial';
        ctx.textAlign = 'center';
        ctx.shadowBlur = 5;
        ctx.shadowColor = '#000';
        ctx.fillText('★ FASE ' + this.phase + ' ★', this.x + this.w/2, this.y - 42);
        ctx.shadowBlur = 0;

        // Barra de carga do ataque especial
        if (this.specialAttackCharge > 0) {
            const cp = Math.min(this.specialAttackCharge / 300, 1);
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 2;
            ctx.strokeRect(this.x, this.y - 30, this.w, 7);
            ctx.fillStyle = cp >= 1 ? '#ff0000' : '#ff8800';
            ctx.fillRect(this.x, this.y - 30, this.w * cp, 7);
            if (cp >= 1) {
                ctx.globalAlpha = 0.3 + Math.abs(Math.sin(Date.now() * 0.01)) * 0.25;
                ctx.fillStyle = '#ff0000';
                ctx.fillRect(this.x - 5, this.y - 5, this.w + 10, this.h + 5);
                ctx.globalAlpha = 1;
            }
        }

        ctx.restore();

        // Barra de vida acima do boss
        this._drawBossHP(ctx);
    }

    _drawBossHP(ctx) {
        const bw = this.w + 60;
        const bh = 16;
        const bx = this.x + this.w/2 - bw/2;
        const by = this.y - 68;
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.fillRect(bx - 3, by - 20, bw + 6, bh + 24);
        ctx.fillStyle = '#ffd700';
        ctx.shadowBlur = 6;
        ctx.shadowColor = '#ff8800';
        ctx.font = 'bold 13px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('★ ' + (this.name || 'BOSS') + ' ★', bx + bw/2, by - 3);
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#330000';
        ctx.fillRect(bx, by, bw, bh);
        const lp = Math.max(0, this.life / this.maxLife);
        const g = ctx.createLinearGradient(bx, by, bx + bw, by);
        g.addColorStop(0, '#c0392b');
        g.addColorStop(0.5, '#e74c3c');
        g.addColorStop(1, '#ff6b6b');
        ctx.fillStyle = g;
        ctx.fillRect(bx, by, bw * lp, bh);
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 2;
        ctx.strokeRect(bx, by, bw, bh);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(Math.max(0, Math.floor(this.life)) + ' / ' + this.maxLife, bx + bw/2, by + 12);
        ctx.restore();
    }

    checkHitPlayer(player) {
        if (!this.attacking || !player || player.life <= 0) return false;
        return this.x < player.x + player.w &&
               this.x + this.w > player.x &&
               this.y < player.y + player.h &&
               this.y + this.h > player.y;
    }
}


class FinalBoss extends BossEnemy {
    constructor(x, y) {
        super(x, y, 5);

        // Sobrescrever com stats do final boss
        this.isBoss = true;
        this.w = 160;
        this.h = 200;

        // Reposicionar com novo h
        this.y = this.groundY - this.h;

        this.life = 2500;
        this.maxLife = 2500;
        this.speed = 2.8;
        this.damage = 70;
        this.attackDamage = 70;
        this.color = '#0a0020';
        this.score = 8000;
        this.name = 'REI DE VEGAS';

        // Hitbox
        this.hitbox = {
            offsetX: 12,
            offsetY: 25,
            width: this.w - 24,
            height: Math.floor(this.h * 0.7)
        };

        // Habilidades exclusivas
        this.laserCooldown = 7000;
        this.lastLaser = Date.now() + 4000;
        this.meteorCooldown = 10000;
        this.lastMeteor = Date.now() + 7000;

        this.crownAnim = 0;

        if(window.DEV) console.log('👑 FinalBoss (REI DE VEGAS) criado - X:' + this.x + ' Y:' + this.y + ' H:' + this.h);
    }

    update(players, allEnemies) {
        super.update(players, allEnemies);
        this.crownAnim += 0.04;

        if (!players || players.length === 0 || this.life <= 0) return;
        const now = Date.now();

        if (now - this.lastLaser >= this.laserCooldown) {
            this.laserAttack(players);
            this.lastLaser = now;
        }
        if (now - this.lastMeteor >= this.meteorCooldown) {
            this.meteorShower();
            this.lastMeteor = now;
        }
    }

    laserAttack(players) {
        const laserY = this.y + this.h * 0.45;
        const dir = this.facingRight ? 1 : -1;

        for (let i = 0; i < 4; i++) {
            (window.GameRuntime?.schedule || ((owner,ms,fn)=>setTimeout(fn,ms)))('boss', i * 120, () => {
                if (window.gameState && window.gameState !== 'playing') return;
                if (this.life <= 0 || !window.particles) return;
                window.particles.jet(
                    this.x + (dir > 0 ? this.w : 0), laserY,
                    dir > 0 ? 0 : Math.PI, 18,
                    { color: '#ff0000', speed: 12, type: 'spark' }
                );
            });
        }

        (window.GameRuntime?.schedule || ((owner,ms,fn)=>setTimeout(fn,ms)))('boss', 480, () => {
            if (window.gameState && window.gameState !== 'playing') return;
            if (this.life <= 0 || !window.particles) return;
            for (let i = -1; i <= 1; i++) {
                window.particles.jet(
                    this.x + (dir > 0 ? this.w : 0), laserY + i * 10,
                    dir > 0 ? 0 : Math.PI, 55,
                    { color: '#ffff00', speed: 32, type: 'spark', size: 5 }
                );
            }
            if (window.players) {
                window.players.forEach(p => {
                    const sameSide = dir > 0 ? p.x > this.x : p.x < this.x;
                    if (sameSide && Math.abs(p.y + p.h/2 - laserY) < 38 && p.life > 0) {
                        p.takeDamage(80);
                    }
                });
            }
            if (window.screenShake !== undefined) window.screenShake = 8;
        });
    }

    meteorShower() {
        const baseX = (window.cameraX || 0) + 80;

        for (let i = 0; i < 6; i++) {
            (window.GameRuntime?.schedule || ((owner,ms,fn)=>setTimeout(fn,ms)))('boss', i * 320, () => {
                if (window.gameState && window.gameState !== 'playing') return;
                if (this.life <= 0) return;
                const mx = baseX + Math.random() * 840;
                if (window.particles) {
                    window.particles.createText(mx, 70, '☄️', '#ff8800', { size: 26, maxLife: 85 });
                    (window.GameRuntime?.schedule || ((owner,ms,fn)=>setTimeout(fn,ms)))('boss', 880, () => {
                        if (window.gameState && window.gameState !== 'playing') return;
                        if (this.life <= 0 || !window.particles) return;
                        window.particles.explosion(mx, 490, 28, { color: '#ff8800', speed: 10 });
                        window.particles.explosion(mx, 490, 14, { color: '#ffff00', speed: 6 });
                        if (window.players) {
                            window.players.forEach(p => {
                                if (Math.abs(p.x + p.w/2 - mx) < 95 && p.life > 0) p.takeDamage(55);
                            });
                        }
                        if (window.screenShake !== undefined) window.screenShake = 6;
                    });
                }
            });
        }
    }

    draw(ctx) {
        if (this.life <= 0 && this.deathAnim >= 30) return;

        ctx.save();

        if (this.life <= 0) {
            ctx.globalAlpha = 1 - (this.deathAnim / 30);
            ctx.translate(this.x + this.w/2, this.y + this.h);
            ctx.rotate(this.deathAnim * 0.1);
            ctx.translate(-(this.x + this.w/2), -(this.y + this.h));
        }

        // Aura sombria
        const as = 120 + Math.sin(Date.now() * 0.003) * 18;
        const ag = ctx.createRadialGradient(
            this.x + this.w/2, this.y + this.h * 0.5, 10,
            this.x + this.w/2, this.y + this.h * 0.5, as
        );
        ag.addColorStop(0, 'rgba(60, 0, 120, 0.5)');
        ag.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = ag;
        ctx.beginPath();
        ctx.arc(this.x + this.w/2, this.y + this.h * 0.5, as, 0, Math.PI * 2);
        ctx.fill();

        if (this.hitFlash > 0) {
            ctx.shadowBlur = 30;
            ctx.shadowColor = '#fff';
            this.hitFlash--;
        }

        // Sombra chão
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath();
        ctx.ellipse(this.x + this.w/2, this.groundY + 6, this.w * 0.55, 13, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Manto/capa
        ctx.fillStyle = '#1a0040';
        ctx.beginPath();
        ctx.moveTo(this.x + 15, this.y + 70);
        ctx.lineTo(this.x - 22, this.groundY);
        ctx.lineTo(this.x + this.w + 22, this.groundY);
        ctx.lineTo(this.x + this.w - 15, this.y + 70);
        ctx.closePath();
        ctx.fill();

        // Borda dourada no manto
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.x + 15, this.y + 80);
        ctx.lineTo(this.x - 5, this.groundY);
        ctx.moveTo(this.x + this.w - 15, this.y + 80);
        ctx.lineTo(this.x + this.w + 5, this.groundY);
        ctx.stroke();

        // Corpo
        ctx.fillStyle = '#1a0033';
        ctx.fillRect(this.x + 18, this.y + 60, this.w - 36, this.h - 110);

        // Peitoral dourado
        ctx.fillStyle = '#ffd700';
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#ffd700';
        ctx.beginPath();
        ctx.arc(this.x + this.w/2, this.y + 95, 32, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Símbolo no peito
        ctx.fillStyle = '#ff0000';
        ctx.font = 'bold 22px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('♠', this.x + this.w/2, this.y + 103);

        // Cabeça
        ctx.fillStyle = '#2d0055';
        ctx.beginPath();
        ctx.arc(this.x + this.w/2, this.y + 38, 45, 0, Math.PI * 2);
        ctx.fill();

        // Olhos vermelhos
        const ef = Math.sin(Date.now() * 0.008);
        ctx.fillStyle = 'rgb(255,' + Math.floor(40 + ef * 25) + ',0)';
        ctx.shadowBlur = 22;
        ctx.shadowColor = '#ff0000';
        ctx.beginPath();
        ctx.ellipse(this.x + this.w/2 - 17, this.y + 30, 13, 10, 0, 0, Math.PI * 2);
        ctx.ellipse(this.x + this.w/2 + 17, this.y + 30, 13, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Sorriso
        ctx.strokeStyle = '#ff6600';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(this.x + this.w/2, this.y + 45, 20, 0.15, Math.PI - 0.15);
        ctx.stroke();

        // Braços
        ctx.fillStyle = '#1a0033';
        ctx.fillRect(this.x - 28, this.y + 65, 32, 80);
        ctx.fillRect(this.x + this.w - 4, this.y + 65, 32, 80);

        // Luvas douradas
        ctx.fillStyle = '#ffd700';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ffd700';
        ctx.beginPath();
        ctx.arc(this.x - 12, this.y + 143, 26, 0, Math.PI * 2);
        ctx.arc(this.x + this.w + 12, this.y + 143, 26, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Dados/cartas nas mãos
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('🎲', this.x - 12, this.y + 151);
        ctx.fillText('🃏', this.x + this.w + 12, this.y + 151);

        ctx.restore();

        // Coroa
        this._drawCrown(ctx);

        // Barra de vida (override do pai)
        this._drawFinalBossHP(ctx);
    }

    _drawCrown(ctx) {
        const cx = this.x + this.w/2;
        const cy = this.y - 12 + Math.sin(this.crownAnim) * 6;
        const cw = 72;

        ctx.save();
        ctx.shadowBlur = 22;
        ctx.shadowColor = '#ffd700';
        ctx.fillStyle = '#ffd700';

        // Base
        ctx.fillRect(cx - cw/2, cy + 10, cw, 22);

        // Três pontas
        ctx.beginPath();
        ctx.moveTo(cx - cw/2, cy + 10);
        ctx.lineTo(cx - cw/2, cy - 15);
        ctx.lineTo(cx - cw/4, cy + 10);

        ctx.moveTo(cx - cw/4, cy + 10);
        ctx.lineTo(cx, cy - 38);
        ctx.lineTo(cx + cw/4, cy + 10);

        ctx.moveTo(cx + cw/4, cy + 10);
        ctx.lineTo(cx + cw/2, cy - 15);
        ctx.lineTo(cx + cw/2, cy + 10);
        ctx.closePath();
        ctx.fill();

        // Joias
        const gems = ['#ff0000', '#00ffff', '#ff00ff'];
        const gpos = [[cx - cw/2 + 10, cy + 18], [cx, cy + 18], [cx + cw/2 - 10, cy + 18]];
        gpos.forEach(([gx, gy], i) => {
            ctx.fillStyle = gems[i];
            ctx.shadowColor = gems[i];
            ctx.beginPath();
            ctx.arc(gx, gy, 8, 0, Math.PI * 2);
            ctx.fill();
        });

        ctx.shadowBlur = 0;
        ctx.restore();
    }

    _drawFinalBossHP(ctx) {
        const bw = this.w + 90;
        const bh = 22;
        const bx = this.x + this.w/2 - bw/2;
        const by = this.y - 105;

        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.92)';
        ctx.fillRect(bx - 5, by - 28, bw + 10, bh + 33);

        ctx.fillStyle = '#ffd700';
        ctx.shadowBlur = 16;
        ctx.shadowColor = '#ff0000';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('♛ ' + this.name + ' ♛', bx + bw/2, by - 5);
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#1a0000';
        ctx.fillRect(bx, by, bw, bh);

        const lp = Math.max(0, this.life / this.maxLife);
        const g = ctx.createLinearGradient(bx, by, bx + bw, by);
        g.addColorStop(0, '#8b0000');
        g.addColorStop(0.4, '#ff0000');
        g.addColorStop(0.7, '#ff4400');
        g.addColorStop(1, '#ff8800');
        ctx.fillStyle = g;
        ctx.fillRect(bx, by, bw * lp, bh);

        // Brilho animado
        const pulse = Math.abs(Math.sin(Date.now() * 0.003));
        ctx.fillStyle = 'rgba(255,255,255,' + (pulse * 0.18) + ')';
        ctx.fillRect(bx, by, bw * lp, bh / 3);

        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 3;
        ctx.strokeRect(bx, by, bw, bh);

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(Math.max(0, Math.floor(this.life)) + ' / ' + this.maxLife + ' HP', bx + bw/2, by + 16);

        ctx.restore();
    }

    checkHitPlayer(player) {
        if (!this.attacking || !player || player.life <= 0) return false;
        return this.x < player.x + player.w &&
               this.x + this.w > player.x &&
               this.y < player.y + player.h &&
               this.y + this.h > player.y;
    }
}

// Exportar
if (typeof window !== 'undefined') {
    window.BossEnemy = BossEnemy;
    window.FinalBoss = FinalBoss;
}
