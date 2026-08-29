/**
 * SISTEMA DE TROFÉUS ÚNICO
 * Bronze 🥉 | Prata 🥈 | Ouro 🥇 | Platina 🏆
 */

class TrophySystem {
    constructor() {
        this.trophies = [];
        this.unlockedTrophies = new Set();
        this.stats = {
            // Stats de jogo
            enemiesKilled: 0,
            maxCombo: 0,
            dashesUsed: 0,
            powerUpsCollected: 0,
            levelsCompleted: 0,
            bossesDefeated: 0,
            playerLevel: 1,
            deaths: 0,
            score: 0,
            
            // Stats de tempo
            fastestLevelTime: Infinity,
            fastestGameTime: Infinity,
            
            // Stats especiais
            noDamageLevels: 0,
            noDeathRun: false,
            unlockedSkills: 0,
            busCompleted: 0,
            busBestResistance: 0,
            busNoCollision: false,
            busBestTime: Infinity
        };
        
        this.notifications = [];
        this.scrollOffset = 0;
        this.maxScroll = 0;
        
        this.initializeTrophies();
        this.loadProgress();
    }
    
    initializeTrophies() {
        this.trophies = [
            // ==================== BRONZE 🥉 ====================
            {
                id: 'first_blood',
                name: 'Primeiro Sangue',
                description: 'Derrote seu primeiro inimigo',
                tier: 'bronze',
                icon: '🎯',
                color: '#CD7F32',
                requirement: { type: 'kills', value: 1 },
                reward: { xp: 50, points: 100 }
            },
            {
                id: 'combo_starter',
                name: 'Combo Iniciante',
                description: 'Atinja um combo de 10 hits',
                tier: 'bronze',
                icon: '🔥',
                color: '#CD7F32',
                requirement: { type: 'combo', value: 10 },
                reward: { xp: 100, points: 200 }
            },
            {
                id: 'survivor',
                name: 'Sobrevivente',
                description: 'Complete a primeira fase',
                tier: 'bronze',
                icon: '✅',
                color: '#CD7F32',
                requirement: { type: 'level_complete', value: 1 },
                reward: { xp: 150, points: 300 }
            },
            {
                id: 'dash_apprentice',
                name: 'Aprendiz do Dash',
                description: 'Use dash 25 vezes',
                tier: 'bronze',
                icon: '💨',
                color: '#CD7F32',
                requirement: { type: 'dashes', value: 25 },
                reward: { xp: 75, points: 150 }
            },
            {
                id: 'level_5',
                name: 'Crescimento',
                description: 'Alcance nível 5',
                tier: 'bronze',
                icon: '⭐',
                color: '#CD7F32',
                requirement: { type: 'player_level', value: 5 },
                reward: { xp: 200, points: 400 }
            },
            {
                id: 'power_collector',
                name: 'Coletor',
                description: 'Colete 10 power-ups',
                tier: 'bronze',
                icon: '💊',
                color: '#CD7F32',
                requirement: { type: 'powerups', value: 10 },
                reward: { xp: 100, points: 200 }
            },
            
            {
                id: 'bus_road_trip', name: 'PEGANDO A ESTRADA', description: 'Complete o minigame Estrada para Vegas',
                tier: 'bronze', icon: '🚌', color: '#CD7F32', requirement: { type: 'bus_complete', value: 1 }, reward: { xp: 250, points: 500 }
            },
            // ==================== PRATA 🥈 ====================
            {
                id: 'veteran',
                name: 'Veterano',
                description: 'Derrote 100 inimigos',
                tier: 'silver',
                icon: '⚔️',
                color: '#C0C0C0',
                requirement: { type: 'kills', value: 100 },
                reward: { xp: 500, points: 1000 }
            },
            {
                id: 'combo_master',
                name: 'Mestre dos Combos',
                description: 'Atinja um combo de 25 hits',
                tier: 'silver',
                icon: '⚡',
                color: '#C0C0C0',
                requirement: { type: 'combo', value: 25 },
                reward: { xp: 300, points: 600 }
            },
            {
                id: 'halfway',
                name: 'No Meio do Caminho',
                description: 'Complete 3 fases',
                tier: 'silver',
                icon: '🛣️',
                color: '#C0C0C0',
                requirement: { type: 'level_complete', value: 3 },
                reward: { xp: 400, points: 800 }
            },
            {
                id: 'dash_master',
                name: 'Mestre do Dash',
                description: 'Use dash 100 vezes',
                tier: 'silver',
                icon: '💫',
                color: '#C0C0C0',
                requirement: { type: 'dashes', value: 100 },
                reward: { xp: 250, points: 500 }
            },
            {
                id: 'speedrun',
                name: 'Velocista',
                description: 'Complete uma fase em menos de 2 minutos',
                tier: 'silver',
                icon: '⏱️',
                color: '#C0C0C0',
                requirement: { type: 'speedrun', value: 120 },
                reward: { xp: 600, points: 1200 }
            },
            {
                id: 'boss_hunter',
                name: 'Caçador de Chefes',
                description: 'Derrote seu primeiro boss',
                tier: 'silver',
                icon: '👹',
                color: '#C0C0C0',
                requirement: { type: 'boss_defeated', value: 1 },
                reward: { xp: 500, points: 1000 }
            },
            {
                id: 'level_10',
                name: 'Poder Crescente',
                description: 'Alcance nível 10',
                tier: 'silver',
                icon: '🌟',
                color: '#C0C0C0',
                requirement: { type: 'player_level', value: 10 },
                reward: { xp: 400, points: 800 }
            },
            {
                id: 'untouchable',
                name: 'Intocável',
                description: 'Complete uma fase sem levar dano',
                tier: 'silver',
                icon: '🛡️',
                color: '#C0C0C0',
                requirement: { type: 'no_damage_level', value: 1 },
                reward: { xp: 800, points: 1600 }
            },
            
            {
                id: 'bus_good_driver', name: 'BOM MOTORISTA', description: 'Complete com pelo menos 75% da resistência',
                tier: 'silver', icon: '🚌', color: '#C0C0C0', requirement: { type: 'bus_resistance', value: 75 }, reward: { xp: 600, points: 1200 }
            },
            // ==================== OURO 🥇 ====================
            {
                id: 'destroyer',
                name: 'Destruidor',
                description: 'Derrote 500 inimigos',
                tier: 'gold',
                icon: '💀',
                color: '#FFD700',
                requirement: { type: 'kills', value: 500 },
                reward: { xp: 1500, points: 3000 }
            },
            {
                id: 'combo_legend',
                name: 'Lenda dos Combos',
                description: 'Atinja um combo de 50 hits',
                tier: 'gold',
                icon: '🌪️',
                color: '#FFD700',
                requirement: { type: 'combo', value: 50 },
                reward: { xp: 1000, points: 2000 }
            },
            {
                id: 'vegas_bound',
                name: 'Rumo a Vegas!',
                description: 'Complete todas as 5 fases',
                tier: 'gold',
                icon: '🎰',
                color: '#FFD700',
                requirement: { type: 'level_complete', value: 5 },
                reward: { xp: 2000, points: 4000 }
            },
            {
                id: 'all_bosses',
                name: 'Domador de Titãs',
                description: 'Derrote todos os bosses',
                tier: 'gold',
                icon: '🏆',
                color: '#FFD700',
                requirement: { type: 'boss_defeated', value: 3 },
                reward: { xp: 2500, points: 5000 }
            },
            {
                id: 'perfect_victory',
                name: 'Vitória Perfeita',
                description: 'Complete o jogo sem morrer',
                tier: 'gold',
                icon: '👑',
                color: '#FFD700',
                requirement: { type: 'no_death_run', value: true },
                reward: { xp: 5000, points: 10000 }
            },
            {
                id: 'level_15',
                name: 'Poder Supremo',
                description: 'Alcance nível 15',
                tier: 'gold',
                icon: '💎',
                color: '#FFD700',
                requirement: { type: 'player_level', value: 15 },
                reward: { xp: 1000, points: 2000 }
            },
            {
                id: 'all_skills',
                name: 'Maestria Completa',
                description: 'Desbloqueie todas as 10 skills',
                tier: 'gold',
                icon: '🎓',
                color: '#FFD700',
                requirement: { type: 'all_skills', value: 10 },
                reward: { xp: 3000, points: 6000 }
            },
            {
                id: 'speedrunner',
                name: 'Corredor Profissional',
                description: 'Complete o jogo em menos de 15 minutos',
                tier: 'gold',
                icon: '🚀',
                color: '#FFD700',
                requirement: { type: 'game_speedrun', value: 900 },
                reward: { xp: 4000, points: 8000 }
            },
            
            {
                id: 'bus_road_king', name: 'REI DA ESTRADA', description: 'Complete o percurso sem nenhuma colisão',
                tier: 'gold', icon: '👑', color: '#FFD700', requirement: { type: 'bus_no_collision', value: true }, reward: { xp: 1500, points: 3000 }
            },
            {
                id: 'bus_pedal_down', name: 'PÉ EMBAIXO', description: 'Complete Estrada para Vegas em até 72 segundos',
                tier: 'gold', icon: '⚡', color: '#FFD700', requirement: { type: 'bus_time', value: 72 }, reward: { xp: 1800, points: 3600 }
            },
            // ==================== PLATINA 🏆 ====================
            {
                id: 'the_legend',
                name: 'A LENDA',
                description: 'Desbloqueie TODOS os outros troféus',
                tier: 'platinum',
                icon: '🏆',
                color: '#E5E4E2',
                requirement: { type: 'all_trophies', value: 100 },
                reward: { xp: 10000, points: 50000 }
            },
            {
                id: 'genocide',
                name: 'GENOCÍDIO',
                description: 'Derrote 2000 inimigos',
                tier: 'platinum',
                icon: '☠️',
                color: '#E5E4E2',
                requirement: { type: 'kills', value: 2000 },
                reward: { xp: 5000, points: 10000 }
            },
            {
                id: 'combo_insane',
                name: 'COMBO INSANO',
                description: 'Atinja um combo de 100 hits',
                tier: 'platinum',
                icon: '🌋',
                color: '#E5E4E2',
                requirement: { type: 'combo', value: 100 },
                reward: { xp: 5000, points: 10000 }
            },
            {
                id: 'level_max',
                name: 'PODER MÁXIMO',
                description: 'Alcance nível 20 (máximo)',
                tier: 'platinum',
                icon: '✨',
                color: '#E5E4E2',
                requirement: { type: 'player_level', value: 20 },
                reward: { xp: 0, points: 20000 }
            },
            {
                id: 'millionaire',
                name: 'MILIONÁRIO',
                description: 'Acumule 100.000 pontos',
                tier: 'platinum',
                icon: '💰',
                color: '#E5E4E2',
                requirement: { type: 'score', value: 100000 },
                reward: { xp: 10000, points: 20000 }
            }
        ];
        
        this.maxScroll = Math.max(0, this.trophies.length - 5);
    }
    
