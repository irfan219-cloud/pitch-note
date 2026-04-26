// --- ZzFX Micro Synth ---
const zzfx=(...t)=>zzfxP(zzfxG(...t));
const zzfxP=(t)=>{let e=zzfxX.createBuffer(1,t.length,44100),r=e.getChannelData(0);for(let n=0;n<t.length;n++)r[n]=t[n];let n=zzfxX.createBufferSource();return n.buffer=e,n.connect(zzfxX.destination),n.start(),n};
const zzfxG=(q=1,k=.05,c=220,e=0,t=0,u=.1,r=0,F=1,v=0,z=0,w=0,A=0,l=0,B=0,x=0,m=0,p=0,n=1,o=0,y=0)=>{let b=2*Math.PI,H=v*=500*b/44100**2,I=(0<x?1:-1)*b/44100,J=c*=(1+2*k*Math.random()-k)*b/44100,K=[],D=0,E=0,C=0,G=1,L=0,M=0,N=0,O,d;e=44100*e+9;m*=44100;t*=44100;u*=44100;d=e+m+t+u+p;z*=500*b/44100**3;l*=b/44100;B*=b/44100;w*=44100;x*=44100;for(let f=0;f<d;f++){K[f]=O=G*Math.sin(E);E+=J+=v+=z;G=L<w?G:Math.exp(-N/x);L++;N++;if(f>e+m)G=1-(f-(e+m))/t;if(f>e+m+t)G=Math.exp(-(f-(e+m+t))/u);if(f>e+m+t+u+p)G=0;C+=O;if(A&&f%Math.round(44100/A)==0)E+=B*(Math.random()-.5);if(l&&f%Math.round(44100/l)==0)E+=C;if(o&&f%Math.round(44100/o)==0)G*=Math.random();if(y&&f%Math.round(44100/y)==0)G*=y;if(F!=1)O*=F<1?1+F*Math.sin(D+=H):1+F*Math.sin(D+=H)*O;O*=q*G;if(n)O=O<0?-n:n;}return K};
let zzfxX;

// Audio context activation
document.getElementById('audio-btn').addEventListener('click', () => {
    if(!zzfxX) zzfxX = new (window.AudioContext||window.webkitAudioContext)();
    if(zzfxX.state === 'suspended') zzfxX.resume();
    zzfx(...[1.5,,100,.1,.3,.5,2,2,5,,,,,.5]); // test sound
});

const SND_JUMP = [1.2,,150,.01,.02,.05,1,1.5,-3];
const SND_PATCH = [1.5,,100,.1,.3,.5,2,2,5,,,,,.5];
const SND_GOAL = [1.5,,500,.1,.4,.5,1,1.5,1,,150,.1,.1];
const SND_BOUNCE = [1.5,,400,.05,.1,.1,1,1,-5,,,,,,.5];
const SND_DIE = [1.5,,100,.1,.2,.4,3,2,-10,,,,,.5];

class TitleScene extends Phaser.Scene {
    constructor() { super('TitleScene'); }
    create() {
        document.getElementById('hud').classList.remove('active');
        document.getElementById('patch-center').classList.remove('active');
        
        let t1 = this.add.text(512, 250, "PATCH NOTES", { fontSize: '48px', fill: '#ff3399', fontStyle: 'bold', fontFamily: 'Courier New' }).setOrigin(0.5);
        t1.setShadow(2, 2, 'rgba(255, 51, 153, 0.4)', 0);
        this.add.text(512, 300, "REALITY v1.0", { fontSize: '24px', fill: '#33ccff', fontFamily: 'Courier New' }).setOrigin(0.5);
        
        this.add.text(512, 400, "Press ENTER to start", { fontSize: '16px', fill: '#666', fontFamily: 'Courier New' }).setOrigin(0.5);
        
        this.input.keyboard.on('keydown-ENTER', () => {
            if(!zzfxX) zzfxX = new (window.AudioContext||window.webkitAudioContext)();
            if(zzfxX.state === 'suspended') zzfxX.resume();
            this.scene.start('Level1');
        });
    }
}

class BaseScene extends Phaser.Scene {
    constructor(key) {
        super({ key: key });
    }

