/**
 * Sistema de XP e Evolução de Personagem
 * O jogador ganha XP matando inimigos e sobe de nível
 */

const EVOLUTION_VERSION = 3;
const CHARACTER_GROWTH = {
    'João': {
        maxLife: 10,
        meleeDamagePerLevel: 0.65,
        rangedDamagePerLevel: 0.018,
        speed: 0.045,
        defense: 0.70,
        rangedXpBonus: 0.15,
        comboXpBonus: 0.006
    },
    'Crist': {
        maxLife: 12,
        meleeDamagePerLevel: 0.85,
        rangedDamagePerLevel: 0,
        speed: 0.035,
        defense: 1.05,
        rangedXpBonus: 0,
        comboXpBonus: 0.018
    },

    'Chico Fumaça': {
        maxLife: 14,
        meleeDamagePerLevel: 0.95,
        rangedDamagePerLevel: 0,
        speed: 0.03,
        defense: 1.15,
        rangedXpBonus: 0,
        comboXpBonus: 0.012
    },
};

class PlayerEvolution {
    constructor(player) {
        this.player = player;
        this.version = EVOLUTION_VERSION;
        this.level = 1;
        this.xp = 0;
        this.maxLevel = 50;
        this.profile = CHARACTER_GROWTH[player.name] || CHARACTER_GROWTH['João'];
        this.xpToNextLevel = this.getXPRequirement(1);
        this.totalXpEarned = 0;
        this.killStats = { melee:0, ranged:0, assist:0, boss:0 };
        
        // Stats base do personagem
        this.baseStats = {
            maxLife: player.maxLife,
            attackDamage: player.attackDamage || 20,
            speed: player.speed || 5,
            defense: 0
        };
        
        // Crescimento próprio de cada personagem. João favorece tiro/mobilidade;
        // Crist favorece resistência e dano corpo a corpo.
        this.growthRates = {
            maxLife: this.profile.maxLife,
            attackDamage: this.profile.meleeDamagePerLevel,
            speed: this.profile.speed,
            defense: this.profile.defense
        };
        
        // Skills desbloqueadas
        this.unlockedSkills = [];
        this.skillTree = [
            { level: 3,  name: 'Combo Duplo',    description: 'Ataque combo faz 2 hits' },
            { level: 7,  name: 'Dash Mortal',     description: 'Dash causa dano' },
            { level: 10, name: 'Regeneração',     description: 'Regenera 1 HP a cada 5 segundos' },
            { level: 12, name: 'Impacto Sônico',  description: 'Ataques derrubam inimigos fracos' },
            { level: 14, name: 'Fúria',           description: '+50% dano quando HP < 30%' },
            { level: 16, name: 'Aura Protetora',  description: 'Reduz dano recebido em 15%' },
            { level: 18, name: 'Escudo',          description: 'Bloqueia próximo hit a cada 8s' },
            { level: 20, name: 'Super Força',     description: 'Ataque causa knockback extra' },
            { level: 22, name: 'Reflexos',        description: '25% chance de evasão' },
            { level: 25, name: 'Vampirismo',      description: 'Recupera 5% da vida ao matar' },
            { level: 28, name: 'Combo Triplo',    description: 'Ataque combo faz 3 hits' },
            { level: 30, name: 'Explosão de Combo',description: 'Combos acima de 10x causam onda de choque' },
            { level: 35, name: 'Dash Infinito',   description: 'Cooldown do dash reduzido em 60%' },
            { level: 40, name: 'Imortal',         description: 'Revive 1x por fase com 50% HP' },
            { level: 45, name: 'Modo Berserker',  description: '+100% velocidade de ataque' },
            { level: 50, name: 'LENDÁRIO',        description: 'Todos os stats x2 - Você chegou ao topo' }
        ];
        
        this.lastRegenTime = 0;
        this.lastShieldTime = 0;
        this.hasRevived = false;
        this.shieldActive = false;
    }
    