    checkTrophies(gameStats = {}) {
        const mergedStats = { ...this.stats, ...gameStats };
        const newTrophies = [];
        
        this.trophies.forEach(trophy => {
            if (this.unlockedTrophies.has(trophy.id)) return;
            
            if (this.checkRequirement(trophy.requirement, mergedStats)) {
                this.unlockTrophy(trophy);
                newTrophies.push(trophy);
            }
        });
        
        return newTrophies;
    }
    
    checkRequirement(requirement, stats) {
        switch(requirement.type) {
            case 'kills':
                return stats.enemiesKilled >= requirement.value;
            case 'combo':
                return stats.maxCombo >= requirement.value;
            case 'level_complete':
                return stats.levelsCompleted >= requirement.value;
            case 'dashes':
                return stats.dashesUsed >= requirement.value;
            case 'player_level':
                return stats.playerLevel >= requirement.value;
            case 'speedrun':
                return stats.fastestLevelTime <= requirement.value;
            case 'powerups':
                return stats.powerUpsCollected >= requirement.value;
            case 'no_damage_level':
                return stats.noDamageLevels >= requirement.value;
            case 'boss_defeated':
                return stats.bossesDefeated >= requirement.value;
            case 'no_death_run':
                return stats.noDeathRun === true;
            case 'all_skills':
                return stats.unlockedSkills >= requirement.value;
            case 'game_speedrun':
                return stats.fastestGameTime <= requirement.value;
            case 'score':
                return stats.score >= requirement.value;
            case 'bus_complete':
                return (stats.busCompleted || 0) >= requirement.value;
            case 'bus_resistance':
                return (stats.busBestResistance || 0) >= requirement.value;
            case 'bus_no_collision':
                return stats.busNoCollision === true;
            case 'bus_time':
                return Number.isFinite(stats.busBestTime) && stats.busBestTime <= requirement.value;
            case 'all_trophies':
                const nonPlatinum = this.trophies.filter(t => t.tier !== 'platinum');
                const unlockedNonPlatinum = nonPlatinum.filter(t => 
                    this.unlockedTrophies.has(t.id)
                );
                return unlockedNonPlatinum.length >= nonPlatinum.length;
            default:
                return false;
        }
    }
    
