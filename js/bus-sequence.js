// Assets extras do ônibus adicionados: carros coloridos, motos, cones e buracos.
/* João & Crist v0.9.4 - sequência modular do ônibus / minigame Estrada para Vegas */
(function () {
    'use strict';

    const W = 1000, H = 650;
    const LANES = [335, 430, 525];
    const BUS_X = 245;
    const BUS_W = 220;
    const BUS_H = 94;
    const BUS_PHASE_W = 280;
    const BUS_PHASE_H = 120;
    const BUS_PHASE_Y = 428;
    const COURSE_DISTANCE = 100;
    const SPEEDRUN_TARGET = 72; // segundos; equilibrado para percurso nominal de ~75s
    const START_COUNTDOWN = 2.4;
    const COLLISION_GRACE = .72;
    const NEAR_MISS_X = BUS_X + BUS_W + 22;

    const spritePaths = {
        idle: 'assets/bus/idle.webp', moving: 'assets/bus/andando.webp', moving2: 'assets/bus/andando-2.webp', accelerating: 'assets/bus/acelerando.webp', braking: 'assets/bus/freando.webp',
        turning: 'assets/bus/virando-cima.webp', turningUp: 'assets/bus/virando-cima.webp', turningDown: 'assets/bus/virando-baixo.webp', collision: 'assets/bus/colisao.webp', damaged: 'assets/bus/danificado.webp', critical: 'assets/bus/muito-danificado.webp',
        doorClosed: 'assets/bus/porta-fechada.webp', doorOpening: 'assets/bus/porta-abrindo.webp', doorOpen: 'assets/bus/porta-aberta.webp', doorClosing: 'assets/bus/porta-fechando.webp',
        leaving: 'assets/bus/saida.webp', arriving: 'assets/bus/chegada.webp'
    };
    const obstaclePaths = {
        cone:'assets/bus/cone-1.webp',
        cone1:'assets/bus/cone-1.webp', cone2:'assets/bus/cone-2.webp', cone3:'assets/bus/cone-3.webp', coneLight:'assets/bus/cone-light.webp',
        pothole:'assets/bus/pothole-deep.webp',
        potholeWater:'assets/bus/pothole-water.webp', potholeDeep:'assets/bus/pothole-deep.webp', potholeCracked:'assets/bus/pothole-cracked.webp',
        rock:'assets/bus/obstacles/rock.webp',
        car:'assets/bus/cars/car-red.webp',
        carRed:'assets/bus/cars/car-red.webp', carBlue:'assets/bus/cars/car-blue.webp', carYellow:'assets/bus/cars/car-yellow.webp',
        carGreen:'assets/bus/cars/car-green.webp', carBlack:'assets/bus/cars/car-black.webp', carWhite:'assets/bus/cars/car-white.webp',
        moto:'assets/bus/moto-red.webp',
        motoRed:'assets/bus/moto-red.webp', motoBrown:'assets/bus/moto-brown.webp', motoGreen:'assets/bus/moto-green.webp'
    };
    const obstacleVariants = {
        car:['carRed','carBlue','carYellow','carGreen','carBlack','carWhite'],
        moto:['motoRed','motoBrown','motoGreen'],
        cone:['cone1','cone2','cone3','coneLight'],
        pothole:['potholeWater','potholeDeep','potholeCracked']
    };
    const itemPaths = { repair:'assets/bus/items/repair.webp', money:'assets/bus/items/money.webp', star:'assets/bus/items/star.webp', turbo:'assets/bus/items/turbo.webp' };

    function loadImages(map) {
        const result = {};
        Object.keys(map).forEach(key => {
            result[key] = window.assetManager.image(map[key],'bonus:bus');
        });
        return result;
    }

    class BusSequenceController {
        constructor() {
            this.sprites = {};
            this.obstacleSprites = {};
            this.itemSprites = {};
            this.runBackground = window.assetManager.placeholder('assets/backgrounds/bus-bonus-vegas.webp');
            this.assetsLoaded = false;
            this.phase2Waiting = false;
            this.boarding = null;
            this.arrival = null;
            this.run = null;
            this.lastTime = performance.now();
            this.hornWasDown = false;
            this.errorMessage = null;
            this.bonusMode = false;
        }

        ensureAssets() {
            if (this.assetsLoaded) return;
            this.assetsLoaded = true;
            this.sprites = loadImages(spritePaths);
            this.obstacleSprites = loadImages(obstaclePaths);
            this.itemSprites = loadImages(itemPaths);
            window.assetManager.loadImage('assets/backgrounds/bus-bonus-vegas.webp','bonus:bus').catch(()=>{});
        }

        log(msg) {
            if(window.DEV) console.log(msg);
            if (window.GameDebugConsole) window.GameDebugConsole.log(msg);
        }

        reportError(err) {
            const stack = err && (err.stack || err.message) ? (err.stack || err.message) : String(err);
            const match = stack.match(/([^/\\\s]+\.js):(\d+):(\d+)/);
            const where = match ? `${match[1]}:${match[2]}:${match[3]}` : 'js/bus-sequence.js';
            this.errorMessage = { title:'ERRO NO MINIGAME DO ÔNIBUS', where, stack };
            if (window.GameDebugConsole) window.GameDebugConsole.error(`ERRO NO MINIGAME DO ÔNIBUS | ${where}\n${stack}`);
            console.error('[BUS] ERRO NO MINIGAME DO ÔNIBUS', err);
        }

        isPhase2Waiting() { return this.phase2Waiting; }

        preparePhase2Exit(level, players) {
            this.ensureAssets();
            if (this.phase2Waiting || this.boarding || this.run) return;
            this.phase2Waiting = true;
            this.boardingPoint = Math.max(650, (level?.width || 5000) - 390);
            this.busWorldX = Math.max(700, (level?.width || 5000) - 320); // posição final de parada
            this.busApproachX = Math.max(0, (this.busWorldX - BUS_PHASE_W) - 900); // sprite novo olha para a direita: entra pela esquerda e avança até a parada
            this.phase2BusArrived = false;
            this.phase2BusStopTimer = 0;
            window.soundSystem?.startLoop?.('busEngine', .42);
            this.log('[BUS] Ônibus chegando ao final da Fase 2');
            players.forEach(p => { if (p) p._busReady = false; });
        }

        updatePhase2Waiting(players) {
            if (!this.phase2Waiting) return false;
            const alive = (players || []).filter(p => p && p.life > 0);
            if (!alive.length) return false;
            if(this.phase2ParkHornAt && performance.now()>=this.phase2ParkHornAt){this.phase2ParkHornAt=0;window.soundSystem?.playSound?.('busHorn');}

            // Primeiro, o ônibus entra em cena e estaciona.
            if (!this.phase2BusArrived) {
                const targetDrawX = this.busWorldX - BUS_PHASE_W;
                this.busApproachX += (targetDrawX - this.busApproachX) * 0.12;
                if (Math.abs(this.busApproachX - targetDrawX) < 3) {
                    this.busApproachX = targetDrawX;
                    this.phase2BusArrived = true;
                    this.phase2BusStopTimer = performance.now();
                    window.soundSystem?.playSound?.('busBrake');
                    window.soundSystem?.playSound?.('busArrival');
                    this.phase2ParkHornAt=performance.now()+520;
                    this.log('[BUS] Ônibus estacionou para embarque');
                }
                return false;
            }

            alive.forEach(p => { p._busReady = (p.x + (p.w || 0) * .5) >= this.boardingPoint; });
            if (alive.every(p => p._busReady)) {
                this.phase2Waiting = false;
                window.soundSystem?.stopLoop?.('busEngine');
                this.startBoarding(alive);
                return true;
            }
            return false;
        }

        drawBusFacingRight(ctx, sprite, x, y, w=BUS_W, h=BUS_H) {
            if (!sprite?.complete || !sprite.naturalWidth) return;
            // Os novos sprites do ônibus já foram desenhados com a frente para a direita.
            // Não aplicar flip aqui: isso invertia o ônibus em cutscenes e chegada/saída.
            ctx.save();
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(sprite, x, y, w, h);
            ctx.restore();
        }

        drawPhase2Bus(ctx) {
            if (!this.phase2Waiting) return;
            const moving = !this.phase2BusArrived;
            const img = moving ? this.sprites.arriving : this.sprites.idle;
            const drawX = moving ? this.busApproachX : (this.busWorldX - BUS_PHASE_W);
            this.drawBusFacingRight(ctx, img, drawX, BUS_PHASE_Y, BUS_PHASE_W, BUS_PHASE_H);
            if (moving) {
                this.drawDust(ctx, drawX + 42, 544, 2);
            } else {
                ctx.save();
                ctx.fillStyle = 'rgba(0,0,0,.72)'; ctx.fillRect(this.busWorldX - 285, 400, 260, 38);
                ctx.strokeStyle = '#ffd66b'; ctx.strokeRect(this.busWorldX - 285, 400, 260, 38);
                ctx.fillStyle = '#fff5d6'; ctx.font = 'bold 17px Righteous'; ctx.textAlign='center';
                ctx.fillText('VÁ ATÉ O ÔNIBUS', this.busWorldX - 170, 418);
                ctx.restore();
            }
        }

        startBoarding(players) {
            this.ensureAssets();
            this.boarding = { start:performance.now(), duration:6200, players:players.map((p,i)=>({p, startX:p.x, startY:p.y, index:i})), doorOpenSfx:false, doorCloseSfx:false };
            window.soundSystem?.startLoop?.('busEngine', .45);
            this.log('[BUS] Cutscene de embarque iniciada');
        }

        getBoardingCameraX(level) {
            const bx = this.busWorldX || ((level?.width || 5000) - 320);
            return Math.max(0, Math.min((level?.width || 5000)-W, bx - 700));
        }

        updateDrawBoarding(ctx, level, players) {
            try {
                const b = this.boarding;
                if (!b) return 'MINIGAME';
                const elapsed = performance.now() - b.start;
                const t = Math.min(1, elapsed / b.duration);
                if(t>=.16 && !b.doorOpenSfx){b.doorOpenSfx=true;window.soundSystem?.playSound?.('busDoorOpen');}
                if(t>=.68 && !b.doorCloseSfx){b.doorCloseSfx=true;window.soundSystem?.playSound?.('busDoorClose');}
                const cam = this.getBoardingCameraX(level);
                ctx.save(); ctx.translate(-cam,0);
                level?.drawBackground?.(ctx, cam);
                const bx = this.busWorldX || ((level?.width || 5000)-320);
                let sprite = this.sprites.doorClosed;
                if (t < .16) sprite=this.sprites.idle;
                else if (t < .28) sprite=this.sprites.doorOpening;
                else if (t < .62) sprite=this.sprites.doorOpen;
                else if (t < .73) sprite=this.sprites.doorClosing;
                else sprite=this.sprites.leaving;
                let busX = bx - BUS_PHASE_W;
                if (t > .74) busX += (t-.74)/.26 * 600;
                this.drawBusFacingRight(ctx, sprite, busX, BUS_PHASE_Y, BUS_PHASE_W, BUS_PHASE_H);

                b.players.forEach((entry, i) => {
                    const p = entry.p; const enterStart=.26+i*.07, enterEnd=.57+i*.07;
                    if (t < enterStart) { p.draw?.(ctx); return; }
                    if (t <= enterEnd) {
                        const q=Math.min(1,(t-enterStart)/(enterEnd-enterStart));
                        p.x=entry.startX+(busX+132-entry.startX)*q; p.y=entry.startY+(489-entry.startY)*q;
                        p.draw?.(ctx);
                    }
                });
                if (t > .76) this.drawDust(ctx, busX+54, 535, 3);
                ctx.restore();
                this.drawFade(ctx, t > .88 ? (t-.88)/.12 : 0);
                if (t >= 1) { this.boarding=null; this.startMinigame(false); return 'MINIGAME'; }
                return null;
            } catch (e) { this.reportError(e); return 'ERROR'; }
        }

        startMinigame(bonusMode=false, checkpoint=null) {
            this.ensureAssets();
            this.bonusMode=!!bonusMode;
            const progress = checkpoint ? checkpoint.progress : 0;
            const elapsed = checkpoint ? checkpoint.elapsed : 0;
            const restoredResistance = checkpoint ? Math.max(1, checkpoint.resistance ?? 100) : 100;
            const restoredCollisions = checkpoint ? Math.max(0, checkpoint.collisions ?? 0) : 0;
            const restoredScore = checkpoint ? Math.max(0, checkpoint.score ?? 0) : 0;
            this.run = {
                progress, elapsed, resistance:restoredResistance, lane:checkpoint?.lane ?? 1, targetLane:checkpoint?.lane ?? 1, y:LANES[checkpoint?.lane ?? 1], speed:1, score:restoredScore,
                obstacles:[], items:[], spawnTimer:.6, itemTimer:6, hornCooldown:0, hornText:0,
                invincible:0, turbo:0, collisionFlash:0, collisions:restoredCollisions, checkpointReached:!!checkpoint,
                checkpoint: checkpoint || null, state:'running', stateTimer:0, distanceLabel:'12 km', shake:0,
                roadsideSeed:Math.random()*10000, safeLane:1, safeLaneWaves:0, nextSafeLane:null, safeLaneTransition:0,
                countdown: checkpoint ? .8 : START_COUNTDOWN, collisionGrace:0, laneChangeCooldown:0, warningCooldown:0,
                nearMisses:0, nearMissStreak:0, bestNearMissStreak:0, feedback:[], lastResistanceBand:restoredResistance<=30?2:restoredResistance<=60?1:0,
                cleanTimer:0, speedBonusTimer:0, tripStarted:false
            };
            this.lastTime=performance.now(); this.hornWasDown=false; this.errorMessage=null;
            window.soundSystem?.startLoop?.('busEngine', .44);
            window.soundSystem?.startLoop?.('busRoad', .16);
            window.soundSystem?.stopMusic?.();
            window.soundSystem?.startMusic?.('road');
            window.soundSystem?.playSound?.('busAccelerate');
            this.log('[BUS] Minigame iniciado');
        }

        input(keys, gamepadSystem, controls) {
            const pad=gamepadSystem?.getPadForPlayer?.(1);
            const ax=pad?.axes?.[0]||0, ay=pad?.axes?.[1]||0;
            const action = a => !!controls?.acaoAtiva?.(1,a,keys);
            const keyDown = k => !!keys?.[k];
            return {
                up: action('up') || keyDown('ArrowUp') || keyDown('w') || ay < -.45,
                down: action('dash') || keyDown('ArrowDown') || keyDown('s') || ay > .45,
                left: action('left') || keyDown('ArrowLeft') || keyDown('a') || ax < -.45,
                right: action('right') || keyDown('ArrowRight') || keyDown('d') || ax > .45,
                horn: action('attack') || keyDown('Enter') || keyDown(' ') || !!gamepadSystem?.isActionDown?.(1,'attack')
            };
        }

        updateDrawMinigame(ctx, keys, gamepadSystem, controls) {
            try {
                if (this.errorMessage) { this.drawError(ctx); return 'ERROR'; }
                if (!this.run) this.startMinigame(this.bonusMode);
                const now=performance.now(), dt=Math.min(.034,Math.max(.001,(now-this.lastTime)/1000)); this.lastTime=now;
                const r=this.run;
                if (r.state==='broken') { this.updateBroken(ctx,dt); return null; }
                if (r.state==='finish') { this.updateFinish(ctx,dt); return r.stateTimer>2.8 ? (this.bonusMode?'BONUS_DONE':'ARRIVAL') : null; }
                const inp=this.input(keys,gamepadSystem,controls);
                if(r.countdown>0){
                    r.countdown=Math.max(0,r.countdown-dt);
                    r.speed+=(0-r.speed)*Math.min(1,dt*4.5);
                    this.updateBusAudio(r);
                    this.drawRoadScene(ctx,r);
                    this.drawCountdown(ctx,r);
                    if(r.countdown<=0){r.speed=.72;r.tripStarted=true;window.soundSystem?.playSound?.('busAccelerate');this.pushFeedback('VAI!', '#ffe36b', 1.0);}
                    return null;
                }
                if(inp.right && !r._accelSfx){window.soundSystem?.playSound?.('busAccelerate');r._accelSfx=true;}
                if(!inp.right)r._accelSfx=false;
                if(inp.left && !r._brakeSfx){window.soundSystem?.playSound?.('busBrake');r._brakeSfx=true;}
                if(!inp.left)r._brakeSfx=false;

                if(r.laneChangeCooldown>0)r.laneChangeCooldown-=dt;
                if (inp.up && !r._upLatch && r.laneChangeCooldown<=0) { const oldLane=r.targetLane;r.targetLane=Math.max(0,r.targetLane-1); if(r.targetLane!==oldLane){window.soundSystem?.playSound?.('busLaneChange');r.laneChangeCooldown=.16;} r._upLatch=true; }
                if (!inp.up) r._upLatch=false;
                if (inp.down && !r._downLatch && r.laneChangeCooldown<=0) { const oldLane=r.targetLane;r.targetLane=Math.min(2,r.targetLane+1); if(r.targetLane!==oldLane){window.soundSystem?.playSound?.('busLaneChange');r.laneChangeCooldown=.16;} r._downLatch=true; }
                if (!inp.down) r._downLatch=false;
                r.y += (LANES[r.targetLane]-r.y)*Math.min(1,dt*9.5);
                if(Math.abs(LANES[r.targetLane]-r.y)<1.5){r.y=LANES[r.targetLane];r.lane=r.targetLane;}

                const targetSpeed = inp.left ? .58 : inp.right ? 1.35 : 1.0;
                r.speed += (targetSpeed-r.speed)*Math.min(1,dt*3.1);
                if (r.turbo>0) { r.turbo-=dt; r.speed=Math.max(r.speed,1.55); }
                if (r.invincible>0) r.invincible-=dt;
                if (r.hornCooldown>0) r.hornCooldown-=dt;
                if (r.hornText>0) r.hornText-=dt;
                if (r.collisionFlash>0) r.collisionFlash-=dt;
                if (r.shake>0) r.shake=Math.max(0,r.shake-dt*12);
                if(r.collisionGrace>0)r.collisionGrace-=dt;
                if(r.warningCooldown>0)r.warningCooldown-=dt;
                this.updateFeedback(dt);
                this.updateBusAudio(r);

                if (inp.horn && !this.hornWasDown && r.hornCooldown<=0) this.honk();
                this.hornWasDown=inp.horn;

                r.elapsed += dt;
                r.progress += dt * (COURSE_DISTANCE/78) * r.speed;
                const difficulty=.85+Math.min(1.25,r.progress/100*1.25);
                r.spawnTimer-=dt;
                if(r.spawnTimer<=0){ this.spawnSafePattern(difficulty); r.spawnTimer=Math.max(.62,1.35-difficulty*.22)+Math.random()*.35; }
                r.itemTimer-=dt; if(r.itemTimer<=0){this.spawnItem();r.itemTimer=7+Math.random()*5;}
                this.updateObjects(dt);
                if(!r.checkpointReached && r.progress>=50){r.checkpointReached=true;r.checkpoint={progress:50,elapsed:r.elapsed,resistance:r.resistance,collisions:r.collisions,score:r.score,lane:r.targetLane};window.soundSystem?.playSound?.('busCheckpoint');this.pushFeedback('CHECKPOINT!', '#83f2a0', 1.5);this.log('[BUS] Checkpoint alcançado');}
                if(r.progress>=COURSE_DISTANCE){r.progress=COURSE_DISTANCE;r.state='finish';r.stateTimer=0;this.completeRun();}

                this.drawRoadScene(ctx,r);
                return null;
            } catch(e){ this.reportError(e); this.drawError(ctx); return 'ERROR'; }
        }

        pickObstacleSprite(type) {
            const variants = obstacleVariants[type];
            if (!variants || !variants.length) return type;
            return variants[Math.floor(Math.random() * variants.length)];
        }

        spawnSafePattern(difficulty) {
            const r=this.run;
            // Reserva uma rota segura por várias ondas. Ao trocar de rota, duas
            // faixas ficam livres por duas ondas para dar tempo real de mudança.
            if (r.safeLane == null) { r.safeLane=r.targetLane; r.safeLaneWaves=0; }
            r.safeLaneWaves++;
            if (r.safeLaneWaves>=4 && r.safeLaneTransition<=0 && Math.random()<.42) {
                const candidates=[0,1,2].filter(l=>l!==r.safeLane);
                r.nextSafeLane=candidates[Math.floor(Math.random()*candidates.length)];
                r.safeLaneTransition=2;
                r.safeLaneWaves=0;
            }
            const protectedLanes=[r.safeLane];
            if(r.safeLaneTransition>0 && r.nextSafeLane!=null){
                protectedLanes.push(r.nextSafeLane);
                r.safeLaneTransition--;
                if(r.safeLaneTransition===0){r.safeLane=r.nextSafeLane;r.nextSafeLane=null;}
            }
            const available=[0,1,2].filter(l=>!protectedLanes.includes(l));
            const maxBlocked=Math.min(available.length,difficulty<1.05?1:2);
            const blockedCount=maxBlocked<=1?maxBlocked:(Math.random()<.62?1:2);
            const lanes=available.sort(()=>Math.random()-.5).slice(0,blockedCount);
            lanes.forEach((lane,idx)=>{
                const roll=Math.random(); let type='cone';
                if(roll<.18)type='pothole';else if(roll<.35)type='rock';else if(roll<.68)type='car';else if(roll<.86)type='moto';
                const isCar=type==='car', isMoto=type==='moto', isHole=type==='pothole';
                r.obstacles.push({type,spriteKey:this.pickObstacleSprite(type),lane,x:1060+idx*72,y:LANES[lane],w:isCar?96:isMoto?58:isHole?52:48,h:isCar?50:isMoto?54:isHole?42:48,hit:false,nearMiss:false,drift:isMoto?(Math.random()-.5)*8:0,speedFactor:isCar?(.84+Math.random()*.18):isMoto?(.94+Math.random()*.22):1});
            });
        }

        ensureSafeRoute(){
            const r=this.run;if(!r)return;
            // Defesa adicional: na zona de decisão à frente do ônibus nunca
            // permite três faixas simultaneamente ocupadas.
            const danger=r.obstacles.filter(o=>!o.hit&&!o.removed&&o.x>BUS_X+70&&o.x<BUS_X+430);
            const occupied=new Set(danger.map(o=>o.lane));
            if(occupied.size<3)return;
            const preferred=[r.targetLane,r.lane,r.safeLane,1,0,2].find(l=>l!=null&&occupied.has(l));
            const candidates=danger.filter(o=>o.lane===preferred).sort((a,b)=>a.x-b.x);
            if(candidates[0]){candidates[0].removed=true;this.log('[BUS] Rota segura corrigida automaticamente');}
        }

        spawnItem(){const r=this.run;let types=r.resistance<45?['repair','repair','money','star','turbo']:r.progress>65?['repair','money','money','star','turbo','turbo']:['repair','money','money','star','turbo'];const type=types[Math.floor(Math.random()*types.length)];const preferred=[r.safeLane,r.targetLane,0,1,2].filter((v,i,a)=>v!=null&&a.indexOf(v)===i);const lane=preferred[Math.floor(Math.random()*Math.min(2,preferred.length))]??Math.floor(Math.random()*3);r.items.push({type,lane,x:1100,y:LANES[lane],w:42,h:42,collected:false,pulse:Math.random()*6.28});}

        updateObjects(dt){
            const r=this.run; const worldSpeed=310*r.speed;
            r.obstacles.forEach(o=>{o.x-=worldSpeed*dt*(o.speedFactor||1); if(o.type==='moto')o.y+=Math.sin(r.elapsed*3+o.x*.01)*o.drift*dt;});
            this.ensureSafeRoute();
            r.items.forEach(i=>i.x-=worldSpeed*dt);
            const busBox={x:BUS_X+25,y:r.y-BUS_H/2+25,w:142,h:55};
            r.obstacles.forEach(o=>{
                if(o.hit)return;
                const box={x:o.x,y:o.y-o.h/2,w:o.w,h:o.h};
                if(this.rects(busBox,box)){o.hit=true;this.collide(o.type);return;}
                if(!o.nearMiss && o.x<NEAR_MISS_X && o.x+o.w>BUS_X-8){
                    const laneGap=Math.abs((o.y)-(r.y));
                    if(laneGap>BUS_H*.48 && laneGap<118){o.nearMiss=true;this.nearMiss();}
                }
            });
            r.items.forEach(i=>{if(i.collected)return;const box={x:i.x,y:i.y-i.h/2,w:i.w,h:i.h};if(this.rects(busBox,box)){i.collected=true;this.collect(i.type);}});
            r.obstacles=r.obstacles.filter(o=>o.x>-100&&!o.removed); r.items=r.items.filter(i=>i.x>-80&&!i.collected);
        }

        collide(type){
            const r=this.run;if(r.invincible>0||r.collisionGrace>0)return;
            const damage={cone:2,pothole:6,rock:10,car:15,moto:9}[type]||5;
            r.resistance=Math.max(0,r.resistance-damage);r.collisions++;r.nearMissStreak=0;r.speed=Math.max(.45,r.speed*.60);r.collisionFlash=.38;r.shake=8;r.collisionGrace=COLLISION_GRACE;
            window.soundSystem?.playSound?.('busCollision');
            this.pushFeedback(`-${damage} RESISTÊNCIA`, '#ff716a', 1.25);
            this.log(`[BUS] Colisão: ${type} -${damage}`);
            window.gamepadSystem?.rumble?.(1,170,.62,.34);
            const band=r.resistance<=30?2:r.resistance<=60?1:0;
            if(band>r.lastResistanceBand){r.lastResistanceBand=band;window.soundSystem?.playSound?.('busWarning');this.pushFeedback(band===2?'ÔNIBUS MUITO DANIFICADO!':'ÔNIBUS DANIFICADO!', '#ffd36d', 1.8);}
            if(r.resistance<=0){r.state='broken';r.stateTimer=0;window.soundSystem?.stopLoop?.('busEngine');window.soundSystem?.stopLoop?.('busRoad');window.soundSystem?.stopMusic?.();window.soundSystem?.playSound?.('busBroken');}
        }

        collect(type){
            const r=this.run;
            if(type==='repair'){const before=r.resistance;r.resistance=Math.min(100,r.resistance+24);r.lastResistanceBand=r.resistance<=30?2:r.resistance<=60?1:0;window.soundSystem?.playSound?.('busRepair');this.pushFeedback(`REPARO +${Math.round(r.resistance-before)}`, '#7df39a', 1.3);}
            else if(type==='money'){r.score+=250;window.soundSystem?.playSound?.('busMoney');this.pushFeedback('+250', '#ffe36b', 1.0);}
            else if(type==='star'){r.invincible=5.5;window.soundSystem?.playSound?.('busStar');this.pushFeedback('INVENCÍVEL!', '#b7efff', 1.35);}
            else if(type==='turbo'){r.turbo=4.5;window.soundSystem?.playSound?.('busTurbo');this.pushFeedback('TURBO!', '#ffb657', 1.35);}
        }

        nearMiss(){const r=this.run;r.nearMisses++;r.nearMissStreak++;r.bestNearMissStreak=Math.max(r.bestNearMissStreak,r.nearMissStreak);const pts=75+Math.min(225,(r.nearMissStreak-1)*25);r.score+=pts;window.soundSystem?.playSound?.('busNearMiss');this.pushFeedback(`QUASE! +${pts}`, '#8fe7ff', .9);}

        honk(){
            const r=this.run;r.hornCooldown=2;r.hornText=.8;let affected=0;window.soundSystem?.playSound?.('busHorn');
            r.obstacles.forEach(o=>{
                if(!(o.x>BUS_X+120&&o.x<BUS_X+430&&(o.type==='cone'||o.type==='moto'||o.type==='car')))return;
                if(o.type==='cone'||o.type==='moto'){o.removed=true;affected++;return;}
                const occupied=new Set(r.obstacles.filter(x=>x!==o&&!x.removed&&!x.hit&&Math.abs(x.x-o.x)<150).map(x=>x.lane));
                const candidates=[r.safeLane,0,1,2].filter((l,i,a)=>l!=null&&a.indexOf(l)===i&&l!==o.lane&&!occupied.has(l)&&l!==r.targetLane);
                if(candidates.length){o.lane=candidates[0];o.y=LANES[o.lane];affected++;}
                else { o.x += 180; o.vx = 0; } // sem faixa segura: recua em vez de cortar o jogador
            });
            this.ensureSafeRoute();
            r.score+=affected*100;
        }

        updateBusAudio(r){
            const ss=window.soundSystem;if(!ss)return;
            const rate=.78+Math.max(.25,r.speed)*.28+(r.turbo>0?.12:0);
            ss.setLoopParams?.('busEngine',rate,.34+Math.min(.18,r.speed*.08));
            ss.setLoopParams?.('busRoad',.88+Math.min(.35,r.speed*.18),.10+Math.min(.12,r.speed*.055));
        }

        pushFeedback(text,color='#fff',duration=1.1){const r=this.run;if(!r)return;r.feedback=r.feedback||[];r.feedback.push({text,color,duration,time:duration});if(r.feedback.length>5)r.feedback.shift();}
        updateFeedback(dt){const r=this.run;if(!r?.feedback)return;r.feedback.forEach(f=>f.time-=dt);r.feedback=r.feedback.filter(f=>f.time>0);}
        drawFeedback(ctx,r){if(!r.feedback?.length)return;ctx.save();ctx.textAlign='center';r.feedback.slice(-3).forEach((f,i)=>{const a=Math.min(1,f.time/.25);ctx.globalAlpha=Math.max(.15,a);ctx.fillStyle=f.color;ctx.font=`bold ${i===r.feedback.slice(-3).length-1?24:17}px Righteous`;ctx.fillText(f.text,500,205+i*30);});ctx.restore();}
        drawCountdown(ctx,r){const left=r.countdown;let text='';if(left>1.8)text='3';else if(left>1.2)text='2';else if(left>.6)text='1';else text='VAI!';ctx.save();ctx.fillStyle='rgba(0,0,0,.42)';ctx.fillRect(0,0,W,H);ctx.shadowBlur=22;ctx.shadowColor='#ffcf5a';ctx.fillStyle='#fff2bd';ctx.font='bold 104px Bebas Neue';ctx.textAlign='center';ctx.fillText(text,500,350);ctx.shadowBlur=0;ctx.font='16px Righteous';ctx.fillStyle='#8fe7ff';ctx.fillText('↑↓ TROCAR FAIXA   •   ← FREAR   •   → ACELERAR   •   ATAQUE BUZINAR',500,405);ctx.restore();}

        updateBroken(ctx,dt){const r=this.run;r.stateTimer+=dt;this.drawRoadScene(ctx,r);ctx.save();ctx.fillStyle='rgba(0,0,0,.62)';ctx.fillRect(0,0,W,H);ctx.fillStyle='#ffdb6f';ctx.font='bold 54px Bebas Neue';ctx.textAlign='center';ctx.fillText('ÔNIBUS QUEBROU!',500,300);ctx.fillStyle='#fff';ctx.font='20px Righteous';ctx.fillText(r.checkpointReached?'Reiniciando do checkpoint...':'Reiniciando o percurso...',500,342);ctx.restore();if(r.stateTimer>2.2){const cp=r.checkpointReached?r.checkpoint:null;this.startMinigame(this.bonusMode,cp);}}
        updateFinish(ctx,dt){const r=this.run;r.stateTimer+=dt;this.drawRoadScene(ctx,r,true);this.drawFade(ctx,Math.max(0,(r.stateTimer-1.7)/1.1));}

        completeRun(){
            const r=this.run;window.soundSystem?.stopLoop?.('busEngine');window.soundSystem?.stopLoop?.('busRoad');window.soundSystem?.stopMusic?.();window.soundSystem?.playSound?.('busArrival');this.log('[BUS] Minigame concluído');
            const save=window.saveSystem; if(save?.recordBusResult) save.recordBusResult({time:r.elapsed,resistance:r.resistance,noCollision:r.collisions===0});
            if(window.trophySystem){
                const ts=window.trophySystem;ts.stats.busCompleted=Math.max(1,ts.stats.busCompleted||0);ts.stats.busBestResistance=Math.max(ts.stats.busBestResistance||0,r.resistance);ts.stats.busNoCollision=!!(ts.stats.busNoCollision||r.collisions===0);ts.stats.busBestTime=Math.min(Number.isFinite(ts.stats.busBestTime)?ts.stats.busBestTime:Infinity,r.elapsed);ts.checkTrophies();ts.saveProgress();
            }
            window.refreshMenuOptions?.();
        }

        startArrival(players){
            this.ensureAssets();this.arrival={start:performance.now(),duration:6500,players:(players||[]).map((p,i)=>({p,index:i})),doorOpenSfx:false,doorCloseSfx:false,brakeSfx:false,leaveSfx:false};window.soundSystem?.startLoop?.('busEngine',.42);this.log('[BUS] Iniciando Fase 3');}

        updateDrawArrival(ctx, level, players){
            try{
                if(!this.arrival)this.startArrival(players);const a=this.arrival;const t=Math.min(1,(performance.now()-a.start)/a.duration);
                if(t>=.27&&!a.brakeSfx){a.brakeSfx=true;window.soundSystem?.playSound?.('busBrake');}
                if(t>=.38&&!a.doorOpenSfx){a.doorOpenSfx=true;window.soundSystem?.playSound?.('busDoorOpen');}
                if(t>=.68&&!a.doorCloseSfx){a.doorCloseSfx=true;window.soundSystem?.playSound?.('busDoorClose');}
                if(t>=.74&&!a.leaveSfx){a.leaveSfx=true;window.soundSystem?.playSound?.('busAccelerate');}
                level?.drawBackground?.(ctx,0);
                let bx=-BUS_PHASE_W+Math.min(1,t/.28)*500; if(t>.72)bx=308+(t-.72)/.28*620;
                let spr=t<.24?this.sprites.arriving:t<.38?this.sprites.braking:t<.48?this.sprites.doorOpening:t<.67?this.sprites.doorOpen:t<.73?this.sprites.doorClosing:this.sprites.leaving;
                this.drawBusFacingRight(ctx, spr, bx, BUS_PHASE_Y, BUS_PHASE_W, BUS_PHASE_H);
                a.players.forEach((entry,i)=>{const p=entry.p;const s=.49+i*.055,e=.64+i*.055;if(t<s)return;const q=Math.min(1,(t-s)/(e-s));p.x=365+i*60+q*70;p.y=455;p.draw?.(ctx);});
                if(t>.76)this.drawDust(ctx,bx+58,535,3);
                this.drawFade(ctx,t<.08?1-t/.08:0);
                if(t>=1){window.soundSystem?.stopLoop?.('busEngine');this.arrival=null;return 'DONE';}return null;
            }catch(e){this.reportError(e);this.drawError(ctx);return 'ERROR';}
        }

        drawRunBackground(ctx, r){
            const bg = this.runBackground;
            if (bg?.complete && bg.naturalWidth) {
                // O panorama serve SOMENTE como cenário do deserto. A estrada do
                // minigame precisa continuar sendo desenhada pelo jogo, pois é ela
                // que define visualmente as 3 faixas usadas pela lógica/colisões.
                const srcW = Math.max(1000, Math.min(bg.naturalWidth, Math.floor(bg.naturalWidth / 5)));
                const maxX = Math.max(0, bg.naturalWidth - srcW);
                const srcX = Math.max(0, Math.min(maxX, Math.floor((r.progress / 100) * maxX)));
                const scenicSrcH = Math.max(1, Math.floor(bg.naturalHeight * 0.58));
                ctx.drawImage(bg, srcX, 0, srcW, scenicSrcH, 0, 0, W, 305);
                return true;
            }
            return false;
        }

        drawThreeLaneRoad(ctx, r){
            // Transição do deserto para o asfalto em estilo 16-bit.
            ctx.fillStyle='#91663f';
            ctx.fillRect(0,285,W,10);
            ctx.fillStyle='#e1bf82';
            ctx.fillRect(0,295,W,10);

            // Pista física do bônus: continua alinhada às LANES [335, 430, 525].
            ctx.fillStyle='#d9c8ad';
            ctx.fillRect(0,305,W,8);
            ctx.fillRect(0,582,W,8);
            ctx.fillStyle='#a39279';
            for(let x=0;x<W;x+=16){
                ctx.fillRect(x,308,8,2);
                ctx.fillRect(x+4,585,8,2);
            }

            // Asfalto principal em blocos retro.
            ctx.fillStyle='#44464f';
            ctx.fillRect(0,313,W,269);
            ctx.fillStyle='#4d505a';
            for(let y=313;y<582;y+=18){
                for(let x=((y/18)%2)*12;x<W;x+=24){
                    ctx.fillRect(x,y,10,2);
                }
            }
            ctx.fillStyle='#3a3c44';
            for(let y=322;y<575;y+=24) ctx.fillRect(0,y,W,2);

            // Linhas divisórias das 3 pistas em pixel-art.
            const dashOff=(r.elapsed*265*r.speed)%112;
            ctx.fillStyle='#f7ebc7';
            for(const y of [382,477]){
                for(let x=-112;x<W+112;x+=112){
                    ctx.fillRect(x-dashOff,y,60,8);
                    ctx.fillRect(x-dashOff+2,y+1,56,2);
                }
            }

            // Linhas laterais contínuas.
            ctx.fillStyle='#f0e0ba';
            ctx.fillRect(0,314,W,3);
            ctx.fillRect(0,578,W,3);

            // Pequenos elementos no acostamento; nunca entram nas 3 faixas.
            const roadOff=(r.elapsed*120*r.speed)%220;
            for(let x=-220;x<W+220;x+=220){
                const px=x-roadOff;
                ctx.fillStyle='#356b3c';
                ctx.fillRect(px,266,9,28);
                ctx.fillRect(px-8,276,10,6);
                ctx.fillRect(px+7,281,10,6);
                ctx.fillStyle='#5c452f';
                ctx.fillRect(px+125,270,5,24);
            }
            this.drawRoadSign(ctx,840-roadOff*.3,214,r.progress>88?'LAS VEGAS':'ROUTE 66');
        }

        drawRoadScene(ctx,r,finishing=false){
            const sx=r.shake?(Math.random()-.5)*r.shake:0, sy=r.shake?(Math.random()-.5)*r.shake*.5:0;ctx.save();ctx.translate(sx,sy);
            if(!this.drawRunBackground(ctx,r)){
                const grad=ctx.createLinearGradient(0,0,0,305);grad.addColorStop(0,'#4d78a8');grad.addColorStop(.65,'#e4aa61');grad.addColorStop(1,'#c98b50');ctx.fillStyle=grad;ctx.fillRect(-20,-20,W+40,325);
                const off1=(r.progress*8)%360;ctx.fillStyle='#9c684e';for(let x=-360;x<W+360;x+=360){ctx.beginPath();ctx.moveTo(x-off1,300);ctx.lineTo(x+130-off1,145);ctx.lineTo(x+280-off1,300);ctx.fill();}
                const off2=(r.progress*18)%260;ctx.fillStyle='#c88a55';for(let x=-260;x<W+260;x+=260){ctx.beginPath();ctx.moveTo(x-off2,305);ctx.lineTo(x+100-off2,220);ctx.lineTo(x+220-off2,305);ctx.fill();}
            }
            this.drawThreeLaneRoad(ctx,r);
            // objects
            r.items.forEach(i=>{const img=this.itemSprites[i.type];if(img?.complete&&img.naturalWidth){const pulse=1+Math.sin(r.elapsed*6+(i.pulse||0))*.07;const w=i.w*pulse,h=i.h*pulse;ctx.save();ctx.globalAlpha=.96;ctx.drawImage(img,i.x-(w-i.w)/2,i.y-h/2,w,h);ctx.restore();}});
            r.obstacles.forEach(o=>{const img=this.obstacleSprites[o.spriteKey]||this.obstacleSprites[o.type];if(img?.complete&&img.naturalWidth)ctx.drawImage(img,o.x,o.y-o.h/2,o.w,o.h);});
            // ônibus: usa os novos quadros da sprite sheet, incluindo dois frames de rodagem
            // e inclinações diferentes ao trocar de faixa para dar mais vida ao movimento.
            let spr=(Math.floor(r.elapsed*8)%2===0 ? this.sprites.moving : this.sprites.moving2);
            if(r.collisionFlash>0)spr=this.sprites.collision;
            else if(r.resistance<=30)spr=this.sprites.critical;
            else if(r.resistance<=60)spr=this.sprites.damaged;
            else if(r.turbo>0||r.speed>1.2)spr=this.sprites.accelerating;
            else if(r.speed<.75)spr=this.sprites.braking;
            else {
                const laneDelta=LANES[r.targetLane]-r.y;
                if(Math.abs(laneDelta)>4)spr=laneDelta<0?(this.sprites.turningUp||this.sprites.turning):(this.sprites.turningDown||this.sprites.turning);
            }
            ctx.save();ctx.imageSmoothingEnabled=false;if(r.invincible>0&&Math.floor(r.elapsed*10)%2===0)ctx.globalAlpha=.55;if(spr?.complete&&spr.naturalWidth)ctx.drawImage(spr,BUS_X,r.y-BUS_H/2,BUS_W,BUS_H);ctx.restore();
            if(r.speed>1.18)this.drawDust(ctx,BUS_X+28,r.y+44,2);
            ctx.restore();
            this.drawBusHUD(ctx,r,finishing);
            this.drawFeedback(ctx,r);
        }

        drawBusHUD(ctx,r,finishing){
            ctx.save();ctx.fillStyle='rgba(10,13,18,.82)';ctx.fillRect(18,16,964,82);ctx.strokeStyle='#e6c26b';ctx.lineWidth=2;ctx.strokeRect(18,16,964,82);
            ctx.fillStyle='#fff4d8';ctx.font='bold 22px Righteous';ctx.textAlign='left';ctx.fillText(`ÔNIBUS ❤️ ${Math.ceil(r.resistance)}`,36,48);
            ctx.fillStyle='#30252a';ctx.fillRect(36,60,260,15);ctx.fillStyle=r.resistance>50?'#65d86e':r.resistance>25?'#f0b34f':'#e35c54';ctx.fillRect(36,60,260*r.resistance/100,15);
            const remaining=Math.max(0,12*(1-r.progress/100));const label=r.progress>=99?'VEGAS!':remaining>8?'12 km':remaining>4?'8 km':remaining>1?'4 km':'1 km';
            ctx.textAlign='center';ctx.fillStyle='#ffda6a';ctx.font='bold 18px Righteous';ctx.fillText('DISTÂNCIA ATÉ VEGAS',515,43);ctx.fillStyle='#fff';ctx.font='bold 26px Bebas Neue';ctx.fillText(label,515,72);
            ctx.textAlign='right';ctx.fillStyle='#8fe7ff';ctx.font='16px Righteous';ctx.fillText(`PONTOS ${r.score}`,960,39);ctx.fillStyle=r.hornCooldown<=0?'#ffd66b':'#a59b89';ctx.fillText(r.hornCooldown<=0?'BUZINA PRONTA':`BUZINA ${r.hornCooldown.toFixed(1)}s`,960,62);ctx.fillStyle='#c6d5e7';ctx.font='12px Righteous';ctx.fillText(`${Math.round(r.speed*92)} km/h  •  QUASE ${r.nearMisses}`,960,84);
            ctx.fillStyle='rgba(255,255,255,.13)';ctx.fillRect(348,84,334,7);ctx.fillStyle='#66d6ff';ctx.fillRect(348,84,334*(r.progress/100),7);
            if(r.hornText>0){ctx.textAlign='center';ctx.fillStyle='#fff36c';ctx.font='bold 34px Permanent Marker';ctx.fillText('BEEP! BEEP!',500,145);}
            if(r.checkpointReached){ctx.textAlign='left';ctx.fillStyle='#87e7a0';ctx.font='14px Righteous';ctx.fillText('CHECKPOINT ✓',36,92);}
            if(finishing){const rank=r.resistance>=85&&r.collisions<=2?'S':r.resistance>=65?'A':r.resistance>=40?'B':'C';ctx.textAlign='center';ctx.fillStyle='#fff3b0';ctx.font='bold 50px Bebas Neue';ctx.fillText('VEGAS!',500,170);ctx.font='16px Righteous';ctx.fillStyle='#fff';ctx.fillText(`TEMPO ${r.elapsed.toFixed(1)}s  •  RESISTÊNCIA ${Math.ceil(r.resistance)}%  •  COLISÕES ${r.collisions}  •  RANK ${rank}`,500,198);}
            ctx.restore();
        }

        drawRoadSign(ctx,x,y,text){ctx.save();ctx.fillStyle='#59422c';ctx.fillRect(x+38,y+48,8,75);ctx.fillStyle='#f3ead2';ctx.strokeStyle='#463a2d';ctx.lineWidth=4;ctx.fillRect(x,y,84,55);ctx.strokeRect(x,y,84,55);ctx.fillStyle='#332d27';ctx.font='bold 13px Righteous';ctx.textAlign='center';ctx.fillText(text,x+42,y+32);ctx.restore();}
        drawDust(ctx,x,y,count){ctx.save();for(let i=0;i<count;i++){ctx.globalAlpha=.28-i*.05;ctx.fillStyle='#d7b178';ctx.fillRect(x-i*10,y-i*2,7+i*2,4+i);}ctx.restore();}
        drawFade(ctx,a){if(a<=0)return;ctx.save();ctx.fillStyle=`rgba(0,0,0,${Math.max(0,Math.min(1,a))})`;ctx.fillRect(0,0,W,H);ctx.restore();}
        drawError(ctx){const e=this.errorMessage;if(!e)return;ctx.save();ctx.fillStyle='rgba(20,0,0,.94)';ctx.fillRect(0,0,W,H);ctx.fillStyle='#ff6f6f';ctx.font='bold 42px Bebas Neue';ctx.textAlign='center';ctx.fillText(e.title,500,240);ctx.fillStyle='#fff';ctx.font='18px Consolas';ctx.fillText(e.where,500,285);ctx.font='13px Consolas';ctx.fillText('O save existente foi preservado.',500,325);ctx.restore();}
        rects(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;}
        getSpeedrunTarget(){return SPEEDRUN_TARGET;}
    }

    window.BusSequenceController = BusSequenceController;
    window.busSequence = new BusSequenceController();
})();
