const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

// Estados do jogo
const GameState = {
    LOADING: 'loading',
    MENU: 'menu',
    TUTORIAL: 'tutorial', // Melhoria #20: Tutorial
    CONTROLS_CONFIG: 'controls_config',
    OPTIONS: 'options',
    CHARACTER_SELECT: 'character_select',
    STORY_INTRO: 'story_intro',
    STORY_LEVEL: 'story_level',
    LEVEL_INTRO: 'level_intro',
    PLAYING: 'playing',
    PAUSED: 'paused',
    LEVEL_COMPLETE: 'level_complete',
    GAME_OVER: 'gameover',
    VICTORY: 'victory',
    ACHIEVEMENTS: 'achievements',
    TROPHIES: 'trophies',  // ✅ SPRINT 1 FIX: Adicionado
    STAGE_SELECT: 'stage_select',
    BUS_BOARDING: 'bus_boarding',
    BUS_MINIGAME: 'bus_minigame',
    FISHING_BONUS: 'fishing_bonus',
    BUS_ARRIVAL: 'bus_arrival',
    CUTSCENE: 'cutscene'
};

let gameState = GameState.LOADING; // Melhoria #19: Começar em loading
let loadingProgress = 0;
let keys = {};
let players = [];
let enemies = [];
let cameraX = 0;
let score = 0;
let particles = [];
const MAX_PARTICLES = 500; // Bug #5: Limite máximo de partículas
let currentLevel = null;
let currentLevelIndex = 0;
let levelIntroTimer = 0;
let levelCompleteTimer = 0;
let playerCount = 1;

// ========== SISTEMA DE BOSS ==========
let bossSpawned = false;        // Se o boss já foi spawnado nesta fase
let bossPhase = false;          // Se estamos na fase de boss (inimigos normais mortos)
let bossDefeated = false;       // Se o boss foi derrotado
let bossWarningTimer = 0;       // Timer para aviso de aparição do boss
const BOSS_WARNING_DURATION = 180; // 3 segundos de aviso

// ========== SISTEMA DE ONDAS (Expansão) ==========
let waveSystem = null;
let enemySpawnDirector = null; // grupos liberados conforme avanço do jogador
let levelLoadToken = 0; // invalida callbacks de fases antigas          // WaveSystem para fases 6-8
let levelGateActive = false;    // Tela de gate de nível ativa
let menuSelection = 0;
let menuOptions = [];
let menuButtonRects = [];
let menuPointerActive = false;
let stageSelectIndex = 0;
let pendingStartLevel = 0;
let stageSelectPlayers = 1;
let pendingResumeCheckpoint = null;
function getStageSelectCount(){ return LEVELS.length + (saveSystem?.load?.().busMinigameUnlocked ? 1 : 0) + 1; }
function stageSelectBusIndex(){ return saveSystem?.load?.().busMinigameUnlocked ? LEVELS.length : -1; }
function stageSelectChicoIndex(){ return LEVELS.length + (saveSystem?.load?.().busMinigameUnlocked ? 1 : 0); }
function stageSelectIsBusBonus(){ return stageSelectIndex === stageSelectBusIndex(); }
function stageSelectIsChicoBonus(){ return stageSelectIndex === stageSelectChicoIndex(); }

function refreshMenuOptions() {
    const completed = !!saveSystem?.load?.().gameCompleted;
    menuOptions = ['1 JOGADOR', '2 JOGADORES', 'COMO JOGAR: JOÃO & CRIST', 'CONFIGURAR CONTROLES', 'TROFÉUS', 'OPÇÕES'];
    const checkpoint = saveSystem?.loadCampaignCheckpoint?.();
    if (checkpoint && !completed) menuOptions.push('CONTINUAR CAMPANHA');
    if (completed) menuOptions.push('SELECIONAR FASE');
    if (saveSystem?.load?.().busMinigameUnlocked) menuOptions.push('BÔNUS — ESTRADA PARA VEGAS');
    // v0.9.4: bônus da pescaria é independente da campanha e fica sempre disponível.
    menuOptions.push('BÔNUS — PESCARIA DO CHICO FUMAÇA');
    if (menuSelection >= menuOptions.length) menuSelection = menuOptions.length - 1;
}

let controlsConfigPlayer = 1;
let controlsConfigSelection = 0;
let controlsConfigCapture = false;
let controlsConfigDevice = 'keyboard'; // keyboard | gamepad
let controlsConfigMessage = '';
const controlsConfigActions = ['left', 'right', 'up', 'attack', 'ranged', 'dash', 'pause'];
const controlsConfigLabels = { left:'Mover esquerda', right:'Mover direita', up:'Pular', attack:'Atacar', ranged:'Tiro / Ataque à distância', dash:'Dash / Esquiva', pause:'Pausar' };
let gamepadSystem = new GamepadSystem(sistemControles); window.gamepadSystem = gamepadSystem;
let soundSystem = new SoundSystem(); window.soundSystem = soundSystem;
let gameSettings = new SettingsSystem(); window.gameSettings = gameSettings; gameSettings.applyAudio(soundSystem);
let optionsSelection = 0;
const optionsItems = ['VOLUME GERAL','MÚSICA','EFEITOS','QUALIDADE GRÁFICA','VIBRAÇÃO','DIFICULDADE','TELA CHEIA'];
let selectedCharacters = [null, null]; // [Player1, Player2]
let characterSelectCursor = 0; // Qual jogador está selecionando (0 ou 1)
let characterSelectReady = false; // Evita seleção imediata ao entrar na tela
let characterSelectTransition = null; // animação de confirmação na seleção de personagem
let characterSelectTransitionToken = 0;
let screenShake = 0; // Intensidade do screen shake
let hitStopFrames = 0; // Freeze frames em hits fortes
const pauseMenuBg = window.assetManager.image('assets/ui/pause-menu-vegas.webp','shared');

let pauseReturnState = GameState.PLAYING;
let pauseStartedAt = 0;
let pauseSnapshot = null;
let pauseMenuSelection = 0;
const pauseMenuItems = ['CONTINUAR','VOLUME GERAL','MÚSICA','EFEITOS','QUALIDADE GRÁFICA','VIBRAÇÃO','TELA CHEIA','VOLTAR AO MENU'];

function capturePauseSnapshot() {
    try {
        if (!pauseSnapshot) pauseSnapshot = document.createElement('canvas');
        pauseSnapshot.width = canvas.width;
        pauseSnapshot.height = canvas.height;
        const pctx = pauseSnapshot.getContext('2d');
        pctx.imageSmoothingEnabled = false;
        pctx.clearRect(0,0,pauseSnapshot.width,pauseSnapshot.height);
        pctx.drawImage(canvas,0,0);
    } catch (_) { pauseSnapshot = null; }
}

function shiftPauseSensitiveTimestamps(obj, deltaMs, depth=0, seen=new Set()) {
    if (!obj || typeof obj !== 'object' || depth > 2 || seen.has(obj)) return;
    seen.add(obj);
    for (const key of Object.keys(obj)) {
        let value;
        try { value = obj[key]; } catch (_) { continue; }
        if (typeof value === 'number') {
            const looksLikeTimestamp = /(?:time|start|started|last|next|aim|laser|meteor|teleport|cooldown|anim)/i.test(key);
            if (looksLikeTimestamp && value > 1000) obj[key] = value + deltaMs;
        } else if (value && typeof value === 'object' && !Array.isArray(value) && depth < 1) {
            shiftPauseSensitiveTimestamps(value, deltaMs, depth + 1, seen);
        }
    }
}

function enterTruePause(fromState=gameState) {
    if (gameState === GameState.PAUSED) return;
    pauseReturnState = fromState || GameState.PLAYING;
    pauseStartedAt = performance.now();
    pauseMenuSelection = 0;
    capturePauseSnapshot();
    gameState = GameState.PAUSED;
    soundSystem?.pauseAll?.();
    window.GameRuntime?.pauseTimers?.();
    clearKeys();
    if (window.GameDebugConsole) window.GameDebugConsole.log('[PAUSE] Simulação congelada');
}

function resumeTruePause() {
    if (gameState !== GameState.PAUSED) return;
    const pausedMs = Math.max(0, performance.now() - pauseStartedAt);
    if (gameStartTime) gameStartTime += pausedMs;
    if (levelStartTime) levelStartTime += pausedMs;
    if (lastPlaytimeSaveAt) lastPlaytimeSaveAt += pausedMs;
    for (const p of players) shiftPauseSensitiveTimestamps(p, pausedMs);
    for (const e of enemies) shiftPauseSensitiveTimestamps(e, pausedMs);
    if (waveSystem) shiftPauseSensitiveTimestamps(waveSystem, pausedMs);
    if (enemySpawnDirector) shiftPauseSensitiveTimestamps(enemySpawnDirector, pausedMs);
    if (window.busSequence) {
        if (window.busSequence.lastTime) window.busSequence.lastTime += pausedMs;
        if (window.busSequence.boarding?.start) window.busSequence.boarding.start += pausedMs;
        if (window.busSequence.arrival?.start) window.busSequence.arrival.start += pausedMs;
    }
    if (window.storyCutscenes?.active) {
        if (window.storyCutscenes.startedAt) window.storyCutscenes.startedAt += pausedMs;
        if (window.storyCutscenes.lineStartedAt) window.storyCutscenes.lineStartedAt += pausedMs;
    }
    gameState = pauseReturnState || GameState.PLAYING;
    pauseStartedAt = 0;
    soundSystem?.resumeAll?.();
    window.GameRuntime?.resumeTimers?.();
    clearKeys();
    try { __fixedAccum = 0; __fixedLast = performance.now(); } catch (_) {}
    if (window.GameDebugConsole) window.GameDebugConsole.log('[PAUSE] Simulação retomada');
}

window.enterTruePause = enterTruePause;
window.resumeTruePause = resumeTruePause;

// Bug #2: Modal customizado para substituir confirm()
let showModal = false;
let modalMessage = '';
let modalCallback = null;

// ✅ SPRINT 1 FIX: Event listeners gerenciados
let keyDownHandler = null;
let keyUpHandler = null;

// Melhoria #14: Performance monitoring
let fpsCounter = 0;
let fpsLastTime = Date.now();
let currentFPS = 60;
let debugMode = false;

// Melhoria #47: Modo de acessibilidade
let highContrastMode = false;

// ========== NOVOS SISTEMAS ==========
// Sistema unificado carregado via unified-achievements.js
let saveSystem = new SaveSystem();
refreshMenuOptions();
let powerUps = [];
let destructibles = []; // Caixas/barris que guardam power-ups

// ===== SPRITES 16-BIT DOS RECIPIENTES =====
const containerSprites = {};
['crate', 'barrel'].forEach(type => {
    const src=type === 'crate' ? 'assets/objects/wood-crate-16bit.webp' : 'assets/objects/wood-barrel-16bit.webp';
    containerSprites[type] = window.assetManager.image(src,'shared');
});
window.containerSprites = containerSprites;

// ===== SPRITES 16-BIT DOS POWER-UPS =====
const powerUpSprites = {};
['health', 'speed', 'strength', 'invincible', 'score'].forEach(type => {
    const src=`assets/powerups/${type}-16bit.webp`;
    powerUpSprites[type] = window.assetManager.image(src,'shared');
});
window.powerUpSprites = powerUpSprites;

let projectiles = [];  // NOVO: Sistema de projéteis para Sniper
let levelStartTime = 0;
let levelDamageTaken = 0;
let gameStartTime = 0;
let victoryCommitted = false;
let gameOverCommitted = false;
let completedLevelStats = new Set();
let sessionPlaytimeSeconds = 0;
let lastPlaytimeSaveAt = 0;
const particlePool = [];
const projectilePool = [];
let totalGameDamage = 0;

// Sistema de Troféus (inicializado depois)
let trophySystem = null;

// Sistema de Game Over - Inicializar imediatamente
let gameOverScreen = new GameOverScreen();

// Tornar variáveis acessíveis globalmente para os novos sistemas
window.particles = particles;
window.getGameScore = () => score;
window.addGameScore = (value) => { score += Number(value) || 0; return score; };
window.acquireProjectile = (data={}) => { const p=projectilePool.pop() || {}; if(p.hitEnemies?.clear)p.hitEnemies.clear(); Object.assign(p,data); return p; };
Object.defineProperty(window, 'enemies', { configurable: true, get: () => enemies, set: value => { enemies = value; } });
Object.defineProperty(window, 'players', { configurable: true, get: () => players, set: value => { players = value; } });
window.soundSystem = soundSystem;
window.saveSystem = saveSystem;
Object.defineProperty(window, 'selectedCharacters', { configurable: true, get: () => selectedCharacters, set: value => { selectedCharacters = value; } });
window.projectiles = projectiles;  // NOVO: Tornar projéteis globais
window.powerUps = powerUps;  // NOVO: Tornar powerUps globais para drops
window.destructibles = destructibles;
Object.defineProperty(window, 'screenShake', { configurable: true, get: () => screenShake, set: value => { screenShake = value; } }); // NOVO: Screen shake global
Object.defineProperty(window, 'hitStopFrames', { configurable: true, get: () => hitStopFrames, set: value => { hitStopFrames = Math.max(0, Number(value) || 0); } }); // v5.5: hit-stop acessível aos sistemas externos
window.eventBus = null; // Pode ser usado se implementar eventBus

// Partículas de fundo
let bgParticles = [];
for (let i = 0; i < 50; i++) {
    bgParticles.push({
        x: Math.random() * 1000,
        y: Math.random() * 650,
        size: Math.random() * 3,
        speedX: Math.random() * 0.5 - 0.25,
        speedY: Math.random() * 0.5 - 0.25,
        hue: Math.random() * 360
    });
}

// ═══════════════════════════════════════════════════════════════
// ✅ SPRINT 1 FIX: Funções de Cleanup (Memory Leak Fix)
// ═══════════════════════════════════════════════════════════════

function getEffectiveGraphicsQuality() {
    const configured = gameSettings?.data?.graphicsQuality || 'auto';
    if (configured !== 'auto') return configured;
    const fps = Number.isFinite(currentFPS) ? currentFPS : 60;
    if (fps < 42) return 'low';
    if (fps < 54) return 'medium';
    return 'high';
}
function getParticleLimit() {
    return ({high:500,medium:320,low:180})[getEffectiveGraphicsQuality()] || 500;
}
function getParticleScale() {
    return ({high:1,medium:.75,low:.5})[getEffectiveGraphicsQuality()] || 1;
}
function graphicsQualityDisplay() {
    const configured = gameSettings?.data?.graphicsQuality || 'auto';
    const base = gameSettings?.graphicsQualityLabel?.() || configured.toUpperCase();
    return configured === 'auto' ? `${base} (${getEffectiveGraphicsQuality().toUpperCase()})` : base;
}

/**
 * Limpa partículas mortas e excesso de partículas
 */
function cleanupParticles() {
    // Remover partículas mortas sem criar um novo array; objetos simples são reciclados.
    const before = particles.length;
    let w=0;
    const particleLimit=getParticleLimit();
    for(let i=0;i<particles.length;i++){ const p=particles[i]; if(p.life>0) particles[w++]=p; else if(particlePool.length<particleLimit) particlePool.push(p); }
    particles.length=w;
    
    // Limitar tamanho máximo (prevenir memory leak)
    if (particles.length > particleLimit) {
        const removed = particles.length - particleLimit;
        particles.splice(0, particles.length - particleLimit);
        if (debugMode) {
            if(window.DEV) console.warn(`⚠️ Limite de partículas atingido! Removendo ${removed} antigas`);
        }
    }
    
    const removed = before - particles.length;
    if (debugMode && removed > 10) {
        if(window.DEV) console.log(`🧹 Limpou ${removed} partículas`);
    }
}

/**
 * Limpa projéteis inativos e fora da tela
 */
function cleanupProjectiles() {
    const before = projectiles.length;
    
    const kept=[];
    for(const p of projectiles){
        const camX=(typeof cameraX==='number'&&Number.isFinite(cameraX))?cameraX:0;
        const invalid=p.dead || p.x<camX-350 || p.x>camX+canvas.width+350 || p.y<-250 || p.y>canvas.height+250 || (p.life!==undefined&&p.life<=0);
        if(invalid){ if(projectilePool.length<160){ if(p.hitEnemies?.clear)p.hitEnemies.clear(); projectilePool.push(p); } }
        else kept.push(p);
    }
    projectiles.splice(0,projectiles.length,...kept);
    
    const removed = before - projectiles.length;
    if (debugMode && removed > 0) {
        if(window.DEV) console.log(`🧹 Removidos ${removed} projéteis`);
    }
}

/**
 * Limpa power-ups coletados
 */
function cleanupPowerUps() {
    const before = powerUps.length;
    powerUps.splice(0, powerUps.length, ...powerUps.filter(p => !p.collected));
    
    const removed = before - powerUps.length;
    if (debugMode && removed > 0) {
        if(window.DEV) console.log(`🧹 Removidos ${removed} power-ups`);
    }
}

function replayPreviousLevelFromGate() {
    if (!levelGateActive) return false;
    const replayIndex = Math.max(0, currentLevelIndex - 1);
    levelGateActive = false;
    gameOverScreen?.deactivate?.();
    clearKeys?.();
    soundSystem?.stopMusic?.();
    transitionToLevel(replayIndex,()=>{ gameState=GameState.LEVEL_INTRO; levelIntroTimer=180; });
    soundSystem?.playSound?.('menuSelect');
    return true;
}

function returnToMenuFromGameOver() {
    levelGateActive = false;
    gameOverScreen?.deactivate?.();
    soundSystem?.stopMusic?.();
    window.GameRuntime?.cancelTimersFor?.('level');
    window.GameRuntime?.cancelTimersFor?.('boss');
    clearKeys?.();
    releaseCurrentLevelForMenu();
    gameState = GameState.MENU;
    refreshMenuOptions?.();
    menuSelection = 0;
    soundSystem?.playSound?.('menuBack');
}

// Event listeners
document.addEventListener('keydown', e => {
    const normalizedKey = sistemControles.normalizarTecla(e.key);
    if (window.__gameLoopFatalPaused) {
        if (e.key === 'r' || e.key === 'R') {
            window.__gameLoopFatalPaused = false; window.__gameDebugFatal = null; __fixedAccum = 0; __fixedLast = performance.now();
            try { loadLevel(currentLevelIndex); gameState = GameState.LEVEL_INTRO; } catch (_) { location.reload(); }
            return;
        }
        if (e.key === 'Escape') {
            window.__gameLoopFatalPaused = false; window.__gameDebugFatal = null; __fixedAccum = 0; __fixedLast = performance.now();
            soundSystem?.stopAllLoops?.(); gameState = GameState.MENU; menuSelection = 0; refreshMenuOptions(); clearKeys();
            return;
        }
    }
    if (gameState === GameState.CONTROLS_CONFIG && controlsConfigCapture && controlsConfigDevice === 'keyboard') {
        e.preventDefault();
        if (e.key === 'Escape') {
            controlsConfigCapture = false; controlsConfigMessage = 'Remapeamento cancelado'; soundSystem.playSound('menuBack');
        } else {
            const action = controlsConfigActions[controlsConfigSelection];
            const conflict = sistemControles.definirTecla(controlsConfigPlayer, action, normalizedKey);
            controlsConfigCapture = false;
            controlsConfigMessage = conflict ? `Teclas trocadas: ${controlsConfigLabels[action]} ↔ ${controlsConfigLabels[conflict]}` : 'Tecla salva';
            soundSystem.playSound('menuSelect');
        }
        return;
    }
    if ((gameState === GameState.PLAYING || gameState === GameState.BUS_MINIGAME) && ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Enter',' ','Tab'].includes(e.key)) e.preventDefault();
    keys[normalizedKey] = true;

    if (gameState === GameState.CUTSCENE) {
        e.preventDefault();
        window.storyCutscenes?.handleKey?.(e.key);
        return;
    }
    
    // Loading real: erro permite retry; somente o bootstrap inicial aguarda tecla.
    if (gameState === GameState.LOADING) {
        const ls=window.LevelLoadState||{};
        if(ls.error && (e.key==='Enter'||e.key===' ')) { window.retryCurrentLoad?.(); return; }
        if(!ls.active && loadingProgress>=1 && ls.type==='bootstrap') {
            gameState=GameState.MENU; soundSystem.playSound('menuSelect'); return;
        }
    }
    
    // Menu principal
    if (gameState === GameState.MENU) {
        if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
            menuSelection = Math.max(0, menuSelection - 1);
            soundSystem.playSound('menuMove');
        }
        if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
            menuSelection = Math.min(menuOptions.length - 1, menuSelection + 1);
            soundSystem.playSound('menuMove');
        }
        if (e.key === 'Enter') {
            activateMenuSelection();
            return;
        }
        // Atalhos diretos
        if (e.key === '1') {
            playerCount = 1;
            gameState = GameState.CHARACTER_SELECT;
            selectedCharacters = [null, null];
            characterSelectCursor = 0;
            characterSelectReady = false; // Prevenir seleção imediata
            setTimeout(() => { characterSelectReady = true; }, 300); // 300ms de delay
            soundSystem.playSound('menuSelect');
        }
        if (e.key === '2') {
            playerCount = 2;
            gameState = GameState.CHARACTER_SELECT;
            selectedCharacters = [null, null];
            characterSelectCursor = 0;
            characterSelectReady = false; // Prevenir seleção imediata
            setTimeout(() => { characterSelectReady = true; }, 300); // 300ms de delay
            soundSystem.playSound('menuSelect');
        }
        if (e.key === '3') {
            gameState = GameState.TUTORIAL; // Melhoria #20
            soundSystem.playSound('menuSelect');
        }
        if (e.key === '4') {
            gameState = GameState.CONTROLS_CONFIG;
            controlsConfigPlayer = 1; controlsConfigSelection = 0; controlsConfigCapture = false;
            soundSystem.playSound('menuSelect');
        }
        if (e.key === '5') {
            gameState = GameState.TROPHIES;  // ✅ SPRINT 1 FIX
            if (window.trophySystem) {
                window.trophySystem.scrollOffset = 0;
            }
            soundSystem.playSound('menuSelect');
        }
        if (e.key === '6' || e.key === 'o' || e.key === 'O') {
            gameState = GameState.OPTIONS; optionsSelection = 0; gameSettings.applyAudio(soundSystem);
            soundSystem.playSound('menuSelect');
        }
    }
    
    // Menu de pausa completo
    if (gameState === GameState.PAUSED) {
        if (showModal) {
            if (e.key==='Enter' || e.key==='y' || e.key==='Y') {
                showModal=false; const cb=modalCallback; modalCallback=null; cb?.(); return;
            }
            if (e.key==='Escape' || e.key==='n' || e.key==='N') {
                showModal=false; modalCallback=null; soundSystem.playSound('menuBack'); return;
            }
            return;
        }
        const up=e.key==='ArrowUp'||e.key==='w'||e.key==='W';
        const down=e.key==='ArrowDown'||e.key==='s'||e.key==='S';
        const left=e.key==='ArrowLeft'||e.key==='a'||e.key==='A';
        const right=e.key==='ArrowRight'||e.key==='d'||e.key==='D';
        if (e.key==='Escape' || sistemControles.teclaParaAcao(normalizedKey,'pause')) { resumeTruePause(); return; }
        if(up){pauseMenuSelection=(pauseMenuSelection+pauseMenuItems.length-1)%pauseMenuItems.length;soundSystem.playSound('menuMove');return;}
        if(down){pauseMenuSelection=(pauseMenuSelection+1)%pauseMenuItems.length;soundSystem.playSound('menuMove');return;}
        if(left){adjustPauseMenuSetting(-1,false);return;}
        if(right){adjustPauseMenuSetting(1,false);return;}
        if(e.key==='Enter'||e.key===' '){adjustPauseMenuSetting(1,true);return;}
        return;
    }

    // Seletor de fases (desbloqueado apenas após zerar o jogo)
    if (gameState === GameState.STAGE_SELECT) {
        if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W' || e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
            stageSelectIndex = (stageSelectIndex + getStageSelectCount() - 1) % getStageSelectCount();
            soundSystem.playSound('menuMove');
        }
        if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S' || e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
            stageSelectIndex = (stageSelectIndex + 1) % getStageSelectCount();
            soundSystem.playSound('menuMove');
        }
        if (e.key === 'Tab') {
            e.preventDefault(); stageSelectPlayers = stageSelectPlayers === 1 ? 2 : 1; soundSystem.playSound('menuMove');
        }
        if (e.key === 'Enter') {
            if (stageSelectIsBusBonus()) { startBonusWithLoading('bus', stageSelectPlayers); }
            else if (stageSelectIsChicoBonus()) { startBonusWithLoading('fishing', stageSelectPlayers); }
            else { pendingStartLevel = stageSelectIndex; playerCount = stageSelectPlayers; selectedCharacters=[null,null]; characterSelectCursor=0; characterSelectReady=false; gameState=GameState.CHARACTER_SELECT; setTimeout(()=>characterSelectReady=true,300); soundSystem.playSound('menuSelect'); }
        }
        if (e.key === 'Escape') { gameState=GameState.MENU; menuSelection=6; soundSystem.playSound('menuBack'); }
    }

    // Melhoria #20: Tela de tutorial
    if (gameState === GameState.TUTORIAL) {
        if (e.key === 'Escape' || e.key === 'Enter') {
            gameState = GameState.MENU;
            soundSystem.playSound('menuBack');
        }
    }
    
    // Tela de conquistas
    if (gameState === GameState.ACHIEVEMENTS) {
        if (e.key === 'Escape' || e.key === 'Enter') {
            gameState = GameState.MENU;
            soundSystem.playSound('menuBack');
        }
    }
    
    // Tela de troféus
    if (gameState === GameState.TROPHIES) {  // ✅ SPRINT 1 FIX
        if (e.key === 'Escape' || e.key === 'Enter') {
            gameState = GameState.MENU;
            soundSystem.playSound('menuBack');
        }
        if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
            if (window.trophySystem) {
                window.trophySystem.scrollUp();
                soundSystem.playSound('menuMove');
            }
        }
        if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
            if (window.trophySystem) {
                window.trophySystem.scrollDown();
                soundSystem.playSound('menuMove');
            }
        }
    }
    
    // Opções gerais
    if (gameState === GameState.OPTIONS) {
        const left = e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A';
        const right = e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D';
        if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') { optionsSelection=(optionsSelection+optionsItems.length-1)%optionsItems.length; soundSystem.playSound('menuMove'); }
        if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') { optionsSelection=(optionsSelection+1)%optionsItems.length; soundSystem.playSound('menuMove'); }
        if (left || right || e.key === 'Enter') {
            const dir = left ? -1 : 1;
            if (optionsSelection===0) gameSettings.data.masterVolume=Math.max(0,Math.min(100,gameSettings.data.masterVolume+dir*5));
            else if (optionsSelection===1) gameSettings.data.musicVolume=Math.max(0,Math.min(100,gameSettings.data.musicVolume+dir*5));
            else if (optionsSelection===2) gameSettings.data.sfxVolume=Math.max(0,Math.min(100,gameSettings.data.sfxVolume+dir*5));
            else if (optionsSelection===3) gameSettings.cycleGraphicsQuality(dir);
            else if (optionsSelection===4) { gameSettings.data.vibration=!gameSettings.data.vibration; if(gameSettings.data.vibration) gamepadSystem.rumble(1,160,.55,.35); }
            else if (optionsSelection===5) gameSettings.cycleDifficulty(dir);
            else if (optionsSelection===6 && e.key === 'Enter') toggleFullscreen();
            gameSettings.save(); gameSettings.applyAudio(soundSystem); soundSystem.playSound('menuSelect');
        }
        if (e.key === 'Escape') { gameState=GameState.MENU; menuSelection=5; soundSystem.playSound('menuBack'); }
    }

    // Configuração de teclado/gamepad
    if (gameState === GameState.CONTROLS_CONFIG) {
        if (!controlsConfigCapture) {
            if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') { controlsConfigSelection=(controlsConfigSelection+controlsConfigActions.length-1)%controlsConfigActions.length; soundSystem.playSound('menuMove'); }
            if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') { controlsConfigSelection=(controlsConfigSelection+1)%controlsConfigActions.length; soundSystem.playSound('menuMove'); }
            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { controlsConfigPlayer=controlsConfigPlayer===1?2:1; soundSystem.playSound('menuMove'); }
            if (e.key === 'Tab') { e.preventDefault(); controlsConfigDevice=controlsConfigDevice==='keyboard'?'gamepad':'keyboard'; controlsConfigMessage=''; soundSystem.playSound('menuMove'); }
            if (e.key === 'Enter') { controlsConfigCapture=true; controlsConfigMessage=''; soundSystem.playSound('menuSelect'); }
            if (e.key === 'r' || e.key === 'R') {
                if (controlsConfigDevice==='keyboard') sistemControles.restaurarPadrao(controlsConfigPlayer); else gamepadSystem.reset(controlsConfigPlayer);
                controlsConfigMessage=`Padrão restaurado para Jogador ${controlsConfigPlayer}`; soundSystem.playSound('menuSelect');
            }
            if (e.key === 'Escape') { gameState=GameState.MENU; menuSelection=3; soundSystem.playSound('menuBack'); }
        } else if (controlsConfigDevice === 'gamepad' && e.key === 'Escape') { controlsConfigCapture=false; controlsConfigMessage='Remapeamento cancelado'; soundSystem.playSound('menuBack'); }
    }

    // Seleção de personagens
    if (gameState === GameState.CHARACTER_SELECT) {
        if (!characterSelectTransition && (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A')) {
            nextCharacterCursor(-1);
            soundSystem.playSound('menuMove');
        }
        if (!characterSelectTransition && (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D')) {
            nextCharacterCursor(1);
            soundSystem.playSound('menuMove');
        }
        if (e.key === 'Enter') {
            if (!characterSelectReady || characterSelectTransition) return;
            beginCharacterConfirm();
        }
        if (!characterSelectTransition && e.key === 'Escape') {
            cancelCharacterSelectTransition();
            gameState = GameState.MENU;
            menuSelection = 0;
            selectedCharacters = [null, null];
            soundSystem.playSound('menuBack');
        }
    }
    
    // História introdutória
    if (gameState === GameState.STORY_INTRO && e.key === 'Enter') {
        gameState = GameState.STORY_LEVEL;
        soundSystem.playSound('menuSelect');
    }
    
    // História da fase
    if (gameState === GameState.STORY_LEVEL && e.key === 'Enter') {
        gameState = GameState.LEVEL_INTRO;
        soundSystem.playSound('menuSelect');
    }
    
    // Level intro - pular com Enter
    if (gameState === GameState.LEVEL_INTRO && e.key === 'Enter') {
        gameState = GameState.PLAYING;
        levelStartTime = Date.now();
        levelDamageTaken = 0;
        startLevelMusic();
        soundSystem.playSound('menuSelect');
    }
    
    // Level complete - continuar
    if (gameState === GameState.LEVEL_COMPLETE && e.key === 'Enter') {
        nextLevel();
        soundSystem.playSound('menuSelect');
    }
    
    // Game Over / gate / vitória
    if (gameState === GameState.GAME_OVER) {
        if (levelGateActive) {
            if (e.key === 'r' || e.key === 'R' || e.key === 'Enter') {
                replayPreviousLevelFromGate();
                return;
            }
            if (e.key === 'Escape') {
                returnToMenuFromGameOver();
                return;
            }
        } else if (e.key === 'r' || e.key === 'R' || e.key === 'Enter' || e.key === 'Escape') {
            returnToMenuFromGameOver();
            return;
        }
    } else if (gameState === GameState.VICTORY && (e.key === 'r' || e.key === 'R' || e.key === 'Enter' || e.key === 'Escape')) {
        gameState = GameState.MENU;
        refreshMenuOptions?.();
        menuSelection = 0;
        soundSystem.playSound('menuSelect');
        return;
    }
    
    // Pause real: congela simulação, animações e áudio.
    const canPauseNow = [GameState.PLAYING, GameState.BUS_MINIGAME, GameState.FISHING_BONUS].includes(gameState);
    if (canPauseNow && (e.key === 'Escape' || sistemControles.teclaParaAcao(normalizedKey, 'pause'))) {
        enterTruePause(gameState);
    } else if (gameState === GameState.PAUSED && (e.key === 'Escape' || sistemControles.teclaParaAcao(normalizedKey, 'pause'))) {
        resumeTruePause();
    }
    
    // Voltar ao menu de pausa
    if (gameState === GameState.PAUSED && (e.key === 'q' || e.key === 'Q')) {
        // Bug #2: Usar modal customizado em vez de confirm()
        showModal = true;
        modalMessage = 'Deseja voltar ao menu principal?\nSeu progresso será perdido.';
        modalCallback = () => {
            soundSystem?.stopAllLoops?.();
            soundSystem?.resumeAll?.();
            pauseStartedAt = 0;
            pauseSnapshot = null;
            gameState = GameState.MENU;
            menuSelection = 0;
        };
    }
    
    // Bug #2: Controle do modal
    if (showModal) {
        if (e.key === 'y' || e.key === 'Y' || e.key === 'Enter') {
            showModal = false;
            if (modalCallback) modalCallback();
            modalCallback = null;
        }
        if (e.key === 'n' || e.key === 'N' || e.key === 'Escape') {
            showModal = false;
            modalCallback = null;
        }
    }
    
    // Debug desabilitado na build pública.
    debugMode = false;
    
    // Melhoria #47: Toggle high contrast mode
    if (e.key === 'h' || e.key === 'H') {
        highContrastMode = !highContrastMode;
        soundSystem.playSound('menuSelect');
    }
});