    unlockTrophy(trophy) {
        if (this.unlockedTrophies.has(trophy.id)) return;
        
        this.unlockedTrophies.add(trophy.id);
        
        this.addNotification(trophy);
        // v0.9.4: conquista discreta — sem partículas/efeitos no gameplay
        this.giveReward(trophy.reward);
        
        if (window.soundSystem) {
            window.soundSystem.playSound('achievement');
        }
        
        this.saveProgress();
        
        if(window.DEV) console.log(`🏆 Troféu desbloqueado: ${trophy.name} (${trophy.tier.toUpperCase()})`);
    }
    
    createUnlockEffects(trophy) {
        // Mantido por compatibilidade com chamadas antigas.
        // Troféus não geram partículas nem texto flutuante no cenário.
        return;
    }
    
    giveReward(reward) {
        if (!reward) return;
        
        if (reward.xp && Array.isArray(window.players)) {
            window.players.forEach(player => {
                if (player?.evolution) player.evolution.addXP(reward.xp, { trophy:true });
            });
        }
        
        if (reward.points) {
            if (typeof window.addGameScore === 'function') window.addGameScore(reward.points);
        }
    }
    
    addNotification(trophy) {
        // Cartão compacto; limita a fila para não cobrir a tela quando
        // várias conquistas são liberadas ao mesmo tempo.
        this.notifications.push({
            trophy: trophy,
            time: 150,
            maxTime: 150,
            alpha: 1
        });
        if (this.notifications.length > 3) {
            this.notifications.splice(0, this.notifications.length - 3);
        }
    }
    
