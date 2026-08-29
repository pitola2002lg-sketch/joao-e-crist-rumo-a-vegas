/**
 * ENEMY FACTORY - Sistema centralizado de criação de inimigos
 * Resolve o problema de instanciação e garante que todos os tipos funcionem
 */

class EnemyFactory {
    static create(x, y, type) {
        switch(type) {
            case 'basic':
                // Capanga básico
                return typeof BasicEnemy !== 'undefined'
                    ? new BasicEnemy(x, y)
                    : new Enemy(x, y, 'basic');
            
            case 'ciclista':
                // Ciclista - inimigo rápido em bicicleta
                return typeof CiclistaEnemy !== 'undefined'
                    ? new CiclistaEnemy(x, y)
                    : typeof BasicEnemy !== 'undefined'
                    ? new BasicEnemy(x, y)
                    : new Enemy(x, y, 'basic');
            
            case 'fast':
                return typeof FastEnemy !== 'undefined'
                    ? new FastEnemy(x, y)
                    : new Enemy(x, y, 'fast');
            
            case 'strong':
                return typeof StrongEnemy !== 'undefined'
                    ? new StrongEnemy(x, y)
                    : new Enemy(x, y, 'strong');
            
            case 'tank':
                return typeof TankEnemy !== 'undefined'
                    ? new TankEnemy(x, y)
                    : new Enemy(x, y, 'tank');
            
            case 'berserker':
                return typeof BerserkerEnemy !== 'undefined'
                    ? new BerserkerEnemy(x, y)
                    : new Enemy(x, y, 'berserker');
            case 'cowboy':
                return typeof CowboyEnemy !== 'undefined'
                    ? new CowboyEnemy(x, y)
                    : new Enemy(x, y, 'cowboy');
            
            case 'cockroach':
                return typeof CockroachEnemy !== 'undefined'
                    ? new CockroachEnemy(x, y)
                    : new Enemy(x, y, 'cockroach');
            
            case 'turista':
                return typeof window.TuristaEnemy !== 'undefined' ? new window.TuristaEnemy(x, y) : new Enemy(x, y, 'basic');

            case 'seguranca':
                return typeof window.SegurancaEnemy !== 'undefined' ? new window.SegurancaEnemy(x, y) : new Enemy(x, y, 'strong');

            case 'elvis_fan':
                return typeof window.ElvisFanEnemy !== 'undefined' ? new window.ElvisFanEnemy(x, y) : new Enemy(x, y, 'fast');

            case 'mulher_feia':
                return typeof window.MulherFeiaEnemy !== 'undefined' ? new window.MulherFeiaEnemy(x, y) : new Enemy(x, y, 'strong');

            case 'travesti':
                return typeof window.TravestiEnemy !== 'undefined' ? new window.TravestiEnemy(x, y) : new Enemy(x, y, 'fast');
            
            case 'elite':
                return typeof EliteEnemy !== 'undefined'
                    ? new EliteEnemy(x, y)
                    : new Enemy(x, y, 'basic');
            
            case 'ghost':
                return typeof GhostEnemy !== 'undefined'
                    ? new GhostEnemy(x, y)
                    : new Enemy(x, y, 'fast');
            
            case 'assassin':
                return typeof AssassinEnemy !== 'undefined'
                    ? new AssassinEnemy(x, y)
                    : new Enemy(x, y, 'fast');
            
            case 'boss':
                return typeof BossEnemy !== 'undefined'
                    ? new BossEnemy(x, y, 1)
                    : new Enemy(x, y, 'boss');
            
            case 'final_boss':
                return typeof FinalBoss !== 'undefined'
                    ? new FinalBoss(x, y)
                    : typeof BossEnemy !== 'undefined'
                    ? new BossEnemy(x, y, 5)
                    : new Enemy(x, y, 'boss');
            
            default:
                if(window.DEV) console.warn(`Tipo de inimigo desconhecido: ${type}, criando inimigo básico`);
                return new Enemy(x, y, type);
        }
    }

    // Método auxiliar para debug
    static logAvailableEnemies() {
        if(window.DEV) console.log('=== ENEMY FACTORY DEBUG ===');
        if(window.DEV) console.log('Classes disponíveis:');
        if(window.DEV) console.log('  Enemy:', typeof Enemy !== 'undefined' ? '✓' : '✗');
        if(window.DEV) console.log('  CiclistaEnemy:', typeof CiclistaEnemy !== 'undefined' ? '✓' : '✗');
        if(window.DEV) console.log('  BasicEnemy:', typeof BasicEnemy !== 'undefined' ? '✓' : '✗');
        if(window.DEV) console.log('  FastEnemy:', typeof FastEnemy !== 'undefined' ? '✓' : '✗');
        if(window.DEV) console.log('  StrongEnemy:', typeof StrongEnemy !== 'undefined' ? '✓' : '✗');
        if(window.DEV) console.log('  TankEnemy:', typeof TankEnemy !== 'undefined' ? '✓' : '✗');
        if(window.DEV) console.log('  BerserkerEnemy:', typeof BerserkerEnemy !== 'undefined' ? '✓' : '✗');
        if(window.DEV) console.log('  CowboyEnemy:', typeof CowboyEnemy !== 'undefined' ? '✓' : '✗');
        if(window.DEV) console.log('  CockroachEnemy:', typeof CockroachEnemy !== 'undefined' ? '✓' : '✗');
        if(window.DEV) console.log('  TuristaEnemy:', typeof window.TuristaEnemy !== 'undefined' ? '✓' : '✗');
        if(window.DEV) console.log('  SegurancaEnemy:', typeof window.SegurancaEnemy !== 'undefined' ? '✓' : '✗');
        if(window.DEV) console.log('  ElvisFanEnemy:', typeof window.ElvisFanEnemy !== 'undefined' ? '✓' : '✗');
        if(window.DEV) console.log('  MulherFeiaEnemy:', typeof window.MulherFeiaEnemy !== 'undefined' ? '✓' : '✗');
        if(window.DEV) console.log('  TravestiEnemy:', typeof window.TravestiEnemy !== 'undefined' ? '✓' : '✗');
        if(window.DEV) console.log('  BossEnemy:', typeof BossEnemy !== 'undefined' ? '✓' : '✗');
        if(window.DEV) console.log('  FinalBoss:', typeof FinalBoss !== 'undefined' ? '✓' : '✗');
        if(window.DEV) console.log('========================');
    }
}

// Auto-log ao carregar
if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
        setTimeout(() => EnemyFactory.logAvailableEnemies(), 500);
    });
}
