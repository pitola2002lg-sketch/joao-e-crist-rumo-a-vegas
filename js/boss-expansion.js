/**
 * NOVOS BOSSES - Expansão Fases 6, 7 e 8
 * 
 * Boss Fase 6: O Engenheiro - Cria drones e usa eletricidade
 * Boss Fase 7: A Sombra - Clone do jogador, copia ataques
 * Boss Fase 8: O Deus das Apostas - Boss final supremo
 */

// ═══════════════════════════════════════
// BOSS FASE 6: O ENGENHEIRO
// ═══════════════════════════════════════
class TechBoss extends Enemy {
    constructor(x, y) {
        super(x, y, 'boss');
        this.isBoss = true;

        this.w = 100;
        this.h = 130;
        this.groundY = y;
        this.y = y - this.h;

        this.name = 'O ENGENHEIRO';
        this.life = 800;
        this.maxLife = 800;
        this.speed = 1.5;
        this.damage = 30;
        this.attackDamage = 30;
        this.score = 3000;
        this.color = '#00aaff';
        this.phase = 1;

        // Habilidades
        this.lastDrone = 0;
        this.droneCooldown = 4000;
        this.lastShock = 0;
        this.shockCooldown = 6000;
        this.shockActive = false;
        this.shockTimer = 0;

        this.lastTeleport = 0;
        this.teleportCooldown = 8000;

        this.hitFlash = 0;
        this.deathAnim = 0;
        this.walkCycle = 0;
        this.attacking = false;
        this.attackTimer = 0;
        this.attackCooldown = 0;
        this.facingRight = false;
        this.aiTimer = 0;

        this.hitbox = {
            offsetX: 10,
            offsetY: 15,
            width: this.w - 20,
            height: Math.floor(this.h * 0.75)
        };

        if(window.DEV) console.log('👹 ENGENHEIRO spawnado!');
    }

    update(players, allEnemies) {
        if (this.life <= 0) {
            this.deathAnim++;
            return;
        }

        const hpPct = this.life / this.maxLife;
        if (hpPct <= 0.6 && this.phase === 1) this.enterPhase2();
        if (hpPct <= 0.3 && this.phase === 2) this.enterPhase3();

        const now = Date.now();
        const target = players && players.find(p => p.life > 0);

        // Teleporte
        if (now - this.lastTeleport > this.teleportCooldown && target) {
            const side = Math.random() > 0.5 ? 1 : -1;
            this.x = target.x + side * 200;
            this.x = Math.max(100, Math.min(this.x, 4700));
            this.lastTeleport = now;
            if (window.particles) {
                window.particles.explosion(this.x + this.w / 2, this.y + this.h / 2, 20, { color: '#00aaff', speed: 5 });
            }
        }

        // Invoca drones (inimigos fast escalados)
        if (now - this.lastDrone > this.droneCooldown && allEnemies) {
            this.lastDrone = now;
            for (let i = 0; i < 2; i++) {
                const droneX = this.x + (i === 0 ? -80 : 80);
                const drone = new FastEnemy(droneX, this.groundY);
                drone.isBossMinion = true;
                drone.life = 40;
                drone.maxLife = 40;
                drone.speed = 5;
                drone.damage = 15;
                drone.color = '#00aaff';
                allEnemies.push(drone);
            }
            if (window.particles) {
                window.particles.createText(this.x + this.w / 2, this.y - 30, '⚡ DRONES!', '#00aaff', { size: 22 });
            }
        }

        // Choque elétrico em área
        if (now - this.lastShock > this.shockCooldown) {
            this.lastShock = now;
            this.shockActive = true;
            this.shockTimer = 90;
            if (window.soundSystem) window.soundSystem.playSound('hit');
        }

        if (this.shockActive) {
            this.shockTimer--;
            if (this.shockTimer <= 0) this.shockActive = false;

            // Dano em área no chão
            if (players && this.shockTimer % 15 === 0) {
                players.forEach(player => {
                    if (player.life > 0 && player.invulnerable <= 0 && Math.abs(player.y - this.groundY) < 80) {
                        player.takeDamage(this.phase === 3 ? 18 : 10);
                        if (window.particles) {
                            window.particles.explosion(player.x + player.w / 2, player.y + player.h / 2, 10, { color: '#ffff00', speed: 4 });
                        }
                    }
                });
            }
        }

        super.update(players, allEnemies);
        if (this.hitFlash > 0) this.hitFlash--;
    }