document.addEventListener('keyup', e => {
    keys[sistemControles.normalizarTecla(e.key)] = false;
});

canvas.addEventListener('mousemove', e => {
    if (gameState !== GameState.MENU) return;
    const pos = getCanvasPointerPosition(e);
    const hit = hitTestMenuOption(pos.x, pos.y);
    if (hit >= 0) {
        canvas.style.cursor = 'pointer';
        if (menuSelection !== hit) {
            menuSelection = hit;
            soundSystem.playSound('menuMove');
        }
        menuPointerActive = true;
    } else {
        canvas.style.cursor = 'default';
        menuPointerActive = false;
    }
});

canvas.addEventListener('mouseleave', () => {
    canvas.style.cursor = 'default';
    menuPointerActive = false;
});

canvas.addEventListener('click', e => {
    if (gameState === GameState.LOADING) {
        const ls=window.LevelLoadState||{};
        if(ls.error){ window.retryCurrentLoad?.(); return; }
        if(!ls.active && loadingProgress>=1 && ls.type==='bootstrap') { gameState=GameState.MENU; soundSystem.playSound('menuSelect'); return; }
        return;
    }
    if (gameState !== GameState.MENU) return;
    const pos = getCanvasPointerPosition(e);
    const hit = hitTestMenuOption(pos.x, pos.y);
    if (hit >= 0) {
        menuSelection = hit;
        activateMenuSelection();
    }
});

// Função auxiliar para limpar todas as teclas (previne conflitos entre estados)
function clearKeys() {
    Object.keys(keys).forEach(key => {
        keys[key] = false;
    });
}

// Funções auxiliares
function rects(a, b) {
    return a && b && 
           a.x < b.x + b.w && 
           a.x + a.w > b.x && 
           a.y < b.y + b.h && 
           a.y + a.h > b.y;
}

function applySkillKnockback(enemy, player, amount) {
    if (!enemy || !player || !amount || enemy.isBoss) return;
    const dir = (enemy.x + (enemy.w || 0)/2) >= (player.x + (player.w || 0)/2) ? 1 : -1;
    enemy.x += dir * amount;
    enemy.hitFlash = Math.max(enemy.hitFlash || 0, 10);
}

function applySonicKnockdown(enemy, player) {
    if (!player?.evolution?.shouldSonicKnockdown?.(enemy)) return false;
    const dir = (enemy.x + (enemy.w || 0)/2) >= (player.x + (player.w || 0)/2) ? 1 : -1;
    enemy.x += dir * 52;
    enemy.attacking = false;
    if (typeof enemy.attackCooldown === 'number') enemy.attackCooldown = Math.max(enemy.attackCooldown, 50);
    enemy._sonicKnockdownUntil = performance.now() + 650;
    enemy.hitFlash = Math.max(enemy.hitFlash || 0, 18);
    createTextPopup?.(enemy.x + (enemy.w || 50)/2, enemy.y - 18, 'DERRUBADO!', '#6ee7ff');
    return true;
}

function triggerComboExplosion(player, primaryDamage) {
    if (!player?.evolution?.shouldTriggerComboExplosion?.(player.combo || 0)) return;
    const cx = player.x + player.w/2, cy = player.y + player.h/2;
    const radius = 190;
    const waveDamage = Math.max(10, Math.round(primaryDamage * 0.35));
    enemies.forEach(target => {
        if (!target || target.life <= 0) return;
        const tx = target.x + (target.w || 50)/2, ty = target.y + (target.h || 60)/2;
        const dist = Math.hypot(tx-cx, ty-cy);
        if (dist > radius) return;
        if (typeof target.takeDamage === 'function') target.takeDamage(waveDamage);
        else { target.life = Math.max(0, target.life - waveDamage); target.hitFlash = 12; }
        if (target.life <= 0) {
            target.dead = true;
            awardEnemyXP(target, player, { melee:true, combo:player.combo || 0 });
            if (player._vampirism && !target.isBoss) player.heal?.(Math.ceil(player.maxLife * 0.05));
        }
        applySkillKnockback(target, player, target.isBoss ? 0 : 28);
    });
    createParticle?.(cx, cy, '#68ddff', 14, 'spark');
    createTextPopup?.(cx, player.y - 36, 'ONDA DE CHOQUE!', '#68ddff');
    screenShake = Math.max(screenShake || 0, 5);
    soundSystem?.playSound?.('combo');
}

function startGame(numPlayers) {
    gameState = GameState.LEVEL_INTRO;
    playerCount = numPlayers;
    players.length = 0;
    enemies.length = 0; // Limpar array em vez de reatribuir
    cameraX = 0;
    score = 0;
    particles.length = 0; // Limpar array em vez de reatribuir
    currentLevelIndex = 0;
    levelIntroTimer = 0;
    
    // NOVO: Usar as classes separadas PlayerJoao e PlayerCrist
    // Player 1 - João
    const player1 = new PlayerJoao(150, 440, 1);
    player1.evolution = new PlayerEvolution(player1);
    players.push(player1);
    
    // Player 2 - Crist (se for 2 jogadores)
    if (numPlayers === 2) {
        const player2 = new PlayerCrist(200, 440, 2);
        player2.evolution = new PlayerEvolution(player2);
        players.push(player2);
    }
    
    // Carregar primeira fase pelo LevelManager
    transitionToLevel(0,()=>{gameState=GameState.LEVEL_INTRO;levelIntroTimer=180;});
}

function cleanupCurrentLevelForTransition() {
    // Limpeza segura antes de carregar a próxima fase.
    window.GameRuntime?.cancelTimersFor?.('level');
    window.GameRuntime?.cancelTimersFor?.('boss');
    soundSystem?.stopMusic?.();
    soundSystem?.stopAllLoops?.();
    enemies.length = 0;
    particles.length = 0;
    powerUps.length = 0;
    destructibles.length = 0;
    if (typeof projectiles !== 'undefined') projectiles.length = 0;
    waveSystem = null;
    enemySpawnDirector = null;
    bossSpawned = false;
    bossPhase = false;
    bossDefeated = false;
    bossWarningTimer = 0;
    phase3ColonelIntroPlayed = false;
    window.farmDogNPCManager?.dispose?.();
    clearKeys?.();
}

function releaseCurrentLevelForMenu() {
    cleanupCurrentLevelForTransition();
    const lm=window.levelManager;
    if(lm?.currentGroup){
        window.assetManager?.releaseGroup?.(lm.currentGroup);
        window.soundSystem?.releaseTypes?.(lm.currentSounds||[]);
        lm.currentSounds=[]; lm.currentGroup=null; lm.currentLevelIndex=null;
    }
    currentLevel?.dispose?.();
}

function selectedCharacterNamesForLoad() {
    return selectedCharacters.slice(0, Math.max(1, playerCount)).filter(Boolean);
}

function transitionToLevel(index, afterLoaded) {
    loadingProgress = 0;
    gameState = GameState.LOADING;
    return window.levelManager.transitionLevel(index, {
        playerNames: selectedCharacterNamesForLoad(),
        beforeLoad: () => {
            // Salva o estado relevante antes de liberar referências da fase anterior.
            if (currentLevel) {
                try { saveSystem?.save?.({ score, level: currentLevelIndex + 1, playerCharacter: selectedCharacters[0] }); } catch (_) {}
            }
            cleanupCurrentLevelForTransition();
        },
        afterLoad: () => {
            loadingProgress = 1;
            loadLevel(index);
            if (gameState !== GameState.GAME_OVER && gameState !== GameState.VICTORY) afterLoaded?.();
        },
        onError: () => { gameState = GameState.LOADING; }
    });
}

function startBonusWithLoading(kind, count=1) {
    loadingProgress = 0;
    gameState = GameState.LOADING;
    soundSystem?.stopMusic?.();
    const bonusPlayerNames = kind==='fishing' ? (count>1?['João','Crist']:['João']) : selectedCharacterNamesForLoad();
    return window.levelManager.loadBonus(kind, {
        playerNames: bonusPlayerNames,
        beforeLoad: () => { clearKeys?.(); },
        afterLoad: () => {
            loadingProgress = 1;
            if (kind === 'bus') {
                window.busSequence?.startMinigame(true);
                gameState = GameState.BUS_MINIGAME;
            } else {
                window.fishingBonus?.start?.(count);
                gameState = GameState.FISHING_BONUS;
            }
            soundSystem?.playSound?.('menuSelect');
        },
        onError: () => { gameState = GameState.LOADING; }
    });
}

function startGameWithCharacters() {
    clearKeys();
    const startLevelIndex = Math.max(0, Math.min(LEVELS.length - 1, pendingStartLevel || 0));

    players.length = 0;
    enemies.length = 0;
    cameraX = 0;
    const resumeCheckpoint = pendingResumeCheckpoint;
    score = resumeCheckpoint ? Math.max(0, Number(resumeCheckpoint.score) || 0) : 0;
    particles.length = 0;
    powerUps.length = 0;
    destructibles.length = 0;
    currentLevelIndex = startLevelIndex;
    levelIntroTimer = 0;
    gameStartTime = Date.now();
    victoryCommitted = false; gameOverCommitted=false; completedLevelStats.clear(); sessionPlaytimeSeconds=0; lastPlaytimeSaveAt=Date.now();
    saveSystem.beginGame?.();
    totalGameDamage = 0;

    let player1;
    if (selectedCharacters[0] === 'João') player1 = new PlayerJoao(150, 440, 1);
    else if (selectedCharacters[0] === 'Crist') player1 = new PlayerCrist(150, 440, 1);
    else player1 = new PlayerChico(150, 440, 1);
    player1.evolution = new PlayerEvolution(player1);
    player1.hitEnemiesThisSwing = new Set();
    player1.evolution.load(saveSystem.loadPlayerProgress(selectedCharacters[0]));
    players.push(player1);

    if (playerCount === 2) {
        let player2;
        if (selectedCharacters[1] === 'João') player2 = new PlayerJoao(200, 440, 2);
        else if (selectedCharacters[1] === 'Crist') player2 = new PlayerCrist(200, 440, 2);
        else player2 = new PlayerChico(200, 440, 2);
        player2.evolution = new PlayerEvolution(player2);
        player2.hitEnemiesThisSwing = new Set();
        player2.evolution.load(saveSystem.loadPlayerProgress(selectedCharacters[1]));
        players.push(player2);
    }

    if (!window.trophySystem) window.trophySystem = new TrophySystem();
    trophySystem = window.trophySystem;
    gameOverScreen.deactivate();
    saveSystem.updateFavoriteCharacter(selectedCharacters[0]);

    transitionToLevel(startLevelIndex, () => {
        pendingStartLevel = 0;
        pendingResumeCheckpoint = null;
        if (startLevelIndex === 0) {
            gameState = GameState.STORY_INTRO;
            startStoryScene('intro', () => {
                gameState = GameState.LEVEL_INTRO;
                levelIntroTimer = 180;
            });
        } else {
            gameState = GameState.STORY_LEVEL;
            levelIntroTimer = 180;
        }
    });
}

function cancelCharacterSelectTransition() {
    characterSelectTransition = null;
    characterSelectTransitionToken++;
    characterSelectReady = true;
}

function chicoPlayable(){ return !!saveSystem?.load?.().chicoUnlocked; }
function characterCountForSelect(){ return chicoPlayable()?3:2; }
function characterNameForIndex(index){ return index===0?'João':index===1?'Crist':'Chico Fumaça'; }
function nextCharacterCursor(dir){
    const count=characterCountForSelect();
    characterSelectCursor=(characterSelectCursor+dir+count)%count;
}

function beginCharacterConfirm() {
    if (!characterSelectReady || characterSelectTransition) return;
    const chosenName = characterNameForIndex(characterSelectCursor);
    const selectingPlayer = selectedCharacters[0] === null ? 1 : 2;
    const accent = chosenName === 'João' ? '#4ba3ff' : chosenName === 'Crist' ? '#ff624b' : '#f0bd55';
    characterSelectTransition = {
        name: chosenName,
        cardIndex: characterSelectCursor,
        playerSlot: selectingPlayer,
        startedAt: performance.now(),
        duration: 520,
        accent
    };
    characterSelectReady = false;
    const token = ++characterSelectTransitionToken;
    soundSystem.playSound('menuSelect');
    setTimeout(() => {
        if (token !== characterSelectTransitionToken || !characterSelectTransition) return;
        if (selectedCharacters[0] === null) {
            selectedCharacters[0] = chosenName;
            if (playerCount === 2) {
                characterSelectCursor = chosenName === 'João' ? 1 : 0;
                characterSelectTransition = null;
                characterSelectReady = true;
            } else {
                characterSelectTransition = null;
                characterSelectReady = true;
                startGameWithCharacters();
            }
        } else if (playerCount === 2 && selectedCharacters[1] === null) {
            selectedCharacters[1] = chosenName;
            characterSelectTransition = null;
            characterSelectReady = true;
            startGameWithCharacters();
        } else {
            characterSelectTransition = null;
            characterSelectReady = true;
        }
    }, characterSelectTransition.duration);
}

function loadLevel(index) {
    if (index >= LEVELS.length) {
        gameState = GameState.VICTORY;
        return;
    }
    
    // Cancela callbacks de gameplay pertencentes à fase anterior antes de trocar de cena.
    window.GameRuntime?.cancelTimersFor?.('level');
    window.GameRuntime?.cancelTimersFor?.('boss');
    currentLevelIndex = index;
    currentLevel = LEVELS[index];
    levelLoadToken++;
    const thisLevelToken = levelLoadToken;

    // A nova fase começa limpa e olhando para o começo real do mapa.
    cameraX = 0;
    enemySpawnDirector = null;

    // === VERIFICAÇÃO DE GATE DE NÍVEL ===
    if (typeof checkLevelRequirement === 'function' && !checkLevelRequirement(index, players)) {
        // Jogador não tem nível suficiente - ativa o gate
        levelGateActive = true;
        gameState = GameState.GAME_OVER;
        if (gameOverScreen) {
            gameOverScreen.activate(score, currentLevelIndex + 1);
        }
        return;
    }
    levelGateActive = false;
    
    enemies.length = 0;
    particles.length = 0;
    powerUps.length = 0;
    destructibles.length = 0;
    if (typeof projectiles !== 'undefined') projectiles.length = 0;
    levelIntroTimer = 180;
    levelStartTime = Date.now();
    levelDamageTaken = 0;
    
    // Resetar estado do sistema de boss
    bossSpawned = false;
    bossPhase = false;
    bossDefeated = false;
    bossWarningTimer = 0;
    phase3ColonelIntroPlayed = false;
    
    // Inicializar sistema de ondas para fases de expansão
    waveSystem = null;
    if (currentLevel.useWaves && typeof WaveSystem !== 'undefined') {
        waveSystem = new WaveSystem({ ...currentLevel, difficultyMultiplier:(currentLevel.difficultyMultiplier||1)*gameSettings.difficultyMultiplier() }, currentLevel.getGround());
        // Iniciar primeira onda automaticamente após 2s
        (window.GameRuntime?.schedule || ((owner,ms,fn)=>setTimeout(fn,ms)))('level', 2000, () => {
            if (thisLevelToken !== levelLoadToken) return;
            if (waveSystem && gameState === GameState.PLAYING) {
                waveSystem.startNextWave(enemies);
            }
        });
    }
    
    // Atualizar posição do chão para os jogadores
    players.forEach(player => {
        player.groundY = currentLevel.getGround();
        player.x = 150 + players.indexOf(player) * 50;
        player.y = player.groundY - player.h;

        // Não carregar impulso/ataque/dash da fase anterior.
        if ('vy' in player) player.vy = 0;
        if ('jumpPower' in player) player.jumpPower = 0;
        if ('isJumping' in player) player.isJumping = false;
        if ('attacking' in player) player.attacking = false;
        if ('attackTimer' in player) player.attackTimer = 0;
        if ('dashing' in player) player.dashing = false;
        if ('dashTimer' in player) player.dashTimer = 0;
        if ('isMoving' in player) player.isMoving = false;
        if ('isRunning' in player) player.isRunning = false;
        if ('moveHoldFrames' in player) player.moveHoldFrames = 0;
        if ('rangedCharging' in player) player.rangedCharging = false;
        if ('rangedChargeFrames' in player) player.rangedChargeFrames = 0;
    });
    
    // NPC amigável exclusivo da Fase 1
    window.farmDogNPCManager?.initForLevel?.(currentLevel);

    // Spawn de inimigos (apenas para fases sem ondas)
    if (!currentLevel.useWaves) {
        spawnEnemies();
    }
    
    // Spawn de power-ups (2-4 por fase)
    spawnPowerUps(2 + Math.floor(Math.random() * 3));

    // Checkpoint de campanha: sempre no início de uma fase já validada pelo gate.
    // Não salva posição/meio de combate para evitar estados impossíveis ao recarregar.
    saveSystem?.saveCampaignCheckpoint?.({
        levelIndex: index,
        playerCount,
        selectedCharacters: selectedCharacters.slice(0, playerCount),
        score
    });
    refreshMenuOptions?.();
}

function createEnemySafe(type, x, y) {
    let enemy = null;
    try {
        if (typeof EnemyFactory !== 'undefined') {
            enemy = EnemyFactory.create(x, y, type);
        }
    } catch (err) {
        console.error('[spawn] Erro ao criar inimigo', type, err);
    }

    if (!enemy) {
        try {
            enemy = (typeof BasicEnemy !== 'undefined')
                ? new BasicEnemy(x, y)
                : new Enemy(x, y, 'basic');
        } catch (fallbackErr) {
            console.error('[spawn] Falha também no fallback', fallbackErr);
            return null;
        }
    }

    const difficultyMult = (currentLevel.difficultyMultiplier || 1.0) * gameSettings.difficultyMultiplier();
    const activePlayerCount = Math.max(1, players.filter(p => p && p.life > 0).length || playerCount || 1);
    const mpLife = activePlayerCount > 1 ? 1.30 : 1;
    const mpDamage = activePlayerCount > 1 ? 1.08 : 1;
    if (enemy.maxLife) {
        enemy.maxLife = Math.max(1, Math.floor(enemy.maxLife * difficultyMult * mpLife));
        enemy.life = enemy.maxLife;
    }
    if (enemy.damage) enemy.damage = Math.max(1, Math.floor(enemy.damage * difficultyMult * mpDamage));
    if (enemy.attackDamage) enemy.attackDamage = Math.max(1, Math.floor(enemy.attackDamage * difficultyMult * mpDamage));
    if (enemy.score) enemy.score = Math.floor(enemy.score * difficultyMult);
    return enemy;
}