    updateNotifications() {
        this.notifications = this.notifications.filter(notif => {
            notif.time--;
            // Fade suave somente no final, sem partículas.
            if (notif.time < 30) {
                notif.alpha = Math.max(0, notif.time / 30);
            } else {
                notif.alpha = 1;
            }
            return notif.time > 0;
        });
    }
    
    drawNotifications(ctx) {
        const cardW = 246;
        const cardH = 46;
        const gap = 7;
        const x = 1000 - cardW - 12;
        const tierLabel = { bronze: 'BRONZE', silver: 'PRATA', gold: 'OURO', platinum: 'PLATINA' };
        
        this.notifications.forEach((notif, i) => {
            const trophy = notif.trophy;
            const y = 82 + i * (cardH + gap);
            const age = notif.maxTime - notif.time;
            // Entrada curta deslizando do canto, sem efeitos no cenário.
            const slide = Math.min(1, age / 12);
            const drawX = x + (1 - slide) * 34;
            
            ctx.save();
            ctx.globalAlpha = notif.alpha;
            ctx.fillStyle = 'rgba(8, 10, 16, 0.88)';
            ctx.fillRect(drawX, y, cardW, cardH);
            ctx.fillStyle = trophy.color;
            ctx.fillRect(drawX, y, 4, cardH);
            ctx.strokeStyle = 'rgba(255,255,255,0.15)';
            ctx.lineWidth = 1;
            ctx.strokeRect(drawX + 0.5, y + 0.5, cardW - 1, cardH - 1);
            
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.font = '20px Arial';
            ctx.fillStyle = '#fff';
            ctx.fillText(trophy.icon, drawX + 12, y + 23);
            
            ctx.font = 'bold 10px Righteous';
            ctx.fillStyle = trophy.color;
            ctx.fillText(`TROFÉU • ${tierLabel[trophy.tier] || trophy.tier.toUpperCase()}`, drawX + 42, y + 13);
            
            ctx.font = 'bold 13px Righteous';
            ctx.fillStyle = '#fff';
            ctx.fillText(trophy.name, drawX + 42, y + 28);
            
            ctx.textAlign = 'right';
            ctx.font = '9px Righteous';
            ctx.fillStyle = '#bfc5cf';
            const xp = trophy.reward?.xp || 0;
            const pts = trophy.reward?.points || 0;
            ctx.fillText(`+${xp} XP  +${pts} pts`, drawX + cardW - 8, y + 40);
            ctx.restore();
        });
    }
    