    enterPhase2() {
        this.phase = 2;
        this.speed = 2.5;
        this.droneCooldown = 2500;
        this.damage = 40;
        this.color = '#00ffff';
        if (window.particles) {
            window.particles.explosion(this.x + this.w / 2, this.y + this.h / 2, 40, { color: '#00ffff', speed: 7 });
            window.particles.createText(this.x + this.w / 2, this.y - 50, '⚡ FASE 2! ⚡', '#00ffff', { size: 30 });
        }
        if (window.screenShake !== undefined) window.screenShake = 10;
    }

    enterPhase3() {
        this.phase = 3;
        this.speed = 3.5;
        this.droneCooldown = 1500;
        this.shockCooldown = 3000;
        this.damage = 55;
        this.color = '#ff00ff';
        if (window.particles) {
            window.particles.explosion(this.x + this.w / 2, this.y + this.h / 2, 60, { color: '#ff00ff', speed: 9 });
            window.particles.createText(this.x + this.w / 2, this.y - 50, '⚡ MODO CRÍTICO! ⚡', '#ff00ff', { size: 30 });
        }
        if (window.screenShake !== undefined) window.screenShake = 15;
    }

    takeDamage(amount) {
        this.life = Math.max(0, this.life - amount);
        this.hitFlash = 10;
    }

