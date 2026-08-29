// Gamepad isolado do teclado: não escreve mais no objeto `keys`.
class GamepadSystem {
    constructor(controlSystem) {
        this.controlSystem = controlSystem;
        this.deadzone = 0.28;
        this.prevButtons = {};
        this.pressed = new Set();
        this.connected = [];
        this.actionState = {1:{},2:{}};
        this.config = this.loadConfig();
    }
    defaultConfig() {
        return {
            1:{left:14,right:15,up:0,attack:2,ranged:3,dash:1,pause:9},
            2:{left:14,right:15,up:0,attack:2,ranged:3,dash:1,pause:9}
        };
    }
    loadConfig() {
        try {
            const saved=JSON.parse(localStorage.getItem('joaoCristGamepadConfig_v092')||'null');
            const def=this.defaultConfig();
            return {1:{...def[1],...(saved?.[1]||{})},2:{...def[2],...(saved?.[2]||{})}};
        } catch(_){ return this.defaultConfig(); }
    }
    saveConfig(){ try{localStorage.setItem('joaoCristGamepadConfig_v092',JSON.stringify(this.config));}catch(_){} }
    reset(player=null){
        const def=this.defaultConfig();
        if(player) this.config[player]={...def[player]}; else this.config={1:{...def[1]},2:{...def[2]}};
        this.saveConfig();
    }
    setButton(player, action, index) {
        if(!this.config[player]) this.config[player]={...this.defaultConfig()[player]};
        const old=this.config[player][action];
        const conflict=Object.keys(this.config[player]).find(a=>a!==action&&this.config[player][a]===index);
        if(conflict) this.config[player][conflict]=old;
        this.config[player][action]=index;
        this.saveConfig();
        return conflict || null;
    }
    buttonName(i){const n={0:'A',1:'B',2:'X',3:'Y',4:'LB',5:'RB',6:'LT',7:'RT',8:'BACK',9:'START',10:'L3',11:'R3',12:'D-PAD ↑',13:'D-PAD ↓',14:'D-PAD ←',15:'D-PAD →',16:'HOME'};return n[i]??`BOTÃO ${i}`;}
    getPads(){return Array.from(navigator.getGamepads?.()||[]).filter(Boolean);}
    getPadForPlayer(player){return this.getPads()[Math.max(0,player-1)]||null;}
    isActionDown(player,action){return !!this.actionState[player]?.[action];}
    update(){
        const pads=this.getPads(); this.connected=pads.map(p=>p.id); this.pressed.clear();
        this.actionState={1:{},2:{}};
        pads.slice(0,2).forEach((pad,idx)=>{
            const player=idx+1,cfg=this.config[player]; if(!cfg)return;
            const axisX=pad.axes?.[0]||0;
            this.actionState[player]={
                left:axisX < -this.deadzone || !!pad.buttons[cfg.left]?.pressed,
                right:axisX > this.deadzone || !!pad.buttons[cfg.right]?.pressed,
                up:!!pad.buttons[cfg.up]?.pressed,
                attack:!!pad.buttons[cfg.attack]?.pressed,
                ranged:!!pad.buttons[cfg.ranged]?.pressed,
                dash:!!pad.buttons[cfg.dash]?.pressed,
                pause:!!pad.buttons[cfg.pause]?.pressed
            };
            pad.buttons.forEach((b,bi)=>{const k=`${idx}-${bi}`,was=!!this.prevButtons[k];if(b.pressed&&!was)this.pressed.add(k);this.prevButtons[k]=!!b.pressed;});
            const axisY=pad.axes?.[1]||0;
            [['axisL',axisX<-.6],['axisR',axisX>.6],['axisU',axisY<-.6],['axisD',axisY>.6]].forEach(([name,val])=>{const k=`${idx}-${name}`,was=!!this.prevButtons[k];if(val&&!was)this.pressed.add(k);this.prevButtons[k]=val;});
        });
    }
    rumble(player=1,duration=120,strong=.55,weak=.25){try{if(window.gameSettings&&!window.gameSettings.data.vibration)return;const pad=this.getPadForPlayer(player);const a=pad?.vibrationActuator||pad?.hapticActuators?.[0];if(!a)return;if(a.playEffect)a.playEffect('dual-rumble',{duration,strongMagnitude:strong,weakMagnitude:weak});else if(a.pulse)a.pulse(Math.max(strong,weak),duration);}catch(_){}}
    wasPressed(padIndex,buttonIndex){return this.pressed.has(`${padIndex}-${buttonIndex}`);}
    axisPressed(padIndex,dir){return this.pressed.has(`${padIndex}-axis${dir}`);}
}
window.GamepadSystem=GamepadSystem;