    /**
     * Adiciona XP e verifica se subiu de nível
     */
    getXPRequirement(level = this.level) {
        // Curva determinística: cresce de forma suave no início e mais forte no fim.
        // Mantém os gates das fases 7/8 alcançáveis sem grind excessivo.
        const n = Math.max(0, level - 1);
        return Math.max(100, Math.round(100 + 20 * n + 5 * Math.pow(n, 1.5)));
    }

    getXPMultiplier(context = {}) {
        let mult = 1;
        if (context.assist) mult *= 1.0; // o valor de assist já chega reduzido pelo distribuidor.
        if (this.player.name === 'João' && context.ranged) mult += this.profile.rangedXpBonus;
        if (this.player.name === 'Crist' && context.melee) {
            mult += Math.min(0.20, Math.max(0, Number(context.combo) || 0) * this.profile.comboXpBonus);
        }
        // Catch-up leve no multiplayer: evita que o segundo personagem fique inutilizável.
        const team = window.players || [];
        const highest = team.reduce((m,p)=>Math.max(m,p?.evolution?.level||1),1);
        if (highest - this.level >= 3) mult += 0.15;
        return Math.max(0.25, mult);
    }

    addXP(amount, context = {}) {
        if (this.level >= this.maxLevel) return 0;
        const raw = Math.max(0, Number(amount) || 0);
        if (!raw) return 0;
        const gained = Math.max(1, Math.round(raw * this.getXPMultiplier(context)));
        this.xp += gained;
        this.totalXpEarned += gained;
        if (context.assist) this.killStats.assist++;
        else if (context.ranged) this.killStats.ranged++;
        else if (context.melee) this.killStats.melee++;
        if (context.boss) this.killStats.boss++;

        while (this.xp >= this.xpToNextLevel && this.level < this.maxLevel) {
            this.levelUp();
        }
        this.persistSoon();
        return gained;
    }

    persistSoon() {
        clearTimeout(this._saveTimer);
        this._saveTimer = setTimeout(() => {
            try { window.saveSystem?.savePlayerProgress?.(this.player.name, this.save()); } catch (_) {}
        }, 250);
    }

    getMeleeDamageBonus() {
        return Math.max(0, (this.level - 1) * this.profile.meleeDamagePerLevel);
    }

    getRangedDamageMultiplier() {
        return 1 + Math.max(0, this.level - 1) * this.profile.rangedDamagePerLevel;
    }

    /**
     * Sobe de nível e melhora stats
     */
    levelUp() {
        this.level++;
        this.xp -= this.xpToNextLevel;
        this.xpToNextLevel = this.getXPRequirement(this.level);
        
        // Aumentar stats sem transformar level-up em cura completa explorável.
        const oldMaxLife = this.player.maxLife;
        this.player.maxLife += this.growthRates.maxLife;
        const levelHeal = Math.max(this.growthRates.maxLife, Math.round(this.player.maxLife * 0.25));
        this.player.life = Math.min(this.player.maxLife, this.player.life + levelHeal);
        
        // Remover invulnerabilidade se tiver (para evitar bugs)
        if (this.player.invulnerable) {
            this.player.invulnerable = 0;
            this.player.invulnerableTimer = 0;
        }
        
        // O dano é calculado dinamicamente por getMeleeDamageBonus/getRangedDamageMultiplier,
        // evitando stats que existiam no save mas não eram usados pelo combate real.
        this.player.speed += this.growthRates.speed;
        
        // Verificar skills desbloqueadas
        const newSkills = this.skillTree.filter(skill => 
            skill.level === this.level && !this.unlockedSkills.includes(skill.name)
        );
        
        newSkills.forEach(skill => {
            this.unlockedSkills.push(skill.name);
            this.applySkill(skill);
        });
        
        // Efeitos visuais e sonoros
        if (window.particles) {
            window.particles.explosion(this.player.x + this.player.w/2, this.player.y + this.player.h/2, 30, {
                color: '#ffd700',
                speed: 6,
                size: 5
            });
            window.particles.createText(this.player.x + this.player.w/2, this.player.y - 30, 
                'LEVEL UP!', '#ffd700', { size: 32, maxLife: 120 });
        }
        
        if (window.soundSystem) {
            window.soundSystem.playSound('levelUp');
        }
        
        // Notificar evento
        if (window.eventBus) {
            window.eventBus.emit('player:levelup', {
                level: this.level,
                player: this.player,
                newSkills: newSkills
            });
        }
        
        return newSkills;
    }
    
