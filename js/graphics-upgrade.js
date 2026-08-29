/**
 * JOÃO & CRIST - Graphics Upgrade v5.5
 * Polimento visual leve e determinístico, sem depender de assets externos.
 * Mantém o estilo 2D/pixel do jogo e evita excesso de partículas.
 */
(function () {
    'use strict';

    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const hash = (n, salt = 0) => {
        const x = Math.sin((n + 1) * 12.9898 + (salt + 17) * 78.233) * 43758.5453;
        return x - Math.floor(x);
    };

    function levelId(level) {
        return level && Number(level.id) ? Number(level.id) : 1;
    }

    function drawBackdropAtmosphere(ctx, level, cameraX) {
        if (!ctx || !level) return;
        const id = levelId(level);
        const t = performance.now() * 0.001;
        const left = cameraX;

        ctx.save();

        // Luz atmosférica: dá profundidade sem esconder o cenário original.
        let tint = null;
        if (id === 1) tint = ['rgba(255,238,170,0.10)', 'rgba(120,190,255,0.02)'];
        if (id === 2) tint = ['rgba(120,180,220,0.06)', 'rgba(25,35,55,0.08)'];
        if (id === 3) tint = ['rgba(255,198,110,0.10)', 'rgba(190,110,65,0.04)'];
        if (id === 4) tint = ['rgba(255,120,70,0.08)', 'rgba(80,60,120,0.05)'];
        if (id === 5) tint = ['rgba(100,50,190,0.05)', 'rgba(0,210,255,0.035)'];
        if (tint) {
            const g = ctx.createLinearGradient(0, 0, 0, 650);
            g.addColorStop(0, tint[0]);
            g.addColorStop(1, tint[1]);
            ctx.fillStyle = g;
            ctx.fillRect(left, 0, 1000, 650);
        }

        // Partículas ambientais discretas. São calculadas, não armazenadas,
        // então não aumentam o array global de partículas nem geram memory leak.
        const count = id === 5 ? 16 : 11;
        for (let i = 0; i < count; i++) {
            const seedX = hash(i, id * 13);
            const seedY = hash(i, id * 29);
            const drift = (t * (8 + hash(i, 71) * 10));
            const x = left + ((seedX * 1100 + drift + i * 61) % 1100) - 50;
            const y = 90 + seedY * 430 + Math.sin(t * 0.8 + i) * 4;

            if (id === 1) {
                ctx.fillStyle = 'rgba(255,244,180,0.28)';
                ctx.fillRect(x, y, 2, 2);
            } else if (id === 2) {
                ctx.fillStyle = 'rgba(190,215,230,0.16)';
                ctx.fillRect(x, y, 1, 4);
            } else if (id === 3) {
                ctx.fillStyle = 'rgba(235,190,125,0.18)';
                ctx.fillRect(x, 420 + seedY * 120, 3, 1);
            } else if (id === 4) {
                ctx.fillStyle = 'rgba(255,190,130,0.15)';
                ctx.fillRect(x, 380 + seedY * 140, 3, 1);
            } else if (id === 5) {
                ctx.globalAlpha = 0.12 + hash(i, 91) * 0.16;
                ctx.fillStyle = i % 2 ? '#55ddff' : '#ff66dd';
                ctx.fillRect(x, y, 2, 2);
                ctx.globalAlpha = 1;
            }
        }

        // Névoa baixa/poeira perto do piso cria separação entre chão e personagens.
        const low = ctx.createLinearGradient(0, 440, 0, 610);
        if (id === 3) {
            low.addColorStop(0, 'rgba(255,210,150,0)');
            low.addColorStop(1, 'rgba(255,205,145,0.10)');
        } else if (id === 5) {
            low.addColorStop(0, 'rgba(80,40,120,0)');
            low.addColorStop(1, 'rgba(80,40,120,0.08)');
        } else {
            low.addColorStop(0, 'rgba(220,230,240,0)');
            low.addColorStop(1, 'rgba(220,230,240,0.045)');
        }
        ctx.fillStyle = low;
        ctx.fillRect(left, 430, 1000, 190);
        ctx.restore();
    }

    function drawEnemyPre(ctx, enemy) {
        if (!ctx || !enemy || enemy.life <= 0) return;
        const w = enemy.w || 42;
        const h = enemy.h || 62;
        const x = enemy.x || 0;
        const y = enemy.y || 0;
        const ground = y + h + 4;

        ctx.save();
        // Sombra de contato uniforme em todos os inimigos. Ajuda personagens
        // procedurais diferentes a parecerem parte do mesmo cenário.
        const grad = ctx.createRadialGradient(x + w / 2, ground, 1, x + w / 2, ground, Math.max(14, w * 0.58));
        grad.addColorStop(0, 'rgba(0,0,0,0.30)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(x + w / 2, ground, Math.max(14, w * 0.58), Math.max(4, w * 0.13), 0, 0, Math.PI * 2);
        ctx.fill();

        // Aura mínima apenas onde faz sentido.
        if (enemy.isBoss || enemy.type === 'elite' || enemy.type === 'berserker') {
            ctx.globalAlpha = enemy.isBoss ? 0.11 : 0.07;
            ctx.strokeStyle = enemy.isBoss ? '#ffb347' : '#e7d7ff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(x + w / 2, y + h * 0.55, w * 0.72, h * 0.62, 0, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.restore();
    }

    function drawEnemyPost(ctx, enemy) {
        if (!ctx || !enemy || enemy.life <= 0) return;
        const w = enemy.w || 42;
        const h = enemy.h || 62;
        const x = enemy.x || 0;
        const y = enemy.y || 0;

        ctx.save();
        // Pequeno sinal de perigo quando um inimigo está em ataque ativo.
        // Substitui efeitos explosivos grandes por leitura visual limpa.
        if (enemy.attacking && (enemy.attackTimer || 0) > 0) {
            const pulse = 0.35 + Math.sin(performance.now() * 0.018) * 0.12;
            ctx.globalAlpha = clamp(pulse, 0.18, 0.48);
            ctx.strokeStyle = '#ffcf6a';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(x + w / 2, y + h * 0.48, Math.max(w, h) * 0.48, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Vida crítica: feedback sem mais partículas.
        if (enemy.maxLife && enemy.life / enemy.maxLife <= 0.25 && !enemy.isBoss) {
            ctx.globalAlpha = 0.28;
            ctx.fillStyle = '#8a1d1d';
            ctx.fillRect(x + w * 0.2, y - 7, w * 0.6, 2);
        }
        ctx.restore();
    }

    function drawForeground(ctx, level, cameraX) {
        if (!ctx || !level) return;
        const id = levelId(level);
        const left = cameraX;
        ctx.save();

        // Elementos bem próximos da câmera em baixa opacidade. Só ocupam a base,
        // não atrapalham leitura de golpes/hitboxes.
        if (id === 1) {
            ctx.strokeStyle = 'rgba(34,74,27,0.45)';
            ctx.lineWidth = 2;
            for (let i = 0; i < 24; i++) {
                const x = left + ((i * 83 + 17) % 1030) - 15;
                const hh = 7 + hash(i, 201) * 12;
                ctx.beginPath();
                ctx.moveTo(x, 650); ctx.lineTo(x - 3, 650 - hh); ctx.stroke();
            }
        } else if (id === 3) {
            ctx.fillStyle = 'rgba(90,58,38,0.20)';
            for (let i = 0; i < 12; i++) {
                const x = left + ((i * 127 + 40) % 1040) - 20;
                ctx.beginPath();
                ctx.ellipse(x, 645, 12 + hash(i, 212) * 10, 3, 0, 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (id === 4) {
            ctx.fillStyle = 'rgba(255,255,255,0.08)';
            for (let i = 0; i < 14; i++) {
                const x = left + ((i * 101 + 50) % 1080) - 40;
                ctx.fillRect(x, 638, 34, 2);
            }
        } else if (id === 5) {
            const glow = ctx.createLinearGradient(left, 570, left, 650);
            glow.addColorStop(0, 'rgba(0,0,0,0)');
            glow.addColorStop(1, 'rgba(60,0,90,0.16)');
            ctx.fillStyle = glow;
            ctx.fillRect(left, 570, 1000, 80);
        }
        ctx.restore();
    }

    function drawScreenFinish(ctx, level) {
        if (!ctx || !level) return;
        const id = levelId(level);
        ctx.save();
        // Vignette extremamente leve, melhora foco sem "escurecer o jogo".
        const v = ctx.createRadialGradient(500, 320, 220, 500, 320, 610);
        v.addColorStop(0, 'rgba(0,0,0,0)');
        v.addColorStop(0.72, 'rgba(0,0,0,0.015)');
        v.addColorStop(1, id === 5 ? 'rgba(7,0,18,0.18)' : 'rgba(0,0,0,0.12)');
        ctx.fillStyle = v;
        ctx.fillRect(0, 0, 1000, 650);
        ctx.restore();
    }

    window.GraphicsUpgrade = {
        drawBackdropAtmosphere,
        drawEnemyPre,
        drawEnemyPost,
        drawForeground,
        drawScreenFinish
    };
})();
