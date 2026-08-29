// ========== SISTEMA DE SOM ==========
class SoundSystem {
    constructor() {
        this.enabled = true;
        this.volume = 0.5;
        this.sfxVolume = 0.5; // Melhoria #52: Volume de efeitos sonoros
        this.musicVolume = 0.3; // Melhoria #52: Volume de música
        this.audioContext = null;
        this.initialized = false;

        // v0.9.4: efeitos WAV 16-bit. Mantém fallback procedural caso um arquivo falhe.
        this.soundManifest = {
            punch:'assets/sounds/punch.wav', punch1:'assets/sounds/punch.wav', kick:'assets/sounds/kick.wav', heavy:'assets/sounds/kick2.wav',
            cane1:'assets/sounds/cane1.wav', cane2:'assets/sounds/cane2.wav', cane_ultimate:'assets/sounds/cane_ultimate.wav',
            hit:'assets/sounds/hit.wav', enemyHit:'assets/sounds/enemyHit.wav', enemyDeath:'assets/sounds/enemyDeath.wav', ko:'assets/sounds/ko.wav',
            dash:'assets/sounds/dash.wav', jump:'assets/sounds/jump.wav', combo:'assets/sounds/combo.wav', perfect:'assets/sounds/perfect.wav', perfectDodge:'assets/sounds/perfectDodge.wav',
            powerup:'assets/sounds/powerup.wav', powerUp:'assets/sounds/powerup.wav', levelComplete:'assets/sounds/levelComplete.wav', victory:'assets/sounds/victory.wav', gameOver:'assets/sounds/gameOver.wav',
            menuMove:'assets/sounds/menuMove.wav', menuSelect:'assets/sounds/menuSelect.wav', menuBack:'assets/sounds/menuBack.wav', achievement:'assets/sounds/achievement.wav',
            shoot:'assets/sounds/shoot.wav', fuse:'assets/sounds/fuse.wav', explosion:'assets/sounds/explosion.wav',
            busEngine:'assets/sounds/busEngine.wav', busAccelerate:'assets/sounds/busAccelerate.wav', busBrake:'assets/sounds/busBrake.wav', busHorn:'assets/sounds/busHorn.wav',
            busCollision:'assets/sounds/busCollision.wav', busRepair:'assets/sounds/busRepair.wav', busMoney:'assets/sounds/busMoney.wav', busStar:'assets/sounds/busStar.wav',
            busTurbo:'assets/sounds/busTurbo.wav', busCheckpoint:'assets/sounds/busCheckpoint.wav', busDoorOpen:'assets/sounds/busDoorOpen.wav', busDoorClose:'assets/sounds/busDoorClose.wav',
            busBroken:'assets/sounds/busBroken.wav', busArrival:'assets/sounds/busArrival.wav',
            punch2:'assets/sounds/punch2.wav', punch3:'assets/sounds/punch3.wav', kick1:'assets/sounds/kick.wav', kick2:'assets/sounds/kick2.wav',
            hit1:'assets/sounds/hit.wav', hit2:'assets/sounds/hit2.wav', hit3:'assets/sounds/hit3.wav',
            enemyHit1:'assets/sounds/enemyHit.wav', enemyHit2:'assets/sounds/enemyHit2.wav', enemyDeath1:'assets/sounds/enemyDeath.wav', enemyDeath2:'assets/sounds/enemyDeath2.wav',
            ko1:'assets/sounds/ko.wav', ko2:'assets/sounds/ko2.wav', playerHurt1:'assets/sounds/playerHurt1.wav', playerHurt2:'assets/sounds/playerHurt2.wav',
            jump1:'assets/sounds/jump.wav', jump2:'assets/sounds/jump2.wav', dash1:'assets/sounds/dash.wav', dash2:'assets/sounds/dash2.wav',
            shoot1:'assets/sounds/shoot.wav', shoot2:'assets/sounds/shoot2.wav', menuMove1:'assets/sounds/menuMove.wav', menuMove2:'assets/sounds/menuMove2.wav',
            crateHit:'assets/sounds/crateHit.wav', crateBreak:'assets/sounds/crateBreak.wav', barrelHit:'assets/sounds/barrelHit.wav', barrelBreak:'assets/sounds/barrelBreak.wav',
            pickupHealth:'assets/sounds/pickupHealth.wav', pickupSpeed:'assets/sounds/pickupSpeed.wav', pickupStrength:'assets/sounds/pickupStrength.wav',
            pickupInvincible:'assets/sounds/pickupInvincible.wav', pickupScore:'assets/sounds/pickupScore.wav',
            dogPet:'assets/sounds/dogPet.wav', dogBark:'assets/sounds/dogBark.wav', levelUp:'assets/sounds/levelUp.wav', pause:'assets/sounds/pause.wav', unpause:'assets/sounds/unpause.wav',
            busHorn1:'assets/sounds/busHorn.wav', busHorn2:'assets/sounds/busHorn2.wav', busCollision1:'assets/sounds/busCollision.wav', busCollision2:'assets/sounds/busCollision2.wav'
        };
        this.soundVariants = {
            punch:['punch','punch2','punch3'], kick:['kick1','kick2'], hit:['hit1','hit2','hit3'],
            enemyHit:['enemyHit1','enemyHit2'], enemyDeath:['enemyDeath1','enemyDeath2'], ko:['ko1','ko2'],
            playerHurt:['playerHurt1','playerHurt2'], jump:['jump1','jump2'], dash:['dash1','dash2'], shoot:['shoot1','shoot2'],
            menuMove:['menuMove1','menuMove2'], busHorn:['busHorn1','busHorn2'], busCollision:['busCollision1','busCollision2']
        };
        this.soundCooldownMs = { hit:28, enemyHit:35, punch:30, kick:45, playerHurt:80, menuMove:45, fuse:110, busCollision:120 };
        this.soundPitchRange = { punch:.035, kick:.025, hit:.045, enemyHit:.035, playerHurt:.025, jump:.025, dash:.025, shoot:.018, menuMove:.015, busCollision:.02 };
        this.soundVolumeScale = { hit:.68, enemyHit:.72, punch:.78, kick:.82, playerHurt:.82, ko:.88, shoot:.78, explosion:.80, busCollision:.82, dogBark:.72, menuMove:.72 };
        this._lastPlayedAt = {};
        this._lastVariantIndex = {};
        this.soundPools = {};
        this.loopingSounds = {};
        this.preloadWavSounds();
        
        // Melhoria #53: Sistema de música de fundo
        this.musicPlaying = false;
        this.musicOscillators = [];
        this.musicGain = null;
        this.musicSessionId = 0;
        
        // Não inicializar AudioContext aqui - aguardar interação do usuário
    }
    
