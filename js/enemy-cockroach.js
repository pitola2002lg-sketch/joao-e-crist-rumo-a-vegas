/**
 * BARATA MELHORADA - Homem com fantasia de barata
 * Tamanho do player, visual cômico mas intimidador
 */

class CockroachEnemy extends Enemy {
    constructor(x, y) {
        super(x, y, 'cockroach');
        
        // Tamanho do player
        this.w = 60;
        this.h = 80;
        this.life = 60;
        this.maxLife = 60;
        this.speed = 3.5; // Rápido como uma barata
        this.damage = 20;
        this.score = 180;
        this.name = 'Homem-Barata';
        
        // ✅ HITBOX PADRONIZADA
        this.hitbox = {
            offsetX: Math.floor(this.w * 0.15),
            offsetY: Math.floor(this.h * 0.25),
            width: Math.floor(this.w * 0.70),
            height: Math.floor(this.h * 0.65)
        };
        
        if(window.DEV) console.log('🪳 Homem-Barata criado em:', this.x, this.y);
        
        // Cores da fantasia
        this.shellColor = '#3d2817'; // Marrom escuro (carapaça)
        this.bodyColor = '#5a3d28'; // Marrom médio
        this.accentColor = '#8B4513'; // Marrom claro
        this.skinColor = '#d4a574'; // Pele (rosto/mãos)
        this.eyeColor = '#ff0000'; // Olhos vermelhos
        
        // Estado
        this.erraticTimer = 0;
        this.shakeOffset = { x: 0, y: 0 };
        this.antennaWiggle = 0;
        this.legAnimation = 0;
        this.legSpeed = 0.5;
        
        // Comportamento errático
        this.erraticDirection = 1;
        this.changeDirectionInterval = 30;
        
        // Dash attack
        this.dashCooldown = 0;
        this.dashing = false;
        this.dashTimer = 0;
        this.dashSpeed = 12;
        this.dashDirection = { x: 0, y: 0 };
        
        // ✅ VALIDAÇÃO
        if (this.groundY) {
            this.y = this.groundY - this.h;
        }
    }
    

