/* João & Crist v0.9.4 - camada conservadora de estabilidade.
   Não substitui sistemas existentes: adiciona guardas, diagnóstico e utilidades. */
(() => {
  if (window.GameHardening) return;

  window.DEBUG_GAME = false;
  const rawConsoleLog = console.log.bind(console);
  console.log = (...args) => {
    const first = String(args[0] ?? '');
    const noisy = /criado|spawnado|hitbox|Sistema .* carregado|Sprite pack extra carregado|BERSERKER|TIRO JOAO/i.test(first);
    if (!window.DEBUG_GAME && noisy) return;
    rawConsoleLog(...args);
  };

  const timers = new Map();
  let timerSeq = 0;
  let timersPaused = false;
  const runtime = window.GameRuntime || (window.GameRuntime = {});

  function armTimer(rec, delayMs) {
    rec.remaining = Math.max(0, delayMs || 0);
    rec.startedAt = performance.now();
    rec.dueAt = rec.startedAt + rec.remaining;
    rec.native = setTimeout(() => {
      if (rec.cancelled || timersPaused) return;
      timers.delete(rec.id);
      try { rec.callback(); } catch (err) {
        window.GameDebugConsole?.error?.('[TIMER] ' + (err?.stack || err));
        console.error('[timer]', err);
      }
    }, rec.remaining);
  }

  runtime.schedule = function(owner, delayMs, callback) {
    const id = ++timerSeq;
    const rec = { id, owner:owner || 'global', callback, native:null, cancelled:false, remaining:Math.max(0,delayMs || 0), startedAt:0, dueAt:0 };
    timers.set(id, rec);
    if (!timersPaused) armTimer(rec, rec.remaining);
    return id;
  };

  runtime.cancelTimer = function(id) {
    const rec = timers.get(id);
    if (!rec) return false;
    rec.cancelled = true;
    if (rec.native) clearTimeout(rec.native);
    timers.delete(id);
    return true;
  };

  runtime.cancelTimersFor = function(owner) {
    for (const [id, rec] of Array.from(timers.entries())) {
      if (rec.owner === owner) runtime.cancelTimer(id);
    }
  };

  runtime.cancelAllTimers = function() {
    for (const id of Array.from(timers.keys())) runtime.cancelTimer(id);
  };

  runtime.pauseTimers = function() {
    if (timersPaused) return;
    timersPaused = true;
    const now = performance.now();
    for (const rec of timers.values()) {
      if (rec.cancelled) continue;
      rec.remaining = Math.max(0, rec.dueAt - now);
      if (rec.native) clearTimeout(rec.native);
      rec.native = null;
    }
  };

  runtime.resumeTimers = function() {
    if (!timersPaused) return;
    timersPaused = false;
    for (const rec of timers.values()) {
      if (!rec.cancelled && !rec.native) armTimer(rec, rec.remaining);
    }
  };

  runtime.timersPaused = () => timersPaused;

  runtime.stats = runtime.stats || {
    lastFrameMs:0, maxFrameMs:0, slowFrames:0, fatalErrors:0,
    reset(){ this.lastFrameMs=0; this.maxFrameMs=0; this.slowFrames=0; }
  };

  const originalSceneEnter = window.sceneManager?.enter?.bind(window.sceneManager);
  if (originalSceneEnter) {
    window.sceneManager.enter = function(name) {
      const prev = this.current;
      originalSceneEnter(name);
      if (prev !== name) {
        window.GameDebugConsole?.log?.(`[SCENE] ${prev || 'boot'} -> ${name}`);
      }
    };
  }

  // Diagnóstico de erros assíncronos sem apagar save nem travar silenciosamente.
  window.addEventListener('error', ev => {
    const err = ev.error || ev.message;
    const msg = `[ERROR] ${ev.filename || 'script'}:${ev.lineno || '?'}:${ev.colno || '?'} ${err?.stack || err}`;
    window.GameDebugConsole?.error?.(msg);
    window.__lastGameError = msg;
  });
  window.addEventListener('unhandledrejection', ev => {
    const reason = ev.reason?.stack || ev.reason || 'Promise rejeitada';
    const msg = `[PROMISE] ${reason}`;
    window.GameDebugConsole?.error?.(msg);
    window.__lastGameError = msg;
  });

  window.GameHardening = {
    version:'1.0',
    timers,
    runtime
  };
})();
