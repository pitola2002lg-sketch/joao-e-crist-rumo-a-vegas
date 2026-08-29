// ========== SISTEMA DE SALVAMENTO ==========
class SaveSystem {
    constructor() {
        this.data = {
            highScore: 0,
            highestLevel: 0,
            totalPlaytime: 0,
            gamesPlayed: 0,
            favoriteCharacter: null,
            gameCompleted: false,
            campaignCheckpoint: null,
            lastSessionStartedAt: null,
            busMinigameUnlocked: false,
            busBestTime: null,
            busBestResistance: 0,
            busNoCollision: false,
            busTrophies: [],
            chicoUnlocked: false,
            fishingBonusCompleted: false,
            playerProgress: {
                João: { version: 2, level: 1, xp: 0, xpToNextLevel: 100, totalXpEarned: 0, killStats: { melee:0, ranged:0, assist:0, boss:0 }, unlockedSkills: [] },
                Crist: { version: 2, level: 1, xp: 0, xpToNextLevel: 100, totalXpEarned: 0, killStats: { melee:0, ranged:0, assist:0, boss:0 }, unlockedSkills: [] },
                'Chico Fumaça': { version: 2, level: 1, xp: 0, xpToNextLevel: 100, totalXpEarned: 0, killStats: { melee:0, ranged:0, assist:0, boss:0 }, unlockedSkills: [] }
            }
        };
        this.loadSave();
    }
    
    load() {
        return this.data;
    }
    
    save(gameData) {
        if (gameData.score) {
            this.updateHighScore(gameData.score);
        }
        if (gameData.level) {
            this.updateHighestLevel(gameData.level);
        }
        if (gameData.playerCharacter) {
            this.updateFavoriteCharacter(gameData.playerCharacter);
        }
        // save() persiste estado; não contabiliza uma nova partida.
    }
    
    updateHighScore(score) {
        if (score > this.data.highScore) {
            this.data.highScore = score;
            this.saveSave();
            return true;
        }
        return false;
    }
    
    updateHighestLevel(level) {
        if (level > this.data.highestLevel) {
            this.data.highestLevel = level;
            this.saveSave();
        }
    }
    
    markGameCompleted() {
        if (!this.data.gameCompleted) {
            this.data.gameCompleted = true;
            this.data.completedAt = Date.now();
            this.saveSave();
        }
    }
    

    saveCampaignCheckpoint(checkpoint = {}) {
        // Checkpoint guarda apenas o início de uma fase. Evolução individual continua
        // sendo persistida pelo sistema já existente de playerProgress.
        if (this.data.gameCompleted) return false;
        const levelIndex = Math.max(0, Math.min(7, Number(checkpoint.levelIndex) || 0));
        const chars = Array.isArray(checkpoint.selectedCharacters)
            ? checkpoint.selectedCharacters.filter(Boolean).slice(0, 2)
            : [];
        if (!chars.length) return false;
        this.data.campaignCheckpoint = {
            version: 1,
            levelIndex,
            playerCount: Math.max(1, Math.min(2, Number(checkpoint.playerCount) || chars.length || 1)),
            selectedCharacters: chars,
            score: Math.max(0, Number(checkpoint.score) || 0),
            savedAt: Date.now()
        };
        this.saveSave();
        return true;
    }

    loadCampaignCheckpoint() {
        const cp = this.data.campaignCheckpoint;
        if (!cp || this.data.gameCompleted) return null;
        const levelIndex = Number(cp.levelIndex);
        if (!Number.isFinite(levelIndex) || levelIndex < 0 || levelIndex > 7) return null;
        const chars = Array.isArray(cp.selectedCharacters) ? cp.selectedCharacters.filter(Boolean).slice(0,2) : [];
        if (!chars.length) return null;
        return {
            version: 1,
            levelIndex,
            playerCount: Math.max(1, Math.min(2, Number(cp.playerCount) || chars.length || 1)),
            selectedCharacters: chars,
            score: Math.max(0, Number(cp.score) || 0),
            savedAt: Number(cp.savedAt) || null
        };
    }

    clearCampaignCheckpoint() {
        if (this.data.campaignCheckpoint !== null) {
            this.data.campaignCheckpoint = null;
            this.saveSave();
        }
    }


    recordBusResult(result = {}) {
        const time = Number(result.time);
        const resistance = Math.max(0, Math.min(100, Number(result.resistance) || 0));
        this.data.busMinigameUnlocked = true;
        if (Number.isFinite(time) && time > 0 && (!Number.isFinite(this.data.busBestTime) || time < this.data.busBestTime)) this.data.busBestTime = time;
        this.data.busBestResistance = Math.max(Number(this.data.busBestResistance) || 0, resistance);
        if (result.noCollision) this.data.busNoCollision = true;
        if (!Array.isArray(this.data.busTrophies)) this.data.busTrophies = [];
        const add = id => { if (!this.data.busTrophies.includes(id)) this.data.busTrophies.push(id); };
        add('bus_road_trip');
        if (resistance >= 75) add('bus_good_driver');
        if (result.noCollision) add('bus_road_king');
        if (Number.isFinite(time) && time <= 72) add('bus_pedal_down');
        this.saveSave();
    }


    beginGame() {
        this.data.gamesPlayed = (Number(this.data.gamesPlayed) || 0) + 1;
        this.data.lastSessionStartedAt = Date.now();
        this.saveSave();
    }

    addPlaytime(seconds) {
        const safe = Math.max(0, Number(seconds) || 0);
        if (!safe) return;
        this.data.totalPlaytime = (Number(this.data.totalPlaytime) || 0) + safe;
        this.saveSave();
    }