    draw(ctx) {
        if (this.life <= 0 && this.deathAnim >= 40) return;
        ctx.save();

        if (this.life <= 0) {
            ctx.globalAlpha = 1 - (this.deathAnim / 40);
        }

        if (this.hitFlash > 0) {
            ctx.shadowBlur = 25;
            ctx.shadowColor = '#fff';
        }

        const pulse = Math.sin(Date.now() * 0.005) * 0.3 + 0.7;
        const c = this.phase === 3 ? '#ff00ff' : this.phase === 2 ? '#00ffff' : '#00aaff';

        // Corpo
        ctx.fillStyle = '#0a1a2e';
        ctx.fillRect(this.x + 5, this.y + 25, this.w - 10, this.h - 45);

        // Armadura
        ctx.fillStyle = c;
        ctx.globalAlpha = 0.4 * pulse;
        ctx.fillRect(this.x + 5, this.y + 25, this.w - 10, this.h - 45);
        ctx.globalAlpha = this.life <= 0 ? (1 - this.deathAnim / 40) : 1;

        // Borda tech
        ctx.strokeStyle = c;
        ctx.lineWidth = 2;
        ctx.shadowBlur = 20 * pulse;
        ctx.shadowColor = c;
        ctx.strokeRect(this.x + 5, this.y + 25, this.w - 10, this.h - 45);

        // Capacete tech
        ctx.fillStyle = '#0a1a2e';
        ctx.beginPath();
        ctx.arc(this.x + this.w / 2, this.y + 16, 22, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = c;
        ctx.lineWidth = 3;
        ctx.stroke();

        // Viseira
        ctx.fillStyle = c;
        ctx.globalAlpha = 0.8 * pulse;
        ctx.fillRect(this.x + 18, this.y + 8, this.w - 36, 12);
        ctx.globalAlpha = this.life <= 0 ? (1 - this.deathAnim / 40) : 1;

        // Efeito de choque ativo
        if (this.shockActive) {
            ctx.strokeStyle = '#ffff00';
            ctx.lineWidth = 3;
            ctx.shadowColor = '#ffff00';
            ctx.shadowBlur = 30;
            for (let i = 0; i < 4; i++) {
                const angle = (Date.now() * 0.01 + i * Math.PI / 2);
                const ex = this.x + this.w / 2 + Math.cos(angle) * 60;
                const ey = this.y + this.h / 2 + Math.sin(angle) * 30;
                ctx.beginPath();
                ctx.moveTo(this.x + this.w / 2, this.y + this.h / 2);
                ctx.lineTo(ex, ey);
                ctx.stroke();
            }
            // Aviso no chão
            ctx.fillStyle = 'rgba(255, 255, 0, 0.15)';
            ctx.fillRect(this.x - 200, this.groundY - 10, 500, 15);
        }

        // Barra de vida do boss
        this.drawBossBar(ctx);

        ctx.restore();
    }

    drawBossBar(ctx) {
        const barW = 120;
        const barX = this.x + this.w / 2 - barW / 2;
        const barY = this.y - 18;
        const pct = Math.max(0, this.life / this.maxLife);

        ctx.fillStyle = '#111';
        ctx.fillRect(barX, barY, barW, 8);

        const c = pct > 0.6 ? '#00aaff' : pct > 0.3 ? '#ff8800' : '#ff0000';
        ctx.fillStyle = c;
        ctx.fillRect(barX, barY, barW * pct, 8);

        ctx.strokeStyle = '#00aaff';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(barX, barY, barW, 8);

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${this.name} [FASE ${this.phase}]`, this.x + this.w / 2, barY - 4);
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
        if (player.life <= 0 || player.invulnerable > 0) return false;
        const cb = this.getCollisionBox();
        const overlap = cb.x < player.x + player.w && cb.x + cb.w > player.x &&
                        cb.y < player.y + player.h && cb.y + cb.h > player.y;
        if (overlap && !this._hitCooldown) {
            this._hitCooldown = 50;
            return true;
        }
        if (this._hitCooldown > 0) this._hitCooldown--;
        return false;
    }

    isDead() {
        return this.life <= 0 && this.deathAnim >= 40;
    }
}

// ═══════════════════════════════════════
// BOSS FASE 7: A SOMBRA (Clone das habilidades)
// ═══════════════════════════════════════
class ShadowBoss extends Enemy {
    constructor(x, y) {
        super(x, y, 'boss');
        this.isBoss = true;

        this.w = 55;
        this.h = 80;
        this.groundY = y;
        this.y = y - this.h;

        this.name = 'A SOMBRA';
        this.life = 1200;
        this.maxLife = 1200;
        this.speed = 5;
        this.damage = 35;
        this.attackDamage = 35;
        this.score = 5000;
        this.color = '#111';
        this.phase = 1;

        this.lastClone = 0;
        this.cloneCooldown = 7000;
        this.lastDash = 0;
        this.dashCooldown = 3000;
        this.invincibleFrames = 0;

        this.hitFlash = 0;
        this.deathAnim = 0;
        this.walkCycle = 0;
        this.attacking = false;
        this.attackTimer = 0;
        this.attackCooldown = 0;
        this.facingRight = false;
        this.aiTimer = 0;
        this.alpha = 1;

        this.hitbox = {
            offsetX: 8,
            offsetY: 10,
            width: this.w - 16,
            height: Math.floor(this.h * 0.8)
        };

        if(window.DEV) console.log('👹 SOMBRA spawnada!');
    }

    update(players, allEnemies) {
        if (this.life <= 0) {
            this.deathAnim++;
            return;
        }

        const hpPct = this.life / this.maxLife;
        if (hpPct <= 0.6 && this.phase === 1) this.enterPhase2(allEnemies);
        if (hpPct <= 0.3 && this.phase === 2) this.enterPhase3(allEnemies);

        const now = Date.now();
        const target = players && players.find(p => p.life > 0);

        // Invencibilidade breve quando entra de fase
        if (this.invincibleFrames > 0) {
            this.invincibleFrames--;
            this.alpha = 0.5 + Math.sin(Date.now() * 0.05) * 0.5;
        } else {
            this.alpha = 1;
        }

        // Cria clones (GhostEnemy que seguem o jogador)
        if (now - this.lastClone > this.cloneCooldown && allEnemies) {
            this.lastClone = now;
            const cloneCount = this.phase;
            for (let i = 0; i < cloneCount; i++) {
                const cx = this.x + (i - 1) * 100;
                const clone = new GhostEnemy(cx, this.groundY);
                clone.isBossMinion = true;
                clone.life = 50 * this.phase;
                clone.maxLife = clone.life;
                clone.speed = 3.5;
                clone.damage = 15;
                allEnemies.push(clone);
            }
            if (window.particles) {
                window.particles.createText(this.x + this.w / 2, this.y - 40, '👥 CLONES!', '#9b59b6', { size: 26 });
            }
        }

        // Dash rápido através do jogador
        if (now - this.lastDash > this.dashCooldown && target && allEnemies) {
            this.lastDash = now;
            const dx = target.x - this.x;
            this.x += Math.sign(dx) * 300;
            this.x = Math.max(50, Math.min(this.x, 4700));
            if (window.particles) {
                window.particles.explosion(this.x + this.w / 2, this.y + this.h / 2, 15, { color: '#111', speed: 6 });
            }
        }

        super.update(players, allEnemies);
        if (this.hitFlash > 0) this.hitFlash--;
    }

    takeDamage(amount) {
        if (this.invincibleFrames > 0) return;
        this.life = Math.max(0, this.life - amount);
        this.hitFlash = 10;
    }

    enterPhase2(allEnemies) {
        this.phase = 2;
        this.speed = 6.5;
        this.damage = 45;
        this.invincibleFrames = 90;
        this.dashCooldown = 2000;
        if (window.particles) {
            window.particles.explosion(this.x + this.w / 2, this.y + this.h / 2, 50, { color: '#333', speed: 8 });
            window.particles.createText(this.x + this.w / 2, this.y - 50, '💀 MODO SOMBRA! 💀', '#9b59b6', { size: 30 });
        }
        if (window.screenShake !== undefined) window.screenShake = 12;
    }

    enterPhase3(allEnemies) {
        this.phase = 3;
        this.speed = 8;
        this.damage = 60;
        this.invincibleFrames = 120;
        this.dashCooldown = 1200;
        this.cloneCooldown = 4000;
        if (window.particles) {
            window.particles.explosion(this.x + this.w / 2, this.y + this.h / 2, 80, { color: '#ff00ff', speed: 10 });
            window.particles.createText(this.x + this.w / 2, this.y - 50, '⚰️ MODO MORTE! ⚰️', '#ff0000', { size: 30 });
        }
        if (window.screenShake !== undefined) window.screenShake = 15;
    }

    draw(ctx) {
        if (this.life <= 0 && this.deathAnim >= 40) return;
        ctx.save();
        ctx.globalAlpha = this.alpha;

        if (this.life <= 0) {
            ctx.globalAlpha = (1 - this.deathAnim / 40) * this.alpha;
        }

        if (this.hitFlash > 0) {
            ctx.shadowBlur = 25;
            ctx.shadowColor = '#9b59b6';
        }

        const c = this.phase === 3 ? '#ff00ff' : this.phase === 2 ? '#9b59b6' : '#555';
        const t = Date.now() * 0.003;

        // Aura sombria
        ctx.shadowBlur = 30;
        ctx.shadowColor = c;
        for (let i = 3; i > 0; i--) {
            ctx.fillStyle = `rgba(0,0,0,${0.3 - i * 0.07})`;
            ctx.beginPath();
            ctx.ellipse(
                this.x + this.w / 2 + Math.sin(t + i) * 5,
                this.y + this.h / 2,
                (this.w / 2 + i * 10),
                (this.h / 2 + i * 8),
                0, 0, Math.PI * 2
            );
            ctx.fill();
        }

        // Corpo sombra
        ctx.fillStyle = '#0d0d0d';
        ctx.fillRect(this.x + 5, this.y + 22, this.w - 10, this.h - 38);

        // Contorno colorido
        ctx.strokeStyle = c;
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x + 5, this.y + 22, this.w - 10, this.h - 38);

        // Cabeça
        ctx.fillStyle = '#0a0a0a';
        ctx.beginPath();
        ctx.arc(this.x + this.w / 2, this.y + 15, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = c;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Olhos brilhantes
        ctx.fillStyle = c;
        ctx.shadowColor = c;
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(this.x + 12, this.y + 15, 4, 0, Math.PI * 2);
        ctx.arc(this.x + this.w - 12, this.y + 15, 4, 0, Math.PI * 2);
        ctx.fill();

        this.drawBossBar(ctx);
        ctx.restore();
    }

    drawBossBar(ctx) {
        const barW = 100;
        const barX = this.x + this.w / 2 - barW / 2;
        const barY = this.y - 20;
        const pct = Math.max(0, this.life / this.maxLife);
        const c = this.phase === 3 ? '#ff00ff' : this.phase === 2 ? '#9b59b6' : '#555';

        ctx.fillStyle = '#111';
        ctx.fillRect(barX, barY, barW, 8);
        ctx.fillStyle = c;
        ctx.fillRect(barX, barY, barW * pct, 8);
        ctx.strokeStyle = c;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(barX, barY, barW, 8);

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${this.name} [FASE ${this.phase}]`, this.x + this.w / 2, barY - 4);
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
        if (player.life <= 0 || player.invulnerable > 0) return false;
        const cb = this.getCollisionBox();
        const hit = cb.x < player.x + player.w && cb.x + cb.w > player.x &&
                    cb.y < player.y + player.h && cb.y + cb.h > player.y;
        if (hit && !this._hitCooldown) {
            this._hitCooldown = 50;
            return true;
        }
        if (this._hitCooldown > 0) this._hitCooldown--;
        return false;
    }

