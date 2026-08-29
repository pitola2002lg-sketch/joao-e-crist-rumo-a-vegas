// v0.9.4 - controles touch robustos para Android/iOS/WebView
(() => {
  'use strict';

  try {
    const hasTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) ||
      (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) || window.innerWidth < 900;
    if (!hasTouch) return;

    const controls = window.sistemControles;
    const host = document.getElementById('game-container');
    if (!controls || !host) {
      if(window.DEV) console.warn('[TOUCH] Controles ou game-container indisponíveis');
      return;
    }

    const old = document.getElementById('touch-controls');
    if (old) old.remove();

    const style = document.createElement('style');
    style.id = 'touch-controls-style';
    style.textContent = `
      #touch-controls{position:absolute;inset:0;z-index:80;pointer-events:none;display:none;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none}
      #touch-controls button{pointer-events:auto;touch-action:none;-webkit-tap-highlight-color:transparent;border:2px solid rgba(255,255,255,.55);background:rgba(10,18,30,.68);color:#fff;font:bold 15px Arial;border-radius:50%;width:68px;height:68px;box-shadow:0 2px 10px rgba(0,0,0,.45)}
      #touch-controls button.pressed{transform:scale(.94);background:rgba(255,150,35,.82);border-color:#ffd46b}
      #touch-controls .touch-left{position:absolute;left:18px;bottom:18px;display:flex;gap:12px;align-items:flex-end}
      #touch-controls .touch-right{position:absolute;right:18px;bottom:18px;display:grid;grid-template-columns:repeat(2,68px);gap:10px}
      #touch-controls .pause-touch{position:absolute;right:18px;top:18px;width:56px;height:56px;font-size:22px}
      @media (max-width:700px){#touch-controls button{width:62px;height:62px;font-size:13px}#touch-controls .touch-right{grid-template-columns:repeat(2,62px)}#touch-controls .pause-touch{width:50px;height:50px}}
    `;
    document.getElementById('touch-controls-style')?.remove();
    document.head.appendChild(style);

    const layer = document.createElement('div');
    layer.id = 'touch-controls';
    layer.innerHTML = `
      <button class="pause-touch" data-special="pause" aria-label="Pausar">Ⅱ</button>
      <div class="touch-left">
        <button data-a="left" aria-label="Esquerda">◀</button>
        <button data-a="right" aria-label="Direita">▶</button>
      </div>
      <div class="touch-right">
        <button class="jump" data-a="up">PULO</button>
        <button class="dash" data-a="dash">DASH</button>
        <button class="ranged" data-a="ranged">TIRO</button>
        <button class="attack" data-a="attack">ATAQUE</button>
      </div>`;
    host.appendChild(layer);

    const activeTouches = new Map();
    const setAction = (action, on) => {
      try { controls.definirTouch(1, action, !!on); }
      catch (e) { if(window.DEV) console.warn('[TOUCH] definirTouch falhou', action, e); }
    };
    const releaseAll = () => {
      activeTouches.clear();
      try { controls.limparTouch(); } catch (_) {}
      layer.querySelectorAll('button.pressed').forEach(b => b.classList.remove('pressed'));
    };

    function pressButton(btn, id) {
      if (!btn) return;
      const action = btn.dataset.a;
      if (action) setAction(action, true);
      if (id != null) activeTouches.set(id, btn);
      btn.classList.add('pressed');
    }
    function releaseButton(btn, id) {
      if (!btn) return;
      const action = btn.dataset.a;
      if (action) setAction(action, false);
      if (id != null) activeTouches.delete(id);
      btn.classList.remove('pressed');
    }

    // Pointer Events para Android/Chrome/Edge modernos.
    if (window.PointerEvent) {
      layer.querySelectorAll('button[data-a]').forEach(btn => {
        btn.addEventListener('pointerdown', e => {
          e.preventDefault();
          try { btn.setPointerCapture?.(e.pointerId); } catch (_) {}
          pressButton(btn, e.pointerId);
        }, {passive:false});
        const up = e => { e.preventDefault(); releaseButton(btn, e.pointerId); };
        btn.addEventListener('pointerup', up, {passive:false});
        btn.addEventListener('pointercancel', up, {passive:false});
        btn.addEventListener('lostpointercapture', e => releaseButton(btn, e.pointerId));
      });
    } else {
      // Fallback essencial para Safari/WebViews antigos.
      layer.querySelectorAll('button[data-a]').forEach(btn => {
        btn.addEventListener('touchstart', e => {
          e.preventDefault();
          for (const t of e.changedTouches) pressButton(btn, t.identifier);
        }, {passive:false});
        const up = e => {
          e.preventDefault();
          for (const t of e.changedTouches) releaseButton(activeTouches.get(t.identifier) || btn, t.identifier);
        };
        btn.addEventListener('touchend', up, {passive:false});
        btn.addEventListener('touchcancel', up, {passive:false});
      });
    }

    // Pause touch não injeta tecla: chama o mesmo pause real do jogo quando disponível.
    const pauseBtn = layer.querySelector('[data-special="pause"]');
    const pausePress = e => {
      e.preventDefault();
      try {
        if (window.gameState === 'playing' || window.gameState === 'bus_minigame' || window.gameState === 'fishing_bonus') {
          if (typeof window.enterTruePause === 'function') window.enterTruePause(window.gameState);
          else window.dispatchEvent(new KeyboardEvent('keydown', {key:'Escape', bubbles:true}));
        }
      } catch (err) { if(window.DEV) console.warn('[TOUCH] pause falhou', err); }
    };
    if (window.PointerEvent) pauseBtn?.addEventListener('pointerdown', pausePress, {passive:false});
    else pauseBtn?.addEventListener('touchstart', pausePress, {passive:false});

    const jumpBtn = layer.querySelector('[data-a="up"]');
    const dashBtn = layer.querySelector('[data-a="dash"]');
    const rangedBtn = layer.querySelector('[data-a="ranged"]');
    const attackBtn = layer.querySelector('[data-a="attack"]');
    let lastMode = '';

    const sync = () => {
      try {
        const state = window.gameState;
        const bus = state === 'bus_minigame';
        const gameplay = state === 'playing';
        const fishing = state === 'fishing_bonus';
        const visible = gameplay || bus || fishing;
        layer.style.display = visible ? 'block' : 'none';
        if (!visible) releaseAll();

        const mode = bus ? 'bus' : 'fight';
        if (mode !== lastMode) {
          releaseAll();
          lastMode = mode;
          if (bus) {
            if (jumpBtn) jumpBtn.textContent = '↑';
            if (dashBtn) dashBtn.textContent = '↓';
            if (rangedBtn) rangedBtn.style.display = 'none';
            if (attackBtn) attackBtn.textContent = 'BUZINA';
          } else {
            if (jumpBtn) jumpBtn.textContent = 'PULO';
            if (dashBtn) dashBtn.textContent = 'DASH';
            if (rangedBtn) { rangedBtn.style.display = ''; rangedBtn.textContent = 'TIRO'; }
            if (attackBtn) attackBtn.textContent = 'ATAQUE';
          }
        }
      } catch (err) {
        if(window.DEV) console.warn('[TOUCH] sincronização falhou', err);
      }
      window.requestAnimationFrame(sync);
    };

    window.addEventListener('blur', releaseAll);
    window.addEventListener('pagehide', releaseAll);
    document.addEventListener('visibilitychange', () => { if (document.hidden) releaseAll(); });
    document.addEventListener('contextmenu', e => {
      if (e.target?.closest?.('#touch-controls')) e.preventDefault();
    });

    window.TouchControls = { layer, releaseAll, ready:true };
    console.info('[TOUCH] Controles móveis carregados com compatibilidade iOS/Android');
    window.GameDebugConsole?.log?.('[TOUCH] Controles móveis carregados');
    sync();
  } catch (error) {
    console.error('[TOUCH] Falha ao inicializar touch-controls.js', error);
    window.GameDebugConsole?.error?.(`[TOUCH] ${error?.stack || error}`);
  }
})();