    getStats() {
        const tiers = ['bronze', 'silver', 'gold', 'platinum'];
        const stats = {
            total: this.trophies.length,
            unlocked: this.unlockedTrophies.size
        };
        
        tiers.forEach(tier => {
            const tierTrophies = this.trophies.filter(t => t.tier === tier);
            const unlockedTier = tierTrophies.filter(t => 
                this.unlockedTrophies.has(t.id)
            );
            
            stats[tier] = {
                total: tierTrophies.length,
                unlocked: unlockedTier.length
            };
        });
        
        stats.percentage = (stats.unlocked / stats.total) * 100;
        
        return stats;
    }
    

    getTrophyProgress(trophy) {
        const req = trophy.requirement || {};
        const target = req.value;
        let current = 0;
        let percent = 0;
        let label = '';

        switch (req.type) {
            case 'kills': current = this.stats.enemiesKilled || 0; break;
            case 'combo': current = this.stats.maxCombo || 0; break;
            case 'level_complete': current = this.stats.levelsCompleted || 0; break;
            case 'dashes': current = this.stats.dashesUsed || 0; break;
            case 'player_level': current = this.stats.playerLevel || 1; break;
            case 'powerups': current = this.stats.powerUpsCollected || 0; break;
            case 'no_damage_level': current = this.stats.noDamageLevels || 0; break;
            case 'boss_defeated': current = this.stats.bossesDefeated || 0; break;
            case 'all_skills': current = this.stats.unlockedSkills || 0; break;
            case 'score': current = this.stats.score || 0; break;
            case 'bus_complete': current = this.stats.busCompleted || 0; break;
            case 'bus_resistance': current = this.stats.busBestResistance || 0; break;
            case 'bus_no_collision': current = this.stats.busNoCollision ? 1 : 0; percent=current*100; label=`${current}/1 percurso perfeito`; break;
            case 'bus_time': { const best=this.stats.busBestTime; if(Number.isFinite(best)){percent=best<=target?100:Math.max(5,Math.min(99,(target/best)*100));label=`Melhor: ${this.formatTime(best)}  •  Meta: ${this.formatTime(target)}`;} else {percent=0;label=`Melhor: --:--  •  Meta: ${this.formatTime(target)}`;} break; }
            case 'no_death_run':
                current = this.stats.noDeathRun ? 1 : 0;
                percent = current * 100;
                label = `${current}/1 corrida sem morrer`;
                break;
            case 'speedrun': {
                const best = this.stats.fastestLevelTime;
                if (Number.isFinite(best)) {
                    percent = best <= target ? 100 : Math.max(5, Math.min(99, (target / best) * 100));
                    label = `Melhor: ${this.formatTime(best)}  •  Meta: ${this.formatTime(target)}`;
                } else {
                    percent = 0;
                    label = `Melhor: --:--  •  Meta: ${this.formatTime(target)}`;
                }
                break;
            }
            case 'game_speedrun': {
                const best = this.stats.fastestGameTime;
                if (Number.isFinite(best)) {
                    percent = best <= target ? 100 : Math.max(5, Math.min(99, (target / best) * 100));
                    label = `Melhor: ${this.formatTime(best)}  •  Meta: ${this.formatTime(target)}`;
                } else {
                    percent = 0;
                    label = `Melhor: --:--  •  Meta: ${this.formatTime(target)}`;
                }
                break;
            }
            case 'all_trophies': {
                const nonPlatinum = this.trophies.filter(t => t.tier !== 'platinum');
                current = nonPlatinum.filter(t => this.unlockedTrophies.has(t.id)).length;
                const total = nonPlatinum.length;
                percent = total ? (current / total) * 100 : 0;
                label = `${current}/${total} troféus principais`;
                break;
            }
        }

        if (!label) {
            const numericTarget = Number(target) || 1;
            percent = Math.max(0, Math.min(100, (Number(current) / numericTarget) * 100));
            label = `${Math.min(Number(current) || 0, numericTarget)}/${numericTarget}`;
        }

        if (this.unlockedTrophies.has(trophy.id)) percent = 100;
        return { current, target, percent, label };
    }