    // Melhoria #53: Música de fundo procedural
    startMusic(tempo = 'normal') {
        if (!this.enabled || !this.audioContext || this.musicPlaying) return;
        
        const ctx = this.audioContext;
        const now = ctx.currentTime;
        const session = ++this.musicSessionId;
        
        // Ganho principal da música
        this.musicGain = ctx.createGain();
        this.musicGain.gain.setValueAtTime(this.musicVolume, now);
        this.musicGain.connect(ctx.destination);
        
        // Marcar antes de agendar os loops; a versão anterior marcava depois e
        // o primeiro ciclo não era reprogramado.
        this.musicPlaying = true;
        this.musicTempo = tempo;
        // Batida base (kick)
        const kickInterval = tempo === 'fast' ? 0.3 : tempo === 'slow' ? 0.62 : 0.5;
        this.playKick(now, kickInterval, session);
        
        // Linha de baixo
        this.playBassline(now, tempo, session);
        
    }
    
    playKick(startTime, interval, session=this.musicSessionId) {
        if (!this.musicGain || session !== this.musicSessionId) return;
        
        const ctx = this.audioContext;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, startTime);
        osc.frequency.exponentialRampToValueAtTime(40, startTime + 0.1);
        
        gain.gain.setValueAtTime(this.musicVolume * 0.5, startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.1);
        
        osc.connect(gain);
        gain.connect(this.musicGain);
        
        osc.start(startTime);
        osc.stop(startTime + 0.1);
        
