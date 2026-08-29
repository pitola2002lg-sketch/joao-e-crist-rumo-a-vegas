// Definição dos níveis do jogo
class Level {
    constructor(config) {
        this.id = config.id;
        this.name = config.name;
        this.bgColor1 = config.bgColor1;
        this.bgColor2 = config.bgColor2;
        this.groundColor = config.groundColor;
        this.enemyTypes = config.enemyTypes;
        this.enemyCount = config.enemyCount;
        this.music = config.music;
        this.obstacles = config.obstacles || [];
        this.nextLevel = config.nextLevel;
        this.backgroundImage = config.backgroundImage || null;
        this._backgroundImg = null;
        this._backgroundFailed = false;

        // Flags de gameplay recebidas pela configuração. Antes estes campos eram
        // ignorados pelo construtor, fazendo bosses/ondas/dificuldade das fases
        // avançadas ficarem undefined mesmo estando declarados em LEVELS.
        this.hasBoss = !!config.hasBoss;
        this.hasFinalBoss = !!config.hasFinalBoss;
        this.hasTechBoss = !!config.hasTechBoss;
        this.hasShadowBoss = !!config.hasShadowBoss;
        this.hasGodBoss = !!config.hasGodBoss;
        this.useWaves = !!config.useWaves;
        this.levelRequirement = Number.isFinite(config.levelRequirement) ? config.levelRequirement : 0;
        this.difficultyMultiplier = Number.isFinite(config.difficultyMultiplier) ? config.difficultyMultiplier : 1;
        this.customDrawBackground = typeof config.drawBackground === 'function' ? config.drawBackground : null;

        // v0.9.4 stability: carregamento preguiçoso. Evita decodificar todos os
        // backgrounds grandes logo ao abrir o index.html.
        this.description = config.description;
        this.width = Number.isFinite(config.width) ? config.width : 5000;
        this._visualSeed = (this.id || 1) * 7919;
    }

    ensureBackground() {
        if (!this.backgroundImage) return null;
        if (this._backgroundImg) return this._backgroundImg;
        const manager = window.assetManager;
        if (manager?.image) {
            this._backgroundImg = manager.image(this.backgroundImage, `level:${this.id}`, {defer:true});
            if (!this._backgroundImg.complete || !this._backgroundImg.naturalWidth) manager.loadImage(this.backgroundImage, `level:${this.id}`).catch(()=>{ this._backgroundFailed=true; });
            return this._backgroundImg;
        }
        const img = new Image();
        img.onload = () => { this._backgroundFailed = false; };
        img.onerror = () => { this._backgroundFailed = true; if(window.DEV) if(window.DEV) console.warn('[background] Falha ao carregar:', this.backgroundImage); };
        img.src = this.backgroundImage;
        this._backgroundImg = img;
        return img;
    }

    preload() { return this.ensureBackground(); }

    dispose() {
        // Libera somente referência específica da fase. O AssetManager decide se o arquivo ainda pertence a outro grupo.
        this._backgroundImg = null;
        this._backgroundFailed = false;
    }

    // Aleatoriedade determinística para o cenário. Evita prédios/janelas/cactos
    // mudando de forma a cada frame (flicker visual).
    visualRandom(index, salt = 0) {
        const x = Math.sin((index + 1) * 12.9898 + (salt + this._visualSeed) * 78.233) * 43758.5453;
        return x - Math.floor(x);
    }

    drawBackground(ctx, cameraX) {
        // Background customizado por fase (somente quando configurado).
        this.ensureBackground();
        // Não altera largura, física, câmera nem lógica da fase.
        if (this._backgroundImg && this._backgroundImg.complete && this._backgroundImg.naturalWidth) {
            const worldW = this.width || 5000;
            const canvasW = ctx.canvas ? ctx.canvas.width : 1000;
            const canvasH = ctx.canvas ? ctx.canvas.height : 650;
            const imgW = this._backgroundImg.naturalWidth;
            const imgH = this._backgroundImg.naturalHeight;

            // PERFORMANCE: desenha somente o trecho visível do background.
            // Antes o navegador escalava uma imagem de ~2000px para 5000px em TODO frame,
            // mesmo com quase tudo fora da tela. Isso gerava travadas nas fases avançadas.
            const safeCameraX = Math.max(0, Math.min(Number(cameraX) || 0, Math.max(0, worldW - canvasW)));
            const sx = Math.max(0, Math.min(imgW - 1, (safeCameraX / worldW) * imgW));
            const sw = Math.max(1, Math.min(imgW - sx, (canvasW / worldW) * imgW));

            ctx.save();
            ctx.imageSmoothingEnabled = false;
            // O contexto já está translate(-cameraX,0). Desenhar em safeCameraX faz
            // o recorte cair exatamente no viewport 0..canvasW.
            ctx.drawImage(this._backgroundImg, sx, 0, sw, imgH, safeCameraX, 0, canvasW, canvasH);
            ctx.restore();
            if (this.customDrawBackground) this.customDrawBackground.call(this, ctx, cameraX, true);
            return;
        }

        // Cenários customizados (Fases 7/8). A configuração já possuía
        // drawBackground, mas o construtor antigo nunca a conectava à fase.
        if (this.customDrawBackground) {
            this.customDrawBackground.call(this, ctx, cameraX);
            return;
        }

        // Céu com gradiente
        const gradient = ctx.createLinearGradient(0, 0, 0, 650);
        gradient.addColorStop(0, this.bgColor1);
        gradient.addColorStop(1, this.bgColor2);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 5000, 650);

