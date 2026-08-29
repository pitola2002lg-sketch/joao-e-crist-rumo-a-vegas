// Sistema unificado de controles por SLOT de jogador.
// O personagem escolhido (João ou Crist) usa os controles do slot 1 ou 2.
class Controles {
    constructor() {
        this.storageKey = 'joaoCristKeyboardConfig_v092';
        this.actions = ['left','right','up','attack','ranged','dash','pause'];
        this.touchState = {1:{},2:{}};
        this.defaults = {
            1: { left:'a', right:'d', up:'w', attack:' ', ranged:'e', dash:'Shift', pause:'p' },
            2: { left:'ArrowLeft', right:'ArrowRight', up:'ArrowUp', attack:'Enter', ranged:'/', dash:'ArrowDown', pause:'Backspace' }
        };
        const saved = this.carregar();
        this.player1 = this.sanitizar(1, saved?.[1]);
        this.player2 = this.sanitizar(2, saved?.[2]);
        this.atualizarDescricoes();
    }

    normalizarTecla(tecla) {
        if (typeof tecla !== 'string') return tecla;
        if (tecla.length === 1 && /[A-Z]/i.test(tecla)) return tecla.toLowerCase();
        return tecla;
    }

    sanitizar(numeroJogador, saved) {
        const base = {...this.defaults[numeroJogador]};
        if (!saved || typeof saved !== 'object') return base;
        for (const acao of this.actions) {
            const v = saved[acao];
            if (typeof v === 'string' && v.length > 0) base[acao] = this.normalizarTecla(v);
        }
        // Migração v0.9.4: algumas versões antigas gravaram teclas de ação
        // (principalmente ENTER/S) nos campos de movimento. Isso fazia ENTER
        // mover para trás e S mover para frente após carregar um save antigo.
        // Corrigimos somente esquerda/direita, preservando as demais teclas
        // personalizadas e todo o restante do save.
        const movimentosInvalidos = numeroJogador === 1
            ? new Set(['Enter', ' ', 'Shift', 'w', 's'])
            : new Set(['Enter', ' ', 'Backspace', 'ArrowUp', 'ArrowDown']);
        if (movimentosInvalidos.has(base.left) || movimentosInvalidos.has(base.right) || base.left === base.right) {
            base.left = this.defaults[numeroJogador].left;
            base.right = this.defaults[numeroJogador].right;
        }

        // Remove conflitos vindos de versões antigas/corrompidas.
        const used = new Set();
        for (const acao of this.actions) {
            if (used.has(base[acao])) base[acao] = this.defaults[numeroJogador][acao];
            used.add(base[acao]);
        }
        return base;
    }

    carregar() {
        try { return JSON.parse(localStorage.getItem(this.storageKey) || 'null'); }
        catch (_) { return null; }
    }

    salvar() {
        try {
            const pack = {1:{},2:{}};
            for (const a of this.actions) { pack[1][a]=this.player1[a]; pack[2][a]=this.player2[a]; }
            localStorage.setItem(this.storageKey, JSON.stringify(pack));
        } catch (_) {}
        this.atualizarDescricoes();
    }

    atualizarDescricoes() {
        this.player1.description = 'Jogador 1 - teclado configurável';
        this.player2.description = 'Jogador 2 - teclado configurável';
    }

    obterControles(numeroJogador) { return numeroJogador === 2 ? this.player2 : this.player1; }

    definirTecla(numeroJogador, acao, tecla) {
        if (!this.actions.includes(acao)) return null;
        const c = this.obterControles(numeroJogador);
        tecla = this.normalizarTecla(tecla);
        if (!c || typeof tecla !== 'string' || !tecla.length) return null;
        const anterior = c[acao];
        const conflito = this.actions.find(a => a !== acao && c[a] === tecla);
        if (conflito) c[conflito] = anterior;
        c[acao] = tecla;
        this.salvar();
        return conflito || null;
    }

    restaurarPadrao(numeroJogador=null) {
        const restore = n => {
            const target = this.obterControles(n);
            for (const a of this.actions) target[a] = this.defaults[n][a];
        };
        if (numeroJogador) restore(numeroJogador); else { restore(1); restore(2); }
        this.salvar();
    }

    verificarTecla(tecla, numeroJogador) {
        const c = this.obterControles(numeroJogador);
        const t = this.normalizarTecla(tecla);
        return this.actions.some(a => c?.[a] === t);
    }

    teclaParaAcao(tecla, acao) {
        const t = this.normalizarTecla(tecla);
        return [1,2].some(n => this.obterControles(n)?.[acao] === t);
    }

    acaoAtiva(numeroJogador, acao, keyboardState) {
        const c = this.obterControles(numeroJogador);
        const key = c?.[acao];
        const keyboard = key ? !!keyboardState?.[key] : false;
        const pad = !!window.gamepadSystem?.isActionDown?.(numeroJogador, acao);
        const touch = !!this.touchState?.[numeroJogador]?.[acao];
        return keyboard || pad || touch;
    }


    definirTouch(numeroJogador, acao, ativo) {
        if (!this.actions.includes(acao)) return;
        const n = numeroJogador === 2 ? 2 : 1;
        this.touchState[n][acao] = !!ativo;
    }

    limparTouch() {
        this.touchState = {1:{},2:{}};
    }

    nomeTecla(tecla) {
        const nomes = {' ':'ESPAÇO','Shift':'SHIFT','Enter':'ENTER','Backspace':'BACKSPACE','ArrowLeft':'←','ArrowRight':'→','ArrowUp':'↑','ArrowDown':'↓','Escape':'ESC','Control':'CTRL','Alt':'ALT','Tab':'TAB'};
        return nomes[tecla] || String(tecla || '?').toUpperCase();
    }

    mostrarInstrucoes() {
        const p1=this.player1,p2=this.player2;
        const fmt=p=>`${this.nomeTecla(p.left)}/${this.nomeTecla(p.right)} mover • ${this.nomeTecla(p.up)} pular • ${this.nomeTecla(p.attack)} atacar • ${this.nomeTecla(p.ranged)} tiro (João) • ${this.nomeTecla(p.dash)} dash`;
        return {player1:p1.description,player2:p2.description,instrucoes:[`JOGADOR 1: ${fmt(p1)}`,`JOGADOR 2: ${fmt(p2)}`]};
    }
}
const sistemControles = new Controles();
window.sistemControles = sistemControles;