    create() {
        this.createTextures();
        
        this.rules = {
            gravityY: 620,
            jumpStrength: -380,
            speed: 220,
            collisions: true, // true = wall collisions ON. Floor always on.
            enemyEffect: 'kill',
            invertedControls: false
        };

        this.physics.world.gravity.y = this.rules.gravityY;

        this.floors = this.physics.add.staticGroup();
        this.walls = this.physics.add.staticGroup();
        this.enemies = this.physics.add.group();
        this.terminals = this.physics.add.staticGroup();
        this.goals = this.physics.add.staticGroup();

        this.buildLevel();

        this.player = this.physics.add.sprite(this.spawnPos.x, this.spawnPos.y, 'player');
        this.player.setCollideWorldBounds(true);

        this.floorCollider = this.physics.add.collider(this.player, this.floors);
        this.wallCollider = this.physics.add.collider(this.player, this.walls);
        
        this.enemyCollider = this.physics.add.collider(this.player, this.enemies, this.hitEnemyCollider, null, this);
        this.physics.add.collider(this.enemies, this.floors);
        this.physics.add.collider(this.enemies, this.walls);
        
        this.physics.add.overlap(this.player, this.goals, this.reachGoal, null, this);
        this.physics.add.overlap(this.player, this.terminals, this.touchTerminal, null, this);

        this.cursors = this.input.keyboard.createCursorKeys();
        
        this.input.keyboard.on('keydown-UP', this.handleJump, this);
        this.input.keyboard.on('keydown-SPACE', this.handleJump, this);
        
        this.input.keyboard.on('keydown-R', () => this.scene.restart());
        this.input.keyboard.on('keydown-ESC', () => this.scene.start('TitleScene'));
        this.input.keyboard.on('keydown-ENTER', () => {
            if(this.levelCompleted) this.scene.start(this.nextLevel);
        });

        document.getElementById('hud').classList.add('active');
        this.updateHUD();
        this.levelCompleted = false;
        this.idleTime = 0;
    }

    createTextures() {
        if (!this.textures.exists('player')) {
            let g = this.add.graphics();
            
            // Player
            g.fillStyle(0xfce205);
            g.fillRect(0, 0, 24, 30);
            g.fillStyle(0x0d0c14);
            g.fillRect(18, 12, 4, 4); 
            g.generateTexture('player', 24, 30);
            
            // Platform
            g.clear();
            g.fillStyle(0x2a2a35); // dark purple/grey
            g.fillRect(0, 0, 100, 20);
            g.generateTexture('platform', 100, 20);

            // Goal
            g.clear();
            g.fillStyle(0x44ffd1);
            g.fillRect(0, 0, 40, 60);
            g.fillStyle(0x0d0c14); 
            g.fillRect(3, 3, 34, 57); 
            g.fillStyle(0x44ffd1);
            g.fillRect(18, 15, 4, 30); 
            g.generateTexture('goal', 40, 60);

            // Enemy
            g.clear();
            g.fillStyle(0xff003c);
            g.fillRect(0, 0, 30, 20);
            g.generateTexture('enemy', 30, 20);

            // Terminal
            g.clear();
            g.fillStyle(0xff3399); // Pink orb
            g.fillRect(0,0, 16, 16);
            g.generateTexture('terminal', 16, 16);
            g.destroy();
        }
    }

    hitEnemyCollider(player, enemy) {
        if (this.rules.enemyEffect === 'platform') return;
        if (this.rules.enemyEffect === 'kill') {
            this.respawn();
        } else if (this.rules.enemyEffect === 'bounce') {
            if(zzfxX) zzfx(...SND_BOUNCE);
            this.cameras.main.shake(100, 0.01);
            player.setVelocityY(-500);
            player.setVelocityX(this.player.x < enemy.x ? -400 : 400); 
        }
    }

    handleJump() {
        if (this.levelCompleted) return;
        if (this.player.body.blocked.down || this.player.body.touching.down) {
            this.player.setVelocityY(this.rules.jumpStrength);
            if(zzfxX) zzfx(...SND_JUMP);
        }
    }

