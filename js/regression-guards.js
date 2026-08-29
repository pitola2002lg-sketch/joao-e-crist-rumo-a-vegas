/* Verificações leves contra regressões de estrutura. Sem alterar gameplay. */
(() => {
  function run(){
    const issues=[];
    try {
      if (!Array.isArray(LEVELS) || LEVELS.length !== 8) issues.push('LEVELS deve possuir 8 fases');
      if (Array.isArray(LEVELS)) {
        LEVELS.forEach((l,i)=>{
          const expected = i < LEVELS.length-1 ? i+2 : null;
          if (l.nextLevel !== expected) issues.push(`Transição da Fase ${i+1} inválida: ${l.nextLevel}`);
        });
        if (!LEVELS[2]?.hasBoss) issues.push('Fase 3 sem boss');
        if (!LEVELS[4]?.hasFinalBoss) issues.push('Fase 5 sem Rei de Vegas');
        if (!LEVELS[5]?.hasTechBoss) issues.push('Fase 6 sem Engenheiro');
        if (!LEVELS[6]?.hasShadowBoss) issues.push('Fase 7 sem A Sombra');
        if (!LEVELS[7]?.hasGodBoss) issues.push('Fase 8 sem Deus das Apostas');
      }
      if (!window.busSequence) issues.push('Sistema do ônibus indisponível');
      if (!window.GameBridge?.ready) issues.push('Ponte global não ativada');
      if (!window.soundSystem) issues.push('Sistema de som indisponível');
      if (!window.saveSystem && typeof saveSystem === 'undefined') issues.push('SaveSystem indisponível');
      if (!window.GameRuntime?.schedule || !window.GameRuntime?.pauseTimers) issues.push('Timers administrados indisponíveis');
      if (typeof saveSystem !== 'undefined' && (!saveSystem.saveCampaignCheckpoint || !saveSystem.loadCampaignCheckpoint)) issues.push('Checkpoint de campanha indisponível');
      if (typeof CowboyEnemy !== 'undefined' && !CowboyEnemy.prototype.__spr16Final && !CowboyEnemy.prototype.__spr16) issues.push('Renderer do Cowboy não instalado');
      if (typeof TankEnemy !== 'undefined' && !TankEnemy.prototype.__spr16Final && !TankEnemy.prototype.__spr16) issues.push('Renderer do Tank não instalado');
      if (typeof BerserkerEnemy !== 'undefined' && !BerserkerEnemy.prototype.__spr16Final && !BerserkerEnemy.prototype.__spr16) issues.push('Renderer do Berserker não instalado');
    } catch (e) { issues.push(e?.message || String(e)); }
    if (issues.length) {
      issues.forEach(x=>window.GameDebugConsole?.error?.('[REGRESSION] '+x));
      console.error('[regression-guards]', issues);
    } else {
      window.GameDebugConsole?.log?.('[CORE] Verificações estruturais OK: 8 fases, bosses, ônibus, save e áudio');
    }
    window.__regressionIssues=issues;
  }
  setTimeout(run,0);
})();