    /**
     * Aplica efeito de skill desbloqueada
     */
    applySkill(skill) {
        // Flags explícitas consumidas pelo combate. Evita skills “só de descrição”.
        switch(skill.name) {
            case 'Combo Duplo':
                this.player._comboDouble = true;
                break;
            case 'Dash Mortal':
                this.player._dashDamage = true;
                break;
            case 'Impacto Sônico':
                this.player._sonicImpact = true;
                break;
            case 'Fúria':
                this.player._fury = true;
                break;
            case 'Aura Protetora':
                this.player._auraProtection = true;
                break;
            case 'Escudo':
                this.player._shieldSkill = true;
                break;
            case 'Super Força':
                this.player._superStrength = true;
                break;
            case 'Reflexos':
                this.player._reflexes = true;
                break;
            case 'Vampirismo':
                this.player._vampirism = true;
                break;
            case 'Combo Triplo':
                this.player._comboTriple = true;
                break;
            case 'Explosão de Combo':
                this.player._comboExplosion = true;
                break;
            case 'Dash Infinito':
                this.player._dashCooldownMultiplier = 0.4; // -60% cooldown, duração intacta
                break;
            case 'Imortal':
                this.player._immortalSkill = true;
                break;
            case 'Modo Berserker':
                this.player._berserkerMode = true;
                break;
            case 'LENDÁRIO':
                this.player._legendary = true;
                // Vida e velocidade são stats visíveis e devem refletir o desbloqueio.
                if (!this.player._legendaryStatsApplied) {
                    this.player._legendaryStatsApplied = true;
                    this.player.maxLife *= 2;
                    this.player.life = Math.min(this.player.maxLife, Math.max(this.player.life * 2, this.player.maxLife));
                    this.player.speed *= 2;
                }
                break;
        }
    }

    getComboHitCount() {
        if (this.hasSkill('Combo Triplo')) return 3;
        if (this.hasSkill('Combo Duplo')) return 2;
        return 1;
    }

    getOutgoingDamageMultiplier() {
        let mult = 1;
        if (this.hasSkill('Fúria') && this.player.life > 0 && this.player.life / Math.max(1, this.player.maxLife) < 0.30) mult *= 1.5;
        if (this.hasSkill('LENDÁRIO')) mult *= 2;
        return mult;
    }

    getAttackCooldown(base = 20) {
        let value = Math.max(1, Number(base) || 20);
        if (this.hasSkill('Modo Berserker')) value *= 0.5; // +100% velocidade de ataque
        return Math.max(4, Math.round(value));
    }

    getDashCooldown(base = 60) {
        const mult = this.hasSkill('Dash Infinito') ? 0.4 : 1;
        return Math.max(8, Math.round((Number(base) || 60) * mult));
    }

    getKnockbackBonus() {
        return this.hasSkill('Super Força') ? 38 : 0;
    }

    isWeakEnemy(enemy) {
        if (!enemy || enemy.isBoss || enemy.isBossMinion) return false;
        const type = String(enemy.type || enemy.name || '').toLowerCase();
        if (/(tank|strong|berserker|elite|assassin|engineer|shadow|god)/.test(type)) return false;
        const maxLife = Number(enemy.maxLife || enemy.life || 0);
        return maxLife <= 180;
    }

    shouldSonicKnockdown(enemy) {
        return this.hasSkill('Impacto Sônico') && this.isWeakEnemy(enemy);
    }

    shouldTriggerComboExplosion(combo) {
        if (!this.hasSkill('Explosão de Combo') || combo < 10) return false;
        // Uma onda a cada marco de 5 hits: 10x, 15x, 20x... sem disparar todo frame.
        const mark = Math.floor(combo / 5) * 5;
        if (mark < 10 || this._lastComboExplosionMark === mark) return false;
        this._lastComboExplosionMark = mark;
        return true;
    }

