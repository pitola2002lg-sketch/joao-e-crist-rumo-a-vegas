/**
 * CICLISTA ENEMY - Inimigo realista em bicicleta
 * Visual detalhado com bicicleta, capacete e animação de pedalada
 */

class CiclistaEnemy {
    constructor(x, y) {
        this.x = x;
        this.w = 100; // ✅ AUMENTADO: 80 → 100 (bicicleta bem maior)
        this.h = 120; // ✅ AUMENTADO: 100 → 120 (ciclista + bike bem maiores)
        this.type = 'ciclista';
        
        // CORREÇÃO: Ajustar Y
        this.groundY = y;
        this.y = y - this.h;
        
        // Atributos - ciclista é rápido e ágil
        this.life = 45;
        this.maxLife = 45;
        this.speed = 3.5;  // Mais rápido que capanga
        this.damage = 10;
        this.name = 'Ciclista';
        this.score = 120;
        
        // ✅ HITBOX PADRONIZADA
        this.hitbox = {
            offsetX: Math.floor(this.w * 0.15),
            offsetY: Math.floor(this.h * 0.25),
            width: Math.floor(this.w * 0.70),
            height: Math.floor(this.h * 0.65)
        };
        
        if(window.DEV) console.log('🚴 Ciclista criado em:', this.x, this.y, 'Ground:', this.groundY,
                    'Hitbox:', `${this.hitbox.width}×${this.hitbox.height}`);
        
        // Cores variadas para diferentes ciclistas
        const jerseyColors = ['#FF6B00', '#00A3E0', '#00B140', '#FFD100', '#E30613'];
        const bikeColors = ['#2C3E50', '#E74C3C', '#3498DB', '#1ABC9C', '#9B59B6'];
        const helmetColors = ['#2C3E50', '#E74C3C', '#F39C12', '#FFFFFF'];
        
        this.jerseyColor = jerseyColors[Math.floor(Math.random() * jerseyColors.length)];
        this.bikeColor = bikeColors[Math.floor(Math.random() * bikeColors.length)];
        this.helmetColor = helmetColors[Math.floor(Math.random() * helmetColors.length)];
        this.skinColor = '#d4a574';
        this.shortsColor = '#000000';
        
        // Variações visuais
        this.hasWaterBottle = Math.random() > 0.5;
        this.hasBackpack = Math.random() > 0.7;
        this.bikeStyle = Math.random() > 0.5 ? 'road' : 'mountain';  // estrada ou montanha
        
        // Estado de animação
        this.attacking = false;
        this.attackTimer = 0;
        this.attackCooldown = 0;
        this.facingRight = false;
        this.aiState = 'idle';
        this.aiTimer = 0;
        this.hitFlash = 0;
        this.deathAnim = 0;
        this.dead = false;
        
        // Animação específica do ciclista
        this.pedalAngle = 0;        // Ângulo dos pedais
        this.pedalSpeed = 0.3;      // Velocidade da pedalada
        this.wheelRotation = 0;     // Rotação das rodas
        this.bodyBounce = 0;        // Bounce ao pedalar
        this.bounceSpeed = 0.15;
        
        // ✅ VALIDAÇÃO: Re-calcular Y se mudou altura
        if (this.groundY) {
            this.y = this.groundY - this.h;
        }
    }