    update(_, delta) {
        if (this.levelCompleted) return;

        this.updateHUD();

        let leftDown = this.cursors.left.isDown;
        let rightDown = this.cursors.right.isDown;
        
        if (this.rules.invertedControls) {
            let temp = leftDown; leftDown = rightDown; rightDown = temp;
        }

        if (leftDown) this.player.setVelocityX(-this.rules.speed);
        else if (rightDown) this.player.setVelocityX(this.rules.speed);
        else this.player.setVelocityX(0);

        // NOCLIP logic (walls only)
        if (!this.rules.collisions) {
            this.wallCollider.active = false;
            this.player.setAlpha(0.5);
        } else {
            this.wallCollider.active = true;
            this.player.setAlpha(1);
        }

        // Level 4 hidden exploit check
        if (this.scene.key === 'Level4' && this.player.body.velocity.x === 0 && this.player.body.velocity.y === 0) {
            this.idleTime += delta;
            if (this.idleTime > 3000 && !this.exploitTriggered) {
                this.exploitTriggered = true;
                this.applyPatch('IDLE THREAD DETECTED', 'Gravity float re-injected', '// unintended behavior', { gravityY: 60, jumpStrength: -200 });
            }
        } else {
            this.idleTime = 0;
        }

        if (this.player.y >= 560 && !this.player.body.blocked.down) {
             this.respawn();
        }
    }

    updateHUD() {
        document.getElementById('stat-gravity').innerText = (this.rules.gravityY / 1000).toFixed(2);
        document.getElementById('stat-jump').innerText = (Math.abs(this.rules.jumpStrength) / 100).toFixed(1);
        document.getElementById('stat-collision').innerText = this.rules.collisions ? 'ON' : 'OFF';
        document.getElementById('stat-enemy').innerText = this.rules.enemyEffect;
        document.getElementById('stat-input').innerText = this.rules.invertedControls ? 'inverted' : 'normal';
    }

    setHUDText(title, desc) {
        document.getElementById('level-name').innerText = title;
        document.getElementById('level-desc').innerText = desc;
    }

    respawn() {
        if (this.isRespawning) return;
        this.isRespawning = true;
        if(zzfxX) zzfx(...SND_DIE);
        this.cameras.main.shake(200, 0.03);
        this.player.setPosition(this.spawnPos.x, this.spawnPos.y);
        this.player.setVelocity(0, 0);
        setTimeout(() => this.isRespawning = false, 500);
    }

    touchTerminal(player, terminal) {
        if (terminal.activePatch) return; 
        terminal.activePatch = true;
        
        if(zzfxX) zzfx(...SND_PATCH);
        terminal.destroy();
        this.applyPatch(terminal.patchData.title, terminal.patchData.desc, terminal.patchData.sub, terminal.patchData.rules);
    }

    reachGoal(player, goal) {
        if (this.levelCompleted) return;
        this.levelCompleted = true;
        if(zzfxX) zzfx(...SND_GOAL);
        this.player.setTint(0x44ffd1);
        this.physics.pause();
        this.cameras.main.fade(500, 0, 0, 0);
        this.time.delayedCall(600, () => this.scene.start(this.nextLevel));
    }

    applyPatch(title, desc, sub, newRules) {
        this.cameras.main.shake(300, 0.01);

        const overlay = document.getElementById('patch-center');
        document.getElementById('patch-center-title').innerText = title;
        document.getElementById('patch-center-desc').innerText = desc;
        document.getElementById('patch-center-sub').innerText = sub;
        
        overlay.classList.add('active');
        Object.assign(this.rules, newRules);
        this.physics.world.gravity.y = this.rules.gravityY;

        if (this.rules.enemyEffect === 'platform') {
            this.enemies.getChildren().forEach(e => {
                e.setTexture('platform');
                e.setSize(100, 20);
                e.body.checkCollision.down = false;
                e.body.checkCollision.left = false;
                e.body.checkCollision.right = false;
            });
        }

        setTimeout(() => overlay.classList.remove('active'), 3500);
    }
    
    createFloor(x, y, w) {
        let p = this.add.tileSprite(x, y, w, 20, 'platform');
        this.physics.add.existing(p, true);
        this.floors.add(p);
        return p;
    }

    createWall(x, y, h) {
        let p = this.add.tileSprite(x, y, 40, h, 'platform');
        this.physics.add.existing(p, true);
        this.walls.add(p);
        return p;
    }

    createEnemy(x, y, moveDist) {
        let e = this.add.sprite(x, y, 'enemy');
        this.physics.add.existing(e);
        e.body.setImmovable(true);
        e.body.allowGravity = false;
        this.enemies.add(e);
        
        if (moveDist !== 0) {
            this.tweens.add({
                targets: e, x: x + moveDist, yoyo: true, repeat: -1,
                duration: 2500, ease: 'Sine.easeInOut'
            });
        }
        return e;
    }
}