    formatTime(seconds) {
        if (!Number.isFinite(seconds)) return '--:--';
        const total = Math.max(0, Math.floor(seconds));
        const min = Math.floor(total / 60);
        const sec = total % 60;
        return `${min}:${String(sec).padStart(2, '0')}`;
    }

    draw(ctx) {
        // Fundo escuro
        ctx.fillStyle = 'rgba(0, 0, 0, 0.95)';
        ctx.fillRect(0, 0, 1000, 650);
        
        // Título
        ctx.save();
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#FFD700';
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 48px Permanent Marker';
        ctx.textAlign = 'center';
        ctx.fillText('🏆 TROFÉUS 🏆', 500, 60);
        ctx.restore();
        
        // Stats gerais
        const stats = this.getStats();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 20px Righteous';
        ctx.fillText(`${stats.unlocked} / ${stats.total} desbloqueados (${stats.percentage.toFixed(1)}%)`, 500, 95);
        
        // Stats por tier com CORES
        const tiers = [
            { name: 'Bronze', key: 'bronze', color: '#CD7F32', icon: '🥉' },
            { name: 'Prata', key: 'silver', color: '#C0C0C0', icon: '🥈' },
            { name: 'Ouro', key: 'gold', color: '#FFD700', icon: '🥇' },
            { name: 'Platina', key: 'platinum', color: '#E5E4E2', icon: '🏆' }
        ];
        
        const tierX = 150;
        const tierY = 125;
        const tierSpacing = 210;
        
        tiers.forEach((tier, i) => {
            const x = tierX + (i * tierSpacing);
            const tierStat = stats[tier.key];
            
            // Ícone com cor
            ctx.font = 'bold 28px Arial';
            ctx.fillStyle = tier.color;
            ctx.shadowBlur = 10;
            ctx.shadowColor = tier.color;
            ctx.fillText(tier.icon, x, tierY);
            ctx.shadowBlur = 0;
            
            // Contagem
            ctx.font = 'bold 16px Righteous';
            ctx.fillStyle = '#fff';
            ctx.fillText(`${tierStat.unlocked}/${tierStat.total}`, x, tierY + 25);
        });
        
        // Lista de troféus
        const startY = 180;
        const itemHeight = 86;
        const visibleCount = 5;
        
        // Scroll indicators
        if (this.scrollOffset > 0) {
            ctx.fillStyle = '#FFD700';
            ctx.font = 'bold 20px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('▲', 500, startY - 10);
        }
        
        if (this.scrollOffset < this.maxScroll) {
            ctx.fillStyle = '#FFD700';
            ctx.font = 'bold 20px Arial';
            ctx.fillText('▼', 500, startY + (visibleCount * itemHeight) + 10);
        }
        
        // Desenhar troféus visíveis
        const visibleTrophies = this.trophies.slice(
            this.scrollOffset,
            this.scrollOffset + visibleCount
        );
        
        visibleTrophies.forEach((trophy, i) => {
            const y = startY + (i * itemHeight);
            const unlocked = this.unlockedTrophies.has(trophy.id);
            
            // Background com cor do tier
            ctx.fillStyle = unlocked 
                ? `${trophy.color}22` // 22 = ~13% opacity em hex
                : 'rgba(50, 50, 50, 0.15)';
            ctx.fillRect(50, y, 900, itemHeight - 5);
            
            // Border com cor do tier
            ctx.strokeStyle = unlocked ? trophy.color : '#555';
            ctx.lineWidth = 2;
            ctx.strokeRect(50, y, 900, itemHeight - 5);
            
            // Ícone
            ctx.font = '36px Arial';
            ctx.fillStyle = unlocked ? trophy.color : '#555';
            ctx.textAlign = 'center';
            ctx.fillText(trophy.icon, 90, y + 45);
            
            // Nome
            ctx.font = 'bold 18px Righteous';
            ctx.fillStyle = unlocked ? '#fff' : '#888';
            ctx.textAlign = 'left';
            ctx.fillText(trophy.name, 130, y + 28);
            
            // Descrição
            ctx.font = '14px Righteous';
            ctx.fillStyle = unlocked ? '#ccc' : '#666';
            ctx.fillText(trophy.description, 130, y + 50);
            
            // Recompensa
            ctx.font = '11px Righteous';
            ctx.fillStyle = unlocked ? '#FFD700' : '#777';
            ctx.fillText(`+${trophy.reward.xp} XP  |  +${trophy.reward.points} pts`, 130, y + 68);

            // Progresso da conquista
            const progress = this.getTrophyProgress(trophy);
            const barX = 535;
            const barY = y + 57;
            const barW = 385;
            const barH = 10;

            ctx.fillStyle = 'rgba(0,0,0,0.55)';
            ctx.fillRect(barX, barY, barW, barH);
            ctx.fillStyle = unlocked ? trophy.color : '#777';
            ctx.fillRect(barX, barY, barW * (progress.percent / 100), barH);
            ctx.strokeStyle = unlocked ? trophy.color : '#555';
            ctx.lineWidth = 1;
            ctx.strokeRect(barX + 0.5, barY + 0.5, barW - 1, barH - 1);

            ctx.textAlign = 'right';
            ctx.font = 'bold 11px Righteous';
            ctx.fillStyle = unlocked ? '#fff' : '#bcbcbc';
            ctx.fillText(`${progress.label}  •  ${Math.floor(progress.percent)}%`, 920, y + 78);
            
            // Badge do tier com COR
            ctx.font = 'bold 12px Righteous';
            ctx.fillStyle = trophy.color;
            ctx.fillText(trophy.tier.toUpperCase(), 930, y + 27);
            
            // Status
            if (unlocked) {
                ctx.fillStyle = '#64ff7c';
                ctx.font = 'bold 13px Righteous';
                ctx.fillText('✓ CONCLUÍDO', 930, y + 47);
            } else {
                ctx.fillStyle = '#ff8b8b';
                ctx.font = '11px Righteous';
                ctx.fillText('EM PROGRESSO', 930, y + 47);
            }
        });
        
        // Instruções
        ctx.fillStyle = '#888';
        ctx.font = '16px Righteous';
        ctx.textAlign = 'center';
        ctx.fillText('↑↓ ou WS - Rolar  |  ESC ou ENTER - Voltar', 500, 625);
    }
    