    draw(ctx) {
        if (this.life <= 0 && this.deathAnim >= 30) return;

        ctx.save();

        // Animação de morte - ciclista cai da bike
        if (this.life <= 0) {
            ctx.globalAlpha = 1 - (this.deathAnim / 30);
            ctx.translate(this.x + this.w / 2, this.y + this.h);
            ctx.rotate(this.deathAnim * 0.08);
            ctx.translate(-(this.x + this.w / 2), -(this.y + this.h));
        }

        // Flip horizontal
        if (this.facingRight) {
            ctx.translate(this.x + this.w, this.y);
            ctx.scale(-1, 1);
            ctx.translate(-this.x, -this.y);
        }

        // Sombra da bicicleta
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(
            this.x + this.w / 2, 
            this.y + this.h + 2, 
            this.w / 2 + 5, 
            6, 
            0, 0, Math.PI * 2
        );
        ctx.fill();

        // Bounce ao pedalar (apenas se vivo e em movimento)
        const bounce = this.life > 0 && this.aiState !== 'idle' ? Math.sin(this.bodyBounce) * 2 : 0;

        // === DESENHAR BICICLETA ===
        this.drawBicycle(ctx, bounce);
        
        // === DESENHAR CICLISTA ===
        this.drawCyclist(ctx, bounce);

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
            
            // Fundo
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(this.x, barY, barWidth, barHeight);
            
            // Vida
            const lifePercent = this.life / this.maxLife;
            let barColor = lifePercent > 0.6 ? '#2ecc71' : lifePercent > 0.3 ? '#f39c12' : '#e74c3c';
            ctx.fillStyle = barColor;
            ctx.fillRect(this.x, barY, barWidth * lifePercent, barHeight);
            
            // Borda
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(this.x, barY, barWidth, barHeight);
            
            // Brilho
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.fillRect(this.x, barY, barWidth * lifePercent, barHeight / 2);
            
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

    drawBicycle(ctx, bounce) {
        // ✅ ESCALA CORRIGIDA: Base 60 pixels para bike, escala até preencher a largura
        const scale = this.w / 60; // Nova escala mais agressiva (60px base → 100px = 1.67x)
        
        // Posição base: começar mais à esquerda e mais embaixo
        const baseX = this.x + this.w * 0.05; // Apenas 5% de margem esquerda
        const baseY = this.y + this.h * 0.75 + bounce; // 75% da altura = próximo ao chão

        // Cores
        const frameColor = this.bikeColor;
        const wheelColor = '#1a1a1a';
        const spokeColor = '#888';

        // === QUADRO DA BICICLETA ===
        ctx.strokeStyle = frameColor;
        ctx.lineWidth = 3 * scale;

        // Tubo diagonal
        ctx.beginPath();
        ctx.moveTo(baseX + 10 * scale, baseY - 15 * scale);  // Guidão
        ctx.lineTo(baseX + 20 * scale, baseY + 10 * scale);  // Pedal
        ctx.stroke();

        // Tubo horizontal superior
        ctx.beginPath();
        ctx.moveTo(baseX + 10 * scale, baseY - 15 * scale);
        ctx.lineTo(baseX + 35 * scale, baseY - 15 * scale);  // Selim
        ctx.stroke();

        // Tubo do selim
        ctx.beginPath();
        ctx.moveTo(baseX + 35 * scale, baseY - 15 * scale);
        ctx.lineTo(baseX + 35 * scale, baseY + 5 * scale);
        ctx.stroke();

        // Tubo traseiro
        ctx.beginPath();
        ctx.moveTo(baseX + 35 * scale, baseY + 5 * scale);
        ctx.lineTo(baseX + 20 * scale, baseY + 10 * scale);
        ctx.stroke();

        // Garfo dianteiro
        ctx.beginPath();
        ctx.moveTo(baseX + 10 * scale, baseY - 15 * scale);
        ctx.lineTo(baseX + 5 * scale, baseY + 10 * scale);
        ctx.stroke();

        // === RODAS ===
        const wheelRadius = 10 * scale; // Rodas maiores
        
        // Roda dianteira
        ctx.strokeStyle = wheelColor;
        ctx.lineWidth = 5 * scale; // Pneus mais grossos
        ctx.beginPath();
        ctx.arc(baseX + 5 * scale, baseY + 10 * scale, wheelRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Raios roda dianteira
        ctx.strokeStyle = spokeColor;
        ctx.lineWidth = 1.5 * scale;
        const numSpokes = 8;
        for (let i = 0; i < numSpokes; i++) {
            const angle = (this.wheelRotation + (i * Math.PI * 2 / numSpokes));
            ctx.beginPath();
            ctx.moveTo(baseX + 5 * scale, baseY + 10 * scale);
            ctx.lineTo(
                baseX + 5 * scale + Math.cos(angle) * 9 * scale,
                baseY + 10 * scale + Math.sin(angle) * 9 * scale
            );
            ctx.stroke();
        }

        // Roda traseira
        ctx.strokeStyle = wheelColor;
        ctx.lineWidth = 5 * scale;
        ctx.beginPath();
        ctx.arc(baseX + 35 * scale, baseY + 10 * scale, wheelRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Raios roda traseira
        ctx.strokeStyle = spokeColor;
        ctx.lineWidth = 1.5 * scale;
        for (let i = 0; i < numSpokes; i++) {
            const angle = (this.wheelRotation + (i * Math.PI * 2 / numSpokes));
            ctx.beginPath();
            ctx.moveTo(baseX + 35 * scale, baseY + 10 * scale);
            ctx.lineTo(
                baseX + 35 * scale + Math.cos(angle) * 9 * scale,
                baseY + 10 * scale + Math.sin(angle) * 9 * scale
            );
            ctx.stroke();
        }

        // === PEDAIS ===
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 2.5 * scale;
        
        // Pedal em movimento (animado)
        const pedalX = baseX + 20 * scale + Math.cos(this.pedalAngle) * 7 * scale;
        const pedalY = baseY + 10 * scale + Math.sin(this.pedalAngle) * 7 * scale;
        
        ctx.beginPath();
        ctx.moveTo(baseX + 20 * scale, baseY + 10 * scale);
        ctx.lineTo(pedalX, pedalY);
        ctx.stroke();
        
        // Plataforma do pedal
        ctx.fillStyle = '#333';
        ctx.fillRect(pedalX - 3 * scale, pedalY - 1.5 * scale, 8 * scale, 4 * scale);

        // === SELIM ===
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath();
        ctx.ellipse(baseX + 35 * scale, baseY - 16 * scale, 6 * scale, 4 * scale, 0, 0, Math.PI * 2);
        ctx.fill();

        // === GUIDÃO ===
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2.5 * scale;
        ctx.beginPath();
        ctx.moveTo(baseX + 10 * scale, baseY - 15 * scale);
        ctx.lineTo(baseX + 7 * scale, baseY - 20 * scale);
        ctx.moveTo(baseX + 10 * scale, baseY - 15 * scale);
        ctx.lineTo(baseX + 13 * scale, baseY - 20 * scale);
        ctx.stroke();

        // Garrafa de água (se tiver)
        if (this.hasWaterBottle) {
            ctx.fillStyle = '#3498db';
            ctx.fillRect(baseX + 22 * scale, baseY - 5 * scale, 4 * scale, 12 * scale);
            ctx.fillStyle = '#2980b9';
            ctx.fillRect(baseX + 22 * scale, baseY - 5 * scale, 4 * scale, 4 * scale);
        }
    }

    drawCyclist(ctx, bounce) {
        // ✅ ESCALA CORRIGIDA: Mesma base da bike (60px)
        const scale = this.w / 60;
        const baseX = this.x + this.w * 0.05;
        const baseY = this.y + this.h * 0.50 + bounce; // Ciclista no meio

        // === PERNAS (pedalando) ===
        ctx.strokeStyle = this.skinColor;
        ctx.lineWidth = 4 * scale; // Pernas mais grossas
        
        // Perna esquerda (acompanha pedal)
        const legAngle = this.pedalAngle;
        const legEndX = baseX + 20 * scale + Math.cos(legAngle) * 9 * scale;
        const legEndY = baseY + 22 * scale + Math.sin(legAngle) * 9 * scale;
        
        ctx.beginPath();
        ctx.moveTo(baseX + 27 * scale, baseY + 10 * scale);  // Quadril
        ctx.lineTo(baseX + 24 * scale, baseY + 17 * scale);  // Joelho
        ctx.lineTo(legEndX, legEndY);        // Pé no pedal
        ctx.stroke();

        // Perna direita (oposta)
        const legAngle2 = this.pedalAngle + Math.PI;
        const legEndX2 = baseX + 20 * scale + Math.cos(legAngle2) * 9 * scale;
        const legEndY2 = baseY + 22 * scale + Math.sin(legAngle2) * 9 * scale;
        
        ctx.beginPath();
        ctx.moveTo(baseX + 27 * scale, baseY + 10 * scale);
        ctx.lineTo(baseX + 25 * scale, baseY + 17 * scale);
        ctx.lineTo(legEndX2, legEndY2);
        ctx.stroke();

        // Sapatos de ciclismo
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.ellipse(legEndX, legEndY, 4 * scale, 3 * scale, legAngle, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(legEndX2, legEndY2, 4 * scale, 3 * scale, legAngle2, 0, Math.PI * 2);
        ctx.fill();

        // === SHORTS DE CICLISMO ===
        ctx.fillStyle = this.shortsColor;
        ctx.beginPath();
        ctx.ellipse(baseX + 27 * scale, baseY + 9 * scale, 7 * scale, 6 * scale, 0, 0, Math.PI * 2);
        ctx.fill();

        // === TORSO (inclinado para frente) ===
        ctx.strokeStyle = this.jerseyColor;
        ctx.lineWidth = 6 * scale; // Torso mais grosso
        ctx.beginPath();
        ctx.moveTo(baseX + 27 * scale, baseY + 9 * scale);   // Quadril
        ctx.lineTo(baseX + 22 * scale, baseY - 5 * scale);   // Ombros (inclinado)
        ctx.stroke();

        // Detalhes do jersey (listras)
        ctx.strokeStyle = this.adjustBrightness(this.jerseyColor, -30);
        ctx.lineWidth = 1.5 * scale;
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.moveTo(baseX + (26 - i * 2.5) * scale, baseY + (8 - i * 4.5) * scale);
            ctx.lineTo(baseX + (23 - i * 2.5) * scale, baseY + (-4 - i * 4.5) * scale);
            ctx.stroke();
        }

        // === BRAÇOS (segurando guidão) ===
        ctx.strokeStyle = this.skinColor;
        ctx.lineWidth = 3 * scale;
        
        // Braço esquerdo
        ctx.beginPath();
        ctx.moveTo(baseX + 22 * scale, baseY - 5 * scale);
        ctx.lineTo(baseX + 13 * scale, baseY - 10 * scale);
        ctx.stroke();

        // Braço direito
        ctx.beginPath();
        ctx.moveTo(baseX + 22 * scale, baseY - 5 * scale);
        ctx.lineTo(baseX + 10 * scale, baseY - 10 * scale);
        ctx.stroke();

        // Luvas
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(baseX + 13 * scale, baseY - 10 * scale, 2.5 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(baseX + 10 * scale, baseY - 10 * scale, 2.5 * scale, 0, Math.PI * 2);
        ctx.fill();

        // === CABEÇA COM CAPACETE ===
        ctx.fillStyle = this.skinColor;
        ctx.beginPath();
        ctx.arc(baseX + 22 * scale, baseY - 12 * scale, 7 * scale, 0, Math.PI * 2);
        ctx.fill();

        // Capacete
        ctx.fillStyle = this.helmetColor;
        ctx.beginPath();
        ctx.arc(baseX + 22 * scale, baseY - 15 * scale, 8 * scale, 0, Math.PI);
        ctx.fill();

        // Detalhes do capacete (aerofólios)
        ctx.strokeStyle = this.adjustBrightness(this.helmetColor, -20);
        ctx.lineWidth = 2 * scale;
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.moveTo(baseX + (20 + i * 2.5) * scale, baseY - 17 * scale);
            ctx.lineTo(baseX + (20 + i * 2.5) * scale, baseY - 14 * scale);
            ctx.stroke();
        }

        // Viseira/óculos
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(baseX + 18 * scale, baseY - 13 * scale, 8 * scale, 2.5 * scale);
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1.5 * scale;
        ctx.strokeRect(baseX + 18 * scale, baseY - 13 * scale, 8 * scale, 2.5 * scale);

        // Mochila/hidratação nas costas (se tiver)
        if (this.hasBackpack) {
            ctx.fillStyle = '#2C3E50';
            ctx.beginPath();
            ctx.ellipse(baseX + 30 * scale, baseY + 2 * scale, 5 * scale, 7 * scale, 0.3, 0, Math.PI * 2);
            ctx.fill();
            
            // Tubo de hidratação
            ctx.strokeStyle = '#3498db';
            ctx.lineWidth = 1.5 * scale;
            ctx.beginPath();
            ctx.moveTo(baseX + 30 * scale, baseY + 2 * scale);
            ctx.lineTo(baseX + 25 * scale, baseY - 3 * scale);
            ctx.stroke();
        }
    }


    update(players, allEnemies) {
        if (this.life <= 0) {
            // deathAnim incrementado AQUI no update (não no draw)
            if (this.deathAnim < 30) this.deathAnim++;
            return;
        }

        // Atualizar animações
        if (this.aiState !== 'idle') {
            this.pedalAngle += this.pedalSpeed;
            this.wheelRotation += this.pedalSpeed * 1.5;
            this.bodyBounce += this.bounceSpeed;
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

        // Atualizar direção
        this.facingRight = closestPlayer.x > this.x;

        // Atualizar timers
        if (this.attackCooldown > 0) this.attackCooldown--;
        if (this.attacking) {
            this.attackTimer--;
            if (this.attackTimer <= 0) this.attacking = false;
        }

        // IA: Ciclista mantém distância média e circula
        if (minDist < 50 && this.attackCooldown <= 0) {
            // Ataque rápido de passagem (chute)
            this.attacking = true;
            this.attackTimer = 10;
            this.attackCooldown = 60;
            this.aiState = 'attacking';

            if (closestPlayer.takeDamage) {
                closestPlayer.takeDamage(this.damage);
            }
        } else if (minDist < 300) {
            // Perseguir em alta velocidade
            const direction = closestPlayer.x > this.x ? 1 : -1;
            this.x += direction * this.speed;
            this.aiState = 'chasing';
        } else {
            // Patrulhar
            this.aiTimer--;
            if (this.aiTimer <= 0) {
                this.aiState = Math.random() > 0.5 ? 'patrol_left' : 'patrol_right';
                this.aiTimer = 60 + Math.random() * 60;
            }
            
            if (this.aiState === 'patrol_left') {
                this.x -= this.speed * 0.7;
            } else if (this.aiState === 'patrol_right') {
                this.x += this.speed * 0.7;
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
     */
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

    /**
     * ✅ SISTEMA DE HITBOX PADRONIZADO
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

    isDead() {
        return this.life <= 0 && this.deathAnim >= 30;
    }
}