function getEnemyXPKey(enemy) {
    if (!enemy) return 'basic';
    if (enemy.isBoss && !enemy.isBossMinion) {
        if (enemy.name === 'REI DE VEGAS') return 'final_boss';
        if (enemy.name === 'O ENGENHEIRO') return 'tech_boss';
        if (enemy.name === 'A SOMBRA') return 'shadow_boss';
        if (enemy.name === 'DEUS DAS APOSTAS') return 'god_boss';
        return 'boss';
    }
    if (typeof EliteEnemy !== 'undefined' && enemy instanceof EliteEnemy) return 'elite';
    if (typeof GhostEnemy !== 'undefined' && enemy instanceof GhostEnemy) return 'ghost';
    if (typeof AssassinEnemy !== 'undefined' && enemy instanceof AssassinEnemy) return 'assassin';
    return String(enemy.type || 'basic').toLowerCase();
}

function awardEnemyXP(enemy, killer, context = {}) {
    // Um inimigo só distribui XP uma vez, independentemente de tiro/melee/efeitos simultâneos.
    if (!enemy || enemy._xpAwarded) return [];
    enemy._xpAwarded = true;
    const xpKey = getEnemyXPKey(enemy);
    const baseXP = (window.XP_REWARDS || (typeof XP_REWARDS !== 'undefined' ? XP_REWARDS : {}))[xpKey] || 10;
    const boss = !!(enemy.isBoss && !enemy.isBossMinion);
    const awards = [];
    const activePlayers = players.filter(p => p && p.life > 0 && p.evolution);

    activePlayers.forEach(player => {
        const isKiller = player === killer;
        let rawXP;
        if (isKiller) rawXP = baseXP;
        else rawXP = Math.max(1, Math.round(baseXP * (boss ? 0.70 : 0.30)));

        const gained = player.evolution.addXP(rawXP, {
            melee: isKiller && !!context.melee,
            ranged: isKiller && !!context.ranged,
            combo: isKiller ? (Number(context.combo) || 0) : 0,
            assist: !isKiller,
            boss
        });
        if (gained > 0) {
            awards.push({ player, gained, assist:!isKiller });
            const popupX = enemy.x + enemy.w / 2 + (player.controlPlayer === 2 ? 28 : -28);
            const popupY = enemy.y - 70 - (player.controlPlayer === 2 ? 18 : 0);
            createTextPopup(popupX, popupY, `${!isKiller ? 'ASSIST ' : ''}+${gained} XP`, !isKiller ? '#8fdcff' : '#00ffff');
        }
    });
    return awards;
}

function buildEnemySpawnDirector() {
    const total = Math.max(0, currentLevel.enemyCount || 0);
    const types = Array.isArray(currentLevel.enemyTypes) && currentLevel.enemyTypes.length
        ? currentLevel.enemyTypes.slice()
        : ['basic'];
    const worldWidth = currentLevel.width || 5000;

    const groupCount = Math.max(1, Math.min(5, Math.ceil(total / 4)));
    const startX = 650;
    const endX = Math.max(startX + 500, worldWidth - 650);

    const groups = [];
    let assigned = 0;

    for (let g = 0; g < groupCount; g++) {
        const remaining = total - assigned;
        const groupsLeft = groupCount - g;
        const amount = Math.ceil(remaining / groupsLeft);
        assigned += amount;

        const t = groupCount === 1 ? 0 : g / (groupCount - 1);
        const center = Math.round(startX + (endX - startX) * t);
        const triggerX = g === 0 ? 0 : Math.max(700, center - 500);

        groups.push({ index:g, center, triggerX, amount, spawned:false });
    }

    enemySpawnDirector = {
        total,
        spawnedCount: 0,
        types,
        groups,
        allSpawned: total === 0
    };

    // Apenas o primeiro grupo aparece no começo.
    updateEnemySpawnDirector(true);
}

function spawnDirectorGroup(group) {
    if (!group || group.spawned || !enemySpawnDirector) return;

    const groundY = currentLevel.getGround();
    const worldWidth = currentLevel.width || 5000;

    for (let i = 0; i < group.amount; i++) {
        const type = enemySpawnDirector.types[Math.floor(Math.random() * enemySpawnDirector.types.length)];
        const spread = (i - (group.amount - 1) / 2) * 125 + (Math.random() * 70 - 35);
        const x = Math.max(580, Math.min(worldWidth - 180, group.center + spread));

        const enemy = createEnemySafe(type, x, groundY);
        if (enemy) {
            enemy.spawnSector = group.index;
            enemies.push(enemy);
            enemySpawnDirector.spawnedCount++;
        }
    }

    group.spawned = true;
    enemySpawnDirector.allSpawned = enemySpawnDirector.groups.every(g => g.spawned);
}

function updateEnemySpawnDirector(forceFirst = false) {
    if (!enemySpawnDirector || enemySpawnDirector.allSpawned) return;
    if (!forceFirst && gameState !== GameState.PLAYING) return;

    const alivePlayers = players.filter(p => p && p.life > 0);
    if (!alivePlayers.length && !forceFirst) return;

    const leadX = alivePlayers.length
        ? Math.max(...alivePlayers.map(p => p.x + p.w))
        : 0;

    const nextGroup = enemySpawnDirector.groups.find(g => !g.spawned);
    if (!nextGroup) {
        enemySpawnDirector.allSpawned = true;
        return;
    }

    if (forceFirst || leadX >= nextGroup.triggerX) {
        spawnDirectorGroup(nextGroup);
    }
}

function spawnEnemies() {
    buildEnemySpawnDirector();
}

/**
 * Spawna o boss da fase atual (chamado após matar todos os inimigos normais)
 */
function spawnBoss() {
    if (bossSpawned) return;
    bossSpawned = true;
    bossPhase = true;
    
    const alivePlayers = players.filter(p => p.life > 0);
    const refX = alivePlayers.length > 0
        ? alivePlayers.reduce((s, p) => s + p.x, 0) / alivePlayers.length
        : cameraX + 400;
    
    const levelWidth = (currentLevel && currentLevel.width) ? currentLevel.width : 4800;
    const bossX = Math.min(refX + 350, levelWidth - 200);
    const bossY = currentLevel.getGround();
    
    let boss;
    const levelId = currentLevelIndex + 1;
    
    if (currentLevel.hasGodBoss) {
        boss = typeof GodBoss !== 'undefined'
            ? new GodBoss(bossX, bossY)
            : new Enemy(bossX, bossY, 'boss');
    } else if (currentLevel.hasShadowBoss) {
        boss = typeof ShadowBoss !== 'undefined'
            ? new ShadowBoss(bossX, bossY)
            : new Enemy(bossX, bossY, 'boss');
    } else if (currentLevel.hasTechBoss) {
        boss = typeof TechBoss !== 'undefined'
            ? new TechBoss(bossX, bossY)
            : new Enemy(bossX, bossY, 'boss');
    } else if (currentLevel.hasFinalBoss) {
        boss = typeof FinalBoss !== 'undefined'
            ? new FinalBoss(bossX, bossY)
            : typeof BossEnemy !== 'undefined'
            ? new BossEnemy(bossX, bossY, 5)
            : new Enemy(bossX, bossY, 'boss');
    } else if (currentLevel.hasBoss) {
        boss = typeof BossEnemy !== 'undefined'
            ? new BossEnemy(bossX, bossY, levelId)
            : new Enemy(bossX, bossY, 'boss');
    }
    
    if (boss) {
        const userDiff=gameSettings.difficultyMultiplier();
        const bossPlayers = Math.max(1, alivePlayers.length || playerCount || 1);
        const bossMpLife = bossPlayers > 1 ? 1.35 : 1;
        const bossMpDamage = bossPlayers > 1 ? 1.10 : 1;
        if (boss.maxLife) { boss.maxLife=Math.floor(boss.maxLife*userDiff*bossMpLife); boss.life=boss.maxLife; }
        if (boss.damage) boss.damage=Math.floor(boss.damage*userDiff*bossMpDamage);
        if (boss.attackDamage) boss.attackDamage=Math.floor(boss.attackDamage*userDiff*bossMpDamage);
        enemies.push(boss);
        
        const bossVisualY = boss.y + boss.h / 2;
        createParticle(bossX + boss.w/2, bossVisualY, '#ff0000', 50, 'explosion');
        createParticle(bossX + boss.w/2, bossVisualY, '#ffd700', 30, 'spark');
        createParticle(bossX + boss.w/2, bossVisualY, '#ff00ff', 20, 'spark');
        createTextPopup(bossX + boss.w/2, boss.y - 30, '⚠️ BOSS! ⚠️', '#ff0000', 36);
        
        if (window.soundSystem) window.soundSystem.playSound('ko');
        screenShake = 12;
    }
}

function spawnPowerUps(count) {
    const types = ['health', 'speed', 'strength', 'invincible', 'score'];
    // Sempre existe pelo menos 1 item de vida por fase. Antes era 100% aleatório,
    // então era possível passar várias fases sem o sprite de vida aparecer.
    const guaranteed = ['health'];
    for (let i = 0; i < count; i++) {
        const itemType = guaranteed[i] || types[Math.floor(Math.random() * types.length)];
        const containerType = Math.random() < 0.58 ? 'crate' : 'barrel';
        const w = containerType === 'crate' ? 58 : 50;
        const h = containerType === 'crate' ? 58 : 62;
        const x = 400 + Math.random() * 3000;
        const y = currentLevel.getGround() - h;
        destructibles.push({
            x, y, w, h, type: containerType, itemType,
            life: containerType === 'crate' ? 35 : 45,
            maxLife: containerType === 'crate' ? 35 : 45,
            broken: false, hitFlash: 0
        });
    }
}

function breakPowerUpContainer(obj) {
    if (!obj || obj.broken) return;
    obj.broken = true;
    const py = currentLevel.getGround() - 52;
    powerUps.push({
        x: obj.x + obj.w / 2 - 15,
        y: py, baseY: py,
        type: obj.itemType,
        collected: false,
        bobOffset: Math.random() * Math.PI * 2,
        w: 30, h: 30,
        persistent: true
    });
    createParticle(obj.x + obj.w/2, obj.y + obj.h/2, '#b97836', 12, 'spark');
    createTextPopup(obj.x + obj.w/2, obj.y - 8, 'ITEM!', '#ffd76a');
    if (window.soundSystem) window.soundSystem.playSound(obj.type === 'barrel' ? 'barrelBreak' : 'crateBreak');
}

function damagePowerUpContainer(obj, damage) {
    if (!obj || obj.broken) return;
    obj.life -= Math.max(1, damage || 20);
    obj.hitFlash = 6;
    if (obj.life > 0) window.soundSystem?.playSound?.(obj.type === 'barrel' ? 'barrelHit' : 'crateHit');
    if (obj.life <= 0) breakPowerUpContainer(obj);
}


function startLevelMusic() {
    if (!window.soundSystem) return;
    window.soundSystem.initAudioContext?.();
    window.soundSystem.stopMusic?.();
    const id=currentLevel?.id||1;
    const tempo=id===8?'fast':id===7?'slow':id>=5?'vegas':id===3?'desert':id===4?'fast':'normal';
    const start=()=>window.soundSystem?.startMusic?.(tempo);
    if(window.GameRuntime?.schedule) window.GameRuntime.schedule('level',40,start); else setTimeout(start,40);
}

function recordLevelCompletion(index=currentLevelIndex) {
    if (completedLevelStats.has(index)) return false;
    completedLevelStats.add(index);
    const levelTime=Math.max(0,(Date.now()-levelStartTime)/1000);
    if(window.trophySystem){
        const st=window.trophySystem.stats;
        st.levelsCompleted=(st.levelsCompleted||0)+1;
        if(levelDamageTaken===0)st.noDamageLevels=(st.noDamageLevels||0)+1;
        if(!Number.isFinite(st.fastestLevelTime)||levelTime<st.fastestLevelTime)st.fastestLevelTime=levelTime;
        if(players[0]?.evolution){st.playerLevel=players[0].evolution.level;st.unlockedSkills=players[0].evolution.unlockedSkills.length;}
        window.trophySystem.checkTrophies({score,enemiesKilled:st.enemiesKilled});
        window.trophySystem.saveProgress?.();
    }
    saveSystem.updateHighestLevel(Math.min(LEVELS.length,index+2));
    return true;
}

function commitVictoryOnce(){
    if(victoryCommitted)return;
    victoryCommitted=true;
    recordLevelCompletion(currentLevelIndex);
    const elapsed=Math.max(0,(Date.now()-gameStartTime)/1000);
    if(saveSystem){saveSystem.addPlaytime?.(Math.max(0,elapsed-sessionPlaytimeSeconds));sessionPlaytimeSeconds=elapsed;saveSystem.markGameCompleted?.();saveSystem.clearCampaignCheckpoint?.();saveSystem.save({score,level:LEVELS.length,playerCharacter:selectedCharacters[0],victory:true});}
    refreshMenuOptions?.();
    soundSystem?.stopMusic?.();
    soundSystem?.playSound?.('victory');
}

function drawGameplayHitboxes(ctx){
    if(!debugMode)return;
    ctx.save();ctx.lineWidth=2;
    const box=(o,stroke)=>{if(!o)return;ctx.strokeStyle=stroke;ctx.strokeRect(Math.round(o.x),Math.round(o.y),Math.round(o.w),Math.round(o.h));};
    players.forEach(p=>{box(p,'#00ff88');const h=p.getHitbox?.();if(h)box(h,'#00ffff');});
    enemies.forEach(e=>{box(e.getCollisionBox?.()||e,'#ff5555');const h=e.getHitbox?.();if(h)box(h,'#ffcc00');});
    powerUps.forEach(p=>box(p,'#cc66ff'));destructibles.forEach(o=>box(o,'#ffaa33'));
    ctx.restore();
}

function startStoryScene(sceneId, onComplete) {
    clearKeys?.();
    soundSystem?.stopMusic?.();
    const started = window.storyCutscenes?.start?.(sceneId, () => {
        clearKeys?.();
        onComplete?.();
    });
    if (started) {
        gameState = GameState.CUTSCENE;
        return true;
    }
    onComplete?.();
    return false;
}


function startPhase3ColonelIntro(onDone) {
    if (phase3ColonelIntroPlayed) { onDone?.(); return; }
    phase3ColonelIntroPlayed = true;
    players.forEach((player, i) => {
        player.attacking = false;
        player.attackTimer = 0;
        player.dashing = false;
        player.dashTimer = 0;
        player.isMoving = false;
        player.x = 220 + (i * 88);
        player.y = currentLevel.getGround() - player.h;
    });
    cameraX = Math.max(0, players[0]?.x - 140 || 0);
    startStoryScene('colonelIntro', () => {
        gameState = GameState.PLAYING;
        startLevelMusic();
        spawnBoss();
        onDone?.();
    });
}

function finishGameWithStory() {
    if (window.storyCutscenes && !window.storyCutscenes.hasSeen?.('ending')) {
        startStoryScene('ending', () => {
            if (saveSystem?.markGameCompleted) saveSystem.markGameCompleted();
            saveSystem?.clearCampaignCheckpoint?.();
            refreshMenuOptions();
            gameState = GameState.VICTORY;
        });
        return;
    }
    if (saveSystem?.markGameCompleted) saveSystem.markGameCompleted();
    saveSystem?.clearCampaignCheckpoint?.();
    refreshMenuOptions();
    gameState = GameState.VICTORY;
}

function nextLevel() {
    recordLevelCompletion(currentLevelIndex);
    soundSystem?.stopMusic?.();

    const postSceneByLevel = {0:'farmFarewell', 2:'desertClue', 3:'vegasArrival', 4:'victorReveal', 5:'secretDoor', 6:'shadowTruth'};
    const postScene = postSceneByLevel[currentLevelIndex];
    if (postScene && window.storyCutscenes && !window.storyCutscenes.hasSeen?.(postScene)) {
        startStoryScene(postScene, () => nextLevel());
        return;
    }

    const nextIndex = currentLevelIndex + 1;
    if (nextIndex >= LEVELS.length) {
        cleanupCurrentLevelForTransition();
        finishGameWithStory();
        return;
    }

    if (typeof clearKeys === 'function') clearKeys();
    transitionToLevel(nextIndex, () => {
        if (nextIndex === 7 && gameState !== GameState.GAME_OVER && window.storyCutscenes && !window.storyCutscenes.hasSeen?.('godIntro')) {
            startStoryScene('godIntro', () => { gameState = GameState.LEVEL_INTRO; levelIntroTimer = 180; });
            return;
        }
        if (gameState !== GameState.GAME_OVER && gameState !== GameState.VICTORY) {
            gameState = GameState.STORY_LEVEL;
            levelIntroTimer = 180;
        }
    });
}

function acquireParticle(data){const p=particlePool.pop()||{};Object.keys(p).forEach(k=>delete p[k]);Object.assign(p,data);return p;}

function createParticle(x, y, color, count, type = 'normal') {
    // Bug #5: Limitar número de partículas para evitar memory leak
    const particleLimit=getParticleLimit();
    count=Math.max(1,Math.round(count*getParticleScale()));
    if (particles.length >= particleLimit) {
        particles.splice(0, Math.min(count, particles.length));
    }
    
    for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 / count) * i + Math.random() * 0.5;
        const speed = type === 'explosion' ? 5 + Math.random() * 5 : 3 + Math.random() * 3;
        
        particles.push(acquireParticle({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - (type === 'spark' ? 2 : 0),
            color: color,
            size: type === 'explosion' ? 3 + Math.random() * 4 : 2 + Math.random() * 3,
            life: type === 'explosion' ? 40 : 30,
            type: type
        }));
    }
}

function createTextPopup(x, y, text, color, size = 24) {
    // Bug #5: Limitar número de partículas
    if (particles.length >= getParticleLimit()) {
        particles.splice(0, 1);
    }
    
    particles.push(acquireParticle({
        x: x,
        y: y,
        vx: 0,
        vy: -1,
        color: color,
        size: size,
        life: 60,
        type: 'text',
        text: text
    }));
}

// Criar wrapper de particles para compatibilidade com novos sistemas
window.particlesAPI = {
    createText: function(x, y, text, color, options = {}) {
        createTextPopup(x, y, text, color, options.size || 24);
    },
    explosion: function(x, y, count, options = {}) {
        createParticle(x, y, options.color || '#ffd700', count, 'explosion');
    },
    jet: function(x, y, angle, count, options = {}) {
        // Criar partículas em jato
        for (let i = 0; i < count; i++) {
            const speed = options.speed || 5;
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;
            particles.push({
                x: x,
                y: y,
                vx: vx + (Math.random() - 0.5),
                vy: vy + (Math.random() - 0.5),
                color: options.color || '#00ffff',
                size: options.size || 3,
                life: options.maxLife || 30,
                type: options.type || 'spark'
            });
        }
    },
    // Método push para compatibilidade com código antigo
    push: function(particle) {
        particles.push(particle);
    }
};

// Alias para compatibilidade
if (!window.particles.createText) {
    window.particles = window.particlesAPI;
}

// Melhoria #19: Splash screen com loading
// Imagem oficial da tela de carregamento
const loadingScreenImage = window.assetManager.image('assets/ui/loading-screen.webp','shared');
const mainMenuBackgroundImage = window.assetManager.image('assets/ui/menu-principal-vegas.webp','shared');
const chicoFumacaSelectImage = window.assetManager.image('assets/npc/chico-fumaca/chico-fumaca-idle.webp','shared');


function drawLoading() {
    const loadState = window.LevelLoadState || {};
    const progress = Number.isFinite(loadState.progress) ? loadState.progress : loadingProgress;
    loadingProgress = Math.max(0, Math.min(1, progress || 0));
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    if (loadingScreenImage.complete && loadingScreenImage.naturalWidth) {
        const cw = ctx.canvas.width, ch = ctx.canvas.height;
        const iw = loadingScreenImage.naturalWidth, ih = loadingScreenImage.naturalHeight;
        const scale = Math.max(cw / iw, ch / ih);
        const sw = cw / scale, sh = ch / scale;
        ctx.drawImage(loadingScreenImage, (iw-sw)/2, (ih-sh)/2, sw, sh, 0, 0, cw, ch);
    } else {
        ctx.fillStyle = '#111'; ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    }

    const barW=480,barH=24,barX=(ctx.canvas.width-barW)/2,barY=ctx.canvas.height-104;
    ctx.fillStyle='rgba(8,8,10,.82)';ctx.beginPath();ctx.roundRect(barX-18,barY-88,barW+36,148,14);ctx.fill();

    ctx.textAlign='center';
    ctx.fillStyle='#fff2c2';ctx.font='bold 31px Bebas Neue';
    ctx.fillText(loadState.title || 'JOÃO & CRIST',ctx.canvas.width/2,barY-60);
    ctx.fillStyle='#f0b52f';ctx.font='bold 17px Righteous';
    ctx.fillText(loadState.subtitle || 'Preparando o jogo',ctx.canvas.width/2,barY-35);

    if (loadState.error) {
        ctx.fillStyle='#ff625c';ctx.font='bold 18px Righteous';ctx.fillText('NÃO FOI POSSÍVEL CARREGAR',ctx.canvas.width/2,barY-7);
        const first=loadState.failures?.[0]?.src || loadState.error?.message || 'Recurso desconhecido';
        ctx.fillStyle='#ffe2d9';ctx.font='11px monospace';ctx.fillText(String(first).slice(0,72),ctx.canvas.width/2,barY+18);
        ctx.fillStyle='#fff';ctx.font='bold 14px Righteous';ctx.fillText('ENTER / A / CLIQUE — TENTAR NOVAMENTE',ctx.canvas.width/2,barY+46);
        ctx.restore();
        return;
    }

    ctx.fillStyle='#1b130d';ctx.fillRect(barX-5,barY-5,barW+10,barH+10);
    ctx.fillStyle='#d49a26';ctx.fillRect(barX-3,barY-3,barW+6,barH+6);
    ctx.fillStyle='#241b16';ctx.fillRect(barX,barY,barW,barH);
    const innerW=barW-8,filled=Math.floor(innerW*loadingProgress);
    ctx.fillStyle='#f0b52f';ctx.fillRect(barX+4,barY+4,filled,barH-8);
    ctx.fillStyle='rgba(70,40,18,.38)';for(let x=barX+22;x<barX+barW-5;x+=22)ctx.fillRect(x,barY+4,3,barH-8);

    const pct=Math.floor(loadingProgress*100);
    ctx.fillStyle='#fff2c2';ctx.font='bold 16px monospace';ctx.fillText(`${pct}%`,ctx.canvas.width/2,barY-10);
    const dots='.'.repeat((Math.floor(performance.now()/320)%3)+1);
    ctx.fillStyle='#e6d2a2';ctx.font='bold 14px monospace';ctx.fillText(`CARREGANDO${dots}`,ctx.canvas.width/2,barY+50);
    if(loadState.tip){ctx.fillStyle='#b8dfff';ctx.font='11px Righteous';ctx.fillText(`DICA: ${loadState.tip}`,ctx.canvas.width/2,barY+78);}

    if (!loadState.active && loadingProgress >= 1 && loadState.type === 'bootstrap') {
        ctx.fillStyle='#fff';ctx.font='bold 13px Righteous';
        if((Math.floor(performance.now()/450)&1)===0)ctx.fillText('PRESSIONE QUALQUER TECLA',ctx.canvas.width/2,barY+98);
    }
    ctx.restore();
}

function drawMenuBackgroundCover(img) {
    const cw = ctx.canvas.width;
    const ch = ctx.canvas.height;
    if (img && img.complete && img.naturalWidth) {
        const iw = img.naturalWidth, ih = img.naturalHeight;
        const scale = Math.max(cw / iw, ch / ih);
        const sw = cw / scale;
        const sh = ch / scale;
        const sx = (iw - sw) / 2;
        const sy = (ih - sh) / 2;
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, cw, ch);
        return true;
    }
    return false;
}