    draw(ctx) {
        // Tenta usar primeiro o sprite 16-bit real do Homem-Barata.
        const sprite = window.__cockroach16bitSprite || (() => {
            const src='assets/enemies/cockroach-16bit.webp';
            const img = window.assetManager.placeholder(src);
            window.__cockroach16bitSprite = img;
            if(!img.complete||!img.naturalWidth) window.assetManager.loadImage(src,`level:${(window.levelManager?.currentLevelIndex??0)+1}`).catch(()=>{});
            return img;
        })();
        const frames = {
            idle:[[15,175,106,144],[36,10,81,144],[154,173,94,145]],
            walk:[[156,10,80,146],[276,10,79,146],[295,166,93,130],[400,10,95,147]],
            run:[[1146,178,89,170],[1203,8,147,153],[1273,179,96,185],[1354,10,149,152]],
            attack:[[27,530,102,140],[29,370,160,140],[170,530,106,140],[193,374,158,136],[311,532,89,138]],
            hurt:[[26,680,96,133],[160,680,116,134],[312,714,177,101]],
            dead:[[312,714,177,101],[536,755,157,70],[820,708,187,122],[1041,714,217,116]],
            dash:[[378,860,200,130],[606,864,216,129],[826,861,236,135],[1057,861,249,135],[1302,861,215,132]]
        };
        if (sprite.complete && sprite.naturalWidth) {
            const prevX = this._spritePrevX ?? this.x;
            const dxMove = this.x - prevX;
            this._spritePrevX = this.x;
            if (Math.abs(dxMove) > 0.01) this._spriteFacing = dxMove > 0 ? 1 : -1;
            const state = (this.life <= 0 || this.dead) ? 'dead'
                : (this.hitFlash > 0) ? 'hurt'
                : (this.attacking ? 'attack' : (this.dashing ? 'dash' : (Math.abs(dxMove) > 2.2 ? 'run' : (Math.abs(dxMove) > 0.08 ? 'walk' : 'idle'))));
            const list = frames[state] || frames.idle;
            const idx = state === 'dead'
                ? Math.min(list.length - 1, Math.floor((this.deathAnim || 0) / 9))
                : Math.floor(performance.now() / (state === 'attack' ? 100 : state === 'run' ? 80 : 140)) % list.length;
            const [sx, sy, sw, sh] = list[idx];
            const ground = Number.isFinite(this.groundY) ? this.groundY : this.y + this.h;
            let th = state === 'dead' ? 74 : 96;
            let tw = th * (sw / sh);
            if (tw > 154) { tw = 154; th = tw / (sw / sh); }
            const cx = this.x + this.w / 2;
            const bottom = (this.isJumping || Math.abs(this.vy || 0) > 0.1) ? this.y + this.h : ground;

            ctx.save();
            ctx.fillStyle = 'rgba(0,0,0,0.24)';
            ctx.beginPath();
            ctx.ellipse(cx, ground + 2, Math.max(11, this.w * 0.36), 3.5, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            ctx.save();
            ctx.imageSmoothingEnabled = false;
            const facing = this._spriteFacing ?? (this.facingRight ? 1 : -1);
            if (facing > 0) {
                ctx.translate(cx, 0);
                ctx.scale(-1, 1);
                ctx.translate(-cx, 0);
            }
            ctx.drawImage(sprite, sx, sy, sw, sh, cx - tw / 2, bottom - th, tw, th);
            ctx.restore();

            if (this.life > 0) {
                const barWidth = Math.max(30, Math.min(56, this.w));
                const barX = this.x + this.w / 2 - barWidth / 2;
                const barY = bottom - th - 8;
                const lifePercent = this.life / Math.max(1, this.maxLife);
                ctx.fillStyle = 'rgba(0,0,0,.65)';
                ctx.fillRect(barX - 1, barY - 1, barWidth + 2, 5);
                ctx.fillStyle = lifePercent > 0.6 ? '#31d158' : lifePercent > 0.3 ? '#ffb020' : '#ff453a';
                ctx.fillRect(barX, barY, barWidth * lifePercent, 3);
            }
            return;
        }

        if (this.life <= 0 && this.deathAnim >= 30) return;
        
        ctx.save();
        
        // Animação de morte (vira de barriga pra cima)
        if (this.life <= 0) {
            ctx.globalAlpha = 1 - (this.deathAnim / 30);
            ctx.translate(this.x + this.w / 2, this.y + this.h);
            ctx.rotate(Math.PI + this.deathAnim * 0.05); // Vira de costas
            ctx.translate(-(this.x + this.w / 2), -(this.y + this.h));
        }
        
        // Flip horizontal
        if (this.facingRight) {
            ctx.translate(this.x + this.w, this.y);
            ctx.scale(-1, 1);
            ctx.translate(-this.x, -this.y);
        }
        
        // Sombra
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(
            this.x + this.w / 2,
            this.y + this.h + 2,
            this.w / 2,
            6,
            0, 0, Math.PI * 2
        );
        ctx.fill();
        
        // Tremedeira constante (movimento de barata)
        this.shakeOffset.x = Math.sin(Date.now() * 0.02) * 1.5;
        this.shakeOffset.y = Math.cos(Date.now() * 0.025) * 1;
        this.antennaWiggle = Math.sin(Date.now() * 0.03) * 3;
        
        const scale = this.w / 60;
        const baseX = this.x + this.w * 0.2 + this.shakeOffset.x;
        const baseY = this.y + this.h * 0.15 + this.shakeOffset.y;
        
        // === PERNAS (6 patas de barata) ===
        this.drawLegs(ctx, baseX, baseY, scale);
        
        // === CORPO (fantasia de barata) ===
        this.drawBody(ctx, baseX, baseY, scale);
        
        // === CABEÇA (com antenas) ===
        this.drawHead(ctx, baseX, baseY, scale);
        
        // Flash de hit
        if (this.hitFlash > 0) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.fillRect(this.x, this.y, this.w, this.h);
            this.hitFlash--;
        }
        
        ctx.restore();
        
        // Barra de vida (sempre visível)
        if (this.life > 0) {
            const barWidth = this.w;
            const barHeight = 5;
            const barY = this.y - 12;
            
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(this.x, barY, barWidth, barHeight);
            
            const lifePercent = this.life / this.maxLife;
            ctx.fillStyle = lifePercent > 0.6 ? '#2ecc71' : lifePercent > 0.3 ? '#f39c12' : '#e74c3c';
            ctx.fillRect(this.x, barY, barWidth * lifePercent, barHeight);
            
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(this.x, barY, barWidth, barHeight);
            
            // Nome
            ctx.save();
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 11px Arial';
            ctx.textAlign = 'center';
            ctx.shadowBlur = 6;
            ctx.shadowColor = '#000';
            ctx.fillText(this.name, this.x + this.w / 2, barY - 4);
            ctx.restore();
        }
    }
    