    /**
     * Verifica se tem uma skill específica
     */
    hasSkill(skillName) {
        return this.unlockedSkills.includes(skillName);
    }
    
    /**
     * Calcula redução de dano baseada em defesa
     */
    calculateDamageReduction(damage) {
        let defensePercent = Math.min((this.level - 1) * this.growthRates.defense, 45);
        if (this.hasSkill('Aura Protetora')) defensePercent += 15;
        if (this.hasSkill('LENDÁRIO')) defensePercent += 10;
        defensePercent = Math.min(defensePercent, 70);
        const reduction = damage * (defensePercent / 100);
        return Math.max(1, damage - reduction);
    }
    
    /**
     * Tenta evasão (Skill: Reflexos)
     */
    tryEvade() {
        if (this.hasSkill('Reflexos')) {
            return Math.random() < 0.25; // 25% chance
        }
        return false;
    }
    
    /**
     * Ativa escudo se disponível (Skill: Escudo)
     */
    tryShield() {
        if (this.hasSkill('Escudo')) {
            const now = Date.now();
            if (now - this.lastShieldTime >= 8000) { // 8 segundos
                this.lastShieldTime = now;
                this.shieldActive = true;
                
                if (window.particles) {
                    window.particles.createText(this.player.x + this.player.w/2, this.player.y - 20, 
                        'BLOQUEADO!', '#00ffff', { size: 24 });
                }
                
                return true;
            }
        }
        return false;
    }
    
    /**
     * Tenta reviver (Skill: Imortal)
     */
    tryRevive() {
        if (this.hasSkill('Imortal') && !this.hasRevived) {
            this.hasRevived = true;
            this.player.life = Math.floor(this.player.maxLife * 0.5);
            
            if (window.particles) {
                window.particles.explosion(this.player.x + this.player.w/2, this.player.y + this.player.h/2, 50, {
                    color: '#ff00ff',
                    speed: 8,
                    size: 6
                });
                window.particles.createText(this.player.x + this.player.w/2, this.player.y, 
                    'REVIVEU!', '#ff00ff', { size: 36, maxLife: 150 });
            }
            
            return true;
        }
        return false;
    }
    
    /**
     * Update - chamado a cada frame
     */
    update() {
        // Regeneração (Skill)
        if (this.hasSkill('Regeneração')) {
            const now = Date.now();
            if (now - this.lastRegenTime >= 5000) { // 5 segundos
                this.lastRegenTime = now;
                if (this.player.life < this.player.maxLife) {
                    this.player.life = Math.min(this.player.maxLife, this.player.life + 1);
                    
                    if (window.particles) {
                        window.particles.createText(this.player.x + this.player.w/2, this.player.y - 10, 
                            '+1', '#00ff00', { size: 16, maxLife: 60 });
                    }
                }
            }
        }
        
    }
    
    /**
     * Desenha barra de XP e indicadores
     */
    draw(ctx, x, y) {
        // Barra de XP
        const barWidth = 200;
        const barHeight = 12;
        const barX = x;
        const barY = y;
        
        // Fundo
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(barX - 2, barY - 2, barWidth + 4, barHeight + 4);
        
        // Borda
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 2;
        ctx.strokeRect(barX, barY, barWidth, barHeight);
        
        // Progresso
        const progress = this.level >= this.maxLevel ? 1 : this.xp / this.xpToNextLevel;
        const gradient = ctx.createLinearGradient(barX, barY, barX + barWidth, barY);
        gradient.addColorStop(0, '#4169e1');
        gradient.addColorStop(1, '#1e90ff');
        ctx.fillStyle = gradient;
        ctx.fillRect(barX, barY, barWidth * progress, barHeight);
        
        // Texto
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`LVL ${this.level}`, barX + barWidth/2, barY - 6);
        
