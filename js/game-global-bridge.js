/* Ponte controlada entre o estado lexical do main.js e módulos antigos que usam window.*.
   Corrige módulos de boss/evolução/troféus sem duplicar estado. */
(() => {
  function bridge(name, getter, setter) {
    try {
      const desc = Object.getOwnPropertyDescriptor(window, name);
      if (desc && desc.configurable === false) return;
      Object.defineProperty(window, name, { configurable:true, enumerable:false, get:getter, set:setter });
    } catch (e) { if(window.DEV) console.warn('[bridge]', name, e); }
  }
  bridge('players', () => players, v => { if (Array.isArray(v)) { players.length=0; players.push(...v); } });
  bridge('enemies', () => enemies, v => { if (Array.isArray(v)) { enemies.length=0; enemies.push(...v); } });
  bridge('cameraX', () => cameraX, v => { if (Number.isFinite(v)) cameraX=v; });
  bridge('screenShake', () => screenShake, v => { if (Number.isFinite(v)) screenShake=v; });
  bridge('score', () => score, v => { if (Number.isFinite(v)) score=v; });
  bridge('gameState', () => gameState, v => { if (v != null) gameState=v; });
  bridge('currentLevelIndex', () => currentLevelIndex, v => { if (Number.isInteger(v)) currentLevelIndex=v; });
  bridge('currentLevel', () => currentLevel, v => { currentLevel=v; });
  bridge('powerUps', () => powerUps, v => { if (Array.isArray(v)) { powerUps.length=0; powerUps.push(...v); } });
  bridge('destructibles', () => destructibles, v => { if (Array.isArray(v)) { destructibles.length=0; destructibles.push(...v); } });
  bridge('waveSystem', () => waveSystem, v => { waveSystem=v; });
  bridge('bossSpawned', () => bossSpawned, v => { bossSpawned=!!v; });
  bridge('bossDefeated', () => bossDefeated, v => { bossDefeated=!!v; });
  bridge('debugMode', () => debugMode, v => { debugMode=!!v; window.DEBUG_GAME=!!v; });

  window.GameBridge = { ready:true };
  window.GameDebugConsole?.log?.('[CORE] Ponte global segura ativada');
})();