    isDead() {
        return this.life <= 0 && this.deathAnim >= 40;
    }
}

// ═══════════════════════════════════════
// BOSS FASE 8: O DEUS DAS APOSTAS (Boss Final Supremo)
// ═══════════════════════════════════════
class GodBoss extends Enemy {
    constructor(x, y) {
        super(x, y, 'boss');
        this.isBoss = true;

        this.w = 150;
        this.h = 180;
        this.groundY = y;
        this.y = y - this.h;

        this.name = 'DEUS DAS APOSTAS';
        this.life = 3000;
        this.maxLife = 3000;
        this.speed = 2;
        this.damage = 50;
        this.attackDamage = 50;
        this.score = 10000;
        this.color = '#ffd700';
        this.phase = 1;

        this.lastAbility = 0;
        this.abilityCooldown = 3500;
        this.abilityIndex = 0;
        this.abilities = ['rain', 'shield', 'summon', 'rage'];
        this.shieldActive = false;
        this.shieldHits = 0;
        this.rageMode = false;
        this.invincibleFrames = 0;
        this.projectilesToFire = [];

        this.hitFlash = 0;
        this.deathAnim = 0;
        this.walkCycle = 0;
        this.attacking = false;
        this.attackTimer = 0;
        this.attackCooldown = 0;
        this.facingRight = false;
        this.aiTimer = 0;

        this.hitbox = {
            offsetX: 15,
            offsetY: 20,
            width: this.w - 30,
            height: Math.floor(this.h * 0.75)
        };

        if(window.DEV) console.log('👹👑 DEUS DAS APOSTAS spawnado!');
    }