function drawMenu() {
    refreshMenuOptions();
    menuButtonRects = [];

    const drewBg = drawMenuBackgroundCover(mainMenuBackgroundImage);
    if (!drewBg) {
        const sky = ctx.createLinearGradient(0, 0, 0, 650);
        sky.addColorStop(0, '#0c1026');
        sky.addColorStop(0.58, '#321247');
        sky.addColorStop(0.76, '#d25a38');
        sky.addColorStop(1, '#1b1114');
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, 1000, 650);
    }

    const savedData = saveSystem.load();
    const highestPhase = Math.max(1, savedData.highestLevel || 1);
    const recordText = `RECORDE ${savedData.highScore || 0}  •  FASE ${highestPhase}`;

    // Linha de status abaixo do letreiro principal.
    ctx.save();
    ctx.fillStyle = 'rgba(8, 10, 16, 0.96)';
    ctx.strokeStyle = '#8c5a2b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(330, 165, 340, 36, 10);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#f0b44c';
    ctx.font = 'bold 16px Righteous';
    ctx.textAlign = 'center';
    ctx.fillText(recordText, 500, 188);
    ctx.restore();

    // Painel central redesenhado para refletir opções desbloqueadas e seleção atual.
    const panelX = 318;
    const panelY = 204;
    const panelW = 364;
    const compactMenu = menuOptions.length >= 8;
    const ultraCompactMenu = menuOptions.length >= 9;
    const topPad = ultraCompactMenu ? 9 : (compactMenu ? 12 : 18);
    const bottomPad = ultraCompactMenu ? 9 : (compactMenu ? 12 : 18);
    const optionH = ultraCompactMenu ? 25 : (compactMenu ? 28 : 34);
    const spacing = ultraCompactMenu ? 3 : (compactMenu ? 5 : 8);
    const panelH = Math.max(356, topPad + bottomPad + menuOptions.length * optionH + Math.max(0, menuOptions.length - 1) * spacing);

    ctx.save();
    ctx.fillStyle = 'rgba(8, 10, 16, 0.96)';
    ctx.strokeStyle = '#b07b3a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(panelX, panelY, panelW, panelH, 18);
    ctx.fill();
    ctx.stroke();

    menuOptions.forEach((option, i) => {
        const y = panelY + topPad + i * (optionH + spacing);
        const isSelected = i === menuSelection;
        const buttonRect = { x: panelX + 24, y, w: panelW - 48, h: optionH };
        menuButtonRects.push(buttonRect);

        if (isSelected) {
            const grad = ctx.createLinearGradient(buttonRect.x, y, buttonRect.x, y + optionH);
            grad.addColorStop(0, '#c94d20');
            grad.addColorStop(1, '#982819');
            ctx.fillStyle = grad;
            ctx.strokeStyle = '#ffcf5d';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(buttonRect.x, buttonRect.y, buttonRect.w, buttonRect.h, 8);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#f9d152';
            ctx.font = 'bold 18px Bebas Neue';
            ctx.textAlign = 'center';
            ctx.fillText('◀', buttonRect.x + 18, buttonRect.y + Math.round(optionH*0.72));
            ctx.fillText('▶', buttonRect.x + buttonRect.w - 18, buttonRect.y + Math.round(optionH*0.72));
            ctx.fillStyle = '#fff9df';
            ctx.font = ultraCompactMenu ? 'bold 18px Bebas Neue' : (compactMenu ? 'bold 20px Bebas Neue' : 'bold 24px Bebas Neue');
            ctx.fillText(option, panelX + panelW / 2, buttonRect.y + Math.round(optionH*0.72));
        } else {
            ctx.fillStyle = '#e9dcc6';
            ctx.font = ultraCompactMenu ? 'bold 16px Bebas Neue' : (compactMenu ? 'bold 18px Bebas Neue' : 'bold 21px Bebas Neue');
            ctx.textAlign = 'center';
            ctx.fillText(option, panelX + panelW / 2, buttonRect.y + Math.round(optionH*0.72));
        }
    });
    ctx.restore();

    // Faixa inferior com ajuda dinâmica.
    const pads = gamepadSystem.connected.length;
    ctx.save();
    ctx.fillStyle = 'rgba(8, 10, 16, 0.96)';
    ctx.strokeStyle = '#8c5a2b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(188, 580, 623, 54, 12);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.font = 'bold 14px Righteous';
    ctx.fillStyle = '#f0e6d2';
    ctx.fillText(pads ? `Gamepad compatível  •  ${pads} controle${pads > 1 ? 's' : ''} conectado${pads > 1 ? 's' : ''}` : 'Gamepad compatível  •  Conecte e pressione um botão', 500, 606);
    ctx.font = 'bold 12px Righteous';
    ctx.fillStyle = '#8ff56f';
    ctx.fillText('ENTER / A para selecionar', 608, 626);
    ctx.fillStyle = '#f0e6d2';
    ctx.fillText('↑ ↓ / W S / Analógico para navegar', 343, 626);
    ctx.fillStyle = '#ff6d5f';
    ctx.fillText('ESC / B para voltar', 731, 626);
    ctx.restore();
}



function getCanvasPointerPosition(evt) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
        x: (evt.clientX - rect.left) * scaleX,
        y: (evt.clientY - rect.top) * scaleY
    };
}

function hitTestMenuOption(px, py) {
    for (let i = 0; i < menuButtonRects.length; i++) {
        const r = menuButtonRects[i];
        if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) return i;
    }
    return -1;
}

function prettyKey(k) {
    if (k === ' ') return 'ESPAÇO';
    if (k === 'Shift') return 'SHIFT';
    if (k === 'Enter') return 'ENTER';
    return String(k).replace('Arrow','').toUpperCase();
}

function drawMenuSprite(sheet, frame, x, y, w, h, row=0) {
    if (!sheet || !sheet.complete || !sheet.naturalWidth) return;
    ctx.save(); ctx.imageSmoothingEnabled=false;
    ctx.drawImage(sheet, frame*128, row*128, 128,128, x,y,w,h); ctx.restore();
}

function drawMenuFrameFromRect(sheet, rect, x, y, w, h, flip=false) {
    if(!sheet?.complete || !sheet.naturalWidth || !rect) return false;
    const [sx,sy,sw,sh]=rect;
    ctx.save();
    ctx.imageSmoothingEnabled=false;
    if(flip){ctx.translate(x+w,0);ctx.scale(-1,1);ctx.drawImage(sheet,sx,sy,sw,sh,0,y,w,h);}else{ctx.drawImage(sheet,sx,sy,sw,sh,x,y,w,h);}
    ctx.restore();
    return true;
}

function drawMenuFrameImage(img, x, y, w, h, flip=false) {
    if(!img?.complete || !img.naturalWidth) return false;
    ctx.save();
    ctx.imageSmoothingEnabled=false;
    if(flip){ctx.translate(x+w,0);ctx.scale(-1,1);ctx.drawImage(img,0,0,img.naturalWidth,img.naturalHeight,0,y,w,h);}else{ctx.drawImage(img,x,y,w,h);}
    ctx.restore();
    return true;
}

function getCharacterPreviewAnim(name, selected){
    const n=String(name||'').toLowerCase();
    const t=performance.now();
    if(n==='joão'||n==='joao'){
        const cycle=selected?5600:3600;
        const p=t%cycle;
        if(selected){
            if(p<900) return {state:'walk', frameMs:100, drift:Math.sin((p/900)*Math.PI)*14, bob:Math.sin(p/90)*1.8, scale:1.03};
            if(p<1700) return {state:'run', frameMs:88, drift:Math.sin((p-900)/800*Math.PI)*18, bob:Math.sin(p/70)*2.2, scale:1.05, fx:'dust'};
            if(p<2400) return {state:'dash', frameMs:84, drift:18, bob:-2, scale:1.07, fx:'dash'};
            if(p<3350) return {state:'attack', frameMs:105, drift:10, bob:0, scale:1.04, fx:'impact'};
            if(p<4300) return {state:'ranged', frameMs:120, drift:14, bob:0, scale:1.03, fx:'shot'};
            if(p<5000) return {state:'jump', frameMs:120, drift:8, bob:-10-Math.sin((p-4300)/700*Math.PI)*18, scale:1.02, fx:'air'};
            return {state:'idle', frameMs:150, drift:0, bob:Math.sin(p/120)*2.1, scale:1.02, fx:'shine'};
        }
        if(p<1200) return {state:'walk', frameMs:125, drift:Math.sin((p/1200)*Math.PI)*10, bob:Math.sin(p/150)*1.3, scale:1};
        if(p<2100) return {state:'attack', frameMs:125, drift:6, bob:0, scale:1.01, fx:'impact'};
        return {state:'idle', frameMs:185, drift:0, bob:Math.sin(p/170)*1.5, scale:1};
    }
    if(n==='crist'){
        const cycle=selected?5600:3700;
        const p=t%cycle;
        if(selected){
            if(p<950) return {state:'walk', frameMs:96, drift:Math.sin((p/950)*Math.PI)*14, bob:Math.sin(p/90)*1.5, scale:1.02};
            if(p<1750) return {state:'run', frameMs:82, drift:Math.sin((p-950)/800*Math.PI)*20, bob:Math.sin(p/68)*2.2, scale:1.05, fx:'dust'};
            if(p<2450) return {state:'dash', frameMs:95, drift:22, bob:-1, scale:1.07, fx:'dash'};
            if(p<3400) return {state:'attack', frameMs:108, drift:9, bob:0, scale:1.05, fx:'slash'};
            if(p<4250) return {state:'jump', frameMs:120, drift:7, bob:-12-Math.sin((p-3400)/850*Math.PI)*18, scale:1.03, fx:'air'};
            return {state:'idle', frameMs:165, drift:0, bob:Math.sin(p/115)*1.9, scale:1.02, fx:'shine'};
        }
        if(p<1200) return {state:'walk', frameMs:120, drift:Math.sin((p/1200)*Math.PI)*9, bob:Math.sin(p/150)*1.2, scale:1};
        if(p<2200) return {state:'dash', frameMs:110, drift:10, bob:-1, scale:1.02, fx:'dash'};
        return {state:'idle', frameMs:180, drift:0, bob:Math.sin(p/170)*1.5, scale:1};
    }
    if(n==='chico fumaça'||n==='chico fumaca'){
        const p=t%2800;
        return {state:'idle', frameMs:220, drift:Math.sin(p/350)*2.2, bob:Math.sin(p/180)*2.8, scale:1.02+Math.sin(p/240)*0.015, fx:(p>1800&&p<2400)?'shine':'idle'};
    }
    return {state:'idle', frameMs:220, drift:0, bob:Math.sin((t%3000)/220)*1.2, scale:1};
}