    drawLegs(ctx, baseX, baseY, scale) {
        // 6 pernas de barata (3 de cada lado)
        const legMovement = Math.sin(this.legAnimation) * 5 * scale;
        
        ctx.strokeStyle = this.bodyColor;
        ctx.lineWidth = 3 * scale;
        
        // Pernas esquerdas (visíveis por trás)
        for (let i = 0; i < 3; i++) {
            const yPos = baseY + (25 + i * 12) * scale;
            const movement = i % 2 === 0 ? legMovement : -legMovement;
            
            ctx.beginPath();
            ctx.moveTo(baseX + 10 * scale, yPos);
            ctx.lineTo(baseX + 2 * scale, yPos + movement);
            ctx.lineTo(baseX - 4 * scale, yPos + 8 * scale + movement);
            ctx.stroke();
        }
        
        // Pernas direitas (visíveis por trás)
        for (let i = 0; i < 3; i++) {
            const yPos = baseY + (25 + i * 12) * scale;
            const movement = i % 2 === 0 ? -legMovement : legMovement;
            
            ctx.beginPath();
            ctx.moveTo(baseX + 30 * scale, yPos);
            ctx.lineTo(baseX + 38 * scale, yPos + movement);
            ctx.lineTo(baseX + 44 * scale, yPos + 8 * scale + movement);
            ctx.stroke();
        }
    }
    
    drawBody(ctx, baseX, baseY, scale) {
        // Carapaça (parte de trás)
        const gradient = ctx.createLinearGradient(
            baseX, baseY + 20 * scale,
            baseX, baseY + 60 * scale
        );
        gradient.addColorStop(0, this.shellColor);
        gradient.addColorStop(0.5, this.bodyColor);
        gradient.addColorStop(1, this.shellColor);
        
        ctx.fillStyle = gradient;
        
        // Corpo oval (carapaça de barata)
        ctx.beginPath();
        ctx.ellipse(
            baseX + 20 * scale,
            baseY + 40 * scale,
            16 * scale,
            22 * scale,
            0, 0, Math.PI * 2
        );
        ctx.fill();
        
        // Segmentos da carapaça
        ctx.strokeStyle = this.adjustBrightness(this.shellColor, -20);
        ctx.lineWidth = 2 * scale;
        for (let i = 0; i < 5; i++) {
            ctx.beginPath();
            ctx.arc(
                baseX + 20 * scale,
                baseY + (25 + i * 8) * scale,
                14 * scale,
                Math.PI * 0.3,
                Math.PI * 0.7
            );
            ctx.stroke();
        }
        
        // Brilho da carapaça
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.beginPath();
        ctx.ellipse(
            baseX + 24 * scale,
            baseY + 35 * scale,
            8 * scale,
            12 * scale,
            0.3, 0, Math.PI * 2
        );
        ctx.fill();
        
        // Braços humanos saindo da fantasia
        ctx.fillStyle = this.skinColor;
        
        // Braço esquerdo
        ctx.fillRect(baseX + 5 * scale, baseY + 25 * scale, 6 * scale, 15 * scale);
        // Mão
        ctx.beginPath();
        ctx.arc(baseX + 8 * scale, baseY + 42 * scale, 3 * scale, 0, Math.PI * 2);
        ctx.fill();
        
        // Braço direito
        ctx.fillRect(baseX + 29 * scale, baseY + 25 * scale, 6 * scale, 15 * scale);
        // Mão
        ctx.beginPath();
        ctx.arc(baseX + 32 * scale, baseY + 42 * scale, 3 * scale, 0, Math.PI * 2);
        ctx.fill();
    }
    