class Level1 extends BaseScene {
    constructor() { super('Level1'); }
    buildLevel() {
        this.setHUDText("LEVEL 01 :: /float", "+/- to move, SPACE to jump");
        this.spawnPos = { x: 80, y: 450 };
        this.nextLevel = 'Level2';
        
        // Exact layout from screenshot
        this.createFloor(100, 500, 200);
        
        this.createFloor(350, 400, 150);
        this.createFloor(600, 300, 150);
        this.createFloor(850, 200, 150);
        
        this.goals.create(850, 150, 'goal');
        this.add.text(838, 125, 'EXIT', { fontSize: '10px', fill: '#44ffd1', fontFamily: 'Courier New' });

        // Trigger patch immediately like in the screenshot
        this.time.delayedCall(500, () => {
            this.applyPatch('PATCH UPDATE 1.0.1', 'Gravity reduced by 95%', '// unintended behavior detected', { gravityY: 60, jumpStrength: -200 });
        });
    }
}

class Level2 extends BaseScene {
    constructor() { super('Level2'); }
    buildLevel() {
        this.setHUDText("LEVEL 02 :: /noclip", "Collision module offline");
        this.spawnPos = { x: 80, y: 450 };
        this.nextLevel = 'Level3';

        this.createFloor(512, 500, 1024);
        
        // Walls that block the way
        this.createWall(400, 250, 500);
        this.createWall(700, 250, 500);

        this.goals.create(950, 450, 'goal');

        let t = this.terminals.create(200, 470, 'terminal');
        t.patchData = {
            title: 'PATCH UPDATE 1.0.2', desc: 'NOCLIP activated', sub: '// walls disabled, floors intact',
            rules: { collisions: false }
        };
    }
}

class Level3 extends BaseScene {
    constructor() { super('Level3'); }
    buildLevel() {
        this.setHUDText("LEVEL 03 :: /invert", "Threat assessment inverted");
        this.spawnPos = { x: 80, y: 450 };
        this.nextLevel = 'Level4';

        this.createFloor(150, 500, 300);
        this.createFloor(850, 500, 300);
        this.goals.create(950, 450, 'goal');

        this.createEnemy(512, 450, 0);

        let t = this.terminals.create(200, 470, 'terminal');
        t.patchData = {
            title: 'PATCH UPDATE 1.0.3', desc: 'Enemies repulse instead of kill', sub: '// use them to cross the gap',
            rules: { enemyEffect: 'bounce' }
        };
    }
}

class Level4 extends BaseScene {
    constructor() { super('Level4'); }
    buildLevel() {
        this.setHUDText("LEVEL 04 :: /all_bugs_fixed", "Normal physics restored");
        this.spawnPos = { x: 80, y: 450 };
        this.nextLevel = 'Level5';

        this.createFloor(100, 500, 200);
        this.createWall(300, 250, 500); // Impossible wall
        this.createFloor(900, 100, 200);
        
        this.goals.create(950, 50, 'goal');

        this.time.delayedCall(500, () => {
            this.applyPatch('HOTFIX DEPLOYED', 'All bugs fixed.', '// stand still to trigger idle thread', {
                gravityY: 620, jumpStrength: -380
            });
        });
        
        this.exploitTriggered = false;
    }
}

class Level5 extends BaseScene {
    constructor() { super('Level5'); }
    buildLevel() {
        this.setHUDText("LEVEL 05 :: /enemy_floor", "Hostile entities promoted");
        this.spawnPos = { x: 50, y: 520 };
        this.nextLevel = 'TitleScene'; // Loop back to title

        this.createFloor(100, 560, 200);
        this.createFloor(950, 160, 150);
        this.goals.create(945, 120, 'goal');
        this.add.text(933, 95, 'EXIT', { fontSize: '10px', fill: '#44ffd1', fontFamily: 'Courier New' });

        this.createEnemy(250, 480, 20);
        this.createEnemy(400, 400, -20);
        this.createEnemy(550, 320, 20);
        this.createEnemy(780, 240, -20);

        this.time.delayedCall(500, () => {
            this.applyPatch('SYS.UPDATE', 'Enemy AI repurposed', '// they are platforms now', { enemyEffect: 'platform' });
        });
    }
}

const config = {
    type: Phaser.AUTO,
    width: 1024,
    height: 576,
    parent: 'game-container',
    backgroundColor: 'transparent',
    physics: {
        default: 'arcade',
        arcade: { gravity: { y: 620 }, debug: false }
    },
    scene: [TitleScene, Level1, Level2, Level3, Level4, Level5]
};

const game = new Phaser.Game(config);