    update(players, allEnemies) {
        if (this.life <= 0) {
            this.deathAnim++;
            return;
        }

        const hpPct = this.life / this.maxLife;
        if (hpPct <= 0.66 && this.phase === 1) this.enterPhase2(allEnemies);
        if (hpPct <= 0.33 && this.phase === 2) this.enterPhase3(allEnemies);

        if (this.invincibleFrames > 0) this.invincibleFrames--;

        const now = Date.now();
        const target = players && players.find(p => p.life > 0);

        // Habilidades em rotação
        if (now - this.lastAbility > this.abilityCooldown) {
            this.lastAbility = now;
            const ability = this.abilities[this.abilityIndex % this.abilities.length];
            this.abilityIndex++;
            this.performAbility(ability, players, allEnemies);
        }

        // Chuva de projéteis em fase 3
        if (this.phase === 3 && players && allEnemies && now % 4000 < 50) {
            for (let i = 0; i < 5; i++) {
                const px = this.x + Math.random() * this.w;
                if (window.projectiles) {
                    window.projectiles.push({
                        type: 'enemy_projectile',
                        x: px, y: this.y,
                        vx: (Math.random() - 0.5) * 3,
                        vy: 5,
                        damage: 25,
                        color: '#ffd700',
                        spriteKind: 'orb_gold',
                        life: 120, w: 18, h: 18
                    });
                }
            }
        }

        super.update(players, allEnemies);
        if (this.hitFlash > 0) this.hitFlash--;
        if (this.rageMode) this.speed = this.phase === 3 ? 5 : 4;
    }