    incrementGamesPlayed() {
        this.data.gamesPlayed++;
        this.saveSave();
    }
    
    updateFavoriteCharacter(character) {
        this.data.favoriteCharacter = character;
        this.saveSave();
    }
    
    savePlayerProgress(characterName, evolutionData) {
        if (!this.data.playerProgress) {
            this.data.playerProgress = {
                João: { version: 2, level: 1, xp: 0, xpToNextLevel: 100, totalXpEarned: 0, killStats: { melee:0, ranged:0, assist:0, boss:0 }, unlockedSkills: [] },
                Crist: { version: 2, level: 1, xp: 0, xpToNextLevel: 100, totalXpEarned: 0, killStats: { melee:0, ranged:0, assist:0, boss:0 }, unlockedSkills: [] }
            };
        }
        this.data.playerProgress[characterName] = evolutionData;
        this.saveSave();
    }
    
    loadPlayerProgress(characterName) {
        if (!this.data.playerProgress || !this.data.playerProgress[characterName]) {
            return { version: 2, level: 1, xp: 0, xpToNextLevel: 100, totalXpEarned: 0, killStats: { melee:0, ranged:0, assist:0, boss:0 }, unlockedSkills: [] };
        }
        return this.data.playerProgress[characterName];
    }
    
    unlockChico() {
        const firstUnlock = !this.data.chicoUnlocked;
        this.data.chicoUnlocked = true;
        this.data.fishingBonusCompleted = true;
        if (!this.data.playerProgress['Chico Fumaça']) {
            this.data.playerProgress['Chico Fumaça'] = { version: 2, level: 1, xp: 0, xpToNextLevel: 100, totalXpEarned: 0, killStats: { melee:0, ranged:0, assist:0, boss:0 }, unlockedSkills: [] };
        }
        this.saveSave();
        return firstUnlock;
    }

    isChicoUnlocked() { return !!this.data.chicoUnlocked; }

    saveSave() {
        try {
            localStorage.setItem('joaoCristSave', JSON.stringify(this.data));
        } catch (e) {
            if(window.DEV) console.warn('Não foi possível salvar progresso');
        }
    }
    
    loadSave() {
        try {
            const saved = localStorage.getItem('joaoCristSave');
            if (saved) {
                const parsed = JSON.parse(saved);
                this.data = { ...this.data, ...parsed, playerProgress: { ...this.data.playerProgress, ...(parsed.playerProgress || {}) } };
                if (typeof this.data.busMinigameUnlocked !== 'boolean') this.data.busMinigameUnlocked = false;
                if (!Number.isFinite(this.data.busBestTime)) this.data.busBestTime = null;
                this.data.busBestResistance = Number(this.data.busBestResistance) || 0;
                this.data.busNoCollision = !!this.data.busNoCollision;
                if (!Array.isArray(this.data.busTrophies)) this.data.busTrophies = [];
                this.data.chicoUnlocked = !!this.data.chicoUnlocked;
                this.data.fishingBonusCompleted = !!this.data.fishingBonusCompleted;
                if (!this.data.playerProgress['Chico Fumaça']) this.data.playerProgress['Chico Fumaça'] = { version: 2, level: 1, xp: 0, xpToNextLevel: 100, totalXpEarned: 0, killStats: { melee:0, ranged:0, assist:0, boss:0 }, unlockedSkills: [] };
                // Migração de saves antigos: quem já alcançou/zerou a última fase também recebe o seletor.
                if (typeof this.data.gameCompleted !== 'boolean') {
                    this.data.gameCompleted = Number(this.data.highestLevel || 0) >= 8;
                }
                if (!this.data.campaignCheckpoint || typeof this.data.campaignCheckpoint !== 'object') this.data.campaignCheckpoint = null;
                if (this.data.gameCompleted) this.data.campaignCheckpoint = null;
            }
        } catch (e) {
            if(window.DEV) console.warn('Não foi possível carregar progresso');
        }
    }
    
    resetSave() {
        if (confirm('Tem certeza que deseja resetar todo o progresso?')) {
            this.data = {
                highScore: 0,
                highestLevel: 0,
                totalPlaytime: 0,
                gamesPlayed: 0,
                favoriteCharacter: null,
                gameCompleted: false,
                campaignCheckpoint: null,
                lastSessionStartedAt: null,
                busMinigameUnlocked: false,
                busBestTime: null,
                busBestResistance: 0,
                busNoCollision: false,
                busTrophies: [],
                chicoUnlocked: false,
                fishingBonusCompleted: false,
                playerProgress: {
                    João: { version: 2, level: 1, xp: 0, xpToNextLevel: 100, totalXpEarned: 0, killStats: { melee:0, ranged:0, assist:0, boss:0 }, unlockedSkills: [] },
                    Crist: { version: 2, level: 1, xp: 0, xpToNextLevel: 100, totalXpEarned: 0, killStats: { melee:0, ranged:0, assist:0, boss:0 }, unlockedSkills: [] },
                    'Chico Fumaça': { version: 2, level: 1, xp: 0, xpToNextLevel: 100, totalXpEarned: 0, killStats: { melee:0, ranged:0, assist:0, boss:0 }, unlockedSkills: [] }
                }
            };
            this.saveSave();
            
            // Limpar conquistas também
            localStorage.removeItem('joaoCristAchievements');
            localStorage.removeItem('joaoCristStats');
            localStorage.removeItem('trophies');
            localStorage.removeItem('game_trophies');
        }
    }
}