        // Repetir kick
        if (this.musicPlaying) {
            setTimeout(() => { if(this.musicPlaying && session===this.musicSessionId) this.playKick(ctx.currentTime, interval, session); }, interval * 1000);
        }
    }
    
    playBassline(startTime, tempo, session=this.musicSessionId) {
        if (!this.musicGain || session !== this.musicSessionId) return;
        
        const ctx = this.audioContext;
        const notes = tempo === 'fast' ? [110,130,147,165] : tempo === 'vegas' ? [98,123.5,146.8,196] : tempo === 'desert' ? [73.4,82.4,110,123.5] : [82.4,98,110,123.5]; // A, B, C#, D
        const noteLength = tempo === 'fast' ? 0.4 : 0.6;
        
        notes.forEach((freq, i) => {
            const noteTime = startTime + i * noteLength;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const filter = ctx.createBiquadFilter();
            
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, noteTime);
            
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(800, noteTime);
            filter.Q.value = 1;
            
            gain.gain.setValueAtTime(this.musicVolume * 0.3, noteTime);
            gain.gain.exponentialRampToValueAtTime(0.01, noteTime + noteLength);
            
            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.musicGain);
            
            osc.start(noteTime);
            osc.stop(noteTime + noteLength);
        });
        
        // Loop da bassline
        if (this.musicPlaying) {
            setTimeout(() => { if(this.musicPlaying && session===this.musicSessionId) this.playBassline(ctx.currentTime, tempo, session); }, notes.length * noteLength * 1000);
        }
    }
    
    stopMusic() {
        this.musicPlaying = false;
        this.musicSessionId++;
        if (this.musicGain) {
            this.musicGain.disconnect();
            this.musicGain = null;
        }
        this.musicOscillators = [];
    }
    
    initAudioContext() {
        if (this.initialized) return;
        
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.initialized = true;
            
            // Resumir contexto se estiver suspenso (política de autoplay)
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
        } catch (e) {
            if(window.DEV) console.warn('Web Audio API não suportada:', e);
            this.enabled = false;
        }
    }
    
    preloadWavSounds() {
        // v0.9.4 loader: não cria dezenas de elementos Audio no boot.
        // Pools são criados somente quando o som é usado ou solicitado pelo LevelManager.
        this.soundPools = this.soundPools || {};
    }

    ensureSoundPool(type) {
        if (this.soundPools[type]?.pool?.length) return this.soundPools[type];
        const src = this.soundManifest[type];
        if (!src) return null;
        const pool = [];
        const voices = type === 'busEngine' ? 1 : 3;
        for (let i=0;i<voices;i++) {
            const a = new Audio();
            a.preload = 'auto';
            a.src = src;
            pool.push(a);
        }
        return (this.soundPools[type] = { pool, cursor:0 });
    }

    async preloadTypes(types, progressCb) {
        const keys=[...new Set((types||[]).flatMap(t=>this.soundVariants[t]||[t]).filter(k=>this.soundManifest[k]))];
        let done=0;
        const waitOne=(key)=>new Promise(resolve=>{
            const entry=this.ensureSoundPool(key); const audio=entry?.pool?.[0];
            if(!audio){done++;progressCb?.(done,keys.length,key);return resolve();}
            let settled=false;
            const finish=()=>{if(settled)return;settled=true;clearTimeout(timer);audio.removeEventListener('loadeddata',finish);audio.removeEventListener('canplaythrough',finish);audio.removeEventListener('error',finish);done++;progressCb?.(done,keys.length,key);resolve();};
            const timer=setTimeout(finish,7000);
            audio.addEventListener('loadeddata',finish,{once:true});
            audio.addEventListener('canplaythrough',finish,{once:true});
            audio.addEventListener('error',finish,{once:true});
            try{audio.load();}catch(_){finish();}
            if(audio.readyState>=2)finish();
        });
        await Promise.all(keys.map(waitOne));
        return {loaded:done,total:keys.length};
    }

    releaseTypes(types) {
        const keys=[...new Set((types||[]).flatMap(t=>this.soundVariants[t]||[t]))];
        for(const key of keys){
            const entry=this.soundPools[key]; if(!entry)continue;
            for(const a of entry.pool||[]){try{a.pause();a.removeAttribute('src');a.load();}catch(_){}}
            delete this.soundPools[key];
        }
    }

    resolveSoundKey(type) {
        const variants = this.soundVariants[type];
        if (!variants?.length) return type;
        let idx = Math.floor(Math.random() * variants.length);
        if (variants.length > 1 && idx === this._lastVariantIndex[type]) idx = (idx + 1) % variants.length;
        this._lastVariantIndex[type] = idx;
        return variants[idx];
    }

    playWav(type, volumeScale=1) {
        if (!this.enabled || this._gamePaused) return false;
        const now = performance.now();
        const cd = this.soundCooldownMs[type] || 0;
        if (cd && now - (this._lastPlayedAt[type] || -Infinity) < cd) return true;
        this._lastPlayedAt[type] = now;

        const key = this.resolveSoundKey(type);
        const entry = this.soundPools[key] || this.ensureSoundPool(key) || this.soundPools[type] || this.ensureSoundPool(type);
        if (!entry?.pool?.length) return false;
        const audio = entry.pool[entry.cursor++ % entry.pool.length];
        try {
            audio.pause();
            audio.currentTime = 0;
            audio.loop = false;
            const baseScale = this.soundVolumeScale[type] ?? 1;
            audio.volume = Math.max(0, Math.min(1, this.sfxVolume * volumeScale * baseScale));
            const pitch = this.soundPitchRange[type] || 0;
            audio.playbackRate = pitch ? 1 + (Math.random() * 2 - 1) * pitch : 1;
            const promise = audio.play();
            if (promise?.catch) promise.catch(()=>{});
            return true;
        } catch (_) { return false; }
    }

    startLoop(type, volumeScale=.65) {
        if (!this.enabled || this.loopingSounds[type]) return;
        const entry = this.soundPools[type] || this.ensureSoundPool(type);
        if (!entry?.pool?.length) return;
        const audio = entry.pool[0];
        try {
            audio.currentTime = 0; audio.loop = true; audio.playbackRate = 1;
            audio.volume = Math.max(0, Math.min(1, this.sfxVolume * volumeScale));
            this.loopingSounds[type] = audio;
            const promise = audio.play();
            if (promise?.catch) promise.catch(()=>{});
        } catch (_) {}
    }

    stopLoop(type) {
        const audio = this.loopingSounds[type];
        if (!audio) return;
        try { audio.pause(); audio.currentTime = 0; } catch (_) {}
        delete this.loopingSounds[type];
    }

    stopAllLoops() { Object.keys(this.loopingSounds).forEach(k=>this.stopLoop(k)); }

    pauseAll() {
        if (this._gamePaused) return;
        this._gamePaused = true;
        this._pausedPoolAudio = [];
        this._pausedLoops = [];
        Object.entries(this.soundPools || {}).forEach(([type, entry]) => {
            (entry?.pool || []).forEach((audio, index) => {
                try {
                    if (!audio.paused && !audio.ended) {
                        this._pausedPoolAudio.push({type, index, time:audio.currentTime, loop:audio.loop});
                        audio.pause();
                    }
                } catch (_) {}
            });
        });
        Object.entries(this.loopingSounds || {}).forEach(([type, audio]) => {
            try {
                if (audio && !audio.paused) {
                    this._pausedLoops.push({type, time:audio.currentTime});
                    audio.pause();
                }
            } catch (_) {}
        });
        try {
            if (this.audioContext?.state === 'running') {
                this._resumeAudioContextAfterPause = true;
                this.audioContext.suspend();
            }
        } catch (_) {}
    }

    resumeAll() {
        if (!this._gamePaused) return;
        this._gamePaused = false;
        try {
            if (this._resumeAudioContextAfterPause && this.audioContext?.state === 'suspended') this.audioContext.resume();
        } catch (_) {}
        this._resumeAudioContextAfterPause = false;
        for (const item of (this._pausedPoolAudio || [])) {
            const audio = this.soundPools?.[item.type]?.pool?.[item.index];
            if (!audio) continue;
            try {
                audio.currentTime = item.time || 0;
                audio.loop = !!item.loop;
                const pr = audio.play(); if (pr?.catch) pr.catch(()=>{});
            } catch (_) {}
        }
        // loops already exist in loopingSounds, only resume them from the same position.
        for (const item of (this._pausedLoops || [])) {
            const audio = this.loopingSounds?.[item.type];
            if (!audio) continue;
            try {
                audio.currentTime = item.time || 0;
                const pr = audio.play(); if (pr?.catch) pr.catch(()=>{});
            } catch (_) {}
        }
        this._pausedPoolAudio = [];
        this._pausedLoops = [];
    }

    // Gerar sons proceduralmente usando Web Audio API
    playSound(type) {
        if (!this.enabled) return;

        // Prioriza os WAVs 16-bit. O procedural fica como fallback para tipos antigos.
        if (this.playWav(type)) return;
        
        // Inicializar AudioContext na primeira interação do usuário
        if (!this.initialized) {
            this.initAudioContext();
        }
        
        if (!this.audioContext) return;
        
        const ctx = this.audioContext;
        const now = ctx.currentTime;
        
        switch(type) {
            case 'punch':
                this.createPunchSound(ctx, now);
                break;
            case 'hit':
                this.createHitSound(ctx, now);
                break;
            case 'ko':
                this.createKOSound(ctx, now);
                break;
            case 'dash':
                this.createDashSound(ctx, now);
                break;
            case 'jump':
                this.createJumpSound(ctx, now);
                break;
            case 'combo':
                this.createComboSound(ctx, now);
                break;
            case 'powerup':
                this.createPowerUpSound(ctx, now);
                break;
            case 'levelComplete':
                this.createLevelCompleteSound(ctx, now);
                break;
            case 'victory':
                this.createVictorySound(ctx, now);
                break;
            case 'gameOver':
                this.createGameOverSound(ctx, now);
                break;
            case 'menuMove':
                this.createMenuMoveSound(ctx, now);
                break;
            case 'menuSelect':
                this.createMenuSelectSound(ctx, now);
                break;
            case 'menuBack':
                this.createMenuBackSound(ctx, now);
                break;
        }
    }
    
    createPunchSound(ctx, now) {
        // Melhoria #51: Som procedural melhorado com ADSR envelope
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        
        osc.type = 'square';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.1);
        
        // ADSR Envelope (usando sfxVolume)
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(this.sfxVolume * 0.4, now + 0.01); // Attack
        gain.gain.linearRampToValueAtTime(this.sfxVolume * 0.25, now + 0.04); // Decay
        gain.gain.setValueAtTime(this.sfxVolume * 0.25, now + 0.07); // Sustain
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1); // Release
        
        // Filtro para dar mais corpo ao som
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1200, now);
        filter.frequency.exponentialRampToValueAtTime(400, now + 0.1);
        filter.Q.value = 2;
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(now);
        osc.stop(now + 0.1);
    }
    
    createHitSound(ctx, now) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.15);
        
        gain.gain.setValueAtTime(this.volume * 0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(now);
        osc.stop(now + 0.15);
    }
    
    createKOSound(ctx, now) {
        // Som de KO - explosão dramática
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc1.type = 'sawtooth';
        osc2.type = 'square';
        
        osc1.frequency.setValueAtTime(300, now);
        osc1.frequency.exponentialRampToValueAtTime(50, now + 0.3);
        
        osc2.frequency.setValueAtTime(150, now);
        osc2.frequency.exponentialRampToValueAtTime(25, now + 0.3);
        
        gain.gain.setValueAtTime(this.volume * 0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);
        
        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.3);
        osc2.stop(now + 0.3);
    }
    
    createDashSound(ctx, now) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.2);
        
        gain.gain.setValueAtTime(this.volume * 0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(now);
        osc.stop(now + 0.2);
    }
    
    createJumpSound(ctx, now) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(500, now + 0.1);
        
        gain.gain.setValueAtTime(this.volume * 0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(now);
        osc.stop(now + 0.1);
    }
    
    createComboSound(ctx, now) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.15);
        
        gain.gain.setValueAtTime(this.volume * 0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(now);
        osc.stop(now + 0.15);
    }
    
    createPowerUpSound(ctx, now) {
        // Arpejo ascendente
        const frequencies = [400, 500, 600, 800];
        frequencies.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + i * 0.05);
            
            gain.gain.setValueAtTime(this.volume * 0.2, now + i * 0.05);
            gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.05 + 0.1);
            
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.start(now + i * 0.05);
            osc.stop(now + i * 0.05 + 0.1);
        });
    }
    
    createLevelCompleteSound(ctx, now) {
        // Fanfarra de vitória
        const melody = [523, 659, 784, 1047]; // C, E, G, C (oitava acima)
        melody.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + i * 0.15);
            
            gain.gain.setValueAtTime(this.volume * 0.3, now + i * 0.15);
            gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.15 + 0.3);
            
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.start(now + i * 0.15);
            osc.stop(now + i * 0.15 + 0.3);
        });
    }
    
    createVictorySound(ctx, now) {
        // Música épica de vitória
        const melody = [523, 659, 784, 1047, 1047, 784, 659, 523];
        melody.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + i * 0.2);
            
            gain.gain.setValueAtTime(this.volume * 0.25, now + i * 0.2);
            gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.2 + 0.4);
            
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.start(now + i * 0.2);
            osc.stop(now + i * 0.2 + 0.4);
        });
    }
    
    createGameOverSound(ctx, now) {
        // Som descendente de derrota
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 1);
        
        gain.gain.setValueAtTime(this.volume * 0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 1);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(now);
        osc.stop(now + 1);
    }
    
    createMenuMoveSound(ctx, now) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, now);
        
        gain.gain.setValueAtTime(this.volume * 0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(now);
        osc.stop(now + 0.05);
    }
    
    createMenuSelectSound(ctx, now) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.setValueAtTime(800, now + 0.05);
        
        gain.gain.setValueAtTime(this.volume * 0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(now);
        osc.stop(now + 0.1);
    }
    
    createMenuBackSound(ctx, now) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(500, now);
        osc.frequency.setValueAtTime(300, now + 0.05);
        
        gain.gain.setValueAtTime(this.volume * 0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(now);
        osc.stop(now + 0.1);
    }
    
    toggle() {
        this.enabled = !this.enabled;
        if (!this.enabled) this.stopAllLoops();
    }
}