    performAbility(ability, players, allEnemies) {
        const target = players && players.find(p => p.life > 0);

        switch (ability) {
            case 'rain':
                // Chuva de projéteis dourados
                if (window.projectiles && target) {
                    for (let i = -3; i <= 3; i++) {
                        window.projectiles.push({
                            type: 'enemy_projectile',
                            x: target.x + i * 80, y: -30,
                            vx: 0, vy: 6 + this.phase,
                            damage: 20 + this.phase * 5,
                            color: '#ffd700',
                            spriteKind: 'orb_gold',
                            life: 180, w: 22, h: 22
                        });
                    }
                    if (window.particles) {
                        window.particles.createText(target.x + target.w / 2, target.y - 60, '☄ CHUVA DE OURO!', '#ffd700', { size: 22 });
                    }
                }
                break;

            case 'shield':
                // Ativa escudo que bloqueia 3 hits
                this.shieldActive = true;
                this.shieldHits = 3;
                if (window.particles) {
                    window.particles.explosion(this.x + this.w / 2, this.y + this.h / 2, 30, { color: '#ffd700', speed: 6 });
                    window.particles.createText(this.x + this.w / 2, this.y - 40, '🛡 ESCUDO!', '#ffd700', { size: 22 });
                }
                break;

            case 'summon':
                // Invoca 3 inimigos aleatórios
                if (allEnemies) {
                    const types = ['elite', 'ghost', 'assassin'];
                    for (let i = 0; i < (this.phase + 1); i++) {
                        const type = types[i % types.length];
                        let enemy;
                        if (type === 'elite') enemy = new EliteEnemy(this.x + (i - 1) * 120, this.groundY);
                        else if (type === 'ghost') enemy = new GhostEnemy(this.x + (i - 1) * 120, this.groundY);
                        else enemy = new AssassinEnemy(this.x + (i - 1) * 120, this.groundY);
                        enemy.isBossMinion = true;
                        allEnemies.push(enemy);
                    }
                    if (window.particles) {
                        window.particles.createText(this.x + this.w / 2, this.y - 40, '👥 SERVOS!', '#ff00ff', { size: 22 });
                    }
                }
                break;

            case 'rage':
                // Modo fúria por 3 segundos
                this.rageMode = true;
                this.damage = this.phase === 3 ? 80 : this.phase === 2 ? 65 : 50;
                (window.GameRuntime?.schedule || ((owner,ms,fn)=>setTimeout(fn,ms)))('boss', 3000, () => {
                    if (this.life <= 0) return;
                    this.rageMode = false;
                    this.damage = 50 + this.phase * 10;
                });
                if (window.particles) {
                    window.particles.explosion(this.x + this.w / 2, this.y + this.h / 2, 50, { color: '#ff0000', speed: 8 });
                    window.particles.createText(this.x + this.w / 2, this.y - 40, '💢 FÚRIA DIVINA!', '#ff0000', { size: 24 });
                }
                if (window.screenShake !== undefined) window.screenShake = 12;
                break;
        }
    }