        if (this.level < this.maxLevel) {
            ctx.font = '10px Arial';
            ctx.fillText(`${this.xp}/${this.xpToNextLevel} XP`, barX + barWidth/2, barY + barHeight + 12);
        } else {
            ctx.font = 'bold 10px Arial';
            ctx.fillStyle = '#ffd700';
            ctx.fillText('MAX LEVEL', barX + barWidth/2, barY + barHeight + 12);
        }
    }
    
    /**
     * Reseta evolução para nova fase
     */
    resetForNewLevel() {
        this.hasRevived = false;
    }
    
    /**
     * Salva progresso
     */
    save() {
        return {
            version: EVOLUTION_VERSION,
            level: this.level,
            xp: this.xp,
            xpToNextLevel: this.xpToNextLevel,
            totalXpEarned: this.totalXpEarned,
            killStats: { ...this.killStats },
            unlockedSkills: [...this.unlockedSkills]
        };
    }
    
    /**
     * Carrega progresso salvo
     */
    load(data) {
        if (!data) return;
        
        this.level = Math.max(1, Math.min(this.maxLevel, Number(data.level) || 1));
        const newRequirement = this.getXPRequirement(this.level);
        if ((Number(data.version) || 1) < EVOLUTION_VERSION) {
            // Migração retrocompatível: preserva aproximadamente o percentual de XP
            // já conquistado no nível atual do save antigo.
            const oldNeed = Math.max(1, Number(data.xpToNextLevel) || 100);
            const ratio = Math.max(0, Math.min(0.9999, (Number(data.xp) || 0) / oldNeed));
            this.xp = Math.floor(newRequirement * ratio);
        } else {
            this.xp = Math.max(0, Math.min(newRequirement - 1, Number(data.xp) || 0));
        }
        this.xpToNextLevel = newRequirement;
        this.totalXpEarned = Math.max(0, Number(data.totalXpEarned) || 0);
        this.killStats = { melee:0, ranged:0, assist:0, boss:0, ...(data.killStats || {}) };
        const removedSkills = new Set(['Super Pulo', 'Pulo Duplo', 'Duplo Pulo']);
        this.unlockedSkills = Array.isArray(data.unlockedSkills)
            ? [...new Set(data.unlockedSkills.filter(name => !removedSkills.has(name)))]
            : [];
        // Migração: saves antigos recebem automaticamente as skills correspondentes ao nível atual.
        this.skillTree.filter(skill => skill.level <= this.level).forEach(skill => {
            if (!this.unlockedSkills.includes(skill.name)) this.unlockedSkills.push(skill.name);
        });
        
        // Reaplicar stats
        const levelDiff = this.level - 1;
        this.player.maxLife = this.baseStats.maxLife + (levelDiff * this.growthRates.maxLife);
        
        // ✅ CORREÇÃO: Sempre começar com vida cheia ao iniciar novo jogo
        this.player.life = this.player.maxLife;
        
        this.player.speed = this.baseStats.speed + (levelDiff * this.growthRates.speed);
        this.player._legendaryStatsApplied = false;
        this.player._comboDouble = false;
        this.player._comboTriple = false;
        this.player._dashDamage = false;
        this.player._sonicImpact = false;
        this.player._fury = false;
        this.player._auraProtection = false;
        this.player._superStrength = false;
        this.player._comboExplosion = false;
        this.player._dashCooldownMultiplier = 1;
        this.player._berserkerMode = false;
        this.player._legendary = false;
        
        // Reaplicar skills
        this.unlockedSkills.forEach(skillName => {
            const skill = this.skillTree.find(s => s.name === skillName);
            if (skill) this.applySkill(skill);
        });
    }
}

/**
 * Tabela de XP por tipo de inimigo
 */
const XP_REWARDS = {
    'basic': 10,
    'ciclista': 12,
    'fast': 15,
    'cockroach': 18,
    'strong': 20,
    'cowboy': 22,
    'berserker': 25,
    'tank': 30,
    'turista': 14,
    'seguranca': 24,
    'elvis_fan': 18,
    'mulher_feia': 22,
    'travesti': 22,
    'elite': 40,
    'ghost': 35,
    'assassin': 50,
    'boss': 500,
    'final_boss': 1000,
    'tech_boss': 1500,
    'shadow_boss': 2000,
    'god_boss': 5000
};
window.XP_REWARDS = XP_REWARDS;