function drawCharacterPreview(name, cx, cardY, selected){
    const n=String(name||'').toLowerCase();
    const anim=getCharacterPreviewAnim(name, selected);
    const previewTop=cardY+20;
    const previewH=172;
    const previewW=164;
    const frameBox={x:cx-previewW/2,y:previewTop,w:previewW,h:previewH};
    const baseX=frameBox.x + (selected?8:0) + (anim.drift||0);
    const baseY=frameBox.y + (anim.bob||0);
    const scale=anim.scale||1;

    ctx.save();
    ctx.beginPath();
    ctx.rect(frameBox.x-8, frameBox.y-8, frameBox.w+16, frameBox.h+16);
    ctx.clip();

    const shadowBase = (anim.state==='jump'||anim.fx==='air') ? 44 : 62;
    ctx.save();
    ctx.globalAlpha=(anim.state==='jump'||anim.fx==='air') ? 0.16 : 0.28;
    ctx.fillStyle='#000';
    ctx.beginPath();
    ctx.ellipse(cx + (selected?6:0) + (anim.drift||0), frameBox.y + frameBox.h - 5, shadowBase*(2-scale*0.7), 10, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();

    const drawSparkles=(color,centerX,centerY)=>{
        ctx.save();
        ctx.fillStyle=color;
        for(let i=0;i<3;i++){
            const ang=(performance.now()/220)+(i*2.1);
            const rx=Math.cos(ang)*38;
            const ry=Math.sin(ang*1.3)*26;
            ctx.globalAlpha=0.28+0.12*Math.sin(ang*1.7+i);
            ctx.fillRect(centerX+rx,centerY+ry,3,3);
        }
        ctx.restore();
    };
    const drawDashFx=(x,y,w,h,color)=>{
        ctx.save();
        ctx.globalAlpha=.16; ctx.fillStyle=color; ctx.fillRect(x+w-22,y+22,28,56);
        ctx.globalAlpha=.11; ctx.fillRect(x+w+8,y+32,18,38);
        ctx.restore();
    };

    if(n==='joão'||n==='joao'){
        const fallback = (JOAO_16_FRAMES?.idle||[])[0];
        const frames=JOAO_16_FRAMES?.[anim.state]||JOAO_16_FRAMES?.idle||[];
        const idx=Math.floor(performance.now()/anim.frameMs)%Math.max(1,frames.length);
        const rect=frames[idx]||fallback;
        if(rect && JOAO_SPRITE_SHEET?.complete && JOAO_SPRITE_SHEET.naturalWidth){
            const [sx,sy,sw,sh]=rect;
            const ratio=sw/sh;
            let drawH=(anim.state==='ranged'?120:(anim.state==='attack'?118:(anim.state==='dash'?116:(anim.state==='jump'?128:132))))*scale;
            let drawW=Math.min(160,Math.max(88,drawH*ratio));
            const x=Math.round(baseX+(frameBox.w-drawW)/2);
            const y=Math.round(baseY+frameBox.h-drawH-2);
            drawMenuFrameFromRect(JOAO_SPRITE_SHEET, rect, x, y, drawW, drawH, false);
            if(anim.fx==='shot'){ ctx.save();ctx.globalAlpha=.92;ctx.fillStyle='#ffd76a';ctx.fillRect(x+drawW-6,y+46,28,3);ctx.fillStyle='#ff8c34';ctx.fillRect(x+drawW+22,y+45,14,5);ctx.restore(); }
            if(anim.fx==='impact'){ ctx.save();ctx.globalAlpha=.22;ctx.strokeStyle='#4ba3ff';ctx.lineWidth=7;ctx.beginPath();ctx.arc(cx+46,previewTop+92,40,-1.2,1.15);ctx.stroke();ctx.restore(); }
            if(anim.fx==='dash') drawDashFx(x,y,drawW,drawH,'#4ba3ff');
            if(anim.fx==='dust'){ ctx.save();ctx.globalAlpha=.22;ctx.fillStyle='#d8f0ff';ctx.fillRect(x-10,y+drawH-20,18,8);ctx.fillRect(x-24,y+drawH-14,14,6);ctx.restore(); }
            if(selected) drawSparkles('#84c4ff',cx+36,previewTop+78);
        }
        ctx.restore();
        return;
    }

    if(n==='crist'){
        const fallback = (CRIST_FRAMES?.idle||[])[0];
        const frames=CRIST_FRAMES?.[anim.state]||CRIST_FRAMES?.idle||[];
        const idx=Math.floor(performance.now()/anim.frameMs)%Math.max(1,frames.length);
        const img=frames[idx]||fallback;
        if(img?.complete&&img.naturalWidth){
            const ratio=img.naturalWidth/img.naturalHeight;
            let drawH=(anim.state==='dash'?118:(anim.state==='attack'?124:(anim.state==='jump'?128:132)))*scale;
            let drawW=Math.min(154,Math.max(86,drawH*ratio));
            const x=Math.round(baseX+(frameBox.w-drawW)/2);
            const y=Math.round(baseY+frameBox.h-drawH-2);
            drawMenuFrameImage(img, x, y, drawW, drawH, true);
            if(anim.fx==='slash'){ ctx.save();ctx.globalAlpha=.24;ctx.strokeStyle='#ff6c56';ctx.lineWidth=8;ctx.beginPath();ctx.arc(cx-40,previewTop+98,42,2.05,4.1);ctx.stroke();ctx.restore(); }
            if(anim.fx==='dash') drawDashFx(x,y,drawW,drawH,'#75f6ff');
            if(anim.fx==='dust'){ ctx.save();ctx.globalAlpha=.22;ctx.fillStyle='#ffe4df';ctx.fillRect(x+drawW-20,y+drawH-18,18,8);ctx.fillRect(x+drawW-34,y+drawH-12,14,6);ctx.restore(); }
            if(selected) drawSparkles('#ff8678',cx-30,previewTop+78);
        }
        ctx.restore();
        return;
    }

    if(n==='chico fumaça'||n==='chico fumaca'){
        const frames=(CHICO_FRAMES?.idle||[]);
        const idx=Math.floor(performance.now()/190)%Math.max(1,frames.length);
        const img=frames[idx]||frames[0]||chicoFumacaSelectImage;
        if(img?.complete&&img.naturalWidth){
            const drawH=132*scale, drawW=Math.min(138, img.naturalWidth*(drawH/img.naturalHeight));
            const x=Math.round(baseX+(frameBox.w-drawW)/2);
            const y=Math.round(baseY+frameBox.h-drawH-2);
            drawMenuFrameImage(img, x, y, drawW, drawH, false);
            ctx.save(); ctx.globalAlpha=.12; ctx.fillStyle='#ffd06a'; ctx.fillRect(x+18, y+18, Math.max(10,drawW-36), 8); ctx.restore();
            drawSparkles('#f0bd55', cx, previewTop+80);
        }
    }
    ctx.restore();
}

function drawCharacterCard(cx,index,name,accent,stats,role,chosen,opts={}) {
    const selected=!opts.locked && characterSelectCursor===index;
    const transitioning=!!(characterSelectTransition && characterSelectTransition.cardIndex===index);
    const locked=!!opts.locked;
    const cardW=250, cardH=360, cardY=132;
    ctx.save();
    ctx.fillStyle=(selected||transitioning)?'rgba(20,20,20,.94)':locked?'rgba(24,18,14,.84)':'rgba(10,10,10,.76)';
    ctx.strokeStyle=(selected||transitioning)?accent:locked?'#8b6847':'#66574a';
    ctx.lineWidth=(selected||transitioning)?5:2;
    if(selected||transitioning){ctx.shadowBlur=22+(transitioning?10:0);ctx.shadowColor=accent;}
    ctx.beginPath();ctx.roundRect(cx-cardW/2,cardY,cardW,cardH,18);ctx.fill();ctx.stroke(); ctx.shadowBlur=0;

    drawCharacterPreview(name, cx, cardY, selected||locked);

    if(locked){
        ctx.fillStyle='rgba(0,0,0,.45)';ctx.beginPath();ctx.roundRect(cx-86,186,172,28,12);ctx.fill();
        ctx.fillStyle='#f5c04a';ctx.font='bold 16px Bebas Neue';ctx.textAlign='center';ctx.fillText('3º LUTADOR • EM BREVE',cx,206);
    }

    ctx.fillStyle=locked?'#f0bd55':accent;ctx.font='bold 31px Bebas Neue';ctx.textAlign='center';ctx.fillText(name,cx,338);
    ctx.fillStyle='#efe3d1';ctx.font='13px Righteous';ctx.fillText(role,cx,362);
    ctx.textAlign='left';ctx.font='13px Righteous'; stats.forEach((t,i)=>ctx.fillText(t,cx-92,398+i*24));
    if(chosen){ctx.fillStyle='#66f28f';ctx.font='bold 15px Righteous';ctx.textAlign='center';ctx.fillText('✓ SELECIONADO',cx,470);}
    else if(locked){ctx.fillStyle='#d7b27a';ctx.font='bold 15px Righteous';ctx.textAlign='center';ctx.fillText('CHICO FUMAÇA',cx,464); ctx.font='12px Righteous'; ctx.fillText('EM BREVE NA ESTRADA',cx,484);}
    else if(transitioning){ctx.fillStyle='#fff4cf';ctx.font='bold 14px Righteous';ctx.textAlign='center';ctx.fillText('CONFIRMANDO...',cx,476);}
    else if(selected){ctx.fillStyle='#f5c04a';ctx.font='bold 13px Righteous';ctx.textAlign='center';ctx.fillText('ENTER / A PARA ESCOLHER',cx,476);}
    else {ctx.fillStyle='#bfae97';ctx.font='12px Righteous';ctx.textAlign='center';ctx.fillText('PRONTO PARA A ESTRADA',cx,478);}
    ctx.restore();
}

function drawTutorialCharacter(cx,sheet,name,accent,tag,tips) {
    ctx.fillStyle='rgba(0,0,0,.58)';ctx.strokeStyle=accent;ctx.lineWidth=3;ctx.beginPath();ctx.roundRect(cx-190,108,380,250,14);ctx.fill();ctx.stroke();
    if(sheet?.complete&&sheet.naturalWidth){ctx.imageSmoothingEnabled=false;ctx.drawImage(sheet,0,0,128,128,cx-165,135,145,145);}
    else if(name==='CRIST' && CRIST_FRAMES?.idle?.[0]?.complete){const im=CRIST_FRAMES.idle[0];ctx.imageSmoothingEnabled=false;ctx.drawImage(im,cx-150,135,115,145);}
    ctx.fillStyle=accent;ctx.font='bold 34px Bebas Neue';ctx.textAlign='left';ctx.fillText(name,cx-2,157);
    ctx.fillStyle='#f5c04a';ctx.font='bold 14px Righteous';ctx.fillText(tag,cx-2,181);
    ctx.fillStyle='#fff';ctx.font='13px Righteous'; tips.forEach((t,i)=>ctx.fillText('• '+t,cx-2,215+i*34));
}

function drawControlsConfig() {
    const g=ctx.createLinearGradient(0,0,0,650);g.addColorStop(0,'#11182c');g.addColorStop(1,'#1d0f14');ctx.fillStyle=g;ctx.fillRect(0,0,1000,650);
    ctx.fillStyle='#fff0c7';ctx.font='bold 47px Bebas Neue';ctx.textAlign='center';ctx.fillText('CONFIGURAR CONTROLES',500,58);
    ctx.fillStyle='#d8c19a';ctx.font='14px Righteous';ctx.fillText('Controles por jogador. A ação TIRO é exclusiva do João e usa um botão separado do soco.',500,84);

    const isKeyboard=controlsConfigDevice==='keyboard';
    ctx.fillStyle=isKeyboard?'#f5c04a':'#7e6d57';ctx.beginPath();ctx.roundRect(330,101,160,36,8);ctx.fill();
    ctx.fillStyle=!isKeyboard?'#f5c04a':'#7e6d57';ctx.beginPath();ctx.roundRect(510,101,160,36,8);ctx.fill();
    ctx.fillStyle='#17120e';ctx.font='bold 17px Bebas Neue';ctx.fillText('TECLADO',410,126);ctx.fillText('GAMEPAD',590,126);
    ctx.fillStyle='#cfc1ad';ctx.font='12px Righteous';ctx.fillText('TAB alterna dispositivo',500,151);

    const pads=gamepadSystem.getPads();
    [1,2].forEach((pl,i)=>{
        const x=i?535:105,w=360,active=controlsConfigPlayer===pl;
        ctx.fillStyle=active?'rgba(45,31,20,.96)':'rgba(8,8,12,.78)';ctx.strokeStyle=active?'#f5c04a':'#5e5145';ctx.lineWidth=active?4:2;ctx.beginPath();ctx.roundRect(x,168,w,374,15);ctx.fill();ctx.stroke();
        ctx.fillStyle=pl===1?'#69b7ff':'#ff735e';ctx.font='bold 28px Bebas Neue';ctx.textAlign='center';ctx.fillText(`JOGADOR ${pl}`,x+w/2,202);
        ctx.fillStyle='#cfc1ad';ctx.font='12px Righteous';ctx.fillText(isKeyboard?'Teclado configurável':(pads[pl-1]?pads[pl-1].id.slice(0,34):'Gamepad não conectado'),x+w/2,222);
        const kb=sistemControles.obterControles(pl);
        controlsConfigActions.forEach((action,row)=>{
            const yy=252+row*40,sel=active&&row===controlsConfigSelection;
            if(sel){ctx.fillStyle='rgba(245,192,74,.15)';ctx.strokeStyle='#f5c04a';ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(x+22,yy-27,w-44,35,8);ctx.fill();ctx.stroke();}
            ctx.fillStyle='#eee4d6';ctx.font='13px Righteous';ctx.textAlign='left';ctx.fillText(controlsConfigLabels[action],x+38,yy-4);
            const value=isKeyboard?sistemControles.nomeTecla(kb[action]):gamepadSystem.buttonName(gamepadSystem.config[pl][action]);
            ctx.fillStyle=sel?'#f5c04a':'#9de2ff';ctx.font='bold 14px Righteous';ctx.textAlign='right';ctx.fillText(value,x+w-38,yy-4);
        });
    });
    if(controlsConfigMessage){ctx.fillStyle='#74f19b';ctx.font='13px Righteous';ctx.textAlign='center';ctx.fillText(controlsConfigMessage,500,555);}
    if(controlsConfigCapture){
        ctx.fillStyle='rgba(0,0,0,.82)';ctx.fillRect(0,0,1000,650);ctx.strokeStyle='#f5c04a';ctx.lineWidth=4;ctx.fillStyle='#24160f';ctx.beginPath();ctx.roundRect(245,228,510,185,16);ctx.fill();ctx.stroke();
        ctx.fillStyle='#fff0c7';ctx.font='bold 31px Bebas Neue';ctx.textAlign='center';ctx.fillText(isKeyboard?'PRESSIONE A NOVA TECLA':'PRESSIONE O NOVO BOTÃO',500,287);
        ctx.fillStyle='#fff';ctx.font='16px Righteous';ctx.fillText(`${controlsConfigLabels[controlsConfigActions[controlsConfigSelection]]} • Jogador ${controlsConfigPlayer}`,500,329);
        ctx.fillStyle='#cdbda4';ctx.fillText('Se houver conflito, as duas ações trocam de tecla/botão automaticamente.',500,360);ctx.fillText('ESC cancela',500,389);
    } else {
        ctx.fillStyle='#ded1bd';ctx.font='14px Righteous';ctx.textAlign='center';ctx.fillText('← → troca jogador  •  ↑ ↓ ação  •  TAB teclado/gamepad  •  ENTER/A remapeia  •  R restaura  •  ESC/B volta',500,585);
        ctx.fillStyle='#9de2ff';ctx.font='13px Righteous';ctx.fillText('Gamepad e teclado são lidos separadamente: usar um não cancela o outro.',500,610);
    }
}

function toggleFullscreen() {
    const el=document.getElementById('game-container');
    try {
        if(!document.fullscreenElement) el?.requestFullscreen?.();
        else document.exitFullscreen?.();
    } catch (_) {}
}

function drawOptions() {
    const g=ctx.createLinearGradient(0,0,0,650); g.addColorStop(0,'#11182c'); g.addColorStop(.62,'#3a1725'); g.addColorStop(1,'#130d10'); ctx.fillStyle=g;ctx.fillRect(0,0,1000,650);
    ctx.save();ctx.shadowBlur=18;ctx.shadowColor='#ff9d3b';ctx.fillStyle='#fff0c7';ctx.font='bold 50px Bebas Neue';ctx.textAlign='center';ctx.fillText('OPÇÕES',500,66);ctx.restore();
    ctx.fillStyle='#d8c19a';ctx.font='14px Righteous';ctx.fillText('Ajuste o jogo sem sair da tela principal',500,92);
    ctx.fillStyle='rgba(8,8,12,.82)';ctx.strokeStyle='#8c5a2b';ctx.lineWidth=3;ctx.beginPath();ctx.roundRect(215,125,570,395,18);ctx.fill();ctx.stroke();
    const values=[
        `${gameSettings.data.masterVolume}%`, `${gameSettings.data.musicVolume}%`, `${gameSettings.data.sfxVolume}%`,
        graphicsQualityDisplay(), gameSettings.data.vibration?'LIGADA':'DESLIGADA', gameSettings.difficultyLabel(), document.fullscreenElement?'ATIVA':'ENTRAR'
    ];
    optionsItems.forEach((item,i)=>{
        const y=174+i*55, sel=i===optionsSelection;
        if(sel){ctx.fillStyle='rgba(168,50,37,.7)';ctx.strokeStyle='#ffd06a';ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(255,y-30,490,42,9);ctx.fill();ctx.stroke();}
        ctx.fillStyle=sel?'#fff6dc':'#dfd5c6';ctx.font='bold 20px Bebas Neue';ctx.textAlign='left';ctx.fillText(item,280,y-3);
        ctx.fillStyle=sel?'#ffd06a':'#8de3ff';ctx.textAlign='right';ctx.fillText(values[i],720,y-3);
        if(i<=2){
            const w=180, pct=[gameSettings.data.masterVolume,gameSettings.data.musicVolume,gameSettings.data.sfxVolume][i]/100;
            ctx.fillStyle='#302b2a';ctx.fillRect(505,y+6,w,5);ctx.fillStyle=sel?'#ffd06a':'#8de3ff';ctx.fillRect(505,y+6,w*pct,5);
        }
    });
    ctx.fillStyle='#e5d7c1';ctx.font='14px Righteous';ctx.textAlign='center';ctx.fillText('↑ ↓ escolher  •  ← → ajustar  •  ENTER/A ativar  •  ESC/B voltar',500,565);
    ctx.fillStyle='#9de2ff';ctx.fillText('Dificuldade altera vida e dano dos inimigos. Vibração depende do suporte do controle/navegador.',500,596);
    ctx.fillStyle='#b9aa94';ctx.font='12px Righteous';ctx.fillText('Configurações ficam salvas neste navegador.',500,623);
}

function activateMenuSelection() {
    refreshMenuOptions();
    const option = menuOptions[menuSelection];
    if (option==='1 JOGADOR' || option==='2 JOGADORES') {
        pendingStartLevel=0;
        playerCount=option==='2 JOGADORES'?2:1; gameState=GameState.CHARACTER_SELECT; selectedCharacters=[null,null]; characterSelectCursor=0; characterSelectReady=false; setTimeout(()=>characterSelectReady=true,300); soundSystem.playSound('menuSelect');
    } else if(option==='COMO JOGAR: JOÃO & CRIST'){gameState=GameState.TUTORIAL;soundSystem.playSound('menuSelect');}
    else if(option==='CONFIGURAR CONTROLES'){clearKeys();gameState=GameState.CONTROLS_CONFIG;controlsConfigPlayer=1;controlsConfigSelection=0;controlsConfigCapture=false;controlsConfigDevice='keyboard';controlsConfigMessage='';soundSystem.playSound('menuSelect');}
    else if(option==='TROFÉUS'){gameState=GameState.TROPHIES;if(window.trophySystem)window.trophySystem.scrollOffset=0;soundSystem.playSound('menuSelect');}
    else if(option==='OPÇÕES'){gameState=GameState.OPTIONS;optionsSelection=0;gameSettings.applyAudio(soundSystem);soundSystem.playSound('menuSelect');}
    else if(option==='CONTINUAR CAMPANHA'){
        const cp=saveSystem.loadCampaignCheckpoint?.();
        if(cp){
            pendingResumeCheckpoint=cp;
            pendingStartLevel=cp.levelIndex;
            playerCount=cp.playerCount;
            selectedCharacters=[cp.selectedCharacters[0]||'João', cp.playerCount===2?(cp.selectedCharacters[1]||'Crist'):null];
            characterSelectCursor=0;
            characterSelectReady=true;
            soundSystem.playSound('menuSelect');
            startGameWithCharacters();
        } else { refreshMenuOptions(); menuSelection=0; soundSystem.playSound('menuBack'); }
    }
    else if(option==='SELECIONAR FASE' && saveSystem.load().gameCompleted){stageSelectIndex=0;stageSelectPlayers=1;gameState=GameState.STAGE_SELECT;soundSystem.playSound('menuSelect');}
    else if(option==='BÔNUS — ESTRADA PARA VEGAS' && saveSystem.load().busMinigameUnlocked){startBonusWithLoading('bus',1);}
    else if(option==='BÔNUS — PESCARIA DO CHICO FUMAÇA'){
        soundSystem?.stopMusic?.();
        stageSelectPlayers = Math.max(1, Math.min(2, playerCount || 1));
        startBonusWithLoading('fishing',stageSelectPlayers);
    }
}
window.refreshMenuOptions = refreshMenuOptions;

function handleGamepadInput() {
    const pads=gamepadSystem.getPads(); if(!pads.length)return;
    const p=(gameState===GameState.CHARACTER_SELECT && playerCount===2 && selectedCharacters[0]!==null && pads.length>1)?1:0;
    const up=gamepadSystem.axisPressed(p,'U')||gamepadSystem.wasPressed(p,12);
    const down=gamepadSystem.axisPressed(p,'D')||gamepadSystem.wasPressed(p,13);
    const left=gamepadSystem.axisPressed(p,'L')||gamepadSystem.wasPressed(p,14);
    const right=gamepadSystem.axisPressed(p,'R')||gamepadSystem.wasPressed(p,15);
    const accept=gamepadSystem.wasPressed(p,0);
    const back=gamepadSystem.wasPressed(p,1);

    if(gameState===GameState.LOADING){const ls=window.LevelLoadState||{};if(ls.error&&accept){window.retryCurrentLoad?.();return;}if(!ls.active&&loadingProgress>=1&&ls.type==='bootstrap'&&accept){gameState=GameState.MENU;soundSystem.playSound('menuSelect');return;}}
    else if(gameState===GameState.CUTSCENE){if(accept)window.storyCutscenes?.advance?.();if(back||gamepadSystem.wasPressed(p,9))window.storyCutscenes?.skip?.();}
    else if(gameState===GameState.MENU){if(up){menuSelection=(menuSelection+menuOptions.length-1)%menuOptions.length;soundSystem.playSound('menuMove');}if(down){menuSelection=(menuSelection+1)%menuOptions.length;soundSystem.playSound('menuMove');}if(accept)activateMenuSelection();}
    else if(gameState===GameState.TROPHIES){
        if(up&&window.trophySystem){window.trophySystem.scrollUp();soundSystem.playSound('menuMove');}
        if(down&&window.trophySystem){window.trophySystem.scrollDown();soundSystem.playSound('menuMove');}
        if(back||accept){gameState=GameState.MENU;menuSelection=4;soundSystem.playSound('menuBack');}
    }
    else if(gameState===GameState.STAGE_SELECT){
        if(up||left){stageSelectIndex=(stageSelectIndex+getStageSelectCount()-1)%getStageSelectCount();soundSystem.playSound('menuMove');}
        if(down||right){stageSelectIndex=(stageSelectIndex+1)%getStageSelectCount();soundSystem.playSound('menuMove');}
        if(gamepadSystem.wasPressed(p,2)){stageSelectPlayers=stageSelectPlayers===1?2:1;soundSystem.playSound('menuMove');}
        if(accept){if(stageSelectIsBusBonus()){startBonusWithLoading('bus',stageSelectPlayers);}else if(stageSelectIsChicoBonus()){startBonusWithLoading('fishing',stageSelectPlayers);}else{pendingStartLevel=stageSelectIndex;playerCount=stageSelectPlayers;selectedCharacters=[null,null];characterSelectCursor=0;characterSelectReady=false;gameState=GameState.CHARACTER_SELECT;setTimeout(()=>characterSelectReady=true,300);soundSystem.playSound('menuSelect');}}
        if(back){gameState=GameState.MENU;menuSelection=6;soundSystem.playSound('menuBack');}
    }
    else if(gameState===GameState.TUTORIAL){if(accept||back){gameState=GameState.MENU;soundSystem.playSound('menuBack');}}
    else if(gameState===GameState.CHARACTER_SELECT){if(!characterSelectTransition&&left){nextCharacterCursor(-1);soundSystem.playSound('menuMove');}if(!characterSelectTransition&&right){nextCharacterCursor(1);soundSystem.playSound('menuMove');}if(!characterSelectTransition&&back){cancelCharacterSelectTransition();gameState=GameState.MENU;selectedCharacters=[null,null];soundSystem.playSound('menuBack');}if(accept&&characterSelectReady&&!characterSelectTransition){beginCharacterConfirm();}}
    else if(gameState===GameState.OPTIONS){
        if(up){optionsSelection=(optionsSelection+optionsItems.length-1)%optionsItems.length;soundSystem.playSound('menuMove');}
        if(down){optionsSelection=(optionsSelection+1)%optionsItems.length;soundSystem.playSound('menuMove');}
        if(left||right||accept){const dir=left?-1:1;
            if(optionsSelection===0)gameSettings.data.masterVolume=Math.max(0,Math.min(100,gameSettings.data.masterVolume+dir*5));
            else if(optionsSelection===1)gameSettings.data.musicVolume=Math.max(0,Math.min(100,gameSettings.data.musicVolume+dir*5));
            else if(optionsSelection===2)gameSettings.data.sfxVolume=Math.max(0,Math.min(100,gameSettings.data.sfxVolume+dir*5));
            else if(optionsSelection===3)gameSettings.cycleGraphicsQuality(dir);
            else if(optionsSelection===4){gameSettings.data.vibration=!gameSettings.data.vibration;if(gameSettings.data.vibration)gamepadSystem.rumble(1,160,.55,.35);}
            else if(optionsSelection===5)gameSettings.cycleDifficulty(dir);
            else if(optionsSelection===6&&accept)toggleFullscreen();
            gameSettings.save();gameSettings.applyAudio(soundSystem);soundSystem.playSound('menuSelect');}
        if(back){gameState=GameState.MENU;menuSelection=5;soundSystem.playSound('menuBack');}
    }
    else if(gameState===GameState.CONTROLS_CONFIG){
        if(controlsConfigDevice==='gamepad' && controlsConfigCapture){
            const pi=Math.min(controlsConfigPlayer-1,pads.length-1);
            if(pi>=0&&pads[pi]) for(let bi=0;bi<pads[pi].buttons.length;bi++) if(gamepadSystem.wasPressed(pi,bi)){
                const action=controlsConfigActions[controlsConfigSelection];
                const conflict=gamepadSystem.setButton(controlsConfigPlayer,action,bi);
                gamepadSystem.rumble(controlsConfigPlayer,100,.35,.2);controlsConfigCapture=false;
                controlsConfigMessage=conflict?`Botões trocados: ${controlsConfigLabels[action]} ↔ ${controlsConfigLabels[conflict]}`:'Botão salvo';soundSystem.playSound('menuSelect');break;
            }
        } else if(!controlsConfigCapture){
            if(up){controlsConfigSelection=(controlsConfigSelection+controlsConfigActions.length-1)%controlsConfigActions.length;soundSystem.playSound('menuMove');}
            if(down){controlsConfigSelection=(controlsConfigSelection+1)%controlsConfigActions.length;soundSystem.playSound('menuMove');}
            if(left||right){controlsConfigPlayer=controlsConfigPlayer===1?2:1;soundSystem.playSound('menuMove');}
            if(gamepadSystem.wasPressed(p,10)){controlsConfigDevice=controlsConfigDevice==='keyboard'?'gamepad':'keyboard';controlsConfigMessage='';soundSystem.playSound('menuMove');}
            if(accept){controlsConfigCapture=true;controlsConfigMessage='';soundSystem.playSound('menuSelect');}
            if(back){gameState=GameState.MENU;menuSelection=3;soundSystem.playSound('menuBack');}
        }
    }
    else if(gameState===GameState.GAME_OVER){
        if(levelGateActive){ if(accept) replayPreviousLevelFromGate(); else if(back) returnToMenuFromGameOver(); }
        else if(accept||back) returnToMenuFromGameOver();
    }
    else if(gameState===GameState.VICTORY){ if(accept||back){ gameState=GameState.MENU;refreshMenuOptions?.();menuSelection=0;soundSystem.playSound('menuSelect'); } }
    else if((gameState===GameState.STORY_INTRO||gameState===GameState.STORY_LEVEL||gameState===GameState.LEVEL_INTRO||gameState===GameState.LEVEL_COMPLETE)&&accept){if(gameState===GameState.STORY_INTRO)gameState=GameState.STORY_LEVEL;else if(gameState===GameState.STORY_LEVEL)gameState=GameState.LEVEL_INTRO;else if(gameState===GameState.LEVEL_INTRO){gameState=GameState.PLAYING;levelStartTime=Date.now();levelDamageTaken=0;startLevelMusic();}else nextLevel();soundSystem.playSound('menuSelect');}
    else if([GameState.PLAYING,GameState.BUS_MINIGAME,GameState.FISHING_BONUS].includes(gameState)&&[0,1].some(i=>pads[i]&&gamepadSystem.wasPressed(i,gamepadSystem.config[i+1]?.pause??9))){enterTruePause(gameState);}
    else if(gameState===GameState.PAUSED){
        if(showModal){
            if(accept){showModal=false;const cb=modalCallback;modalCallback=null;cb?.();}
            else if(back){showModal=false;modalCallback=null;soundSystem.playSound('menuBack');}
            return;
        }
        const pausePressed=[0,1].some(i=>pads[i]&&gamepadSystem.wasPressed(i,gamepadSystem.config[i+1]?.pause??9));
        if(pausePressed||back){resumeTruePause();}
        else if(up){pauseMenuSelection=(pauseMenuSelection+pauseMenuItems.length-1)%pauseMenuItems.length;soundSystem.playSound('menuMove');}
        else if(down){pauseMenuSelection=(pauseMenuSelection+1)%pauseMenuItems.length;soundSystem.playSound('menuMove');}
        else if(left){adjustPauseMenuSetting(-1,false);}
        else if(right){adjustPauseMenuSetting(1,false);}
        else if(accept){adjustPauseMenuSetting(1,true);}
    }
}

function drawStageSelect() {
    const g=ctx.createLinearGradient(0,0,0,650); g.addColorStop(0,'#090d20'); g.addColorStop(.55,'#30133b'); g.addColorStop(1,'#6b2d1b'); ctx.fillStyle=g;ctx.fillRect(0,0,1000,650);
    ctx.fillStyle='#fff1c8';ctx.font='bold 46px Bebas Neue';ctx.textAlign='center';ctx.fillText('SELECIONAR FASE / BÔNUS',500,52);
    ctx.fillStyle='#f5c04a';ctx.font='13px Righteous';ctx.fillText('Campanha concluída • conteúdos extras e desafios',500,76);

    const entries=LEVELS.map((level,i)=>({title:`${i+1}. ${level.name}`,desc:level.description||'Rumo a Vegas',bonus:false,playable:true}));
    if(saveSystem.load().busMinigameUnlocked)entries.push({title:'BÔNUS — ESTRADA PARA VEGAS',desc:'Rejogue o minigame do ônibus sem repetir a Fase 2',bonus:true,playable:true});
    entries.push({title:'BÔNUS — PESCARIA DO CHICO FUMAÇA',desc:'Pesque no açude do Chico Fumaça e enfrente o monstro que morder o anzol.',bonus:true,chico:true,playable:true});

    const cardY=92, cardH=38, gap=5;
    const listX=112, listW=620;
    entries.forEach((entry,i)=>{
        const y=cardY+i*(cardH+gap),sel=i===stageSelectIndex;
        ctx.fillStyle=sel?(entry.chico?'rgba(117,78,25,.95)':entry.bonus?'rgba(45,115,108,.94)':'rgba(168,50,37,.92)'):'rgba(10,10,14,.82)';
        ctx.strokeStyle=sel?'#ffd06a':'#65513f';ctx.lineWidth=sel?3:1;
        ctx.beginPath();ctx.roundRect(listX,y,listW,cardH,8);ctx.fill();ctx.stroke();
        ctx.textAlign='left';ctx.fillStyle=sel?'#fff7db':'#ddd3c2';ctx.font='bold 17px Bebas Neue';ctx.fillText(entry.title,listX+18,y+17);
        ctx.fillStyle=sel?'#ffd06a':'#9eb2c7';ctx.font='10px Righteous';ctx.fillText(entry.desc.slice(0,72),listX+18,y+32);
        ctx.textAlign='right';ctx.fillStyle=entry.playable?(sel?'#fff':'#8d8273'):'#f5c04a';ctx.font='bold 14px Bebas Neue';ctx.fillText(sel?(entry.playable?'▶ JOGAR':'EM BREVE'):'',listX+listW-16,y+24);
    });

    // Preview do novo bônus do Chico Fumaça, apenas no seletor por enquanto.
    if(stageSelectIsChicoBonus()){
        const px=758,py=150,pw=205,ph=310;
        ctx.fillStyle='rgba(12,16,20,.90)';ctx.strokeStyle='#d99a37';ctx.lineWidth=3;
        ctx.beginPath();ctx.roundRect(px,py,pw,ph,16);ctx.fill();ctx.stroke();
        ctx.fillStyle='#ffd06a';ctx.font='bold 22px Bebas Neue';ctx.textAlign='center';ctx.fillText('CHICO FUMAÇA',px+pw/2,py+34);
        if(chicoFumacaSelectImage.complete&&chicoFumacaSelectImage.naturalWidth){
            const s=Math.min(165/chicoFumacaSelectImage.naturalWidth,190/chicoFumacaSelectImage.naturalHeight);
            const iw=chicoFumacaSelectImage.naturalWidth*s,ih=chicoFumacaSelectImage.naturalHeight*s;
            ctx.save();ctx.imageSmoothingEnabled=false;ctx.drawImage(chicoFumacaSelectImage,px+pw/2-iw/2,py+52,iw,ih);ctx.restore();
        }
        ctx.fillStyle='#fff1c8';ctx.font='12px Righteous';ctx.fillText('FAZENDA DO CHICO FUMAÇA',px+pw/2,py+257);
        ctx.fillStyle='#8de3ff';ctx.font='11px Righteous';ctx.fillText('Pescaria + Boss Tubarão',px+pw/2,py+279);
        ctx.fillStyle='#79ef9a';ctx.font='bold 17px Bebas Neue';ctx.fillText('PRONTO PARA JOGAR',px+pw/2,py+304);
    }

    ctx.textAlign='center';ctx.fillStyle='#8de3ff';ctx.font='13px Righteous';ctx.fillText(`MODO: ${stageSelectPlayers} JOGADOR${stageSelectPlayers>1?'ES':''}  •  TAB / X troca jogadores`,500,595);
    ctx.fillStyle='#ded1bd';ctx.font='12px Righteous';ctx.fillText('↑↓ / ←→ escolher  •  ENTER / A confirmar  •  ESC / B voltar',500,620);
}

function drawAchievements() {
    // Redirecionar para sistema de troféus
    if (window.trophySystem) {
        window.trophySystem.draw(ctx);
    } else {
        ctx.fillStyle = '#fff';
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Sistema de troféus não carregado', 500, 325);
    }
}

function drawCharacterSelect() {
    const g=ctx.createLinearGradient(0,0,0,650); g.addColorStop(0,'#101426'); g.addColorStop(.62,'#4b1d2c'); g.addColorStop(1,'#171015'); ctx.fillStyle=g; ctx.fillRect(0,0,1000,650);
    ctx.fillStyle='#20130f'; ctx.fillRect(0,510,1000,140);
    ctx.strokeStyle='#b06a35'; ctx.lineWidth=4; ctx.beginPath(); ctx.moveTo(0,510); ctx.lineTo(1000,510); ctx.stroke();

    ctx.save(); ctx.shadowBlur=18; ctx.shadowColor='#ff9d3b'; ctx.fillStyle='#fff1c8'; ctx.font='bold 49px Bebas Neue'; ctx.textAlign='center'; ctx.fillText('ESCOLHA SEU PARCEIRO DE ESTRADA',500,66); ctx.restore();
    let selectingText=selectedCharacters[0]===null?(playerCount===1?'ESCOLHA SEU LUTADOR':'JOGADOR 1 • ESCOLHA'):'JOGADOR 2 • ESCOLHA';
    if(characterSelectTransition) selectingText = `${characterSelectTransition.name.toUpperCase()} • JOGADOR ${characterSelectTransition.playerSlot} PRONTO`;
    ctx.fillStyle='#f5c04a'; ctx.font='bold 19px Righteous'; ctx.textAlign='center'; ctx.fillText(selectingText,500,98);

    drawCharacterCard(180, 0, 'JOÃO', '#4ba3ff', ['FORÇA  7/10','VELOC. 6/10','DEFESA 8/10'], 'Brigão resistente • socos fortes', selectedCharacters.includes('João'));
    drawCharacterCard(500, 1, 'CRIST', '#ff624b', ['FORÇA  8/10','VELOC. 8/10','DEFESA 6/10'], 'Bengala rápida • ótimo no avanço', selectedCharacters.includes('Crist'));
    const chicoUnlocked=chicoPlayable();
    drawCharacterCard(820, 2, 'Chico Fumaça', '#f0bd55', chicoUnlocked?['FORÇA  9/10','VELOC. 5/10','DEFESA 9/10']:['FORÇA  ???','VELOC. ???','DEFESA ???'], chicoUnlocked?'Fazendeiro bruto • força e resistência':'Fazendeiro bruto • vença o bônus da pescaria', selectedCharacters.includes('Chico Fumaça'), {locked:!chicoUnlocked});

    if(characterSelectTransition){
        const cardCenters=[180,500,820];
        const cx=cardCenters[characterSelectTransition.cardIndex]||180;
        const elapsed=performance.now()-characterSelectTransition.startedAt;
        const p=Math.min(1, elapsed/characterSelectTransition.duration);
        const pulse=Math.sin(p*Math.PI);
        ctx.save();
        ctx.globalAlpha=0.12+0.16*pulse;
        ctx.fillStyle='#fff1c8';
        ctx.beginPath(); ctx.roundRect(cx-145-pulse*10,124-pulse*6,290+pulse*20,378+pulse*12,24); ctx.fill();
        ctx.globalAlpha=1;
        ctx.strokeStyle=characterSelectTransition.accent; ctx.shadowColor=characterSelectTransition.accent; ctx.shadowBlur=24; ctx.lineWidth=6;
        ctx.beginPath(); ctx.roundRect(cx-145-pulse*8,124-pulse*5,290+pulse*16,378+pulse*10,24); ctx.stroke();
        ctx.shadowBlur=0;
        ctx.fillStyle='#fff6db'; ctx.font='bold 24px Bebas Neue'; ctx.textAlign='center';
        ctx.fillText(`${characterSelectTransition.name.toUpperCase()} CONFIRMADO!`, 500, 536);
        ctx.fillStyle='#f5c04a'; ctx.font='13px Righteous';
        ctx.fillText(playerCount===2 && characterSelectTransition.playerSlot===1 ? 'Agora escolha o segundo parceiro' : 'Preparando a próxima cena...', 500, 558);
        ctx.restore();
    }

    ctx.fillStyle='#d6c6ad'; ctx.font='16px Righteous'; ctx.textAlign='center';
    if(characterSelectTransition){ ctx.fillStyle='#fff4cf'; ctx.fillText('CONFIRMANDO SEU PARCEIRO...',500,612); }
    else if(!characterSelectReady){ ctx.fillStyle='#ffb34d'; ctx.fillText('PREPARANDO...',500,612); }
    else { ctx.fillText('← → / A D / Analógico: navegar   •   ENTER / A: confirmar   •   ESC / B: voltar',500,612); }
}

// Melhoria #20: Tela de tutorial/controles
function drawTutorial() {
    const g=ctx.createLinearGradient(0,0,0,650); g.addColorStop(0,'#111528'); g.addColorStop(1,'#1a0e12'); ctx.fillStyle=g; ctx.fillRect(0,0,1000,650);
    ctx.fillStyle='#fff0c7'; ctx.font='bold 48px Bebas Neue'; ctx.textAlign='center'; ctx.fillText('COMO JOGAR COM CADA PERSONAGEM',500,56);
    ctx.fillStyle='#d9b56c'; ctx.font='15px Righteous'; ctx.fillText('Os controles pertencem ao JOGADOR. Escolher João ou Crist não muda seus botões.',500,82);

    drawTutorialCharacter(250, JOAO_SPRITE_SHEET, 'JOÃO', '#4ba3ff', 'RESISTENTE', [
        'Golpe principal: socos em combo', 'Mais defesa para aprender o jogo', 'Dash ajuda a encurtar distância'
    ]);
    drawTutorialCharacter(750, CRIST_SPRITE_SHEET, 'CRIST', '#ff624b', 'ÁGIL', [
        'Golpe principal: bengala', 'Mais velocidade para pressionar', 'Ataque tem alcance maior na frente'
    ]);

    // Controles reais atuais, sem divergência do código.
    const c1=sistemControles.obterControles(1), c2=sistemControles.obterControles(2);
    ctx.fillStyle='rgba(0,0,0,.55)'; ctx.strokeStyle='#75512f'; ctx.lineWidth=2; ctx.beginPath(); ctx.roundRect(90,388,820,156,14); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#f5c04a'; ctx.font='bold 20px Bebas Neue'; ctx.fillText('TECLADO',500,417);
    ctx.fillStyle='#fff'; ctx.font='15px Righteous';
    ctx.fillText(`JOGADOR 1: ${prettyKey(c1.left)}/${prettyKey(c1.right)} mover • ${prettyKey(c1.up)} pular • ${prettyKey(c1.attack)} atacar • ${prettyKey(c1.ranged)} atirar • ${prettyKey(c1.dash)} dash`,500,449);
    ctx.fillText(`JOGADOR 2: ${prettyKey(c2.left)}/${prettyKey(c2.right)} mover • ${prettyKey(c2.up)} pular • ${prettyKey(c2.attack)} atacar • ${prettyKey(c2.ranged)} atirar • ${prettyKey(c2.dash)} dash`,500,477);
    ctx.fillStyle='#8de3ff'; ctx.fillText('GAMEPAD: analógico/D-pad mover • A pular • X atacar • Y atirar • B dash (padrão)',500,510);
    ctx.fillStyle='#cbbca5'; ctx.font='14px Righteous'; ctx.fillText('Você pode remapear os botões em CONFIGURAR CONTROLES no menu principal.',500,535);

    ctx.fillStyle='#eee2cf'; ctx.font='15px Righteous'; ctx.fillText('ENTER / ESC / B para voltar',500,614);
}

function drawStoryIntro() {
    // Fundo escuro
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, 1000, 650);
    
    // Título
    ctx.save();
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#ffd700';
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 48px Permanent Marker';
    ctx.textAlign = 'center';
    ctx.fillText('A JORNADA COMEÇA', 500, 80);
    ctx.restore();
    
    // Texto da história
    const story = gameStory.intro;
    ctx.fillStyle = '#fff';
    ctx.font = '20px Righteous';
    ctx.textAlign = 'center';
    
    const lines = story.split('\n');
    lines.forEach((line, i) => {
        ctx.fillText(line, 500, 150 + i * 35);
    });
    
    // Instruções
    ctx.fillStyle = '#00ffff';
    ctx.font = '18px Righteous';
    ctx.fillText('Pressione ENTER para continuar...', 500, 600);
}

