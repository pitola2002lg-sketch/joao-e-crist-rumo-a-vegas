// ========== GAME OVER SYSTEM ==========
// Sistema de Game Over separado e melhorado

class GameOverScreen {
    constructor() {
        this.isActive = false;
        this.finalScore = 0;
        this.levelReached = 0;
        this.fadeAlpha = 0;
        this.soundPlayed = false;
        this.particleEffect = [];
        this.glitchTimer = 0;
    }

    activate(score, level) {
        this.isActive = true;
        this.finalScore = score;
        this.levelReached = level;
        this.fadeAlpha = 0;
        this.soundPlayed = false;
        this.particleEffect = [];
        this.glitchTimer = 0;
        
        // Criar partículas de "Game Over"
        for (let i = 0; i < 100; i++) {
            this.particleEffect.push({
                x: 500 + (Math.random() - 0.5) * 400,
                y: 250 + (Math.random() - 0.5) * 100,
                vx: (Math.random() - 0.5) * 3,
                vy: Math.random() * -2,
                size: Math.random() * 4 + 2,
                life: 100,
                color: `hsl(${Math.random() * 60}, 100%, 50%)`
            });
        }
        
        // Tocar som de game over apenas uma vez
        if (window.soundSystem && !this.soundPlayed) {
            window.soundSystem.playSound('gameOver');
            this.soundPlayed = true;
        }
        
        // Salvar progresso
        if (window.saveSystem) {
            window.saveSystem.save({
                score: this.finalScore,
                level: this.levelReached,
                playerCharacter: window.selectedCharacters ? window.selectedCharacters[0] : null
            });
        }
    }

    deactivate() {
        this.isActive = false;
        this.fadeAlpha = 0;
        this.soundPlayed = false;
        this.particleEffect = [];
    }

    update() {
        if (!this.isActive) return;

        // Fade in
        if (this.fadeAlpha < 1) {
            this.fadeAlpha += 0.02;
        }

        // Atualizar partículas
        this.particleEffect = this.particleEffect.filter(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.1; // gravidade leve
            p.life--;
            return p.life > 0;
        });

        // Efeito de glitch
        this.glitchTimer++;
    }

    draw(ctx) {
        if (!this.isActive) return;

        // Fundo vermelho escuro com fade
        const gradient = ctx.createLinearGradient(0, 0, 0, 650);
        gradient.addColorStop(0, `rgba(74, 0, 0, ${this.fadeAlpha})`);
        gradient.addColorStop(1, `rgba(0, 0, 0, ${this.fadeAlpha})`);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 1000, 650);

        // Desenhar partículas
        this.particleEffect.forEach(p => {
            ctx.fillStyle = p.color;
            ctx.globalAlpha = (p.life / 100) * this.fadeAlpha;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = this.fadeAlpha;

        // Efeito de glitch no texto
        const glitchOffset = this.glitchTimer % 60 < 3 ? (Math.random() - 0.5) * 10 : 0;

        // Texto "GAME OVER" principal
        ctx.save();
        ctx.shadowBlur = 40;
        ctx.shadowColor = '#ff0000';
        ctx.fillStyle = '#ff0000';
        ctx.font = 'bold 96px Bebas Neue';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', 500 + glitchOffset, 250);
        
        // Efeito de duplicação (glitch)
        if (this.glitchTimer % 60 < 3) {
            ctx.fillStyle = '#ff00ff';
            ctx.globalAlpha = 0.5 * this.fadeAlpha;
            ctx.fillText('GAME OVER', 502, 248);
            ctx.fillStyle = '#00ffff';
            ctx.fillText('GAME OVER', 498, 252);
        }
        ctx.restore();
        ctx.globalAlpha = this.fadeAlpha;

        // Score final
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 48px Righteous';
        ctx.textAlign = 'center';
        ctx.fillText(`Score Final: ${this.finalScore}`, 500, 340);

        // Fase alcançada
        ctx.font = 'bold 32px Righteous';
        ctx.fillText(`Fase alcançada: ${this.levelReached}`, 500, 390);

        // Verificar high score
        if (window.saveSystem) {
            const savedData = window.saveSystem.load();
            if (this.finalScore > savedData.highScore) {
                ctx.fillStyle = '#ffd700';
                ctx.font = 'bold 28px Righteous';
                
                // Efeito pulsante
                const pulse = Math.sin(this.glitchTimer * 0.1) * 0.2 + 1;
                ctx.save();
                ctx.translate(500, 440);
                ctx.scale(pulse, pulse);
                ctx.fillText('🎉 NOVO RECORDE! 🎉', 0, 0);
                ctx.restore();
            }
        }

        // Instruções com efeito piscante
        const blinkAlpha = Math.sin(this.glitchTimer * 0.15) * 0.3 + 0.7;
        ctx.fillStyle = '#00ffff';
        ctx.globalAlpha = blinkAlpha * this.fadeAlpha;
        ctx.font = '24px Righteous';
        ctx.fillText('Pressione R ou ENTER para voltar ao menu', 500, 550);

        ctx.globalAlpha = 1;
    }

    handleInput(key) {
        if (!this.isActive) return false;

        if (key === 'r' || key === 'R' || key === 'Enter') {
            this.deactivate();
            return true; // Indica que deve voltar ao menu
        }

        return false;
    }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.GameOverScreen = GameOverScreen;
}