    takeDamage(amount) {
        if (this.invincibleFrames > 0) return;
        if (this.shieldActive) {
            this.shieldHits--;
            if (window.particles) {
                window.particles.createText(this.x + this.w / 2, this.y - 20, '🛡 BLOQUEADO!', '#ffd700', { size: 18 });
            }
            if (this.shieldHits <= 0) {
                this.shieldActive = false;
                if (window.particles) {
                    window.particles.explosion(this.x + this.w / 2, this.y + this.h / 2, 20, { color: '#ffd700', speed: 5 });
                    window.particles.createText(this.x + this.w / 2, this.y - 20, '💥 ESCUDO QUEBRADO!', '#ffff00', { size: 18 });
                }
            }
            return;
        }
        this.life = Math.max(0, this.life - amount);
        this.hitFlash = 12;
    }

    enterPhase2(allEnemies) {
        this.phase = 2;
        this.speed = 3;
        this.abilityCooldown = 2500;
        this.damage = 65;
        this.invincibleFrames = 120;
        this.color = '#ff8800';
        this.shieldActive = false;
        if (window.particles) {
            window.particles.explosion(this.x + this.w / 2, this.y + this.h / 2, 70, { color: '#ff8800', speed: 9 });
            window.particles.createText(this.x + this.w / 2, this.y - 60, '🔥 2ª FORMA! 🔥', '#ff8800', { size: 34 });
        }
        if (window.screenShake !== undefined) window.screenShake = 18;
    }

    enterPhase3(allEnemies) {
        this.phase = 3;
        this.speed = 4;
        this.abilityCooldown = 1800;
        this.damage = 80;
        this.invincibleFrames = 150;
        this.color = '#ff0000';
        this.shieldActive = false;
        if (window.particles) {
            window.particles.explosion(this.x + this.w / 2, this.y + this.h / 2, 100, { color: '#ff0000', speed: 12 });
            window.particles.createText(this.x + this.w / 2, this.y - 60, '💀 FORMA FINAL! 💀', '#ff0000', { size: 36 });
        }
        if (window.screenShake !== undefined) window.screenShake = 22;
    }