function drawStoryLevel() {
    // Fundo escuro
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, 1000, 650);
    
    // Título do capítulo
    ctx.save();
    ctx.shadowBlur = 20;
    ctx.shadowColor = currentLevel.bgColor1;
    ctx.fillStyle = currentLevel.bgColor1;
    ctx.font = 'bold 48px Permanent Marker';
    ctx.textAlign = 'center';
    ctx.fillText(`CAPÍTULO ${currentLevelIndex + 1}`, 500, 80);
    ctx.restore();
    
    // Nome da fase
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 36px Bebas Neue';
    ctx.textAlign = 'center';
    ctx.fillText(currentLevel.name, 500, 130);
    
    // História da fase
    const story = gameStory.levels[currentLevelIndex];
    ctx.fillStyle = '#fff';
    ctx.font = '20px Righteous';
    ctx.textAlign = 'center';
    
    const lines = story.split('\n');
    lines.forEach((line, i) => {
        ctx.fillText(line, 500, 180 + i * 35);
    });
    
    // Instruções
    ctx.fillStyle = '#00ffff';
    ctx.font = '18px Righteous';
    ctx.fillText('Pressione ENTER para começar a fase...', 500, 600);
}

function drawLevelIntro() {
    // Cenário de fundo
    if (currentLevel && currentLevel.drawBackground) {

        currentLevel.drawBackground(ctx, 0);

    }
    
    // Overlay escuro
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, 1000, 650);
    
    // Animação de entrada do texto
    const progress = Math.min(1, (180 - levelIntroTimer) / 60);
    const y = 250 + (1 - progress) * 100;
    const alpha = progress;
    
    ctx.save();
    ctx.globalAlpha = alpha;
    
    // Nome da fase
    ctx.shadowBlur = 30;
    ctx.shadowColor = currentLevel.bgColor1;
    ctx.fillStyle = currentLevel.bgColor1;
    ctx.font = 'bold 72px Bebas Neue';
    ctx.textAlign = 'center';
    ctx.fillText(currentLevel.name.toUpperCase(), 500, y);
    
    // Descrição
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#000';
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 28px Righteous';
    ctx.fillText(currentLevel.description, 500, y + 60);
    
    // Número da fase
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.font = 'bold 200px Bebas Neue';
    ctx.fillText((currentLevelIndex + 1).toString(), 500, y + 180);
    
    ctx.restore();
    
    // Instruções (aparecem depois)
    if (levelIntroTimer < 120) {
        ctx.fillStyle = '#00ffff';
        ctx.font = '20px Righteous';
        ctx.textAlign = 'center';
        ctx.fillText('Pressione ENTER para começar', 500, 550);
    }
    
    levelIntroTimer--;
    if (levelIntroTimer <= 0) {
        gameState = GameState.PLAYING;
        levelStartTime = Date.now();
        levelDamageTaken = 0;
        startLevelMusic();
    }
}

function drawLevelComplete() {
    // Overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, 1000, 650);
    
    // Animação de comemoração
    levelCompleteTimer++;
    const scale = 1 + Math.sin(levelCompleteTimer * 0.1) * 0.1;
    
    ctx.save();
    ctx.translate(500, 250);
    ctx.scale(scale, scale);
    ctx.translate(-500, -250);
    
    ctx.shadowBlur = 40;
    ctx.shadowColor = '#ffd700';
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 72px Bebas Neue';
    ctx.textAlign = 'center';
    ctx.fillText('FASE COMPLETA!', 500, 250);
    ctx.restore();
    
    // Estatísticas da fase
    const levelTime = ((Date.now() - levelStartTime) / 1000).toFixed(1);
    
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 32px Righteous';
    ctx.textAlign = 'center';
    ctx.fillText(`Score: ${score}`, 500, 340);
    ctx.fillText(`Tempo: ${levelTime}s`, 500, 385);
    ctx.fillText(`Dano recebido: ${levelDamageTaken}`, 500, 430);
    
    // Bônus
    if (levelDamageTaken === 0) {
        ctx.fillStyle = '#00ff00';
        ctx.fillText('🛡️ SEM DANO! +1000', 500, 475);
    }
    
    if (parseFloat(levelTime) < 60) {
        ctx.fillStyle = '#00ffff';
        ctx.fillText('⚡ VELOCISTA! +500', 500, 520);
    }
    
    // Continuar
    ctx.fillStyle = '#00ffff';
    ctx.font = '24px Righteous';
    ctx.fillText('Pressione ENTER para continuar', 500, 590);
}

function adjustPauseMenuSetting(dir=1, activate=false) {
    const item = pauseMenuItems[pauseMenuSelection];
    if (item === 'CONTINUAR') { if (activate) resumeTruePause(); return; }
    if (item === 'VOLUME GERAL') gameSettings.data.masterVolume=Math.max(0,Math.min(100,gameSettings.data.masterVolume+dir*5));
    else if (item === 'MÚSICA') gameSettings.data.musicVolume=Math.max(0,Math.min(100,gameSettings.data.musicVolume+dir*5));
    else if (item === 'EFEITOS') gameSettings.data.sfxVolume=Math.max(0,Math.min(100,gameSettings.data.sfxVolume+dir*5));
    else if (item === 'QUALIDADE GRÁFICA') gameSettings.cycleGraphicsQuality(dir);
    else if (item === 'VIBRAÇÃO' && (activate || dir!==0)) { gameSettings.data.vibration=!gameSettings.data.vibration; if(gameSettings.data.vibration) gamepadSystem?.rumble?.(1,130,.45,.25); }
    else if (item === 'TELA CHEIA' && activate) { toggleFullscreen(); }
    else if (item === 'VOLTAR AO MENU' && activate) {
        showModal=true;
        modalMessage='Deseja voltar ao menu principal?\nSeu progresso desde o último checkpoint será perdido.';
        modalCallback=()=>{
            soundSystem?.stopAllLoops?.();
            soundSystem?.resumeAll?.();
            window.GameRuntime?.resumeTimers?.();
            pauseStartedAt=0; pauseSnapshot=null;
            releaseCurrentLevelForMenu();
            gameState=GameState.MENU; menuSelection=0; clearKeys();
        };
        return;
    }
    gameSettings.save();
    gameSettings.applyAudio(soundSystem);
    soundSystem.playSound('menuSelect');
}

function pauseValueFor(item) {
    if(item==='VOLUME GERAL') return `${gameSettings.data.masterVolume}%`;
    if(item==='MÚSICA') return `${gameSettings.data.musicVolume}%`;
    if(item==='EFEITOS') return `${gameSettings.data.sfxVolume}%`;
    if(item==='QUALIDADE GRÁFICA') return graphicsQualityDisplay();
    if(item==='VIBRAÇÃO') return gameSettings.data.vibration?'LIGADA':'DESLIGADA';
    if(item==='TELA CHEIA') return document.fullscreenElement?'ATIVA':'ENTRAR';
    return '';
}

function drawPaused() {
    if (pauseMenuBg.complete && pauseMenuBg.naturalWidth) {
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(pauseMenuBg, 0, 0, 1000, 650);
        ctx.restore();
    } else {
        ctx.fillStyle = 'rgba(4, 7, 13, 0.88)';
        ctx.fillRect(0, 0, 1000, 650);
    }

    const x=274,y=154,w=452,rowH=40;
    const panelH=pauseMenuItems.length*rowH+20;

    pauseMenuItems.forEach((item,i)=>{
        const ry=y+12+i*rowH, selected=i===pauseMenuSelection;
        if(selected){
            ctx.fillStyle='rgba(182,68,32,.88)';ctx.strokeStyle='#ffd267';ctx.lineWidth=2;
            ctx.beginPath();ctx.roundRect(x+10,ry,w-20,rowH-6,8);ctx.fill();ctx.stroke();
        }
        ctx.font='bold 20px Bebas Neue';ctx.textAlign='left';ctx.fillStyle=selected?'#fff7db':'#f0e6d1';
        ctx.fillText(item,x+26,ry+24);
        const value=pauseValueFor(item);
        if(value){ctx.textAlign='right';ctx.fillStyle=selected?'#ffd267':'#8fdcff';ctx.fillText(value,x+w-26,ry+24);}
        if(i>=1&&i<=3){
            const pct=[gameSettings.data.masterVolume,gameSettings.data.musicVolume,gameSettings.data.sfxVolume][i-1]/100;
            ctx.fillStyle='rgba(21,38,66,.95)';ctx.fillRect(x+230,ry+28,136,4);
            ctx.fillStyle=selected?'#ffd267':'#5ccdf5';ctx.fillRect(x+230,ry+28,136*pct,4);
        }
    });

    ctx.fillStyle='#d7cbb8';ctx.font='12px Righteous';ctx.textAlign='center';
    ctx.fillText('↑ ↓ escolher  •  ← → ajustar  •  ENTER / A confirmar  •  ESC / Start continuar',500,602);
    ctx.fillStyle='#83daf5';ctx.font='11px Righteous';
    ctx.fillText('Qualidade AUTO reduz partículas e efeitos automaticamente quando o FPS cai.',500,621);
}

// Bug #2: Modal customizado
function drawModal() {
    if (!showModal) return;
    
    // Overlay escuro
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, 1000, 650);
    
    // Caixa do modal
    const modalW = 500;
    const modalH = 250;
    const modalX = (1000 - modalW) / 2;
    const modalY = (650 - modalH) / 2;
    
    // Fundo do modal
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(modalX, modalY, modalW, modalH);
    
    // Borda
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 4;
    ctx.strokeRect(modalX, modalY, modalW, modalH);
    
    // Mensagem
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 24px Righteous';
    ctx.textAlign = 'center';
    
    const lines = modalMessage.split('\n');
    lines.forEach((line, i) => {
        ctx.fillText(line, 500, modalY + 60 + i * 35);
    });
    
    // Botões
    ctx.fillStyle = '#00ff00';
    ctx.font = 'bold 20px Righteous';
    ctx.fillText('[Y] SIM', 400, modalY + modalH - 40);
    
    ctx.fillStyle = '#ff0000';
    ctx.fillText('[N] NÃO', 600, modalY + modalH - 40);
}

function commitGameOverOnce(){
    if(gameOverCommitted)return;
    gameOverCommitted=true;
    const elapsed=gameStartTime?Math.max(0,(Date.now()-gameStartTime)/1000):0;
    if(saveSystem){saveSystem.addPlaytime?.(Math.max(0,elapsed-sessionPlaytimeSeconds));sessionPlaytimeSeconds=elapsed;saveSystem.save({score,level:currentLevelIndex+1,playerCharacter:selectedCharacters[0]});}
    soundSystem?.stopMusic?.();soundSystem?.playSound?.('gameOver');
}

function drawGameOver() {
    commitGameOverOnce();
    // Fundo vermelho escuro
    const gradient = ctx.createLinearGradient(0, 0, 0, 650);
    gradient.addColorStop(0, '#4a0000');
    gradient.addColorStop(1, '#000000');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1000, 650);
    
    // Texto principal
    ctx.save();
    ctx.shadowBlur = 40;
    ctx.shadowColor = '#ff0000';
    ctx.fillStyle = '#ff0000';
    ctx.font = 'bold 96px Bebas Neue';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', 500, 250);
    ctx.restore();
    
    // Score final
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 48px Righteous';
    ctx.textAlign = 'center';
    ctx.fillText(`Score Final: ${score}`, 500, 340);
    
    // Fase alcançada
    ctx.font = 'bold 32px Righteous';
    ctx.fillText(`Fase alcançada: ${currentLevelIndex + 1}`, 500, 390);
    
    // High Score
    const savedData = saveSystem.load();
    if (score > savedData.highScore) {
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 28px Righteous';
        ctx.fillText('🎉 NOVO RECORDE! 🎉', 500, 440);
    }
    
    // Instruções
    ctx.fillStyle = '#00ffff';
    ctx.font = '24px Righteous';
    ctx.fillText('Pressione R ou ENTER para voltar ao menu', 500, 550);
}

function drawVictory() {
    commitVictoryOnce();
    // Fundo dourado
    const gradient = ctx.createLinearGradient(0, 0, 0, 650);
    gradient.addColorStop(0, '#ffd700');
    gradient.addColorStop(1, '#ff8c00');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1000, 650);
    
    // Efeito de brilho
    for (let i = 0; i < 100; i++) {
        const x = Math.random() * 1000;
        const y = Math.random() * 650;
        const size = Math.random() * 3;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Texto principal
    ctx.save();
    ctx.shadowBlur = 40;
    ctx.shadowColor = '#fff';
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 96px Permanent Marker';
    ctx.textAlign = 'center';
    ctx.fillText('VOCÊ CHEGOU', 500, 180);
    ctx.fillText('EM VEGAS!', 500, 260);
    ctx.restore();
    
    // Score final
    ctx.fillStyle = '#000';
    ctx.font = 'bold 48px Righteous';
    ctx.textAlign = 'center';
    ctx.fillText(`Score Final: ${score}`, 500, 350);
    
    // Tempo total
    const totalTime = ((Date.now() - gameStartTime) / 1000).toFixed(1);
    ctx.font = 'bold 32px Righteous';
    ctx.fillText(`Tempo total: ${totalTime}s`, 500, 400);
    ctx.fillStyle='#3b1600';ctx.font='bold 22px Righteous';ctx.fillText('SELETOR DE FASES DESBLOQUEADO!',500,455);
    
    // Verificar conquista de vitória
    const totalLife = players.reduce((sum, p) => sum + p.life, 0);
    const maxLife = players.reduce((sum, p) => sum + p.maxLife, 0);
    
    if (totalLife > 0) {
    }
    
    if (totalLife / maxLife < 0.2) {
    }
    
    
    // Instruções
    ctx.fillStyle = '#000';
    ctx.font = '24px Righteous';
    ctx.fillText('Pressione R ou ENTER para voltar ao menu', 500, 550);
    
    // Easter egg: história final
    ctx.fillStyle = '#333';
    ctx.font = '16px Righteous';
    const finalStory = gameStory.ending.split('\n');
    finalStory.forEach((line, i) => {
        ctx.fillText(line, 500, 580 + i * 20);
    });
}

// Melhoria #14: Debug Panel
function drawDebugPanel() {
    if (!debugMode) return;
    
    // Fundo do painel
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(10, 60, 280, 200);
    
    // Borda
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 60, 280, 200);
    
    // Título
    ctx.fillStyle = '#00ff00';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('DEBUG MODE', 20, 80);
    
    // Stats
    ctx.fillStyle = '#0f0';
    ctx.font = '12px monospace';
    let yPos = 100;
    
    const debugInfo = [
        `FPS: ${currentFPS}`,
        `Jogadores: ${players.length}`,
        `Inimigos: ${enemies.length}`,
        `Partículas: ${particles.length}/${getParticleLimit()}`,
        `Power-ups: ${powerUps.length}`,
        `Câmera X: ${Math.floor(cameraX)}`,
        `Estado: ${gameState}`,
        `Screen Shake: ${screenShake.toFixed(2)}`,
        `Hit Stop: ${hitStopFrames}`,
        '',
        'F12 - Toggle Debug'
    ];
    
    debugInfo.forEach(info => {
        ctx.fillText(info, 20, yPos);
        yPos += 16;
    });
    
    // Hitboxes dos jogadores
    if (gameState === GameState.PLAYING) {
        ctx.save();
        ctx.translate(-cameraX, 0);
        
        players.forEach(player => {
            if (player.life > 0) {
                // Hitbox do corpo
                ctx.strokeStyle = '#00ff00';
                ctx.lineWidth = 2;
                ctx.strokeRect(player.x, player.y, player.w, player.h);
                
                // Hitbox de ataque
                const hitbox = player.getHitbox();
                if (hitbox) {
                    ctx.strokeStyle = '#ff0000';
                    ctx.strokeRect(hitbox.x, hitbox.y, hitbox.w, hitbox.h);
                }
            }
        });
        
        // Hitboxes dos inimigos
        enemies.forEach(enemy => {
            if (enemy.life > 0) {
                ctx.strokeStyle = '#ff00ff';
                ctx.lineWidth = 2;
                ctx.strokeRect(enemy.x, enemy.y, enemy.w, enemy.h);
            }
        });
        
        ctx.restore();
    }
}