    drawHead(ctx, baseX, baseY, scale) {
        // Pescoço
        ctx.fillStyle = this.skinColor;
        ctx.fillRect(baseX + 17 * scale, baseY + 15 * scale, 6 * scale, 5 * scale);
        
        // Cabeça humana
        ctx.fillStyle = this.skinColor;
        ctx.beginPath();
        ctx.arc(baseX + 20 * scale, baseY + 12 * scale, 8 * scale, 0, Math.PI * 2);
        ctx.fill();
        
        // Máscara de barata (parte superior da cabeça)
        ctx.fillStyle = this.shellColor;
        ctx.beginPath();
        ctx.arc(baseX + 20 * scale, baseY + 9 * scale, 9 * scale, Math.PI, Math.PI * 2);
        ctx.fill();
        
        // Detalhes da máscara
        ctx.strokeStyle = this.bodyColor;
        ctx.lineWidth = 1.5 * scale;
        ctx.beginPath();
        ctx.arc(baseX + 20 * scale, baseY + 9 * scale, 7 * scale, Math.PI, Math.PI * 2);
        ctx.stroke();
        
        // ANTENAS (características de barata)
        ctx.strokeStyle = this.shellColor;
        ctx.lineWidth = 2 * scale;
        
        // Antena esquerda
        ctx.beginPath();
        ctx.moveTo(baseX + 14 * scale, baseY + 4 * scale);
        ctx.quadraticCurveTo(
            baseX + 10 * scale + this.antennaWiggle,
            baseY - 2 * scale,
            baseX + 8 * scale + this.antennaWiggle,
            baseY - 8 * scale
        );
        ctx.stroke();
        
        // Antena direita
        ctx.beginPath();
        ctx.moveTo(baseX + 26 * scale, baseY + 4 * scale);
        ctx.quadraticCurveTo(
            baseX + 30 * scale - this.antennaWiggle,
            baseY - 2 * scale,
            baseX + 32 * scale - this.antennaWiggle,
            baseY - 8 * scale
        );
        ctx.stroke();
        
        // Olhos compostos (grandes e vermelhos)
        ctx.fillStyle = this.eyeColor;
        ctx.beginPath();
        ctx.arc(baseX + 15 * scale, baseY + 11 * scale, 3 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(baseX + 25 * scale, baseY + 11 * scale, 3 * scale, 0, Math.PI * 2);
        ctx.fill();
        
        // Reflexos nos olhos
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.beginPath();
        ctx.arc(baseX + 16 * scale, baseY + 10 * scale, 1 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(baseX + 26 * scale, baseY + 10 * scale, 1 * scale, 0, Math.PI * 2);
        ctx.fill();
        
        // Mandíbulas (pequenas, estilo barata)
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1.5 * scale;
        ctx.beginPath();
        ctx.moveTo(baseX + 18 * scale, baseY + 14 * scale);
        ctx.lineTo(baseX + 16 * scale, baseY + 16 * scale);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(baseX + 22 * scale, baseY + 14 * scale);
        ctx.lineTo(baseX + 24 * scale, baseY + 16 * scale);
        ctx.stroke();
    }
    
    update(players, allEnemies) {
        if (this.life <= 0) {
            this.deathAnim++;
            return;
        }
        
        // Atualizar animação de pernas
        this.legAnimation += this.legSpeed;
        
        // Comportamento errático (zigue-zague)
        this.erraticTimer++;
        if (this.erraticTimer >= this.changeDirectionInterval) {
            this.erraticDirection *= -1;
            this.erraticTimer = 0;
        }
        
        const nearestPlayer = this.getNearestPlayer(players);
        if (!nearestPlayer) return;
        
        const dx = nearestPlayer.x - this.x;
        const distance = Math.abs(dx);
        
        this.facingRight = dx > 0;
        
        // Dash attack
        if (this.dashCooldown <= 0 && distance < 200 && Math.random() < 0.02) {
            this.dashing = true;
            this.dashTimer = 20;
            this.dashDirection.x = dx > 0 ? 1 : -1;
            this.dashCooldown = 120;
        }
        
        if (this.dashing) {
            this.dashTimer--;
            this.x += this.dashDirection.x * this.dashSpeed;
            
            if (this.dashTimer <= 0) {
                this.dashing = false;
            }
        } else {
            // Movimento normal + errático
            const erraticMovement = this.erraticDirection * 0.5;
            if (distance < 300) {
                this.x += Math.sign(dx) * this.speed + erraticMovement;
            }
        }
        
        if (this.dashCooldown > 0) this.dashCooldown--;
        
        // Ataque corpo a corpo
        if (this.attackCooldown <= 0 && distance < 50) {
            this.attacking = true;
            this.attackTimer = 15;
            this.attackCooldown = 60;
            
            if (nearestPlayer.takeDamage) {
                nearestPlayer.takeDamage(this.damage);
            }
        }
        
        if (this.attackCooldown > 0) this.attackCooldown--;
        if (this.attackTimer > 0) {
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
        
        // ✅ SISTEMA ANTI-OVERLAP
        this.avoidEnemies(allEnemies);
        
        // Limites
        if (this.x < 0) this.x = 0;
        if (this.x > 5000 - this.w) this.x = 5000 - this.w;
    }
    
    avoidEnemies(otherEnemies) {
        if (!otherEnemies) return;
        
        otherEnemies.forEach(other => {
            if (other === this || other.life <= 0) return;
            
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
        this.hitFlash = 6;
        
        if (typeof createDamageText === 'function') {
            createDamageText(this.x + this.w / 2, this.y, `-${damage}`, '#fff');
        }
        
        if (window.soundSystem && this.life > 0) {
            window.soundSystem.playSound('enemyHit');
        }
        
        if (this.life <= 0) {
            this.dead = true;
            if (window.soundSystem) {
                window.soundSystem.playSound('enemyDeath');
            }
        }
    }
    
    adjustBrightness(color, amount) {
        const hex = color.replace('#', '');
        const r = Math.max(0, Math.min(255, parseInt(hex.substr(0, 2), 16) + amount));
        const g = Math.max(0, Math.min(255, parseInt(hex.substr(2, 2), 16) + amount));
        const b = Math.max(0, Math.min(255, parseInt(hex.substr(4, 2), 16) + amount));
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
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
    
    getNearestPlayer(players) {
        let nearest = null;
        let minDist = Infinity;
        
        players.forEach(p => {
            if (p.life > 0) {
                const dist = Math.hypot(p.x - this.x, p.y - this.y);
                if (dist < minDist) {
                    minDist = dist;
                    nearest = p;
                }
            }
        });
        
        return nearest;
    }
}

// Exportar
if (typeof window !== 'undefined') {
    window.CockroachEnemy = CockroachEnemy;
}