    draw(ctx) {
        if (this.life <= 0 && this.deathAnim >= 60) return;
        ctx.save();

        if (this.life <= 0) {
            ctx.globalAlpha = 1 - (this.deathAnim / 60);
        }

        if (this.hitFlash > 0) {
            ctx.shadowBlur = 30;
            ctx.shadowColor = '#fff';
        }

        const c = this.phase === 3 ? '#ff0000' : this.phase === 2 ? '#ff8800' : '#ffd700';
        const t = Date.now() * 0.002;
        const pulse = Math.sin(t * 2) * 0.3 + 0.7;

        // Aura divina
        ctx.shadowBlur = 40 * pulse;
        ctx.shadowColor = c;
        ctx.globalAlpha = 0.2 * pulse;
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.arc(this.x + this.w / 2, this.y + this.h / 2, 90, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = this.life <= 0 ? (1 - this.deathAnim / 60) : 1;

        // Corpo monumental
        ctx.fillStyle = '#1a0a00';
        ctx.fillRect(this.x + 10, this.y + 35, this.w - 20, this.h - 55);

        // Armadura dourada
        ctx.fillStyle = c;
        ctx.shadowColor = c;
        ctx.shadowBlur = 20 * pulse;
        ctx.globalAlpha = 0.35;
        ctx.fillRect(this.x + 10, this.y + 35, this.w - 20, this.h - 55);
        ctx.globalAlpha = this.life <= 0 ? (1 - this.deathAnim / 60) : 1;

        // Placa peitoral
        ctx.strokeStyle = c;
        ctx.lineWidth = 3;
        ctx.strokeRect(this.x + 20, this.y + 45, this.w - 40, 40);

        // Ombros enormes
        ctx.fillStyle = c;
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.arc(this.x + 15, this.y + 40, 20, 0, Math.PI * 2);
        ctx.arc(this.x + this.w - 15, this.y + 40, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = this.life <= 0 ? (1 - this.deathAnim / 60) : 1;

        // Cabeça coroada
        ctx.fillStyle = '#1a0a00';
        ctx.beginPath();
        ctx.arc(this.x + this.w / 2, this.y + 22, 25, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = c;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Coroa
        ctx.fillStyle = c;
        ctx.shadowColor = c;
        ctx.shadowBlur = 30;
        const crownPts = [
            [this.x + this.w / 2 - 20, this.y + 2],
            [this.x + this.w / 2 - 15, this.y - 15],
            [this.x + this.w / 2 - 8, this.y - 5],
            [this.x + this.w / 2, this.y - 20],
            [this.x + this.w / 2 + 8, this.y - 5],
            [this.x + this.w / 2 + 15, this.y - 15],
            [this.x + this.w / 2 + 20, this.y + 2]
        ];
        ctx.beginPath();
        ctx.moveTo(crownPts[0][0], crownPts[0][1]);
        crownPts.forEach(([px, py]) => ctx.lineTo(px, py));
        ctx.closePath();
        ctx.fill();

        // Olhos
        ctx.fillStyle = this.rageMode ? '#ff0000' : c;
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 25 * pulse;
        ctx.beginPath();
        ctx.arc(this.x + this.w / 2 - 10, this.y + 22, 5, 0, Math.PI * 2);
        ctx.arc(this.x + this.w / 2 + 10, this.y + 22, 5, 0, Math.PI * 2);
        ctx.fill();

        // Escudo visual
        if (this.shieldActive) {
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 5;
            ctx.shadowColor = '#ffd700';
            ctx.shadowBlur = 40;
            ctx.globalAlpha = 0.7 + Math.sin(Date.now() * 0.01) * 0.3;
            ctx.beginPath();
            ctx.arc(this.x + this.w / 2, this.y + this.h / 2, 80, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = this.life <= 0 ? (1 - this.deathAnim / 60) : 1;

            ctx.fillStyle = '#ffd700';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`🛡 ${this.shieldHits}`, this.x + this.w / 2, this.y - 30);
        }

        // Indicador de fúria
        if (this.rageMode) {
            ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
            ctx.beginPath();
            ctx.arc(this.x + this.w / 2, this.y + this.h / 2, 100, 0, Math.PI * 2);
            ctx.fill();
        }

        this.drawBossBar(ctx);
        ctx.restore();
    }

    drawBossBar(ctx) {
        const barW = 160;
        const barX = this.x + this.w / 2 - barW / 2;
        const barY = this.y - 25;
        const pct = Math.max(0, this.life / this.maxLife);
        const c = this.phase === 3 ? '#ff0000' : this.phase === 2 ? '#ff8800' : '#ffd700';

        ctx.fillStyle = '#111';
        ctx.fillRect(barX, barY, barW, 10);
        ctx.fillStyle = c;
        ctx.fillRect(barX, barY, barW * pct, 10);
        ctx.strokeStyle = c;
        ctx.lineWidth = 2;
        ctx.strokeRect(barX, barY, barW, 10);

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.shadowBlur = 10;
        ctx.shadowColor = c;
        ctx.fillText(`⭐ ${this.name} ⭐ [FORMA ${this.phase}]`, this.x + this.w / 2, barY - 5);
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
        if (player.life <= 0 || player.invulnerable > 0) return false;
        const cb = this.getCollisionBox();
        const hit = cb.x < player.x + player.w && cb.x + cb.w > player.x &&
                    cb.y < player.y + player.h && cb.y + cb.h > player.y;
        if (hit && !this._hitCooldown) {
            this._hitCooldown = 45;
            return true;
        }
        if (this._hitCooldown > 0) this._hitCooldown--;
        return false;
    }

    isDead() {
        return this.life <= 0 && this.deathAnim >= 60;
    }
}

if(window.DEV) console.log('✅ Bosses TechBoss, ShadowBoss e GodBoss carregados!');