function drawHUD() {
    // Fundo semi-transparente para HUD
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, 1000, 50);
    
    // Score
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 24px Bebas Neue';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE: ${score}`, 20, 35);
    
    // Fase
    ctx.fillStyle = '#fff';
    ctx.fillText(`FASE: ${currentLevelIndex + 1}/${LEVELS.length}`, 250, 35);
    
    // Inimigos restantes
    ctx.fillText(`INIMIGOS: ${enemies.length}`, 480, 35);
    
    // Som
    const soundStatus = soundSystem.enabled ? '🔊 ON' : '🔇 OFF';
    ctx.fillStyle = soundSystem.enabled ? '#00ff00' : '#ff0000';
    ctx.textAlign = 'right';
    ctx.fillText(soundStatus, 980, 35);
    
    // Barras de vida dos jogadores
    players.forEach((player, i) => {
        const hudY = 60 + i * 60;
        const hudX = 20;
        
        // Nome do jogador
        ctx.fillStyle = player.name === 'João' ? '#3498db' : '#e74c3c';
        ctx.font = 'bold 18px Righteous';
        ctx.textAlign = 'left';
        ctx.fillText(player.name, hudX, hudY + 15);
        
        // Barra de vida
        const barW = 200;
        const barH = 20;
        
        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(hudX, hudY + 20, barW, barH);
        
        // Vida
        const lifePercent = player.life / player.maxLife;
        
        // Melhoria #47: Cores de alto contraste
        let gradient;
        if (highContrastMode) {
            // Modo alto contraste: cores mais vibrantes e distintas
            gradient = ctx.createLinearGradient(hudX, 0, hudX + barW, 0);
            if (lifePercent > 0.5) {
                gradient.addColorStop(0, '#00ff00'); // Verde forte
                gradient.addColorStop(1, '#00cc00');
            } else if (lifePercent > 0.25) {
                gradient.addColorStop(0, '#ffff00'); // Amarelo forte
                gradient.addColorStop(1, '#ffcc00');
            } else {
                gradient.addColorStop(0, '#ff0000'); // Vermelho forte
                gradient.addColorStop(1, '#cc0000');
            }
        } else {
            // Modo normal
            gradient = ctx.createLinearGradient(hudX, 0, hudX + barW, 0);
            if (lifePercent > 0.5) {
                gradient.addColorStop(0, '#2ecc71');
                gradient.addColorStop(1, '#27ae60');
            } else if (lifePercent > 0.25) {
                gradient.addColorStop(0, '#f39c12');
                gradient.addColorStop(1, '#e67e22');
            } else {
                gradient.addColorStop(0, '#e74c3c');
                gradient.addColorStop(1, '#c0392b');
            }
        }
        
        ctx.fillStyle = gradient;
        ctx.fillRect(hudX, hudY + 20, barW * lifePercent, barH);
        
        // Borda
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(hudX, hudY + 20, barW, barH);
        
        // Texto de vida
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px Righteous';
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.max(0, Math.floor(player.life))}/${player.maxLife}`, hudX + barW / 2, hudY + 35);
        
        // Combo
        if (player.combo > 0) {
            ctx.fillStyle = '#ffff00';
            ctx.font = 'bold 20px Bebas Neue';
            ctx.textAlign = 'left';
            ctx.fillText(`COMBO: ${player.combo}x`, hudX + barW + 20, hudY + 35);
        }
        
        // Power-ups ativos
        const activePowerUps = player.activePowerUps || [];
        activePowerUps.forEach((powerUp, pi) => {
            const iconX = hudX + barW + 20;
            const iconY = hudY + 50 + pi * 25;
            
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(iconX, iconY, 120, 20);
            
            const colors = {
                speed: '#00ffff',
                strength: '#ff8800',
                invincible: '#ffd700'
            };
            
            ctx.fillStyle = colors[powerUp.type] || '#fff';
            ctx.font = 'bold 12px Righteous';
            ctx.textAlign = 'left';
            
            const timeLeft = ((powerUp.duration - powerUp.timer) / 60).toFixed(1);
            const icons = {
                speed: '⚡',
                strength: '💪',
                invincible: '⭐'
            };
            
            ctx.fillText(`${icons[powerUp.type]} ${timeLeft}s`, iconX + 5, iconY + 15);
        });
        
        // Barra de XP (Sistema de Evolução)
        if (player.evolution) {
            player.evolution.draw(ctx, hudX + 240, hudY + 20);
            
            // Evolução é atualizada no loop de gameplay; HUD apenas desenha.
        }
    });
    
    // Notificações de troféus são atualizadas/desenhadas apenas pelo hud-v093.js.
    // Evita atualização dupla e notificações aceleradas.
    
    // ========== CONTADOR DE INIMIGOS RESTANTES / ONDAS ==========
    if (!bossSpawned) {
        const hasBossThisLevel = currentLevel && (currentLevel.hasBoss || currentLevel.hasFinalBoss ||
                                  currentLevel.hasTechBoss || currentLevel.hasShadowBoss || currentLevel.hasGodBoss);
        const aliveCount = enemies.filter(e => !e.dead && e.life > 0 && !e.isBoss && !e.isBossMinion).length;

        if (waveSystem && !waveSystem.allWavesDone) {
            const totalWaves = waveSystem.waves.length;
            const doneWaves = Math.max(0, waveSystem.currentWave - 1);
            const label = waveSystem.waveActive
                ? `ONDA ${waveSystem.currentWave}/${totalWaves} | Inimigos: ${aliveCount}`
                : `Próxima onda em ${Math.ceil((waveSystem.waveCooldown - waveSystem.waveTimer) / 60)}s...`;

            ctx.save();
            ctx.fillStyle = 'rgba(0,0,0,0.65)';
            ctx.fillRect(320, 8, 360, 32);
            const waveColor = waveSystem.waveActive ? '#ff6600' : '#00ffff';
            ctx.fillStyle = waveColor;
            ctx.font = 'bold 15px Bebas Neue';
            ctx.textAlign = 'center';
            ctx.fillText(label, 500, 28);
            ctx.fillStyle = '#333';
            ctx.fillRect(380, 34, 240, 5);
            ctx.fillStyle = '#ffd700';
            ctx.fillRect(380, 34, 240 * (doneWaves / totalWaves), 5);
            ctx.restore();
        } else if (aliveCount > 0 || (hasBossThisLevel && !bossSpawned && bossWarningTimer === 0)) {
            const label = hasBossThisLevel
                ? `Inimigos restantes: ${aliveCount} | Boss espera...`
                : `Inimigos restantes: ${aliveCount}`;
            ctx.save();
            ctx.fillStyle = 'rgba(0,0,0,0.55)';
            ctx.fillRect(350, 10, 300, 26);
            ctx.fillStyle = aliveCount <= 3 ? '#ff6666' : '#ffffff';
            ctx.font = 'bold 14px Righteous';
            ctx.textAlign = 'center';
            ctx.fillText(label, 500, 28);
            ctx.restore();
        }
    }
    
    // ========== AVISO DE BOSS ==========
    if (bossWarningTimer > 0 && !bossSpawned) {
        const progress = bossWarningTimer / BOSS_WARNING_DURATION;
        const pulse = Math.sin(Date.now() * 0.01) * 0.5 + 0.5;
        
        // Barra de progresso do boss chegando (topo da tela)
        ctx.fillStyle = `rgba(20, 0, 0, 0.7)`;
        ctx.fillRect(200, 8, 600, 36);
        
        ctx.fillStyle = `rgba(180, 0, 0, ${0.5 + pulse * 0.5})`;
        ctx.fillRect(202, 10, 596 * progress, 32);
        
        ctx.strokeStyle = `rgba(255, 0, 0, 0.9)`;
        ctx.lineWidth = 2;
        ctx.strokeRect(200, 8, 600, 36);
        
        ctx.save();
        ctx.shadowBlur = 20 * pulse;
        ctx.shadowColor = '#ff0000';
        ctx.fillStyle = `rgba(255, ${Math.floor(pulse * 100)}, 0, ${0.7 + pulse * 0.3})`;
        ctx.font = `bold ${24 + Math.floor(pulse * 4)}px Bebas Neue`;
        ctx.textAlign = 'center';
        ctx.fillText('⚠️  BOSS CHEGANDO...  ⚠️', 500, 32);
        ctx.restore();
    }
    
    // ========== HUD DE BOSS (quando boss está vivo) ==========
    if (bossSpawned && !bossDefeated) {
        const bossEnemy = enemies.find(e => {
            if (e.dead || e.life <= 0) return false;
            if (e.isBossMinion) return false;
            if (e.isBoss) return true;
            if (typeof BossEnemy !== 'undefined' && e instanceof BossEnemy) return true;
            if (typeof FinalBoss !== 'undefined' && e instanceof FinalBoss) return true;
            if (e.type === 'boss' || e.type === 'final_boss') return true;
            if (e.name === 'REI DE VEGAS') return true;
            return false;
        });
        
        if (bossEnemy) {
            // Barra de vida do boss na parte inferior da tela
            const barW = 500;
            const barH = 25;
            const barX = (1000 - barW) / 2;
            const barY = 610;
            const lifePercent = Math.max(0, bossEnemy.life / bossEnemy.maxLife);
            
            // Fundo
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(barX - 5, barY - 25, barW + 10, barH + 30);
            
            // Nome do boss
            ctx.save();
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#ff0000';
            ctx.fillStyle = '#ffd700';
            ctx.font = 'bold 18px Bebas Neue';
            ctx.textAlign = 'center';
            ctx.fillText(`★ ${bossEnemy.name || 'BOSS'} ★`, barX + barW / 2, barY - 5);
            ctx.restore();
            
            // Barra de fundo
            ctx.fillStyle = '#330000';
            ctx.fillRect(barX, barY, barW, barH);
            
            // Barra de vida com gradiente
            const bossGrad = ctx.createLinearGradient(barX, barY, barX + barW, barY);
            bossGrad.addColorStop(0, '#ff0000');
            bossGrad.addColorStop(0.5, '#ff4400');
            bossGrad.addColorStop(1, '#ff6600');
            ctx.fillStyle = bossGrad;
            ctx.fillRect(barX, barY, barW * lifePercent, barH);
            
            // Borda dourada
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 3;
            ctx.strokeRect(barX, barY, barW, barH);
            
            // Texto HP
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 14px Righteous';
            ctx.textAlign = 'center';
            ctx.fillText(`${Math.max(0, Math.floor(bossEnemy.life))} / ${bossEnemy.maxLife} HP`, barX + barW / 2, barY + 17);
        }
    }
    
    // Melhoria #47: Indicador de alto contraste
    if (highContrastMode) {
        ctx.fillStyle = '#000';
        ctx.fillRect(720, 10, 260, 30);
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 2;
        ctx.strokeRect(720, 10, 260, 30);
        ctx.fillStyle = '#ffff00';
        ctx.font = 'bold 16px Righteous';
        ctx.textAlign = 'center';
        ctx.fillText('🎨 ALTO CONTRASTE [H]', 850, 30);
    }
}

let __fixedLast=performance.now(), __fixedAccum=0;
function drawFatalGameOverlay(fatal) {
    try {
        ctx.save();
        ctx.fillStyle='rgba(5,7,12,.92)';ctx.fillRect(0,0,canvas.width,canvas.height);
        ctx.strokeStyle='#ff5a55';ctx.lineWidth=4;ctx.strokeRect(110,145,780,330);
        ctx.fillStyle='#ff6b63';ctx.font='bold 38px Bebas Neue';ctx.textAlign='center';ctx.fillText('ERRO NO JOGO',500,205);
        ctx.fillStyle='#fff0df';ctx.font='bold 17px Righteous';ctx.fillText('O save foi preservado.',500,247);
        ctx.font='14px monospace';ctx.fillStyle='#ddd';
        const state=fatal?.details?.state||'desconhecido', level=fatal?.details?.level||'?';
        ctx.fillText(`Estado: ${state}  •  Fase: ${level}`,500,286);
        ctx.fillStyle='#ffd36c';ctx.font='bold 16px Righteous';ctx.fillText('PRESSIONE R PARA RECARREGAR A FASE  •  ESC PARA VOLTAR AO MENU',500,420);
        ctx.restore();
    } catch (_) {}
}
function safeGameLoopFrame(timestamp=performance.now()) {
    const step=window.GameRuntime?.fixedStepMs || (1000/60);
    const frameStart=performance.now();
    let dt=Math.min(100,Math.max(0,timestamp-__fixedLast));__fixedLast=timestamp;__fixedAccum+=dt;
    if(window.__gameLoopFatalPaused){drawFatalGameOverlay(window.__gameDebugFatal);requestAnimationFrame(safeGameLoopFrame);return;}
    const pendingSteps=Math.min(3,Math.floor(__fixedAccum/step));
    if(pendingSteps===0){requestAnimationFrame(safeGameLoopFrame);return;}
    // Um único update+render por RAF. Evita redesenhar a cena 2-3 vezes no mesmo frame em quedas de FPS.
    // O excesso acumulado é descartado de forma controlada para priorizar resposta e evitar espirais de lag.
    __fixedAccum=Math.max(0,__fixedAccum-step);
    if(pendingSteps>1){__fixedAccum=Math.min(__fixedAccum,step);if(window.GameRuntime?.stats)window.GameRuntime.stats.slowFrames++;}
    try {
        gameLoop();
    } catch (fatalError) {
        const details={state:(typeof gameState!=='undefined'?gameState:'desconhecido'),level:(typeof currentLevelIndex!=='undefined'?currentLevelIndex+1:'?'),enemies:(typeof enemies!=='undefined'&&enemies?enemies.length:'?'),players:(typeof players!=='undefined'&&players?players.length:'?'),cameraX:(typeof cameraX!=='undefined'?Math.round(cameraX):'?')};
        const stack=fatalError&&(fatalError.stack||fatalError.message)?(fatalError.stack||fatalError.message):String(fatalError);
        window.GameDebugConsole?.error?.('ERRO FATAL NO GAME LOOP | contexto='+JSON.stringify(details)+'\n'+stack);
        console.error('[game-loop-fatal]',details,fatalError);
        window.__gameDebugFatal={details,stack,time:Date.now()};
        window.__gameLoopFatalPaused=true;
        if(window.GameRuntime?.stats)window.GameRuntime.stats.fatalErrors++;
        drawFatalGameOverlay(window.__gameDebugFatal);
    }
    const frameMs=performance.now()-frameStart;
    if(window.GameRuntime?.stats){window.GameRuntime.stats.lastFrameMs=frameMs;window.GameRuntime.stats.maxFrameMs=Math.max(window.GameRuntime.stats.maxFrameMs,frameMs);}
    requestAnimationFrame(safeGameLoopFrame);
}

function gameLoop() {
    window.sceneManager?.enter?.(gameState);
    // Heartbeat para o console interno detectar travamentos do loop
    window.__gameDebugLastFrame = Date.now();
    if ([GameState.PLAYING,GameState.BUS_MINIGAME,GameState.BUS_BOARDING,GameState.BUS_ARRIVAL].includes(gameState) && gameStartTime) {
        const elapsed=(Date.now()-gameStartTime)/1000;
        if(Date.now()-lastPlaytimeSaveAt>30000){const delta=Math.max(0,elapsed-sessionPlaytimeSeconds);saveSystem.addPlaytime?.(delta);sessionPlaytimeSeconds=elapsed;lastPlaytimeSaveAt=Date.now();}
    }
    // Melhoria #14: Calcular FPS
    fpsCounter++;
    const now = Date.now();
    if (now - fpsLastTime >= 1000) {
        currentFPS = fpsCounter;
        fpsCounter = 0;
        fpsLastTime = now;
    }
    
    // Gamepad: atualiza teclas virtuais e entradas de menu a cada frame.
    gamepadSystem.update();
    handleGamepadInput();

    // Hit stop
    if (hitStopFrames > 0) {
        hitStopFrames--;
        return;
    }
    
    // ✅ SPRINT 1 FIX: Cleanup automático (prevenir memory leak)
    cleanupParticles();
    cleanupProjectiles();
    cleanupPowerUps();
    
    let shakeX = 0;
    let shakeY = 0;
    // Aplicar shake apenas durante o jogo, não em menus/game over
    if (screenShake > 0 && gameState === GameState.PLAYING) {
        shakeX = (Math.random() - 0.5) * screenShake;
        shakeY = (Math.random() - 0.5) * screenShake * 0.6; // Y menor que X
        screenShake *= 0.75; // Decay mais rápido (era 0.9)
        if (screenShake < 0.3) screenShake = 0;
    } else if (gameState !== GameState.PLAYING) {
        screenShake = 0; // Zerar fora do jogo
    }
    
    // Aplicar shake
    ctx.save();
    ctx.translate(shakeX, shakeY);
    
    // Limpar tela
    ctx.fillStyle = '#000';
    ctx.fillRect(-shakeX, -shakeY, 1000, 650);
    
    // Melhoria #19: Renderizar loading screen
    if (gameState === GameState.LOADING) {
        drawLoading();
    }
    else if (gameState === GameState.MENU) {
        drawMenu();
    }
    else if (gameState === GameState.TUTORIAL) {
        drawTutorial();
    }
    else if (gameState === GameState.CONTROLS_CONFIG) {
        drawControlsConfig();
    }
    else if (gameState === GameState.OPTIONS) {
        drawOptions();
    }
    else if (gameState === GameState.ACHIEVEMENTS || gameState === 'ACHIEVEMENTS') {
        // Redirecionar para troféus
        if (window.trophySystem) {
            window.trophySystem.draw(ctx);
        }
    }
    else if (gameState === GameState.STAGE_SELECT) {
        drawStageSelect();
    }
    else if (gameState === GameState.TROPHIES) {  // ✅ SPRINT 1 FIX
        if (window.trophySystem) {
            window.trophySystem.draw(ctx);
        }
    }
    else if (gameState === GameState.CHARACTER_SELECT) {
        drawCharacterSelect();
    }
    else if (gameState === GameState.STORY_INTRO) {
        drawStoryIntro();
    }
    else if (gameState === GameState.STORY_LEVEL) {
        drawStoryLevel();
    }
    else if (gameState === GameState.LEVEL_INTRO) {
        drawLevelIntro();
    }
    else if (gameState === GameState.PLAYING) {
        // Atualizar jogadores
        players.forEach(player => {
            if (player.life > 0) {
                player.update(keys);
                if (player.evolution?.update) player.evolution.update();
                
                // Rastrear dashes para conquista
                if (player.isDashing && player.dashTimer === player.dashDuration - 1) {
                    if (window.trophySystem) {
                        window.trophySystem.stats.dashesUsed++;
                        window.trophySystem.checkTrophies();
                    }
                }
            }
        });
        
        // NPC cachorra da fazenda (apenas Fase 1)
        window.farmDogNPCManager?.update?.(players, keys);

        // Câmera segue jogadores vivos
        const alivePlayers = players.filter(p => p.life > 0);
        if (alivePlayers.length > 0) {
            const avgX = alivePlayers.reduce((sum, p) => sum + p.x, 0) / alivePlayers.length;
            // Câmera avança quando jogador chega perto da borda direita
            if (avgX - cameraX > 600) cameraX = avgX - 600;
            // Câmera recua um pouco se jogador vai muito para trás (evitar perder inimigos de vista)
            if (avgX - cameraX < 200) cameraX = Math.max(0, avgX - 200);
            
            // Bug #4: Limitar câmera aos bounds do nível
            const levelWidth = currentLevel.width || 5000;
            const maxCameraX = Math.max(0, levelWidth - canvas.width);
            cameraX = Math.max(0, Math.min(cameraX, maxCameraX));
        }

        // === SISTEMA DE ONDAS: atualizar e disparar próximas ondas ===
        if (waveSystem && !waveSystem.allWavesDone) {
            waveSystem.update(enemies);
        }

        if (!waveSystem && enemySpawnDirector) {
            updateEnemySpawnDirector();
        }
        
        // Aplicar transformação da câmera
        ctx.save();
        ctx.translate(-cameraX, 0);
        
        // Desenhar cenário
        if (currentLevel && currentLevel.drawBackground) {

            currentLevel.drawBackground(ctx, cameraX);

        }
        if (window.GraphicsUpgrade) {
            window.GraphicsUpgrade.drawBackdropAtmosphere(ctx, currentLevel, cameraX);
        }
        if (currentLevelIndex === 1 && window.busSequence?.isPhase2Waiting?.()) window.busSequence.drawPhase2Bus(ctx);
        
        // Caixas e barris quebráveis que guardam os power-ups
        destructibles.forEach(obj => {
            if (obj.broken) return;
            if (obj.hitFlash > 0) obj.hitFlash--;
            const spr = containerSprites[obj.type];
            ctx.save();
            if (obj.hitFlash > 0) { ctx.globalAlpha = 0.65; ctx.translate((Math.random()-.5)*3, 0); }
            if (spr && spr.complete && spr.naturalWidth > 0) {
                ctx.imageSmoothingEnabled = false;
                ctx.drawImage(spr, Math.round(obj.x), Math.round(obj.y), obj.w, obj.h);
            } else {
                ctx.fillStyle = obj.type === 'barrel' ? '#8a5125' : '#a96b32';
                ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
            }
            ctx.restore();

            players.forEach(player => {
                if (!player || player.life <= 0 || !player.attacking) return;
                const hb = player.getHitbox ? player.getHitbox() : null;
                if (!hb || !rects(hb, obj)) return;
                if (!player.hitContainersThisSwing) player.hitContainersThisSwing = new Set();
                if (player.hitContainersThisSwing.has(obj)) return;
                player.hitContainersThisSwing.add(obj);
                const damage = 20 + (player.hasActivePowerUp?.('strength') ? 20 : 0);
                damagePowerUpContainer(obj, damage);
                screenShake = Math.max(screenShake, 2);
            });
        });
        players.forEach(player => { if (player && !player.attacking && player.hitContainersThisSwing) player.hitContainersThisSwing.clear(); });
        destructibles = destructibles.filter(o => !o.broken);
        window.destructibles = destructibles;

        // Desenhar e atualizar power-ups
        powerUps.forEach(powerUp => {
            if (powerUp.collected) return;
            
            // Animação de bob
            powerUp.bobOffset += 0.1;
            powerUp.y = powerUp.baseY + Math.sin(powerUp.bobOffset) * 10;
            
            // Power-ups agora são persistentes: permanecem na fase até serem coletados.
            
            // Desenhar power-up
            const colors = {
                health: '#00ff00',
                speed: '#00ffff',
                strength: '#ff8800',
                invincible: '#ffd700',
                score: '#ff00ff'
            };
            
            const icons = {
                health: '❤️',
                speed: '⚡',
                strength: '💪',
                invincible: '⭐',
                score: '💎'
            };
            
            // Brilho
            ctx.shadowBlur = 20;
            ctx.shadowColor = colors[powerUp.type];
            
            // Círculo de fundo
            ctx.fillStyle = colors[powerUp.type];
            ctx.globalAlpha = 0.3;
            ctx.beginPath();
            ctx.arc(powerUp.x + powerUp.w / 2, powerUp.y + powerUp.h / 2, 25, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
            
            // Sprite 16-bit (fallback para ícone se a imagem ainda não carregou)
            const puSprite = powerUpSprites[powerUp.type];
            if (puSprite && puSprite.complete && puSprite.naturalWidth > 0) {
                const visualSize = 48;
                const vx = powerUp.x + powerUp.w / 2 - visualSize / 2;
                const vy = powerUp.y + powerUp.h / 2 - visualSize / 2;
                ctx.imageSmoothingEnabled = false;
                ctx.drawImage(puSprite, Math.round(vx), Math.round(vy), visualSize, visualSize);
            } else {
                ctx.font = '30px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(icons[powerUp.type], powerUp.x + powerUp.w / 2, powerUp.y + powerUp.h / 2 + 10);
            }
            
            ctx.shadowBlur = 0;
            
            // Verificar colisão com jogadores
            players.forEach(player => {
                if (player.life <= 0) return;
                
                if (rects(player, powerUp)) {
                    powerUp.collected = true;
                    
                    // Aplicar efeito
                    switch (powerUp.type) {
                        case 'health':
                            player.life = Math.min(player.maxLife, player.life + 30);
                            createTextPopup(powerUp.x, powerUp.y, '+30 HP', '#00ff00');
                            break;
                        case 'speed':
                            player.activatePowerUp('speed', 300);
                            createTextPopup(powerUp.x, powerUp.y, 'VELOCIDADE!', '#00ffff');
                            break;
                        case 'strength':
                            player.activatePowerUp('strength', 300);
                            createTextPopup(powerUp.x, powerUp.y, 'FORÇA!', '#ff8800');
                            break;
                        case 'invincible':
                            player.activatePowerUp('invincible', 180);
                            createTextPopup(powerUp.x, powerUp.y, 'INVENCÍVEL!', '#ffd700');
                            break;
                        case 'score':
                            score += 500;
                            createTextPopup(powerUp.x, powerUp.y, '+500', '#ff00ff');
                            break;
                    }
                    
                    // Efeitos visuais
                    createParticle(powerUp.x + powerUp.w / 2, powerUp.y + powerUp.h / 2, colors[powerUp.type], 8, 'spark');
                    soundSystem.playSound({health:'pickupHealth',speed:'pickupSpeed',strength:'pickupStrength',invincible:'pickupInvincible',score:'pickupScore'}[powerUp.type] || 'powerup');
                    
                    // Rastrear para conquista
                    if (window.trophySystem) {
                        window.trophySystem.stats.powerUpsCollected++;
                        window.trophySystem.checkTrophies();
                    }
                }
            });
        });
        
        // Remover power-ups coletados
        powerUps.splice(0, powerUps.length, ...powerUps.filter(p => !p.collected));
        
        // NOVO: Atualizar e desenhar projéteis (filter ao final para evitar bugs de índice)
        const activeProjectiles = [];
        projectiles.forEach(proj => {
            if (proj.type === 'player_projectile') {
                proj.x += proj.vx;
                proj.y += proj.vy || 0;
                proj.life--;

                // Tiros do jogador também quebram caixas e barris
                for (const obj of destructibles) {
                    if (proj.life <= 0 || obj.broken) continue;
                    const hitObj = proj.x + proj.w/2 >= obj.x && proj.x - proj.w/2 <= obj.x + obj.w &&
                                   proj.y + proj.h/2 >= obj.y && proj.y - proj.h/2 <= obj.y + obj.h;
                    if (!hitObj) continue;
                    damagePowerUpContainer(obj, proj.damage || 20);
                    createParticle(proj.x, proj.y, '#d79a52', 4, 'spark');
                    proj.life = 0;
                    break;
                }
                destructibles = destructibles.filter(o => !o.broken);
                window.destructibles = destructibles;

                for (const enemy of enemies) {
                    if (proj.life <= 0 || !enemy || enemy.life <= 0) continue;
                    if (proj.hitEnemies?.has(enemy)) continue;
                    const box = enemy.getCollisionBox ? enemy.getCollisionBox() : enemy;
                    const hit = proj.x + proj.w/2 >= box.x && proj.x - proj.w/2 <= box.x + box.w &&
                                proj.y + proj.h/2 >= box.y && proj.y - proj.h/2 <= box.y + box.h;
                    if (!hit) continue;

                    if (proj.hitEnemies) proj.hitEnemies.add(enemy);
                    const lifeBefore = Number.isFinite(enemy.life) ? enemy.life : null;
                    const killed = typeof enemy.takeDamage === 'function' ? enemy.takeDamage(proj.damage, proj.owner) : false;
                    if (typeof enemy.takeDamage !== 'function') { enemy.life = Math.max(0, enemy.life - proj.damage); enemy.hitFlash = 10; }
                    const lifeAfter = Number.isFinite(enemy.life) ? enemy.life : null;
                    if (proj.owner?.name === 'João' || proj.owner?.constructor?.name?.toLowerCase().includes('joao')) {
                        const enemyName = enemy.type || enemy.name || enemy.constructor?.name || 'inimigo';
                        if (window.DEBUG_GAME) if(window.DEV) console.log(`[TIRO JOAO] ACERTO id=${proj.shotId ?? '?'} alvo=${enemyName} dano=${proj.damage} vida=${lifeBefore ?? '?'}->${lifeAfter ?? '?'}`);
                    }
                    score += killed ? 30 : 8;
                    if (killed || (lifeAfter !== null && lifeAfter <= 0)) {
                        awardEnemyXP(enemy, proj.owner, { ranged:true, combo:proj.owner?.combo || 0 });
                    }
                    if (proj.owner?.addCombo) proj.owner.addCombo();
                    createParticle(proj.x, proj.y, proj.charged ? '#ffd23f' : '#f4f1df', proj.charged ? 5 : 2, 'spark');
                    createTextPopup(enemy.x + enemy.w/2, enemy.y, `-${proj.damage}`, proj.charged ? '#ffd23f' : '#fff0c7');
                    screenShake = Math.max(screenShake, proj.charged ? 3 : 1);
                    proj.pierce = (proj.pierce || 1) - 1;
                    if (proj.pierce <= 0) proj.life = 0;
                }

                const outOfBounds = proj.x < cameraX - 120 || proj.x > cameraX + 1120;
                if (proj.life <= 0 || outOfBounds) return;

                ctx.save();
                ctx.shadowBlur = proj.charged ? 16 : 6;
                ctx.shadowColor = proj.color;
                ctx.strokeStyle = proj.color;
                ctx.fillStyle = proj.color;
                ctx.lineWidth = proj.charged ? 4 : 2;
                ctx.beginPath();
                ctx.moveTo(proj.x - proj.vx * (proj.charged ? .7 : .35), proj.y);
                ctx.lineTo(proj.x, proj.y);
                ctx.stroke();
                ctx.beginPath();
                ctx.ellipse(proj.x, proj.y, proj.w/2, proj.h/2, 0, 0, Math.PI*2);
                ctx.fill();
                ctx.restore();
                activeProjectiles.push(proj);
                return;
            }
            if (proj.type === 'enemy_projectile') {
                // Mover projétil
                proj.x += proj.vx;
                proj.y += proj.vy;
                proj.life--;
                
                // Verificar colisão com jogadores
                players.forEach(player => {
                    if (player.life > 0 && player.invulnerable === 0 && proj.life > 0) {
                        const hit = proj.x > player.x && proj.x < player.x + player.w &&
                                   proj.y > player.y && proj.y < player.y + player.h;
                        
                        if (hit) {
                            player.takeDamage(proj.damage);
                            proj.life = 0;
                            
                            // Efeito visual
                            createParticle(proj.x, proj.y, '#ff9900', 8, 'explosion');
                        }
                    }
                });
                
                // Marcar para remoção se morto ou fora da tela
                const outOfBounds = proj.x < cameraX - 100 || proj.x > cameraX + 1100;
                if (proj.life <= 0 || outOfBounds) return; // Não adiciona na lista ativa
                
                // Desenhar projétil ativo
                ctx.save();
                const effectSprite = proj.spriteKind && window.__extraSpriteEffect ? window.__extraSpriteEffect(proj.spriteKind) : null;
                if (effectSprite && effectSprite.complete && effectSprite.naturalWidth) {
                    ctx.imageSmoothingEnabled = false;
                    ctx.globalAlpha = 0.55;
                    ctx.drawImage(effectSprite, proj.x - proj.w, proj.y - proj.h, proj.w * 2, proj.h * 2);
                    ctx.globalAlpha = 1;
                    ctx.drawImage(effectSprite, proj.x - proj.w/2, proj.y - proj.h/2, proj.w, proj.h);
                } else {
                    ctx.fillStyle = proj.color;
                    ctx.shadowBlur = 10;
                    ctx.shadowColor = proj.color;
                    ctx.beginPath();
                    ctx.arc(proj.x, proj.y, proj.w/2, 0, Math.PI * 2);
                    ctx.fill();
                    
                    // Trilha
                    ctx.globalAlpha = 0.5;
                    ctx.fillStyle = proj.color;
                    ctx.beginPath();
                    ctx.arc(proj.x - proj.vx/2, proj.y - proj.vy/2, proj.w/3, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.restore();
                
                activeProjectiles.push(proj);
            }
        });
        projectiles.length = 0;
        activeProjectiles.forEach(p => projectiles.push(p));
        
        // Desenhar NPC cachorra amigável da fazenda
        window.farmDogNPCManager?.draw?.(ctx);

        // Desenhar jogadores
        players.forEach(player => {
            if (player.life > 0) {
                player.draw(ctx);
            }
        });
        
        // Diretor de combate: limita quantos inimigos entram em ataque simultaneamente.
        window.attackDirector?.assign?.(enemies, players);
        // Atualizar e desenhar inimigos
        enemies.forEach((enemy, index) => {
            try {
                if (!enemy._sonicKnockdownUntil || performance.now() >= enemy._sonicKnockdownUntil) {
                    enemy.update(players, enemies);
                }
            } catch (enemyUpdateError) {
                console.error('[enemy-update] Inimigo removido para evitar travamento:', enemy?.type || enemy?.name, enemyUpdateError);
                enemy.life = 0;
                enemy.dead = true;
            }
            try {
                // PERFORMANCE: atualiza todos, mas só desenha quem está próximo do viewport.
                // Isso evita dezenas de drawImage/gradientes para inimigos a milhares de px da câmera.
                const enemyW = enemy.w || 60;
                const visible = enemy.x + enemyW >= cameraX - 180 && enemy.x <= cameraX + canvas.width + 180;
                if (visible) {
                    if (window.GraphicsUpgrade) window.GraphicsUpgrade.drawEnemyPre(ctx, enemy);
                    enemy.draw(ctx); // camera já aplicada via ctx.translate(-cameraX, 0)
                    if (window.GraphicsUpgrade) window.GraphicsUpgrade.drawEnemyPost(ctx, enemy);
                }
            } catch (enemyDrawError) {
                const enemyLabel = enemy?.type || enemy?.name || (enemy?.constructor && enemy.constructor.name) || 'desconhecido';
                console.error('[enemy-draw] Falha ao desenhar inimigo:', enemyLabel,
                    'x=' + Math.round(enemy?.x || 0), 'y=' + Math.round(enemy?.y || 0), enemyDrawError);
                if (window.GameDebugConsole) {
                    window.GameDebugConsole.error('INIMIGO COM ERRO DE SPRITE/DRAW: ' + enemyLabel +
                        ' | fase=' + (currentLevelIndex + 1) +
                        ' | x=' + Math.round(enemy?.x || 0) +
                        ' | ' + (enemyDrawError?.stack || enemyDrawError?.message || enemyDrawError));
                }
                enemy.life = 0;
                enemy.dead = true;
                return;
            }
            
            // Verificar colisão dos ataques dos jogadores
            players.forEach(player => {
                if (player.life <= 0) return;

                // Dash Mortal: o corpo em dash vira uma hitbox ofensiva, uma vez por inimigo por dash.
                if (player.dashing && player.evolution?.hasSkill?.('Dash Mortal')) {
                    if (!player._dashHitEnemies) player._dashHitEnemies = new Set();
                    const enemyBoxDash = enemy.getCollisionBox ? enemy.getCollisionBox() : enemy;
                    const playerBody = player.getBodyBounds ? player.getBodyBounds() : {x:player.x,y:player.y,w:player.w,h:player.h};
                    if (!player._dashHitEnemies.has(enemy) && rects(playerBody, enemyBoxDash) && enemy.life > 0) {
                        player._dashHitEnemies.add(enemy);
                        const levelBonus = player.evolution?.getMeleeDamageBonus?.() || 0;
                        const mult = player.evolution?.getOutgoingDamageMultiplier?.() || 1;
                        const dashDamage = Math.round((24 + levelBonus * 0.65) * mult);
                        if (typeof enemy.takeDamage === 'function') enemy.takeDamage(dashDamage);
                        else { enemy.life = Math.max(0, enemy.life - dashDamage); enemy.hitFlash = 12; }
                        if (enemy.life <= 0) {
                            enemy.dead = true;
                            awardEnemyXP(enemy, player, { melee:true, combo:player.combo || 0 });
                            if (player._vampirism && !enemy.isBoss) player.heal?.(Math.ceil(player.maxLife * 0.05));
                        }
                        applySkillKnockback(enemy, player, enemy.isBoss ? 0 : 46);
                        createTextPopup(enemy.x + (enemy.w||50)/2, enemy.y - 14, `DASH -${dashDamage}`, '#7eeaff');
                        createParticle(enemy.x + (enemy.w||50)/2, enemy.y + (enemy.h||60)/2, '#7eeaff', 7, 'spark');
                        screenShake = Math.max(screenShake || 0, 3);
                    }
                } else if (player._dashHitEnemies?.size) {
                    player._dashHitEnemies.clear();
                }
                
                // Resetar set quando não está atacando
                if (!player.attacking) {
                    if (player.hitEnemiesThisSwing) player.hitEnemiesThisSwing.clear();
                    return;
                }
                
                const hitbox = player.getHitbox();
                if (hitbox) {
                    // Inicializar set se não existe (compatibilidade)
                    if (!player.hitEnemiesThisSwing) player.hitEnemiesThisSwing = new Set();
                    
                    // BUG FIX: Cada inimigo só pode ser atingido UMA VEZ por swing
                    const enemyId = enemy;
                    if (player.hitEnemiesThisSwing.has(enemyId)) return;
                    
                    // PATCH: Usar hitbox do inimigo para colisão precisa
                    const enemyBox = enemy.getCollisionBox ? enemy.getCollisionBox() : enemy;
                    if (rects(hitbox, enemyBox) && enemy.life > 0) {
                    // Marcar como atingido neste swing
                    player.hitEnemiesThisSwing.add(enemyId);
                    
                    const baseDamage = 20;
                    const comboDamage = player.combo * 2;
                    const strengthBonus = player.hasActivePowerUp('strength') ? baseDamage : 0;
                    const levelBonus = player.evolution?.getMeleeDamageBonus?.() || 0;
                    const damageMult = player.evolution?.getOutgoingDamageMultiplier?.() || 1;
                    const damage = Math.round((baseDamage + comboDamage + strengthBonus + levelBonus) * damageMult);
                    const hitCount = player.evolution?.getComboHitCount?.() || 1;
                    // Combo Duplo/Triplo: hits adicionais são reais, mas com queda de dano para não quebrar o balanceamento.
                    const hitScales = hitCount >= 3 ? [1, 0.55, 0.45] : hitCount === 2 ? [1, 0.60] : [1];
                    let totalDamage = 0;
                    hitScales.forEach((scale, hitIndex) => {
                        if (enemy.life <= 0 && hitIndex > 0) return;
                        const hitDamage = Math.max(1, Math.round(damage * scale));
                        totalDamage += hitDamage;
                        if (typeof enemy.takeDamage === 'function') enemy.takeDamage(hitDamage);
                        else { enemy.life = Math.max(0, enemy.life - hitDamage); enemy.hitFlash = 10; }
                        if (hitIndex > 0) createParticle(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, '#fff0a8', 2, 'spark');
                    });

                    const knockback = player.evolution?.getKnockbackBonus?.() || 0;
                    if (knockback) applySkillKnockback(enemy, player, knockback);
                    applySonicKnockdown(enemy, player);
                    
                    score += 10 + player.combo;
                    for (let h=0; h<hitScales.length; h++) player.addCombo();
                    triggerComboExplosion(player, totalDamage || damage);
                    
                    // Sons
                    soundSystem.playSound('hit');
                    if (player.combo >= 5) {
                        soundSystem.playSound('combo');
                    }
                    
                    // Efeitos visuais melhorados
                    createParticle(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, '#f0d28a', 4, 'spark');
                    
                    // BUG FIX: Screen shake apenas uma vez por hit (não por frame)
                    screenShake = Math.min(Math.max(screenShake, 1 + player.combo * 0.2), 5);
                    
                    // Hit stop em combos altos
                    if (player.combo >= 5) {
                        hitStopFrames = 2;
                    }
                    
                    // Texto de dano
                    createTextPopup(enemy.x + enemy.w / 2, enemy.y, `-${totalDamage || damage}`, '#ff6666');
                    
                    // Texto de combo
                    if (player.combo > 1) {
                        createTextPopup(enemy.x + enemy.w / 2, enemy.y - 30, `${player.combo}x COMBO!`, '#ffff00');
                    }
                    
                    if (enemy.life <= 0) {
                        enemy.dead = true;  // PATCH: Marcar como morto
                        
                        // Score bônus maior para bosses
                        const enemyScore = enemy.score || 0;
                        score += enemyScore + (player.combo * 10);
                        
                        // Efeitos de morte (mais épicos para bosses)
                        const isBossKill = enemy.isBoss && !enemy.isBossMinion;
                        const explosionCount = isBossKill ? 16 : 5;
                        // Morte mais limpa: poeira/impacto quente, sem explosão arco-íris.
                        createParticle(enemy.x + enemy.w / 2, enemy.y + enemy.h * 0.7, isBossKill ? '#d79a43' : '#9b7a55', explosionCount, 'spark');
                        if (isBossKill) createParticle(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, '#f0d28a', 6, 'spark');
                        screenShake = isBossKill ? 7 : Math.min(1.5 + player.combo * 0.12, 3.5);
                        
                        // XP centralizado: funciona para João/Crist, melee/tiro e multiplayer.
                        awardEnemyXP(enemy, player, { melee:true, combo:player.combo || 0 });

                        // Vampirismo: recuperar vida ao matar
                        if (player._vampirism && !enemy.isBoss) {
                            const heal = Math.ceil(player.maxLife * 0.05);
                            player.life = Math.min(player.maxLife, player.life + heal);
                            createTextPopup(player.x + player.w / 2, player.y - 20, `+${heal} HP`, '#00ff44');
                        }
                        
                        // Sons
                        soundSystem.playSound('ko');
                        
                        // Texto de KO
                        createTextPopup(enemy.x + enemy.w / 2, enemy.y - 40, 'K.O.!', '#ff00ff');
                        
                        // Bônus de score em combo alto
                        if (player.combo >= 10) {
                            const bonus = player.combo * 50;
                            score += bonus;
                            createTextPopup(enemy.x + enemy.w / 2, enemy.y - 60, `+${bonus}`, '#00ffff');
                        }
                        
                        // Rastrear para conquistas
                        if (window.trophySystem) {
                            window.trophySystem.stats.enemiesKilled++;
                            if (player.combo > window.trophySystem.stats.maxCombo) {
                                window.trophySystem.stats.maxCombo = player.combo;
                            }
                            window.trophySystem.checkTrophies({
                                enemiesKilled: window.trophySystem.stats.enemiesKilled,
                                maxCombo: window.trophySystem.stats.maxCombo,
                                playerLevel: player.evolution ? player.evolution.level : 1
                            });
                        }
                    }
                    }
                }
            });
            
            // Verificar ataques dos inimigos
            players.forEach(player => {
                if (enemy.checkHitPlayer(player)) {
                    if (player.takeDamage(enemy.damage)) {
                        createParticle(player.x + player.w / 2, player.y + player.h / 2, '#d66a52', 5, 'spark');
                        screenShake = Math.max(screenShake, 3);
                        createTextPopup(player.x + player.w / 2, player.y - 20, `-${enemy.damage}`, '#ff3333');
                        
                        // Rastrear dano
                        levelDamageTaken += enemy.damage;
                        totalGameDamage += enemy.damage;
                        
                        // Som de dano do jogador separado do impacto no inimigo.
                        soundSystem.playSound('playerHurt');
                    }
                }
            });
        });
        
        // Remover inimigos mortos
        enemies = enemies.filter(e => {
            // Se tiver método isDead, usa ele
            if (typeof e.isDead === 'function') {
                return !e.isDead();
            }
            // Fallback: verificação manual
            return !(e.life <= 0 && (!e.deathAnim || e.deathAnim >= 30));
        });
        
        // ✅ SPRINT 1: Partículas já otimizadas com filter
        // Cleanup adicional feito no início do loop
        // Atualizar e desenhar partículas
        particles = particles.filter(p => {
            p.x += p.vx;
            p.y += p.vy;
            
            if (p.type !== 'text') {
                p.vy += 0.4; // Gravidade
                p.vx *= 0.98; // Fricção
            }
            
            p.life--;
            
            if (p.life > 0) {
                if (p.type === 'text') {
                    // Renderizar texto popup
                    ctx.save();
                    ctx.globalAlpha = p.life / 60;
                    ctx.shadowBlur = 10;
                    ctx.shadowColor = p.color;
                    ctx.fillStyle = p.color;
                    ctx.font = `bold ${p.size}px Bebas Neue`;
                    ctx.textAlign = 'center';
                    ctx.fillText(p.text, p.x, p.y);
                    ctx.restore();
                } else {
                    // Renderizar partícula normal
                    ctx.fillStyle = p.color;
                    ctx.globalAlpha = p.life / 40;
                    
                    if (p.type === 'spark') {
                        // Partículas de faísca (linhas)
                        ctx.strokeStyle = p.color;
                        ctx.lineWidth = p.size;
                        ctx.beginPath();
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(p.x - p.vx, p.y - p.vy);
                        ctx.stroke();
                    } else {
                        // Partículas normais e explosões
                        const q=getEffectiveGraphicsQuality();
                        ctx.shadowBlur = q==='low' ? 0 : (p.type === 'explosion' ? (q==='medium'?8:15) : (q==='medium'?2:5));
                        if(ctx.shadowBlur>0) ctx.shadowColor = p.color;
                        ctx.beginPath();
                        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                        ctx.fill();
                    }
                    
                    ctx.globalAlpha = 1;
                }
                return true;
            }
            if(particlePool.length<getParticleLimit())particlePool.push(p);
            return false;
        });
        
        if (window.GraphicsUpgrade && getEffectiveGraphicsQuality() !== 'low') {
            window.GraphicsUpgrade.drawForeground(ctx, currentLevel, cameraX);
        }
        drawGameplayHitboxes(ctx);
        ctx.restore();
        if (window.GraphicsUpgrade) {
            window.GraphicsUpgrade.drawScreenFinish(ctx, currentLevel);
        }
        
        // Desenhar HUD
        drawHUD();
        
        // Melhoria #14: Debug Panel
        drawDebugPanel();
        
        // Verificar condições de vitória/derrota
        const allPlayersDead = players.every(p => p.life <= 0);
        
        if (allPlayersDead) {
            if(window.DEV) console.log('🔴 GAME OVER - Score:', score, 'Fase:', currentLevelIndex + 1);
            
            // CORREÇÃO DO BUG: Limpar inimigos imediatamente quando o jogador morre
            enemies.length = 0;
            particles.length = 0;
            powerUps.length = 0;
            
            // Ativar a tela de Game Over
            if (gameOverScreen) {
                gameOverScreen.activate(score, currentLevelIndex + 1);
            }
            
            // SALVAR PROGRESSO DOS JOGADORES
            players.forEach(player => {
                if (player.evolution) {
                    const evolutionData = player.evolution.save();
                    saveSystem.savePlayerProgress(player.name, evolutionData);
                }
            });
            
            soundSystem?.stopMusic?.();
            commitGameOverOnce();
            gameState = GameState.GAME_OVER;
            if (window.trophySystem) window.trophySystem.stats.deaths++;
        }
        // Lógica de progresso de fase com sistema de boss
        else {
            if (currentLevelIndex === 1 && window.busSequence?.isPhase2Waiting?.()) {
                if (window.busSequence.updatePhase2Waiting(players)) gameState = GameState.BUS_BOARDING;
            }
            const hasBossThisLevel = currentLevel.hasBoss || currentLevel.hasFinalBoss || 
                                     currentLevel.hasTechBoss || currentLevel.hasShadowBoss || currentLevel.hasGodBoss;
            
            // Verificar inimigos vivos (excluindo bosses e minions do boss)
            const normalEnemiesAlive = enemies.filter(e => {
                if (e.dead || e.life <= 0) return false;
                if (e.isBossMinion) return false; // Minions não bloqueiam transição
                if (e.isBoss) return false;
                if (typeof BossEnemy !== 'undefined' && e instanceof BossEnemy) return false;
                if (typeof FinalBoss !== 'undefined' && e instanceof FinalBoss) return false;
                if (e.type === 'boss' || e.type === 'final_boss') return false;
                if (e.name === 'REI DE VEGAS') return false;
                return true;
            });
            
            const bossEnemiesAlive = enemies.filter(e => {
                if (e.dead || e.life <= 0) return false;
                if (e.isBossMinion) return false; // Minions não contam como boss
                if (e.isBoss) return true;
                if (typeof BossEnemy !== 'undefined' && e instanceof BossEnemy) return true;
                if (typeof FinalBoss !== 'undefined' && e instanceof FinalBoss) return true;
                if (e.type === 'boss' || e.type === 'final_boss') return true;
                if (e.name === 'REI DE VEGAS') return true;
                return false;
            });
            
            const allNormalEnemiesDead = normalEnemiesAlive.length === 0;
            const allBossesDead = bossEnemiesAlive.length === 0;
            
            if (hasBossThisLevel) {
                // === FASE COM BOSS ===
                if (!bossSpawned) {
                    // Aguardando condição para spawnar boss:
                    // - Se tem ondas: aguarda todas as ondas terminarem
                    // - Se não tem ondas: aguarda matar todos os inimigos normais
                    const wavesDone = !waveSystem || waveSystem.allWavesDone;
                    const allNormalDeadForBoss = normalEnemiesAlive.length === 0;

                    if (wavesDone && allNormalDeadForBoss) {
                        if (bossWarningTimer === 0) {
                            bossWarningTimer = 1;
                            const px = players.find(p => p.life > 0);
                            if (px) createTextPopup(px.x + 50, px.y - 80, 'BOSS CHEGANDO...', '#ff0000', 32);
                            screenShake = 5;
                        }
                        
                        bossWarningTimer++;
                        if (bossWarningTimer % 30 === 0) screenShake = 3;
                        
                        if (bossWarningTimer >= BOSS_WARNING_DURATION) {
                            const isColonelLevel = (currentLevel?.id === 3 || currentLevelIndex === 2) && currentLevel?.hasBoss;
                            if (isColonelLevel && !phase3ColonelIntroPlayed) {
                                startPhase3ColonelIntro();
                            } else {
                                spawnBoss();
                            }
                        }
                    }
                } else if (bossSpawned && allBossesDead) {
                    // Boss derrotado! Próxima fase
                    if (!bossDefeated) {
                        bossDefeated = true;
                        
                        // Celebração épica
                        createTextPopup(500 + cameraX, 300, '⭐ BOSS DERROTADO! ⭐', '#ffd700', 42);
                        screenShake = 15;
                        
                        // Score bônus
                        score += 2000;
                        createTextPopup(500 + cameraX, 350, '+2000 BÔNUS!', '#00ffff', 28);
                        
                        recordLevelCompletion(currentLevelIndex);
                        
                        // Pequeno delay antes de completar a fase, protegido contra troca de fase/menu.
                        const bossFinishToken = levelLoadToken;
                        const bossFinishLevel = currentLevelIndex;
                        const finishBossLevel = () => {
                            if (bossFinishToken !== levelLoadToken || bossFinishLevel !== currentLevelIndex) return;
                            if (![GameState.PLAYING, GameState.LEVEL_COMPLETE].includes(gameState)) return;
                            if (currentLevel.nextLevel) {
                                gameState = GameState.LEVEL_COMPLETE;
                                levelCompleteTimer = 0;
                                soundSystem.playSound('levelComplete');
                                players.forEach(player => {
                                    if (player.evolution) saveSystem.savePlayerProgress(player.name, player.evolution.save());
                                });
                            } else {
                                finishGameWithStory();
                                players.forEach(player => {
                                    if (player.evolution) saveSystem.savePlayerProgress(player.name, player.evolution.save());
                                });
                            }
                        };
                        if (window.GameRuntime?.schedule) window.GameRuntime.schedule('boss', 2000, finishBossLevel);
                        else setTimeout(finishBossLevel, 2000);
                    }
                }
            } else {
                // === FASE SEM BOSS - lógica original ===
                const allEnemiesDead = enemies.length === 0 || enemies.every(e => e.dead || e.life <= 0);
                const allScheduledEnemiesSpawned = !enemySpawnDirector || enemySpawnDirector.allSpawned;
                if (allEnemiesDead && allScheduledEnemiesSpawned) {
                    if (currentLevelIndex === 1) {
                        if (gameState === GameState.PLAYING && !window.busSequence?.isPhase2Waiting?.()) {
                            recordLevelCompletion(currentLevelIndex);
                            players.forEach(player => { if (player.evolution) saveSystem.savePlayerProgress(player.name, player.evolution.save()); });
                            enemySpawnDirector = null;
                            window.busSequence?.preparePhase2Exit(currentLevel, players);
                        }
                    } else {
                    recordLevelCompletion(currentLevelIndex);
                    
                    if (currentLevel.nextLevel) {
                        gameState = GameState.LEVEL_COMPLETE;
                        levelCompleteTimer = 0;
                        soundSystem.playSound('levelComplete');
                        
                        players.forEach(player => {
                            if (player.evolution) {
                                const evolutionData = player.evolution.save();
                                saveSystem.savePlayerProgress(player.name, evolutionData);
                            }
                        });
                    } else {
                        finishGameWithStory();
                        
                        players.forEach(player => {
                            if (player.evolution) {
                                const evolutionData = player.evolution.save();
                                saveSystem.savePlayerProgress(player.name, evolutionData);
                            }
                        });
                    }
                    }
                }
            }
        }
    }
    else if (gameState === GameState.FISHING_BONUS) {
        const fishingResult = window.fishingBonus?.updateDraw?.(ctx, keys, gamepadSystem, sistemControles);
        if (window.trophySystem) { window.trophySystem.updateNotifications(); window.trophySystem.drawNotifications(ctx); }
        if (fishingResult === 'DONE') {
            window.levelManager?.releaseBonus?.('fishing');
            gameState = GameState.STAGE_SELECT;
            stageSelectIndex = stageSelectChicoIndex();
            soundSystem?.playSound?.('menuSelect');
        }
    }
    else if (gameState === GameState.BUS_BOARDING) {
        const busResult = window.busSequence?.updateDrawBoarding(ctx, currentLevel, players);
        if (busResult === 'MINIGAME') { soundSystem?.stopMusic?.(); gameState = GameState.BUS_MINIGAME; }
        else if (busResult === 'ERROR') gameState = GameState.BUS_MINIGAME;
    }
    else if (gameState === GameState.BUS_MINIGAME) {
        const busResult = window.busSequence?.updateDrawMinigame(ctx, keys, gamepadSystem, sistemControles);
        if (window.trophySystem) { window.trophySystem.updateNotifications(); window.trophySystem.drawNotifications(ctx); }
        if (busResult === 'ARRIVAL') {
            transitionToLevel(2, () => {
                if (!levelGateActive && gameState !== GameState.GAME_OVER) {
                    gameState = GameState.BUS_ARRIVAL;
                    window.busSequence?.startArrival(players);
                }
            });
        } else if (busResult === 'BONUS_DONE') {
            window.levelManager?.releaseBonus?.('bus');
            gameState = GameState.MENU; refreshMenuOptions(); menuSelection = Math.max(0, menuOptions.indexOf('BÔNUS — ESTRADA PARA VEGAS'));
        }
    }
    else if (gameState === GameState.BUS_ARRIVAL) {
        const busResult = window.busSequence?.updateDrawArrival(ctx, currentLevel, players);
        if (busResult === 'DONE') {
            levelStartTime = Date.now(); levelDamageTaken = 0;
            if (window.storyCutscenes && !window.storyCutscenes.hasSeen?.('desertArrival')) {
                startStoryScene('desertArrival', () => { gameState = GameState.PLAYING; levelStartTime = Date.now(); startLevelMusic(); });
            } else { gameState = GameState.PLAYING; startLevelMusic(); }
        }
    }
    else if (gameState === GameState.CUTSCENE) {
        window.storyCutscenes?.update?.();
        window.storyCutscenes?.draw?.(ctx, currentLevel, players, LEVELS);
        if (window.trophySystem) { window.trophySystem.updateNotifications(); window.trophySystem.drawNotifications(ctx); }
    }
    else if (gameState === GameState.LEVEL_COMPLETE) {
        // Mostrar jogo ao fundo
        ctx.save();
        ctx.translate(-cameraX, 0);
        if (currentLevel && currentLevel.drawBackground) {

            currentLevel.drawBackground(ctx, cameraX);

        }
        players.forEach(p => p.draw(ctx));
        ctx.restore();
        drawHUD();
        
        drawLevelComplete();
    }
    else if (gameState === GameState.PAUSED) {
        // PAUSE REAL: não redesenha entidades nem cenário animado. Mostra exatamente
        // o frame capturado no instante da pausa, congelando toda a apresentação.
        if (pauseSnapshot) {
            ctx.save();
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(pauseSnapshot, 0, 0, canvas.width, canvas.height);
            ctx.restore();
        } else {
            ctx.fillStyle = '#111'; ctx.fillRect(0,0,canvas.width,canvas.height);
        }
        drawPaused();
    }
    else if (gameState === GameState.GAME_OVER) {
        // Verificar se é tela de gate de nível
        if (levelGateActive && typeof drawLevelGate === 'function') {
            if (currentLevel && currentLevel.levelRequirement) {
                if (currentLevel.drawBackground) {
                    ctx.save();
                    ctx.translate(-cameraX, 0);
                    currentLevel.drawBackground(ctx, cameraX);
                    ctx.restore();
                }
                drawLevelGate(ctx, currentLevelIndex, players);
            } else {
                levelGateActive = false;
                if (gameOverScreen) {
                    gameOverScreen.update();
                    gameOverScreen.draw(ctx);
                }
            }
        } else {
            // Atualizar e desenhar a nova tela de Game Over
            if (gameOverScreen) {
                gameOverScreen.update();
                gameOverScreen.draw(ctx);
            } else {
                drawGameOver();
            }
        }
    }
    else if (gameState === GameState.VICTORY) {
        drawVictory();
    }
    
    // Bug #2: Desenhar modal por cima de tudo se estiver ativo
    drawModal();
    
    // Restaurar contexto do shake
    ctx.restore();
    
}

async function beginInitialLoad() {
    const reg=window.CharacterAssetRegistry||{};
    const shared=[
        'assets/ui/loading-screen.webp','assets/ui/menu-principal-vegas.webp','assets/ui/pause-menu-vegas.webp',
        'assets/ui/hud-joao-frame.webp','assets/ui/hud-crist-frame.webp','assets/ui/hud-chico-frame.webp',
        'assets/ui/portrait-joao.webp','assets/ui/portrait-crist.webp','assets/ui/portrait-chico.webp',
        'assets/ui/dialog-hud-joao.webp','assets/ui/dialog-hud-crist.webp','assets/ui/dialog-hud-generic.webp',
        'assets/objects/wood-crate-16bit.webp','assets/objects/wood-barrel-16bit.webp',
        'assets/powerups/health-16bit.webp','assets/powerups/speed-16bit.webp','assets/powerups/strength-16bit.webp','assets/powerups/invincible-16bit.webp','assets/powerups/score-16bit.webp',
        'assets/npc/chico-fumaca/chico-fumaca-idle.webp',
        ...(reg.joao?.preview||[]),...(reg.crist?.preview||[]),...(reg.chico?.preview||[])
    ];
    window.LevelLoadState={active:true,type:'bootstrap',progress:0,title:'JOÃO & CRIST',subtitle:'Preparando recursos essenciais',tip:'As fases serão carregadas somente quando forem usadas.',error:null,failures:[],canRetry:false};
    loadingProgress=0;
    try{
        await window.assetManager.loadGroup('shared',shared,(p)=>{
            loadingProgress=p;
            window.LevelLoadState.progress=p;
        },{timeout:12000,retries:1});
        loadingProgress=1;
        Object.assign(window.LevelLoadState,{active:false,progress:1,error:null,failures:[],canRetry:false});
    }catch(error){
        Object.assign(window.LevelLoadState,{active:true,error,failures:error?.failures||[],canRetry:true});
    }
}

window.retryCurrentLoad=()=>{
    const ls=window.LevelLoadState||{};
    if(ls.type==='bootstrap') return beginInitialLoad();
    return window.levelManager?.retry?.();
};

// Iniciar o jogo: loop único + bootstrap com progresso real.
beginInitialLoad();
safeGameLoopFrame();