        // Desenhar cenário específico por fase
        switch(this.id) {
            case 1:
                this.drawFarm(ctx, cameraX);
                break;
            case 2:
                this.drawCity(ctx, cameraX);
                break;
            case 3:
                this.drawDesert(ctx, cameraX);
                break;
            case 4:
                this.drawHighway(ctx, cameraX);
                break;
            case 5:
                this.drawVegas(ctx, cameraX);
                break;
        }
    }

    drawFarm(ctx, cameraX) {
        // Nuvens no céu
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        for (let i = 0; i < 5000; i += 400) {
            const cloudX = i + (Date.now() * 0.005) % 400;
            ctx.beginPath();
            ctx.arc(cloudX, 80, 30, 0, Math.PI * 2);
            ctx.arc(cloudX + 25, 75, 35, 0, Math.PI * 2);
            ctx.arc(cloudX + 50, 80, 28, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Sol brilhante
        const sunGradient = ctx.createRadialGradient(300, 120, 20, 300, 120, 60);
        sunGradient.addColorStop(0, '#fff8dc');
        sunGradient.addColorStop(0.5, '#ffd700');
        sunGradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
        ctx.fillStyle = sunGradient;
        ctx.beginPath();
        ctx.arc(300, 120, 60, 0, Math.PI * 2);
        ctx.fill();
        
        // Montanhas ao fundo com gradiente
        const mountainGradient = ctx.createLinearGradient(0, 400, 0, 500);
        mountainGradient.addColorStop(0, '#3d6b1f');
        mountainGradient.addColorStop(1, '#2d5016');
        ctx.fillStyle = mountainGradient;
        ctx.beginPath();
        ctx.moveTo(0, 500);
        for (let i = 0; i < 5000; i += 150) {
            ctx.lineTo(i, 450 - Math.sin(i / 100) * 40);
            ctx.lineTo(i + 75, 480 - Math.sin(i / 100) * 20);
        }
        ctx.lineTo(5000, 500);
        ctx.closePath();
        ctx.fill();
        
        // Árvores no fundo
        for (let i = 100; i < 5000; i += 300) {
            // Tronco
            ctx.fillStyle = '#4a3520';
            ctx.fillRect(i, 450, 15, 60);
            // Copa
            ctx.fillStyle = '#2d7a1f';
            ctx.beginPath();
            ctx.arc(i + 7, 440, 25, 0, Math.PI * 2);
            ctx.arc(i - 5, 450, 20, 0, Math.PI * 2);
            ctx.arc(i + 20, 450, 20, 0, Math.PI * 2);
            ctx.fill();
        }

        // Cerca de madeira com textura
        for (let i = 0; i < 5000; i += 50) {
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(i, 480, 8, 30);
            // Textura da madeira
            ctx.strokeStyle = '#5d2f0a';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(i + 2, 485);
            ctx.lineTo(i + 2, 505);
            ctx.moveTo(i + 5, 488);
            ctx.lineTo(i + 5, 508);
            ctx.stroke();
            // Barras horizontais
            ctx.fillRect(i, 490, 45, 5);
            ctx.fillRect(i, 500, 45, 5);
        }

        // Grama com variação
        const grassGradient = ctx.createLinearGradient(0, 510, 0, 650);
        grassGradient.addColorStop(0, '#5a8f38');
        grassGradient.addColorStop(1, '#4a7c2e');
        ctx.fillStyle = grassGradient;
        ctx.fillRect(0, 510, 5000, 140);
        
        // Tufos de grama
        ctx.strokeStyle = '#3d6b1f';
        ctx.lineWidth = 2;
        for (let i = 0; i < 5000; i += 40) {
            const grassX = i + (Math.sin(i * 0.1) * 10);
            ctx.beginPath();
            ctx.moveTo(grassX, 512);
            ctx.lineTo(grassX - 2, 518);
            ctx.moveTo(grassX, 512);
            ctx.lineTo(grassX + 2, 518);
            ctx.stroke();
        }

        // Flores aleatórias melhoradas
        for (let i = 0; i < 5000; i += 100) {
            const flowerX = i + (Math.sin(i) * 30);
            const colors = ['#ff6b9d', '#ffd700', '#ff4757', '#fff'];
            const color = colors[Math.floor(i / 100) % 4];
            
            // Haste
            ctx.strokeStyle = '#4a7c2e';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(flowerX, 505);
            ctx.lineTo(flowerX, 515);
            ctx.stroke();
            
            // Pétalas
            ctx.fillStyle = color;
            for (let p = 0; p < 5; p++) {
                const angle = (Math.PI * 2 * p) / 5;
                ctx.beginPath();
                ctx.arc(flowerX + Math.cos(angle) * 4, 505 + Math.sin(angle) * 4, 3, 0, Math.PI * 2);
                ctx.fill();
            }
            
            // Centro da flor
            ctx.fillStyle = '#ffd700';
            ctx.beginPath();
            ctx.arc(flowerX, 505, 2.5, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Borboletas animadas
        const butterflyTime = Date.now() * 0.002;
        for (let i = 0; i < 3; i++) {
            const bx = 400 + i * 800 + Math.sin(butterflyTime + i) * 100;
            const by = 400 + Math.cos(butterflyTime * 1.5 + i) * 50;
            ctx.fillStyle = ['#ff6b9d', '#87CEEB', '#ffd700'][i];
            ctx.beginPath();
            ctx.ellipse(bx, by, 8, 5, Math.sin(butterflyTime * 4) * 0.3, 0, Math.PI * 2);
            ctx.ellipse(bx + 8, by, 8, 5, -Math.sin(butterflyTime * 4) * 0.3, 0, Math.PI * 2);
            ctx.fill();
        }

        // Celeiro melhorado
        if (cameraX < 1500) {
            // Sombra do celeiro
            ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
            ctx.fillRect(950, 490, 80, 20);
            
            // Corpo do celeiro
            ctx.fillStyle = '#8B0000';
            ctx.fillRect(800, 350, 150, 160);
            
            // Detalhes das tábuas
            ctx.strokeStyle = '#5d0000';
            ctx.lineWidth = 3;
            for (let y = 360; y < 510; y += 15) {
                ctx.beginPath();
                ctx.moveTo(800, y);
                ctx.lineTo(950, y);
                ctx.stroke();
            }
            
            // Telhado
            ctx.fillStyle = '#5d0000';
            ctx.beginPath();
            ctx.moveTo(800, 350);
            ctx.lineTo(875, 300);
            ctx.lineTo(950, 350);
            ctx.closePath();
            ctx.fill();
            
            // Telhas
            ctx.strokeStyle = '#4a0000';
            ctx.lineWidth = 2;
            for (let y = 310; y < 350; y += 10) {
                ctx.beginPath();
                ctx.moveTo(800 + (350 - y) * 0.5, y);
                ctx.lineTo(950 - (350 - y) * 0.5, y);
                ctx.stroke();
            }
            
            // Porta do celeiro
            ctx.fillStyle = '#4a3520';
            ctx.fillRect(850, 430, 50, 80);
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 3;
            ctx.strokeRect(850, 430, 50, 80);
            
            // Dobradiças da porta
            ctx.fillStyle = '#333';
            ctx.fillRect(848, 440, 4, 8);
            ctx.fillRect(848, 490, 4, 8);
            
            // Janela do celeiro
            ctx.fillStyle = '#2c1f13';
            ctx.beginPath();
            ctx.arc(875, 380, 15, 0, Math.PI);
            ctx.fill();
            ctx.strokeStyle = '#8B4513';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Grade da janela
            ctx.beginPath();
            ctx.moveTo(860, 380);
            ctx.lineTo(890, 380);
            ctx.moveTo(875, 370);
            ctx.lineTo(875, 390);
            ctx.stroke();
        }
    }

    drawCity(ctx, cameraX) {
        // Skyline ao fundo (prédios distantes)
        ctx.fillStyle = 'rgba(52, 73, 94, 0.4)';
        for (let i = 0; i < 5000; i += 150) {
            const h = 150 + this.visualRandom(i, 11) * 100;
            ctx.fillRect(i, 510 - h, 120, h);
        }
        
        // Prédios principais com detalhes
        ctx.fillStyle = '#2c3e50';
        const buildings = [
            {x: 200, h: 200}, {x: 350, h: 280}, {x: 500, h: 240},
            {x: 700, h: 300}, {x: 900, h: 180}, {x: 1100, h: 260},
            {x: 1300, h: 220}, {x: 1600, h: 290}, {x: 1900, h: 200}
        ];

        buildings.forEach(building => {
            // Sombra do prédio
            ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
            ctx.fillRect(building.x + 125, 480, 20, 30);
            
            // Prédio
            ctx.fillStyle = '#34495e';
            ctx.fillRect(building.x, 510 - building.h, 120, building.h);
            
            // Bordas do prédio
            ctx.strokeStyle = '#2c3e50';
            ctx.lineWidth = 3;
            ctx.strokeRect(building.x, 510 - building.h, 120, building.h);
            
            // Janelas iluminadas com padrão
            for (let y = 510 - building.h + 20; y < 500; y += 30) {
                for (let x = building.x + 15; x < building.x + 110; x += 25) {
                    const isLit = this.visualRandom(x + y + building.x, 17) > 0.3;
                    ctx.fillStyle = isLit ? '#f1c40f' : '#1a1a1a';
                    ctx.fillRect(x, y, 15, 20);
                    
                    // Moldura da janela
                    if (isLit) {
                        ctx.strokeStyle = '#ffd700';
                        ctx.lineWidth = 1;
                        ctx.strokeRect(x, y, 15, 20);
                    }
                }
            }
            
            // Topo do prédio (antena ou detalhe)
            if (this.visualRandom(building.x, 23) > 0.5) {
                ctx.fillStyle = '#e74c3c';
                ctx.beginPath();
                ctx.arc(building.x + 60, 510 - building.h - 5, 5, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#666';
                ctx.fillRect(building.x + 58, 510 - building.h, 4, 15);
            }
        });
        
        // Pássaros no céu
        ctx.strokeStyle = '#34495e';
        ctx.lineWidth = 2;
        for (let i = 0; i < 5; i++) {
            const bx = 300 + i * 300 + (Date.now() * 0.05) % 300;
            const by = 200 + Math.sin((Date.now() + i * 1000) * 0.003) * 30;
            ctx.beginPath();
            ctx.moveTo(bx - 8, by);
            ctx.quadraticCurveTo(bx, by - 5, bx + 8, by);
            ctx.stroke();
        }

        // Rua com textura
        const roadGradient = ctx.createLinearGradient(0, 510, 0, 650);
        roadGradient.addColorStop(0, '#3a3a3a');
        roadGradient.addColorStop(1, '#2c2c2c');
        ctx.fillStyle = roadGradient;
        ctx.fillRect(0, 510, 5000, 140);
        
        // Rachaduras no asfalto
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 1;
        for (let i = 0; i < 5000; i += 200) {
            ctx.beginPath();
            ctx.moveTo(i, 540);
            ctx.lineTo(i + 30, 545);
            ctx.lineTo(i + 50, 548);
            ctx.stroke();
        }
        
        // Faixa de pedestres
        ctx.fillStyle = '#fff';
        for (let i = 400; i < 600; i += 40) {
            ctx.fillRect(i, 550, 30, 10);
        }
        
        // Placas de trânsito
        for (let i = 800; i < 5000; i += 500) {
            // Poste
            ctx.fillStyle = '#666';
            ctx.fillRect(i, 420, 6, 90);
            
            // Placa
            ctx.fillStyle = '#e74c3c';
            ctx.beginPath();
            ctx.arc(i + 3, 400, 20, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 3;
            ctx.stroke();
            
            // Símbolo de stop
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('!', i + 3, 407);
        }
        
        // Lixeiras
        for (let i = 600; i < 5000; i += 400) {
            ctx.fillStyle = '#2ecc71';
            ctx.fillRect(i, 480, 25, 30);
            ctx.fillStyle = '#27ae60';
            ctx.fillRect(i, 480, 25, 8);
        }
        
        // Hidrantes
        for (let i = 1000; i < 5000; i += 600) {
            ctx.fillStyle = '#e74c3c';
            ctx.fillRect(i, 485, 20, 25);
            ctx.fillStyle = '#c0392b';
            ctx.fillRect(i + 5, 490, 10, 5);
            ctx.fillRect(i - 3, 495, 8, 3);
            ctx.fillRect(i + 15, 495, 8, 3);
        }
    }

    drawDesert(ctx, cameraX) {
        // Montanhas distantes no horizonte
        ctx.fillStyle = 'rgba(139, 115, 85, 0.3)';
        ctx.beginPath();
        ctx.moveTo(0, 480);
        for (let i = 0; i < 5000; i += 100) {
            ctx.lineTo(i, 420 - Math.sin(i / 200) * 40);
        }
        ctx.lineTo(5000, 480);
        ctx.closePath();
        ctx.fill();
        
        // Dunas com sombras
        ctx.fillStyle = '#c9a876';
        ctx.beginPath();
        ctx.moveTo(0, 600);
        for (let i = 0; i < 5000; i += 100) {
            ctx.lineTo(i, 500 + Math.sin(i / 150) * 30);
        }
        ctx.lineTo(5000, 650);
        ctx.closePath();
        ctx.fill();
        
        // Sombras das dunas
        ctx.fillStyle = 'rgba(180, 146, 102, 0.4)';
        ctx.beginPath();
        ctx.moveTo(0, 600);
        for (let i = 0; i < 5000; i += 100) {
            const y = 500 + Math.sin(i / 150) * 30;
            ctx.lineTo(i, y);
            if (Math.sin(i / 150) > 0) {
                ctx.lineTo(i + 50, y + 15);
            }
        }
        ctx.lineTo(5000, 650);
        ctx.closePath();
        ctx.fill();

        // Areia do chão com textura
        const sandGradient = ctx.createLinearGradient(0, 510, 0, 650);
        sandGradient.addColorStop(0, '#e5c29f');
        sandGradient.addColorStop(0.5, '#d4a574');
        sandGradient.addColorStop(1, '#c9a876');
        ctx.fillStyle = sandGradient;
        ctx.fillRect(0, 510, 5000, 140);
        
        // Ondulações na areia
        ctx.strokeStyle = 'rgba(180, 146, 102, 0.3)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 5000; i += 60) {
            ctx.beginPath();
            ctx.moveTo(i, 520);
            ctx.quadraticCurveTo(i + 20, 522, i + 40, 520);
            ctx.stroke();
        }

        // Cactos com mais detalhes
        for (let i = 300; i < 5000; i += 400) {
            this.drawCactus(ctx, i, 460);
        }
        
        // Arbustos secos (tumbleweeds)
        for (let i = 150; i < 5000; i += 450) {
            ctx.strokeStyle = '#8b7355';
            ctx.lineWidth = 2;
            const bushX = i + (Math.sin(Date.now() * 0.001 + i) * 20);
            for (let a = 0; a < 8; a++) {
                const angle = (Math.PI * 2 * a) / 8;
                ctx.beginPath();
                ctx.moveTo(bushX, 500);
                ctx.lineTo(bushX + Math.cos(angle) * 12, 500 + Math.sin(angle) * 12);
                ctx.stroke();
            }
        }

        // Pedras variadas
        ctx.fillStyle = '#8b7355';
        for (let i = 200; i < 5000; i += 350) {
            // Pedra principal
            ctx.beginPath();
            ctx.ellipse(i, 505, 20, 10, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Pedras menores ao redor
            ctx.beginPath();
            ctx.ellipse(i - 15, 508, 8, 4, 0, 0, Math.PI * 2);
            ctx.ellipse(i + 18, 507, 10, 5, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Rachaduras nas pedras
            ctx.strokeStyle = '#5d4a3a';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(i - 10, 505);
            ctx.lineTo(i + 10, 505);
            ctx.stroke();
        }
        
        // Ossos no deserto
        for (let i = 500; i < 5000; i += 800) {
            ctx.fillStyle = '#f5f5dc';
            ctx.strokeStyle = '#d3d3c3';
            ctx.lineWidth = 2;
            
            // Crânio
            ctx.beginPath();
            ctx.ellipse(i, 500, 15, 12, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            
            // Olhos do crânio
            ctx.fillStyle = '#333';
            ctx.beginPath();
            ctx.arc(i - 5, 498, 3, 0, Math.PI * 2);
            ctx.arc(i + 5, 498, 3, 0, Math.PI * 2);
            ctx.fill();
            
            // Ossos
            ctx.fillStyle = '#f5f5dc';
            ctx.fillRect(i - 20, 505, 15, 4);
            ctx.fillRect(i + 10, 505, 15, 4);
        }

        // Sol escaldante melhorado
        const sunGradient = ctx.createRadialGradient(800, 100, 20, 800, 100, 100);
        sunGradient.addColorStop(0, '#fff8dc');
        sunGradient.addColorStop(0.3, '#ffe066');
        sunGradient.addColorStop(0.7, '#ffd700');
        sunGradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
        ctx.fillStyle = sunGradient;
        ctx.beginPath();
        ctx.arc(800, 100, 100, 0, Math.PI * 2);
        ctx.fill();
        
        // Raios do sol
        ctx.strokeStyle = 'rgba(255, 230, 102, 0.3)';
        ctx.lineWidth = 3;
        for (let i = 0; i < 12; i++) {
            const angle = (Math.PI * 2 * i) / 12;
            ctx.beginPath();
            ctx.moveTo(800 + Math.cos(angle) * 50, 100 + Math.sin(angle) * 50);
            ctx.lineTo(800 + Math.cos(angle) * 120, 100 + Math.sin(angle) * 120);
            ctx.stroke();
        }
        
        // Abutres voando em círculos
        const vultureTime = Date.now() * 0.001;
        for (let i = 0; i < 3; i++) {
            const angle = vultureTime + (i * Math.PI * 2 / 3);
            const vx = 1500 + Math.cos(angle) * 200;
            const vy = 250 + Math.sin(angle) * 100;
            
            ctx.fillStyle = '#1a1a1a';
            ctx.beginPath();
            ctx.ellipse(vx, vy, 12, 6, angle, 0, Math.PI * 2);
            ctx.fill();
            
            // Asas
            ctx.beginPath();
            ctx.moveTo(vx - 12, vy);
            ctx.lineTo(vx - 25, vy - 5);
            ctx.moveTo(vx + 12, vy);
            ctx.lineTo(vx + 25, vy - 5);
            ctx.stroke();
        }
        
        // Ondas de calor (distorção visual)
        ctx.strokeStyle = 'rgba(255, 200, 100, 0.15)';
        ctx.lineWidth = 2;
        for (let y = 480; y < 510; y += 10) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            for (let x = 0; x < 5000; x += 40) {
                ctx.lineTo(x, y + Math.sin(x * 0.1 + Date.now() * 0.005) * 3);
            }
            ctx.stroke();
        }
    }

    drawCactus(ctx, x, y) {
        // Sombra do cacto
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(x + 10, y + 62, 18, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Corpo principal
        ctx.fillStyle = '#4a7c2e';
        ctx.fillRect(x, y, 20, 60);
        
        // Detalhes de segmentos (linhas verticais)
        ctx.strokeStyle = '#3d6b1f';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + 5, y);
        ctx.lineTo(x + 5, y + 60);
        ctx.moveTo(x + 10, y);
        ctx.lineTo(x + 10, y + 60);
        ctx.moveTo(x + 15, y);
        ctx.lineTo(x + 15, y + 60);
        ctx.stroke();
        
        // Espinhos
        ctx.strokeStyle = '#f5f5dc';
        ctx.lineWidth = 1;
        for (let sy = y + 5; sy < y + 55; sy += 8) {
            for (let sx = x + 3; sx < x + 17; sx += 6) {
                ctx.beginPath();
                ctx.moveTo(sx, sy);
                ctx.lineTo(sx - 2, sy - 3);
                ctx.moveTo(sx, sy);
                ctx.lineTo(sx + 2, sy - 3);
                ctx.stroke();
            }
        }
        
        // Braços com detalhes
        ctx.fillStyle = '#4a7c2e';
        
        // Braço esquerdo
        ctx.fillRect(x - 15, y + 20, 15, 5);
        ctx.fillRect(x - 15, y + 20, 5, 25);
        ctx.strokeStyle = '#3d6b1f';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x - 12, y + 20);
        ctx.lineTo(x - 12, y + 45);
        ctx.stroke();
        
        // Espinhos no braço esquerdo
        ctx.strokeStyle = '#f5f5dc';
        ctx.lineWidth = 1;
        for (let sy = y + 22; sy < y + 43; sy += 6) {
            ctx.beginPath();
            ctx.moveTo(x - 12, sy);
            ctx.lineTo(x - 14, sy - 2);
            ctx.stroke();
        }
        
        // Braço direito
        ctx.fillStyle = '#4a7c2e';
        ctx.fillRect(x + 20, y + 15, 15, 5);
        ctx.fillRect(x + 30, y + 15, 5, 30);
        ctx.strokeStyle = '#3d6b1f';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + 32, y + 15);
        ctx.lineTo(x + 32, y + 45);
        ctx.stroke();
        
        // Espinhos no braço direito
        ctx.strokeStyle = '#f5f5dc';
        ctx.lineWidth = 1;
        for (let sy = y + 17; sy < y + 43; sy += 6) {
            ctx.beginPath();
            ctx.moveTo(x + 32, sy);
            ctx.lineTo(x + 34, sy - 2);
            ctx.stroke();
        }
        
        // Flor no topo (às vezes)
        if (this.visualRandom(x, 31) > 0.7) {
            ctx.fillStyle = '#ff69b4';
            ctx.beginPath();
            ctx.arc(x + 10, y - 3, 4, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawHighway(ctx, cameraX) {
        // Céu do entardecer
        const skyGradient = ctx.createLinearGradient(0, 0, 0, 480);
        skyGradient.addColorStop(0, '#ff6b35');
        skyGradient.addColorStop(0.5, '#f7931e');
        skyGradient.addColorStop(1, '#2c3e50');
        ctx.fillStyle = skyGradient;
        ctx.fillRect(0, 0, 5000, 480);
        
        // Nuvens coloridas do entardecer
        ctx.fillStyle = 'rgba(255, 107, 53, 0.4)';
        for (let i = 200; i < 5000; i += 600) {
            ctx.beginPath();
            ctx.arc(i, 150, 40, 0, Math.PI * 2);
            ctx.arc(i + 50, 145, 50, 0, Math.PI * 2);
            ctx.arc(i + 100, 150, 35, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Montanhas distantes melhoradas
        ctx.fillStyle = '#1a1a2e';
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        ctx.moveTo(0, 480);
        for (let i = 0; i < 5000; i += 200) {
            ctx.lineTo(i, 400 - Math.sin(i / 150) * 60);
        }
        ctx.lineTo(5000, 480);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;
        
        // Guarda-rails
        ctx.fillStyle = '#666';
        for (let i = 0; i < 5000; i += 100) {
            // Poste
            ctx.fillRect(i, 465, 6, 15);
            // Barra horizontal
            ctx.fillRect(i - 10, 470, 26, 4);
        }

        // Estrada com textura de asfalto
        const roadGradient = ctx.createLinearGradient(0, 480, 0, 650);
        roadGradient.addColorStop(0, '#4a4a4a');
        roadGradient.addColorStop(0.5, '#3a3a3a');
        roadGradient.addColorStop(1, '#2a2a2a');
        ctx.fillStyle = roadGradient;
        ctx.fillRect(0, 480, 5000, 170);
        
        // Rachaduras e detalhes no asfalto
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 2;
        for (let i = 100; i < 5000; i += 250) {
            ctx.beginPath();
            ctx.moveTo(i, 500);
            ctx.lineTo(i + 40, 510);
            ctx.lineTo(i + 60, 505);
            ctx.stroke();
        }

        // Linhas da estrada centrais (dupla linha amarela)
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 5;
        ctx.setLineDash([40, 30]);
        ctx.beginPath();
        ctx.moveTo(0, 565);
        ctx.lineTo(5000, 565);
        ctx.stroke();
        
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, 560);
        ctx.lineTo(5000, 560);
        ctx.stroke();
        ctx.setLineDash([]);

        // Bordas da estrada (linhas contínuas brancas)
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(0, 480);
        ctx.lineTo(5000, 480);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(0, 648);
        ctx.lineTo(5000, 648);
        ctx.stroke();
        
        // Marcas de pneus
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        for (let i = 0; i < 5000; i += 150) {
            ctx.fillRect(i, 520, 80, 3);
            ctx.fillRect(i, 600, 80, 3);
        }

        // Placas de sinalização melhoradas
        for (let i = 500; i < 5000; i += 600) {
            // Sombra do poste
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.fillRect(i + 10, 478, 6, 5);
            
            // Poste metálico
            const poleGradient = ctx.createLinearGradient(i, 380, i + 8, 380);
            poleGradient.addColorStop(0, '#888');
            poleGradient.addColorStop(0.5, '#666');
            poleGradient.addColorStop(1, '#444');
            ctx.fillStyle = poleGradient;
            ctx.fillRect(i, 380, 8, 100);
            
            // Reflexo no poste
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.fillRect(i, 380, 3, 100);
            
            // Placa verde
            const signGradient = ctx.createLinearGradient(i - 40, 350, i + 50, 350);
            signGradient.addColorStop(0, '#27ae60');
            signGradient.addColorStop(0.5, '#2ecc71');
            signGradient.addColorStop(1, '#27ae60');
            ctx.fillStyle = signGradient;
            ctx.fillRect(i - 40, 350, 90, 50);
            
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 4;
            ctx.strokeRect(i - 40, 350, 90, 50);
            
            // Brilho na placa
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.fillRect(i - 35, 355, 30, 15);
            
            // Texto "VEGAS"
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 18px Arial';
            ctx.textAlign = 'center';
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 3;
            ctx.strokeText('VEGAS', i + 5, 380);
            ctx.fillText('VEGAS', i + 5, 380);
            
            // Distância
            ctx.font = 'bold 12px Arial';
            ctx.fillText(`${Math.floor((5000 - i) / 100)} mi`, i + 5, 392);
        }
        
        // Postes de luz
        for (let i = 300; i < 5000; i += 400) {
            // Poste alto
            ctx.fillStyle = '#333';
            ctx.fillRect(i, 300, 8, 180);
            
            // Luminária
            ctx.fillStyle = '#555';
            ctx.beginPath();
            ctx.moveTo(i + 4, 300);
            ctx.lineTo(i - 10, 280);
            ctx.lineTo(i + 18, 280);
            ctx.closePath();
            ctx.fill();
            
            // Luz (se estiver escurecendo)
            const lightGradient = ctx.createRadialGradient(i + 4, 280, 5, i + 4, 280, 40);
            lightGradient.addColorStop(0, 'rgba(255, 220, 150, 0.4)');
            lightGradient.addColorStop(1, 'rgba(255, 220, 150, 0)');
            ctx.fillStyle = lightGradient;
            ctx.beginPath();
            ctx.arc(i + 4, 280, 40, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Carros abandonados (sucata)
        for (let i = 1200; i < 5000; i += 1500) {
            ctx.fillStyle = '#8b4513';
            // Carcaça do carro
            ctx.fillRect(i, 620, 80, 25);
            ctx.fillRect(i + 15, 605, 50, 15);
            // Rodas (vazias)
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(i + 20, 645, 8, 0, Math.PI * 2);
            ctx.arc(i + 60, 645, 8, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    drawVegas(ctx, cameraX) {
        // Céu noturno mais escuro com estrelas
        const gradient = ctx.createLinearGradient(0, 0, 0, 650);
        gradient.addColorStop(0, '#0a0a1a');
        gradient.addColorStop(1, '#1a0a2e');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 5000, 650);
        
        // Estrelas cintilantes
        ctx.fillStyle = '#fff';
        for (let i = 0; i < 200; i++) {
            const sx = (i * 123) % 5000;
            const sy = (i * 87) % 400;
            const brightness = Math.max(0.12, Math.min(1, 0.55 + Math.sin(Date.now() * 0.001 + i) * 0.35));
            ctx.globalAlpha = brightness;
            ctx.beginPath();
            ctx.arc(sx, sy, 1, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        
        // Lua cheia
        const moonGradient = ctx.createRadialGradient(4500, 150, 20, 4500, 150, 50);
        moonGradient.addColorStop(0, '#fff');
        moonGradient.addColorStop(0.7, '#e0e0e0');
        moonGradient.addColorStop(1, 'rgba(224, 224, 224, 0)');
        ctx.fillStyle = moonGradient;
        ctx.beginPath();
        ctx.arc(4500, 150, 50, 0, Math.PI * 2);
        ctx.fill();
        
        // Crateras da lua
        ctx.fillStyle = 'rgba(150, 150, 150, 0.3)';
        ctx.beginPath();
        ctx.arc(4490, 145, 8, 0, Math.PI * 2);
        ctx.arc(4510, 155, 6, 0, Math.PI * 2);
        ctx.arc(4505, 140, 5, 0, Math.PI * 2);
        ctx.fill();

        // Luzes de Vegas ao fundo - CASSINOS
        for (let i = 0; i < 20; i++) {
            const x = 100 + i * 200;
            const height = 200 + this.visualRandom(i, 41) * 200;
            const hue = (i * 30) % 360;
            
            // Sombra do prédio
            ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
            ctx.fillRect(x + 85, 508, 30, 5);
            
            // Prédios iluminados com gradiente
            const buildingGradient = ctx.createLinearGradient(x, 510 - height, x + 80, 510 - height);
            buildingGradient.addColorStop(0, '#0a0a0a');
            buildingGradient.addColorStop(0.5, '#1a1a1a');
            buildingGradient.addColorStop(1, '#0a0a0a');
            ctx.fillStyle = buildingGradient;
            ctx.fillRect(x, 510 - height, 80, height);
            
            // Luzes neon no topo dos prédios
            ctx.shadowBlur = 30;
            ctx.shadowColor = `hsl(${hue}, 100%, 50%)`;
            ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
            ctx.fillRect(x - 5, 510 - height - 10, 90, 10);
            
            // Janelas iluminadas com padrões variados
            ctx.shadowBlur = 20;
            for (let y = 520 - height; y < 500; y += 25) {
                for (let wx = x + 10; wx < x + 70; wx += 20) {
                    const windowHue = (hue + this.visualRandom(wx + y + i, 43) * 60) % 360;
                    ctx.shadowColor = `hsl(${windowHue}, 100%, 50%)`;
                    ctx.fillStyle = this.visualRandom(wx + y + i, 47) > 0.2 ? `hsl(${windowHue}, 100%, 60%)` : '#0a0a0a';
                    ctx.fillRect(wx, y, 12, 15);
                }
            }
            
            // Letreiros verticais no prédio
            if (this.visualRandom(i, 53) > 0.5) {
                ctx.shadowBlur = 40;
                const signHue = (hue + 180) % 360;
                ctx.shadowColor = `hsl(${signHue}, 100%, 50%)`;
                ctx.fillStyle = `hsl(${signHue}, 100%, 60%)`;
                ctx.fillRect(x + 35, 510 - height + 20, 10, height - 40);
            }
            
            ctx.shadowBlur = 0;
        }
        
        // Torres de luz/holofotes
        for (let i = 800; i < 5000; i += 1000) {
            const spotlightAngle = (Date.now() * 0.001 + i) % (Math.PI * 2);
            const spotlightLength = 300;
            
            // Feixe de luz
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.lineWidth = 40;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(i, 510);
            ctx.lineTo(
                i + Math.cos(spotlightAngle) * spotlightLength,
                510 - Math.abs(Math.sin(spotlightAngle)) * spotlightLength
            );
            ctx.stroke();
        }

        // Letreiro "VEGAS" animado e massivo
        if (cameraX < 2500) {
            ctx.save();
            
            // Estrutura de suporte do letreiro
            ctx.fillStyle = '#333';
            ctx.fillRect(1150, 200, 100, 20);
            ctx.fillRect(1190, 220, 20, 290);
            
            // Borda externa do letreiro (3D)
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(1085, 155, 230, 90);
            
            // Fundo do letreiro
            ctx.fillStyle = '#0a0a0a';
            ctx.fillRect(1090, 160, 220, 80);
            
            // Efeito de pulsação
            const pulse = 0.8 + Math.sin(Date.now() * 0.003) * 0.2;
            
            // Brilho externo (múltiplas camadas)
            for (let i = 3; i > 0; i--) {
                ctx.shadowBlur = 50 * i * pulse;
                ctx.shadowColor = i % 2 === 0 ? '#ff00ff' : '#00ffff';
                ctx.fillStyle = i % 2 === 0 ? '#ff00ff' : '#00ffff';
                ctx.globalAlpha = 0.3 * pulse;
                ctx.font = 'bold 80px Impact';
                ctx.textAlign = 'center';
                ctx.fillText('VEGAS', 1200, 210);
            }
            
            ctx.globalAlpha = 1;
            
            // Texto principal (rosa neon)
            ctx.shadowBlur = 40 * pulse;
            ctx.shadowColor = '#ff00ff';
            ctx.fillStyle = '#ff00ff';
            ctx.font = 'bold 80px Impact';
            ctx.textAlign = 'center';
            ctx.fillText('VEGAS', 1200, 210);
            
            // Contorno ciano
            ctx.shadowColor = '#00ffff';
            ctx.shadowBlur = 30 * pulse;
            ctx.strokeStyle = '#00ffff';
            ctx.lineWidth = 5;
            ctx.strokeText('VEGAS', 1200, 210);
            
            // Brilho interno branco
            ctx.shadowColor = '#fff';
            ctx.shadowBlur = 10;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.font = 'bold 78px Impact';
            ctx.fillText('VEGAS', 1200, 209);
            
            // Lâmpadas ao redor do letreiro
            const lampCount = 40;
            ctx.shadowBlur = 15;
            for (let i = 0; i < lampCount; i++) {
                const angle = (Math.PI * 2 * i) / lampCount;
                const radius = 120;
                const lampX = 1200 + Math.cos(angle) * radius;
                const lampY = 200 + Math.sin(angle) * (radius * 0.5);
                
                const lampOn = (Date.now() + i * 100) % 1000 < 500;
                ctx.fillStyle = lampOn ? '#ffd700' : '#4a4a0a';
                ctx.shadowColor = lampOn ? '#ffd700' : 'transparent';
                ctx.beginPath();
                ctx.arc(lampX, lampY, 4, 0, Math.PI * 2);
                ctx.fill();
            }
            
            ctx.restore();
        }

        // Chão com luzes refletidas
        const floorGradient = ctx.createLinearGradient(0, 510, 0, 650);
        floorGradient.addColorStop(0, '#1a1a1a');
        floorGradient.addColorStop(0.5, '#2a2a2a');
        floorGradient.addColorStop(1, '#1a1a1a');
        ctx.fillStyle = floorGradient;
        ctx.fillRect(0, 510, 5000, 140);

        // Reflexos coloridos no chão (mais intensos)
        for (let i = 0; i < 5000; i += 100) {
            const hue = (i * 0.5 + Date.now() * 0.05) % 360;
            ctx.fillStyle = `hsla(${hue}, 100%, 50%, 0.25)`;
            ctx.fillRect(i, 510, 50, 140);
            
            // Brilho adicional
            const glowGradient = ctx.createRadialGradient(i + 25, 580, 0, i + 25, 580, 50);
            glowGradient.addColorStop(0, `hsla(${hue}, 100%, 60%, 0.4)`);
            glowGradient.addColorStop(1, 'transparent');
            ctx.fillStyle = glowGradient;
            ctx.fillRect(i, 510, 50, 140);
        }
        
        // Confetes caindo do céu
        ctx.fillStyle = '#fff';
        for (let i = 0; i < 50; i++) {
            const confettiX = (i * 234 + Date.now() * 0.1) % 5000;
            const confettiY = ((Date.now() * 0.2 + i * 50) % 650);
            const confettiHue = (i * 30) % 360;
            ctx.fillStyle = `hsl(${confettiHue}, 100%, 60%)`;
            ctx.save();
            ctx.translate(confettiX, confettiY);
            ctx.rotate(Date.now() * 0.005 + i);
            ctx.fillRect(-3, -6, 6, 12);
            ctx.restore();
        }
        
        // Placas iluminadas no chão
        for (let i = 400; i < 5000; i += 300) {
            const plateHue = (i + Date.now() * 0.1) % 360;
            ctx.shadowBlur = 20;
            ctx.shadowColor = `hsl(${plateHue}, 100%, 50%)`;
            ctx.fillStyle = `hsl(${plateHue}, 100%, 40%)`;
            ctx.fillRect(i, 630, 80, 5);
            ctx.shadowBlur = 0;
        }
    }

    getGround() {
        return 510;
    }
}

// Configuração de todos os níveis
const LEVELS = [
    new Level({
        id: 1,
        name: 'A Fazenda',
        description: 'Escape da fazenda e inicie sua jornada!',
        bgColor1: '#87CEEB',
        bgColor2: '#E0F6FF',
        groundColor: '#4a7c2e',
        enemyTypes: ['basic'],
        enemyCount: 8,
        nextLevel: 2,
        difficultyMultiplier: 1.0 // Melhoria #36: Dificuldade base
    }),
    new Level({
        id: 2,
        name: 'A Cidade',
        description: 'Atravesse a cidade sem ser pego!',
        backgroundImage: 'assets/backgrounds/fase2-cidade.webp',
        bgColor1: '#34495e',
        bgColor2: '#5d6d7e',
        groundColor: '#2c2c2c',
        enemyTypes: ['basic', 'ciclista', 'fast', 'tank', 'cockroach'],
        enemyCount: 12,
        nextLevel: 3,
        difficultyMultiplier: 1.2 // Melhoria #36: +20% de dificuldade
    }),
    new Level({
        id: 3,
        name: 'O Deserto',
        description: 'Sobreviva ao calor escaldante do deserto!',
        backgroundImage: 'assets/backgrounds/fase3-deserto.webp',
        bgColor1: '#f39c12',
        bgColor2: '#f8c471',
        groundColor: '#e5c29f',
        enemyTypes: ['basic', 'strong', 'berserker', 'cowboy'],
        enemyCount: 15,
        hasBoss: true,
        nextLevel: 4,
        difficultyMultiplier: 1.4 // Melhoria #36: +40% de dificuldade
    }),
    new Level({
        id: 4,
        name: 'A Estrada',
        description: 'Vegas está próxima! Continue em frente!',
        backgroundImage: 'assets/backgrounds/fase4-estrada-vegas.webp',
        bgColor1: '#2c3e50',
        bgColor2: '#34495e',
        groundColor: '#3a3a3a',
        enemyTypes: ['basic', 'ciclista', 'fast', 'strong', 'tank', 'berserker', 'cowboy', 'cockroach'],
        enemyCount: 20,
        nextLevel: 5,
        difficultyMultiplier: 1.6 // Melhoria #36: +60% de dificuldade
    }),
    new Level({
        id: 5,
        name: 'VEGAS!',
        description: 'As luzes de Vegas escondem uma armadilha. Derrote o REI DE VEGAS e descubra quem está por trás de tudo!',
        backgroundImage: 'assets/backgrounds/fase5-vegas.webp',
        bgColor1: '#0a0a1a',
        bgColor2: '#1a0a2e',
        groundColor: '#2a2a2a',
        enemyTypes: ['turista', 'seguranca', 'elvis_fan', 'mulher_feia', 'travesti'],
        enemyCount: 25,
        hasFinalBoss: true,
        nextLevel: 6,
        difficultyMultiplier: 2.0
    }),

    // =====================================================
    // EXPANSÃO: AS VERDADEIRAS PROFUNDEZAS DE VEGAS
    // =====================================================

    new Level({
        id: 6,
        name: 'DENTRO DO CASSINO',
        description: 'João e Crist invadem o Royal Vegas. Entre mesas, caça-níqueis e seguranças, o caminho leva até a Arena VIP!',
        backgroundImage: 'assets/backgrounds/fase6-cassino.webp',
        bgColor1: '#090716',
        bgColor2: '#24102f',
        groundColor: '#2a2019',
        enemyTypes: ['turista', 'seguranca', 'elvis_fan', 'mulher_feia', 'travesti'],
        enemyCount: 28,
        hasBoss: true,
        hasTechBoss: true,
        useWaves: true,
        nextLevel: 7,
        difficultyMultiplier: 2.25
    }),

    new Level({
        id: 7,
        name: 'O CLUBE DOS ASSASSINOS',
        backgroundImage: 'assets/backgrounds/fase7-clube-assassinos.webp',
        description: 'Uma organização secreta de matadores de aluguel. Ninguém sai vivo.',
        bgColor1: '#0d0000',
        bgColor2: '#1a0000',
        groundColor: '#1a0000',
        enemyTypes: ['assassin', 'ghost'],
        enemyCount: 0,
        hasBoss: true,
        hasShadowBoss: true,
        useWaves: true,
        nextLevel: 8,
        levelRequirement: 18,
        difficultyMultiplier: 3.0,
        drawBackground(ctx, cameraX, hasBase=false) {
            const viewX = Math.max(0, Number(cameraX) || 0);
            const viewW = 1000;
            if(!hasBase){
            const grad = ctx.createLinearGradient(0, 0, 0, 650);
            grad.addColorStop(0, '#0d0000');
            grad.addColorStop(1, '#1a0005');
            ctx.fillStyle = grad;
            ctx.fillRect(viewX, 0, viewW, 650);
            }

            const firstLight = Math.floor((viewX - 220) / 400) * 400 + 200;
            for (let i = firstLight; i < viewX + viewW + 220; i += 400) {
                const pulse = Math.sin(performance.now() * 0.004 + i * 0.01) * 0.4 + 0.6;
                const spotGrad = ctx.createRadialGradient(i, 0, 0, i, 0, 200);
                spotGrad.addColorStop(0, `rgba(180, 0, 0, ${0.25 * pulse})`);
                spotGrad.addColorStop(1, 'transparent');
                ctx.fillStyle = spotGrad;
                ctx.fillRect(i - 200, 0, 400, 400);
            }

            const firstLamp = Math.floor((viewX - 100) / 300) * 300 + 300;
            for (let i = firstLamp; i < viewX + viewW + 100; i += 300) {
                const on = Math.floor(performance.now() * 0.003 + i * 0.01) % 3 !== 2;
                if (on) {
                    ctx.fillStyle = '#cc0000';
                    ctx.shadowBlur = 20;
                    ctx.shadowColor = '#ff0000';
                    ctx.beginPath();
                    ctx.arc(i, 105, 8, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.shadowBlur = 0;
                }
            }

            const floorGrad = ctx.createLinearGradient(0, 510, 0, 650);
            floorGrad.addColorStop(0, '#2a0000');
            floorGrad.addColorStop(1, '#1a0000');
            ctx.fillStyle = floorGrad;
            ctx.fillRect(viewX, 510, viewW, 140);
            const firstTile = Math.floor(viewX / 80) * 80;
            for (let i = firstTile; i < viewX + viewW + 80; i += 80) {
                const a = Math.sin(performance.now() * 0.005 + i * 0.05) * 0.08 + 0.05;
                ctx.fillStyle = `rgba(200, 0, 0, ${a})`;
                ctx.fillRect(i, 510, 40, 140);
            }
        }
    }),

    new Level({
        id: 8,
        name: 'O TRONO DO DEUS DAS APOSTAS',
        backgroundImage: 'assets/backgrounds/fase8-trono-deus-apostas.webp',
        description: 'O ápice de Vegas. O ser supremo que controla tudo. Derrote-o e seja LENDÁRIO!',
        bgColor1: '#000000',
        bgColor2: '#0a0500',
        groundColor: '#111100',
        enemyTypes: ['elite', 'ghost', 'assassin'],
        enemyCount: 0,
        hasBoss: false,
        hasGodBoss: true,
        useWaves: true,
        nextLevel: null,
        levelRequirement: 22,
        difficultyMultiplier: 4.0,
        drawBackground(ctx, cameraX, hasBase=false) {
            const viewX = Math.max(0, Number(cameraX) || 0);
            const viewW = 1000;
            if(!hasBase){
            const grad = ctx.createLinearGradient(0, 0, 0, 650);
            grad.addColorStop(0, '#000005');
            grad.addColorStop(0.5, '#05000a');
            grad.addColorStop(1, '#0a0500');
            ctx.fillStyle = grad;
            ctx.fillRect(viewX, 0, viewW, 650);
            }

            // Estrelas determinísticas apenas no trecho visível.
            for (let i = 0; i < 300; i++) {
                const sx = (i * 137.5) % 5000;
                if (sx < viewX - 8 || sx > viewX + viewW + 8) continue;
                const sy = (i * 89.3) % 450;
                const b = Math.sin(performance.now() * 0.002 + i) * 0.5 + 0.5;
                ctx.fillStyle = `rgba(255, 215, 0, ${b * 0.6})`;
                ctx.beginPath();
                ctx.arc(sx, sy, Math.max(0.5, b * 1.5), 0, Math.PI * 2);
                ctx.fill();
            }

            const firstPillar = Math.floor((viewX - 200) / 600) * 600 + 200;
            for (let i = firstPillar; i < viewX + viewW + 100; i += 600) {
                ctx.fillStyle = '#1a1500';
                ctx.fillRect(i, 200, 40, 310);
                ctx.fillStyle = 'rgba(255,215,0,.30)';
                ctx.fillRect(i - 10, 195, 60, 10);
                ctx.fillRect(i - 10, 505, 60, 10);
            }

            const floorGrad = ctx.createLinearGradient(0, 510, 0, 650);
            floorGrad.addColorStop(0, '#1a1500');
            floorGrad.addColorStop(1, '#0a0a00');
            ctx.fillStyle = floorGrad;
            ctx.fillRect(viewX, 510, viewW, 140);
            const firstTile = Math.floor(viewX / 100) * 100;
            for (let i = firstTile; i < viewX + viewW + 100; i += 100) {
                const a = Math.sin(performance.now() * 0.003 + i * 0.02) * 0.06 + 0.04;
                ctx.fillStyle = `rgba(255, 215, 0, ${a})`;
                ctx.fillRect(i, 510, 50, 140);
            }
        }
    })
];

// Referência explícita para módulos de carregamento sem alterar o uso legado de LEVELS.
window.LEVELS_REF = LEVELS;
