
/* Fazenda background 16-bit - visual only, does not alter phase dimensions */
(() => {
  const farmBg = window.assetManager.placeholder('assets/backgrounds/fazenda-16bit.webp');

  function isFarmLevel(level) {
    if (!level) return false;
    const n = String(level.name || level.title || level.id || level.type || '').toLowerCase();
    if (n.includes('fazenda') || n.includes('farm')) return true;
    if (typeof currentLevelIndex !== 'undefined' && currentLevelIndex === 0) return true;
    if (typeof levelIndex !== 'undefined' && levelIndex === 0) return true;
    return false;
  }

  window.drawFarmBackground16 = function(ctx, level, cameraX = 0) {
    if (!ctx || !level || !isFarmLevel(level) || !farmBg.complete || !farmBg.naturalWidth) return false;

    const canvasW = ctx.canvas ? ctx.canvas.width : 1000;
    const canvasH = ctx.canvas ? ctx.canvas.height : 650;
    const worldW = Number.isFinite(level.width) ? level.width : 5000;

    // Background is mapped across the existing world width.
    // The level width itself is NEVER modified.
    const scaleX = farmBg.naturalWidth / worldW;
    const srcX = Math.max(0, Math.min(farmBg.naturalWidth - 1, cameraX * scaleX));
    const srcW = Math.max(1, Math.min(farmBg.naturalWidth - srcX, canvasW * scaleX));

    // Crop vertically to preserve image aspect and fill the game screen.
    const desiredSrcH = Math.min(farmBg.naturalHeight, farmBg.naturalWidth * (canvasH / worldW));
    const srcH = farmBg.naturalHeight;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      farmBg,
      srcX, 0, srcW, srcH,
      cameraX, 0, canvasW, canvasH
    );
    ctx.restore();
    return true;
  };

  // Patch Level.drawBackground if available. Preserve old behavior for every other level.
  function patchLevel() {
    if (typeof Level === 'undefined' || !Level.prototype) return false;

    if (typeof Level.prototype.drawBackground === 'function' && !Level.prototype.__farmBg16Patched) {
      const old = Level.prototype.drawBackground;
      Level.prototype.drawBackground = function(ctx, cameraX, ...rest) {
        if (window.drawFarmBackground16(ctx, this, cameraX || 0)) return;
        return old.call(this, ctx, cameraX, ...rest);
      };
      Level.prototype.__farmBg16Patched = true;
      return true;
    }

    if (typeof Level.prototype.draw === 'function' && !Level.prototype.__farmBg16DrawPatched) {
      const oldDraw = Level.prototype.draw;
      Level.prototype.draw = function(ctx, cameraX, ...rest) {
        if (isFarmLevel(this) && farmBg.complete && farmBg.naturalWidth) {
          window.drawFarmBackground16(ctx, this, cameraX || 0);
          // old draw may redraw background, so use a flag consumed by global canvas patch below if present.
          this.__farmCustomBackgroundDrawn = true;
        }
        return oldDraw.call(this, ctx, cameraX, ...rest);
      };
      Level.prototype.__farmBg16DrawPatched = true;
      return true;
    }
    return false;
  }

  // Try now and again shortly after scripts/classes settle.
  patchLevel();
  setTimeout(patchLevel, 0);
  setTimeout(patchLevel, 250);
})();