    scrollUp() {
        this.scrollOffset = Math.max(0, this.scrollOffset - 1);
    }
    
    scrollDown() {
        this.scrollOffset = Math.min(this.maxScroll, this.scrollOffset + 1);
    }
    
    saveProgress() {
        const data = {
            unlockedTrophies: Array.from(this.unlockedTrophies),
            stats: this.stats
        };
        
        localStorage.setItem('game_trophies', JSON.stringify(data));
    }
    
    loadProgress() {
        try {
            const data = localStorage.getItem('game_trophies');
            if (data) {
                const parsed = JSON.parse(data);
                this.unlockedTrophies = new Set(parsed.unlockedTrophies || []);
                this.stats = { ...this.stats, ...parsed.stats };
                if(window.DEV) console.log('✅ Troféus carregados:', this.unlockedTrophies.size);
            }
        } catch (e) {
            console.error('❌ Erro ao carregar troféus:', e);
        }
    }
    
    reset() {
        this.unlockedTrophies.clear();
        this.stats = {
            enemiesKilled: 0,
            maxCombo: 0,
            dashesUsed: 0,
            powerUpsCollected: 0,
            levelsCompleted: 0,
            bossesDefeated: 0,
            playerLevel: 1,
            deaths: 0,
            score: 0,
            fastestLevelTime: Infinity,
            fastestGameTime: Infinity,
            noDamageLevels: 0,
            noDeathRun: false,
            unlockedSkills: 0,
            busCompleted: 0,
            busBestResistance: 0,
            busNoCollision: false,
            busBestTime: Infinity
        };
        this.saveProgress();
        if(window.DEV) console.log('🔄 Troféus resetados');
    }
}

// Criar instância global
if (typeof window !== 'undefined') {
    window.trophySystem = new TrophySystem();
    if(window.DEV) console.log('✅ Sistema de Troféus carregado');
}
