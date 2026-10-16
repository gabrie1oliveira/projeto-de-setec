/**
 * ============================================================
 * GAME.JS
 * ------------------------------------------------------------
 * Motor principal do jogo. Orquestra tudo:
 *   - Game loop (requestAnimationFrame + deltaTime)
 *   - Carregamento e transição de fases
 *   - Câmera com suavização (lerp) e screen shake
 *   - Colisões player × inimigos × itens × fireballs
 *   - Timer, vidas, score, game over, vitória
 *   - Fundo com parallax
 *   - Input handling
 *   - Save automático
 *
 * v1.1 — Correções:
 *   - drawPipes() alinhado (aro/corpo/sombra/brilho)
 *   - drawPipeText() novo — desenha "vai ds" nos tubos
 *   - Colisão com tubos usa altura real (via player.js)
 *   - checkBossPlayerCollision chamado só quando boss vivo
 * ============================================================
 */
"use strict";

class Game {
    constructor() {
        /* Canvas */
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;

        /* Estado */
        this.state = 'MENU';
        this.running = false;
        this.paused = false;
        this.gameOver = false;

        /* Progresso */
        this.currentStage = 1;
        this.score = 0;
        this.coins = 0;
        this.timeLeft = CONFIG.GAME.START_TIME;
        this.timeAccumulator = 0;

        /* Entidades */
        this.player = null;
        this.enemies = [];
        this.boss = null;
        this.items = [];
        this.fireballs = [];
        this.coins_entities = [];
        this.levelData = null;

        /* Extras da expansão */
        this.checkpoints = [];
        this.stars = [];
        this.respawnX = 80;
        this.respawnY = 200;
        this.weather = window.weather || null;
        this.backgrounds = window.backgrounds || null;
        this.runRng = null;
        this.themeTime = 0;

        /* Câmera */
        this.cameraX = 0;
        this.cameraShakeX = 0;
        this.cameraShakeY = 0;

        /* Intro de fase */
        this.introTimer = 0;
        this.introDuration = 2.5;

        /* Level clear */
        this.levelClearTimer = 0;
        this.levelClearDuration = 3.0;
        this.levelClearShown = false;

        /* Combo */
        this.combo = 0;
        this.comboTimer = 0;

        /* Input */
        this.keys = {};
        this.keysPressedThisFrame = {};

        /* FPS */
        this.fps = Utils.createFpsCounter();

        /* Autosave */
        this.autosaveTimer = 0;

        /* Último timestamp */
        this.lastTime = performance.now();

        /* Play time acumulado */
        this.playTimeAccumulator = 0;

        /* Inicializa */
        UI.init();
        this.initControls();
        this.initAudioUnlock();

        /* Estado inicial: menu */
        MenuManager.setState('MAIN_MENU');

        /* Loop */
        requestAnimationFrame((t) => this.gameLoop(t));

        /* Autosave a cada 15s */
        setInterval(() => this.autosave(), 15000);

        /* Salva ao sair */
        window.addEventListener('beforeunload', () => this.autosave());
    }

    /* ========================================================
       INPUT
    ======================================================== */

    initControls() {
        window.addEventListener('keydown', (e) => {
            if ([
                'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
            ].includes(e.code)) {
                e.preventDefault();
            }

            if (!this.keys[e.code]) {
                this.keysPressedThisFrame[e.code] = true;
            }
            this.keys[e.code] = true;

            this.handleHotkeys(e.code);
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });

        window.addEventListener('blur', () => {
            this.keys = {};
            if (this.state === 'PLAYING') {
                this.pause();
            }
        });
    }

    initAudioUnlock() {
        const unlock = () => {
            SoundManager.init();
            SoundManager.resume();
        };
        window.addEventListener('keydown', unlock, { once: true });
        window.addEventListener('click', unlock, { once: true });
    }

    handleHotkeys(code) {
        if ((code === 'KeyP' || code === 'Escape') && this.state === 'PLAYING') {
            this.pause();
            return;
        }

        if (code === 'KeyM') {
            const muted = SoundManager.toggleMute();
            EffectsManager.text(
                this.player ? this.player.x + 12 : 400,
                this.player ? this.player.y - 20 : 100,
                muted ? 'SOM OFF' : 'SOM ON',
                { color: '#FFF', size: 12 }
            );
            return;
        }

        if (code === 'KeyR' && (this.state === 'PLAYING' || this.state === 'PAUSED')) {
            this.restartLevel();
            return;
        }

        if (this.state !== 'PLAYING' && this.state !== 'LEVEL_INTRO') {
            MenuManager.handleInput(code);
        }
    }

    /* ========================================================
       CONTROLE DE FLUXO
    ======================================================== */

    startNewGame() {
        this.currentStage = 1;
        this.score = 0;
        this.coins = 0;
        this.player = null;
        this.playTimeAccumulator = 0;
        this.playerLives = null;
        this.beginRun();
        this.loadLevel(this.currentStage);

        /* Mostra os mutadores sorteados antes de jogar */
        this.state = 'RUN_MUTATORS';
        MenuManager.setState('RUN_MUTATORS');
    }

    /** Inicia de fato após a tela de mutadores. */
    beginRunPlay() {
        this.startLevelIntro();
    }

    /* Cria uma nova "run" roguelite: seed + mutadores. */
    beginRun() {
        const seed = (Math.random() * 2147483647) >>> 0;
        this.runRng = Utils.createRng(seed);
        RunModifier.roll(this.runRng, CONFIG.RUN.MODIFIER_COUNT);
        RandomEvent.reset();
        SAVE.setRun({ seed, modifiers: RunModifier.active.slice() });
    }

    /* Restaura mutadores/seed de uma run salva (continue). */
    restoreRun() {
        const run = SAVE.getRun();
        if (run && run.modifiers && Array.isArray(run.modifiers)) {
            RunModifier.active = run.modifiers.slice();
            this.runRng = Utils.createRng(run.seed || 1);
        } else {
            this.beginRun();
        }
    }

    continueFromSave() {
        const data = SAVE.get();
        this.currentStage = data.player.currentLevel || 1;
        this.score = data.player.score || 0;
        this.coins = data.player.coins || 0;
        this.restoreRun();
        this.loadLevel(this.currentStage);

        if (this.player && data.player.powers) {
            this.player.powers = JSON.parse(JSON.stringify(data.player.powers));
            this.player.applySize(false);
        }
        this.startLevelIntro();
    }

    stopGame() {
        this.running = false;
        this.state = 'MENU';
        this.paused = false;
        SoundManager.stopMusic();
    }

    pause() {
        if (this.state !== 'PLAYING') return;
        this.state = 'PAUSED';
        this.paused = true;
        MenuManager.setState('PAUSED');
        SoundManager.pauseMusic();
    }

    resume() {
        if (this.state !== 'PAUSED') return;
        this.state = 'PLAYING';
        this.paused = false;
        SoundManager.resumeMusic();
    }

    restartLevel() {
        this.loadLevel(this.currentStage);
        this.startLevelIntro();
    }

    nextLevel() {
        if (this.currentStage < CONFIG.GAME.LEVELS_TOTAL) {
            this.currentStage++;
            SAVE.completeLevel(this.currentStage - 1, CONFIG.GAME.START_TIME - this.timeLeft);
            this.loadLevel(this.currentStage);
            this.startLevelIntro();
        } else {
            this.victory();
        }
    }

    victory() {
        this.state = 'VICTORY';
        this.running = false;
        MenuManager.setState('VICTORY');
        SoundManager.stopMusic();
        SoundManager.playVictory();
        EffectsManager.emitConfetti(80);
        EffectsManager.flashScreen('#FFD700', 0.6);
    }

    gameOverSequence() {
        this.state = 'GAME_OVER';
        this.running = false;
        MenuManager.setState('GAME_OVER');
        SoundManager.stopMusic();
        SoundManager.playGameOver();
    }

    startLevelIntro() {
        this.state = 'LEVEL_INTRO';
        this.introTimer = this.introDuration;

        if (!this.player) {
            this.player = new Player(this.respawnX, this.respawnY);
            this.player.lives = SAVE.get().player.lives;
        } else {
            this.player.x = this.respawnX;
            this.player.y = this.respawnY;
            this.player.vx = 0;
            this.player.vy = 0;
            this.player.dead = false;
            this.player.deadTimer = 0;
        }

        SoundManager.startMusic(this.levelData.theme);
    }

    /* ========================================================
       CARREGAMENTO DE FASE
    ======================================================== */

    loadLevel(stageId) {
        const seed = (SAVE.getRun() && SAVE.getRun().seed) || 1;
        this.levelData = WorldManager.getLevel(stageId, {
            procedural: true,
            seed,
        });
        this.currentStage = stageId;

        this.enemies = [];
        this.items = [];
        this.fireballs = [];
        this.coins_entities = [];
        this.boss = null;
        this.checkpoints = [];
        this.stars = [];

        for (const e of this.levelData.enemies) {
            const enemy = new Enemy(e.x, e.y, e.minX, e.maxX, e.type, e.variant);
            /* Mutador: inimigos mais rápidos */
            if (RunModifier.has('enemy_speed') && enemy.baseSpeed) {
                enemy.baseSpeed *= 1.4;
                enemy.vx = Math.sign(enemy.vx || -1) * enemy.baseSpeed;
            }
            this.enemies.push(enemy);

            /* Mutador: horda (clona parte dos inimigos) */
            if (RunModifier.has('extra_enemies')
                && Math.random() < 0.4) {
                const clone = new Enemy(
                    e.x + 60, e.y, e.minX, e.maxX, e.type, e.variant
                );
                if (RunModifier.has('enemy_speed') && clone.baseSpeed) {
                    clone.baseSpeed *= 1.4;
                    clone.vx = Math.sign(clone.vx || -1) * clone.baseSpeed;
                }
                this.enemies.push(clone);
            }
        }

        for (const c of this.levelData.coins) {
            this.coins_entities.push({
                x: c.x, y: c.y, width: 16, height: 16,
                collected: false, animTimer: Math.random() * 2,
            });
        }

        for (const it of (this.levelData.items || [])) {
            this.items.push(new Item(it.x, it.y, it.type));
        }

        /* Checkpoints */
        if (Array.isArray(this.levelData.checkpoints)) {
            this.levelData.checkpoints.forEach((cp, i) => {
                this.checkpoints.push(new Checkpoint(cp.x, cp.y, i));
            });
        }

        /* Estrelas (respeitam as já coletadas no save) */
        const collected = SAVE.getStars(this.levelData.id);
        if (Array.isArray(this.levelData.stars)) {
            this.levelData.stars.forEach((st, i) => {
                const star = new LevelStar(st.x, st.y, i);
                if (collected[i]) {
                    star.collected = true;
                    star.active = false;
                }
                this.stars.push(star);
            });
        }

        if (this.levelData.hasBoss && this.levelData.bossSpawn) {
            const bs = this.levelData.bossSpawn;
            this.boss = new Boss(bs.x, bs.y, bs.minX, bs.maxX);
        }

        /* Ponto de respawn padrão */
        this.respawnX = 80;
        this.respawnY = 200;

        /* Clima + cenário */
        if (this.weather) this.weather.setTheme(this.levelData.theme);
        if (this.backgrounds) this.backgrounds.setTheme(this.levelData.theme);

        this.cameraX = 0;

        /* Mutador: contra o tempo (timer começa menor) */
        this.timeLeft = RunModifier.has('time_rush')
            ? Math.floor(CONFIG.GAME.START_TIME * 0.66)
            : CONFIG.GAME.START_TIME;
        this.timeAccumulator = 0;

        this.combo = 0;
        this.comboTimer = 0;

        EffectsManager.clear();

        UI.setLives(this.player ? this.player.lives : SAVE.get().player.lives);
    }

    /* ========================================================
       LOOP PRINCIPAL
    ======================================================== */

    gameLoop(currentTime) {
        const dt = Math.min(
            (currentTime - this.lastTime) / 1000,
            CONFIG.CANVAS.MAX_DELTA
        );
        this.lastTime = currentTime;

        this.update(dt);
        this.draw();

        this.keysPressedThisFrame = {};

        requestAnimationFrame((t) => this.gameLoop(t));
    }

    update(dt) {
        EffectsManager.update(dt);
        this.themeTime += dt;

        if (this.comboTimer > 0) {
            this.comboTimer -= dt;
            if (this.comboTimer <= 0) this.combo = 0;
        }

        switch (this.state) {
            case 'LEVEL_INTRO':   this.updateLevelIntro(dt); break;
            case 'PLAYING':       this.updatePlaying(dt); break;
            case 'LEVEL_CLEAR':   this.updateLevelClear(dt); break;
            case 'VICTORY':       this.updateVictory(dt); break;
            case 'GAME_OVER':     break;
            case 'PAUSED':        break;
            case 'MENU':          break;
        }

        this.fps.tick();

        if (this.state === 'PLAYING') {
            this.playTimeAccumulator += dt;
            if (this.playTimeAccumulator >= 1) {
                SAVE.addPlayTime(1);
                this.playTimeAccumulator -= 1;
            }
        }
    }

    updateLevelIntro(dt) {
        this.introTimer -= dt;
        if (this.introTimer <= 0) {
            this.state = 'PLAYING';
            this.running = true;
        }
    }

    updateLevelClear(dt) {
        this.levelClearTimer -= dt;

        if (this.timeLeft > 0) {
            const drain = Math.min(this.timeLeft, dt * 200);
            this.timeLeft -= drain;
            const bonus = Math.floor(drain) * CONFIG.SCORE.TIME_BONUS;
            this.addScore(bonus);

            if (Math.floor(this.timeLeft) % 10 === 0 && Math.random() < 0.3) {
                SoundManager.playCoin();
            }
        }

        if (this.levelClearTimer <= 0 && !this.levelClearShown) {
            this.levelClearShown = true;
            if (this.currentStage < CONFIG.GAME.LEVELS_TOTAL) {
                MenuManager.setState('LEVEL_CLEAR');
            } else {
                this.victory();
            }
        }
    }

    updateVictory(dt) {
        if (Math.random() < 0.1) {
            EffectsManager.emitConfetti(3);
        }
    }

    updatePlaying(dt) {
        /* Timer */
        const rush = RunModifier.has('time_rush') ? 1.5 : 1;
        this.timeAccumulator += dt * rush;
        if (this.timeAccumulator >= 1) {
            this.timeAccumulator -= 1;
            this.timeLeft -= 1;

            if (this.timeLeft <= 0) {
                this.player.kill();
                return;
            }

            if (this.timeLeft === 30) SoundManager.playMenuSelect();
        }

        /* Clima + fundo */
        if (this.weather) this.weather.update(dt);
        if (this.backgrounds) this.backgrounds.update(dt);

        /* Mutadores/eventos aleatórios */
        RandomEvent.update(dt, this);

        /* Inimigos congelados viram plataformas sólidas */
        this.levelData._frozenEnemies = this.enemies.filter(
            e => e.isAlive && e.frozen
        );

        /* Player */
        this.player.update(dt, this.keys, this.levelData, this.fireballs);

        /* Limite esquerdo do mundo */
        if (this.player.x < 0) {
            this.player.x = 0;
            if (this.player.vx < 0) this.player.vx = 0;
        }

        /* Inimigos */
        for (const enemy of this.enemies) {
            enemy.update(dt, this.levelData);
        }

        /* Boss — só atualiza/colide se estiver vivo */
        if (this.boss && this.boss.isAlive) {
            this.boss.update(dt, this.levelData, this.player.x);
            if (!this.boss.stomped) {
                this.checkBossPlayerCollision();
            }
        }

        /* Projéteis do jogador (fireball/iceball/hammer) */
        for (let i = this.fireballs.length - 1; i >= 0; i--) {
            const fb = this.fireballs[i];
            fb.update(dt, this.levelData);
            if (!fb.active) Utils.removeAt(this.fireballs, i);
        }

        /* Itens */
        for (let i = this.items.length - 1; i >= 0; i--) {
            const item = this.items[i];
            item.update(dt, this.levelData);

            if (!item.collected && Utils.aabb(this.player, item)) {
                item.collected = true;
                this.player.collectPowerUp(item.type);
                this.addScore(CONFIG.SCORE.POWERUP);

                if (item.type === 'star') {
                    EffectsManager.flashScreen('#FFD700', 0.5);
                }
            }

            if (item.collected) Utils.removeAt(this.items, i);
        }

        /* Moedas */
        for (let i = this.coins_entities.length - 1; i >= 0; i--) {
            const c = this.coins_entities[i];
            c.animTimer += dt;

            /* Moedas em explosão caem com gravidade */
            if (c.burst && !c.collected) {
                c.vy += CONFIG.CANVAS.GRAVITY;
                c.x += c.vx;
                c.y += c.vy;
                if (c.y > this.levelData.groundY + 40) {
                    Utils.removeAt(this.coins_entities, i);
                    continue;
                }
            }

            if (!c.collected && Utils.aabb(this.player, c)) {
                c.collected = true;
                this.addCoin(1);
                const value = CONFIG.SCORE.COIN
                    * (RunModifier.has('coin_bonus') ? 2 : 1);
                this.addScore(value);
                SoundManager.playCoin();

                EffectsManager.textScore(c.x + 8, c.y - 5, value);
                EffectsManager.emitSparkles(c.x + 8, c.y + 8, 6, '#FFD700');
            }

            if (c.collected) Utils.removeAt(this.coins_entities, i);
        }

        /* Checkpoints */
        for (const cp of this.checkpoints) {
            cp.update(dt);
            if (!cp.active && Utils.aabb(this.player, cp.getRect())) {
                if (cp.activate()) {
                    this.respawnX = cp.x;
                    this.respawnY = cp.y - 60;
                    SAVE.setCheckpoint(this.levelData.id, {
                        x: cp.x, y: cp.y - 60,
                    });
                }
            }
        }

        /* Estrelas */
        for (const star of this.stars) {
            star.update(dt);
            if (!star.collected && Utils.aabb(this.player, star)) {
                if (star.collect()) {
                    SAVE.collectStar(this.levelData.id, star.index);
                    this.addScore(CONFIG.SCORE.STAR);
                }
            }
        }

        /* Perigos (lava / espinhos) */
        this.checkHazards();

        /* Colisões */
        this.checkPlayerEnemyCollisions();
        this.checkProjectileEnemyCollisions();
        this.checkProjectileBossCollisions();

        if (this.boss) {
            this.checkBossFireballPlayerCollisions();
        }

        this.checkFlagCollision();

        /* Player morreu */
        if (this.player.dead) {
            this.player.deadTimer = (this.player.deadTimer || 0) + dt;
            if (this.player.deadTimer > 1.5) {
                this.handlePlayerDeathResolved();
            }
        }

        this.updateCamera(dt);
        this.updateHUD();
    }

    /* Perigos que causam dano imediato. */
    checkHazards() {
        const p = this.player;
        if (p.dead) return;
        const hazards = this.levelData.hazards || [];

        for (const hz of hazards) {
            const y = (hz.y != null) ? hz.y : this.levelData.groundY;
            const h = (hz.height != null)
                ? hz.height
                : (CONFIG.CANVAS.HEIGHT - y);
            const rect = { x: hz.x, y, width: hz.width, height: h };
            if (!Utils.aabb(p, rect)) continue;
            if (hz.type === 'spikes') {
                p.takeDamage();
            } else {
                /* Lava mata instantaneamente */
                p.kill();
            }
            return;
        }
    }

    /* ========================================================
       COLISÕES
    ======================================================== */

    checkPlayerEnemyCollisions() {
        const p = this.player;
        if (p.dead) return;

        for (const enemy of this.enemies) {
            if (!enemy.isAlive) continue;
            if (enemy.stomped) continue;
            if (enemy.frozen) continue;         // congelado = plataforma
            if (!Utils.aabb(p, enemy)) continue;

            const fallingOnTop =
                p.vy > 0 &&
                p.y + p.height - p.vy <= enemy.y + 12;

            /* Giro do martelo / investida da capa: destrói ao contato */
            if (p.isSpinning || p.dashTimer > 0) {
                enemy.hitByFireball();
                this.onEnemyKilled(enemy);
                continue;
            }

            if (p.isStarPowered) {
                enemy.stomped = true;
                enemy.stompTimer = 0.3;
                this.onEnemyKilled(enemy);
                continue;
            }

            if (fallingOnTop && !p.isMini) {
                /* Pacifista não pode esmagar: apenas quica */
                if (p.hasMod('pacifist') && !enemy.isShell) {
                    p.vy = CONFIG.ENEMY.STOMP_BOUNCE;
                    continue;
                }

                const result = enemy.stomp();

                if (result.killed) {
                    this.onEnemyKilled(enemy);
                }

                if (result.shell) {
                    p.vy = CONFIG.ENEMY.STOMP_BOUNCE;
                    EffectsManager.text(
                        enemy.x + 12, enemy.y - 10,
                        result.kick ? 'KICK!' : 'CASCO!',
                        { color: '#4CAF50', size: 10, life: 0.8 }
                    );
                } else {
                    p.vy = CONFIG.ENEMY.STOMP_BOUNCE;
                }

                /* Botas de Ferro: quica mais alto */
                if (p.hasMod('iron_boots')) {
                    p.vy = CONFIG.ENEMY.STOMP_BOUNCE * 1.6;
                }

                EffectsManager.emitDust(
                    enemy.x + enemy.width / 2,
                    enemy.y + enemy.height,
                    4
                );
            } else {
                if (enemy.isShell && enemy.isShellMoving) {
                    p.takeDamage();
                } else if (!enemy.isShell) {
                    p.takeDamage();
                } else if (enemy.isShell && !enemy.isShellMoving) {
                    const result = enemy.stomp();
                    if (result.kick) {
                        p.vy = CONFIG.ENEMY.STOMP_BOUNCE * 0.6;
                    }
                }
            }
        }

        for (const shell of this.enemies) {
            if (!shell.isShell || !shell.isShellMoving || !shell.isAlive) continue;

            for (const other of this.enemies) {
                if (other === shell || !other.isAlive) continue;
                if (other.stomped || other.frozen) continue;
                if (!Utils.aabb(shell, other)) continue;

                other.stomped = true;
                other.stompTimer = 0.3;
                this.onEnemyKilled(other);
                SoundManager.playEnemyHit();
            }
        }
    }

    checkProjectileEnemyCollisions() {
        for (let i = this.fireballs.length - 1; i >= 0; i--) {
            const fb = this.fireballs[i];
            if (!fb.active) continue;

            for (const enemy of this.enemies) {
                if (!enemy.isAlive || enemy.stomped || enemy.frozen) continue;
                if (!Utils.aabb(fb, enemy)) continue;

                let killed;
                if (fb.kind === 'ice') {
                    killed = enemy.hitByIceball();
                    EffectsManager.emitIceTrail(fb.x + 5, fb.y + 5);
                } else if (fb.kind === 'hammer') {
                    killed = enemy.hitByFireball();
                    SoundManager.playHammer();
                } else {
                    killed = enemy.hitByFireball();
                    EffectsManager.emitExplosion(fb.x + 5, fb.y + 5, '#FF6D00');
                }

                if (killed) this.onEnemyKilled(enemy);

                fb.active = false;
                Utils.removeAt(this.fireballs, i);
                break;
            }
        }
    }

    checkProjectileBossCollisions() {
        if (!this.boss || !this.boss.isAlive || this.boss.stomped) return;

        for (let i = this.fireballs.length - 1; i >= 0; i--) {
            const fb = this.fireballs[i];
            if (!fb.active) continue;
            if (!Utils.aabb(fb, this.boss)) continue;

            fb.active = false;

            if (fb.kind === 'ice') {
                const res = this.boss.hitByIceball();
                if (res.hit) this.addScore(CONFIG.SCORE.BOSS_HIT);
            } else {
                const result = this.boss.hitByFireball();
                if (result.killed) {
                    this.onBossKilled();
                } else {
                    this.addScore(CONFIG.SCORE.BOSS_HIT);
                }
            }

            Utils.removeAt(this.fireballs, i);
        }
    }

    checkBossFireballPlayerCollisions() {
        if (!this.boss) return;
        const p = this.player;
        if (p.dead || p.invulnerable) return;

        for (let i = this.boss.fireballs.length - 1; i >= 0; i--) {
            const fb = this.boss.fireballs[i];
            if (!fb.active) continue;
            if (!Utils.aabb(p, fb)) continue;

            fb.active = false;
            p.takeDamage();
            Utils.removeAt(this.boss.fireballs, i);
        }
    }

    checkBossPlayerCollision() {
        if (!this.boss || !this.boss.isAlive || this.boss.stomped) return;
        const p = this.player;
        if (p.dead) return;

        if (!Utils.aabb(p, this.boss)) return;

        const fallingOnTop =
            p.vy > 0 &&
            p.y + p.height - p.vy <= this.boss.y + 16;

        if (fallingOnTop && !p.invulnerable) {
            const result = this.boss.stomp();
            p.vy = CONFIG.ENEMY.STOMP_BOUNCE * 1.2;

            if (result.killed) {
                this.onBossKilled();
            } else {
                this.addScore(CONFIG.SCORE.BOSS_HIT);
            }

            EffectsManager.shake(10, 0.4);
            return;
        }

        if (!this.boss.stomped) {
            p.takeDamage();
        }
    }

    checkFlagCollision() {
        const flag = this.levelData.platforms.find(p => p.type === 'flagpole');
        if (!flag) return;

        const flagRect = {
            x: flag.x - 8,
            y: flag.y,
            width: flag.width + 16,
            height: flag.height,
        };

        if (Utils.aabb(this.player, flagRect)) {
            this.onLevelComplete();
        }
    }

    /* ========================================================
       EVENTOS
    ======================================================== */

    onEnemyKilled(enemy) {
        this.addScore(CONFIG.SCORE.ENEMY);
        this.combo++;
        this.comboTimer = 3.0;

        const comboBonus = Math.max(0, (this.combo - 1)) * 100;
        const total = CONFIG.SCORE.ENEMY + comboBonus;
        if (comboBonus > 0) {
            this.addScore(comboBonus);
        }

        EffectsManager.textScore(
            enemy.x + enemy.width / 2,
            enemy.y - 5,
            total,
            this.combo >= 3 ? '#FF2A6D' : '#FFD700'
        );

        if (this.combo >= 3) {
            EffectsManager.textCombo(
                enemy.x + enemy.width / 2,
                enemy.y - 25,
                this.combo
            );
        }

        const stats = SAVE.getStats();
        stats.totalEnemies++;
    }

    onBossKilled() {
        this.addScore(CONFIG.SCORE.BOSS_KILL);
        EffectsManager.text(
            this.boss.x + this.boss.width / 2,
            this.boss.y - 20,
            'BOSS DERROTADO!',
            { color: '#FFD700', size: 14, life: 2.5 }
        );
        EffectsManager.flashScreen('#FFD700', 0.5);
        SoundManager.playVictory();
    }

    onPlayerDeath() {
        this.player.deadTimer = 0;
    }

    handlePlayerDeathResolved() {
        const lives = SAVE.loseLife();
        this.player.lives = lives;
        UI.setLives(lives);

        if (lives <= 0) {
            this.gameOverSequence();
        } else {
            this.player.dead = false;
            this.player.deadTimer = 0;
            this.player.x = this.respawnX;
            this.player.y = this.respawnY;
            this.player.vx = 0;
            this.player.vy = 0;

            /* Reinicia poderes (volta ao pequeno) */
            this.player.powers = {
                suit: 'none',
                baseSize: 'small',
                temporary: [],
            };
            this.player.applySize(false);

            this.player.invulnerable = true;
            this.player.invulnerableTimer = 2.0;

            this.timeLeft = CONFIG.GAME.START_TIME;
            this.startLevelIntro();
        }
    }

    onLevelComplete() {
        if (this.state !== 'PLAYING') return;

        this.state = 'LEVEL_CLEAR';
        this.levelClearTimer = this.levelClearDuration;
        this.levelClearShown = false;
        this.running = false;

        SoundManager.stopMusic();
        SoundManager.playStageClear();

        EffectsManager.text(
            this.player.x + 12,
            this.player.y - 20,
            'FASE COMPLETA!',
            { color: '#4CAF50', size: 16, life: 2.5 }
        );
    }

    /* ========================================================
       SCORE / COINS / HUD
    ======================================================== */

    addScore(n) {
        this.score += n;
        SAVE.addScore(n);
    }

    addCoin(n = 1) {
        this.coins += n;
        const newCoins = SAVE.addCoins(n);
        this.coins = newCoins;
    }

    addLife(n = 1) {
        const lives = SAVE.addLife(n);
        if (this.player) this.player.lives = lives;
        UI.setLives(lives);
        SoundManager.play1UP();
        return lives;
    }

    /**
     * Explosão de moedas saltando (blocos raros / eventos).
     * @param {number} x
     * @param {number} y
     * @param {number} count
     */
    spawnCoinBurst(x, y, count = 3) {
        for (let i = 0; i < count; i++) {
            this.coins_entities.push({
                x: x + Utils.random(-10, 10),
                y: y - i * 4,
                width: 16,
                height: 16,
                collected: false,
                animTimer: Math.random() * 2,
                vy: Utils.random(-6, -3),
                vx: Utils.random(-2, 2),
                burst: true,
            });
        }
        EffectsManager.emitSparkles(x, y, 8, '#FFD700');
    }

    /**
     * Cria um item no array vivo do jogo (usado por blocos "?").
     * @param {number} x
     * @param {number} y
     * @param {string} type
     * @returns {Item|null}
     */
    spawnItem(x, y, type) {
        if (!type) return null;
        const item = new Item(x, y, type);
        this.items.push(item);
        return item;
    }

    /** Bloco "?" aberto por martelo. */
    breakQuestionByHammer(block) {        if (!block || block.type !== 'question') return;
        SoundManager.playHammer();
        EffectsManager.emitExplosion(
            block.x + block.width / 2,
            block.y + block.height / 2,
            '#FFC107'
        );

        const rarity = block.rarity || Item.rollRarity();
        const reward = Item.rewardForRarity(rarity, block.item);
        if (reward.itemType && reward.itemType !== 'coin') {
            this.items.push(
                new Item(block.x + 4, block.y - 24, reward.itemType)
            );
        } else {
            this.addCoin(1);
            this.addScore(CONFIG.SCORE.COIN);
        }
        block.type = 'used';
        block.item = null;
    }

    updateHUD() {
        const p = this.player;
        UI.update({
            score: this.score,
            coins: SAVE.get().player.coins,
            lives: p ? p.lives : 0,
            time: this.timeLeft,
            level: this.levelData ? this.levelData.id : '1-1',
            power: p ? p.powers.suit : 'none',
            baseSize: p ? p.powers.baseSize : 'small',
            temporary: p ? p.powers.temporary.map(t => t.type) : [],
            stars: this.currentLevelStars(),
        });
    }

    /* Quantas estrelas da fase atual já foram coletadas (0..3). */
    currentLevelStars() {
        if (!this.levelData) return 0;
        const saved = SAVE.getStars(this.levelData.id);
        let n = 0;
        for (let i = 0; i < 3; i++) {
            if (saved[i] || (this.stars[i] && this.stars[i].collected)) n++;
        }
        return n;
    }

    updateCamera(dt) {
        const targetX = this.player.x + this.player.vx * 10 - this.width / 3;
        this.cameraX += (targetX - this.cameraX) * CONFIG.CAMERA.FOLLOW_SPEED;

        const maxX = Math.max(0, this.levelData.length - this.width);
        this.cameraX = Utils.clamp(this.cameraX, 0, maxX);

        const shake = EffectsManager.getShakeOffset();
        this.cameraShakeX = shake.x;
        this.cameraShakeY = shake.y;
    }

    /* ========================================================
       AUTOSAVE
    ======================================================== */

    autosave() {
        if (this.state !== 'PLAYING' && this.state !== 'PAUSED') return;

        const data = SAVE.collect(this);
        data.player.currentLevel = this.currentStage;
        data.player.lives = this.player.lives;
        data.player.score = this.score;
        data.player.coins = SAVE.get().player.coins;
        data.player.powers = this.player.powers;
        SAVE.save(data);
    }

    /* ========================================================
       DRAW
    ======================================================== */

    draw() {
        const ctx = this.ctx;

        ctx.save();
        ctx.translate(this.cameraShakeX, this.cameraShakeY);

        this.drawBackground(ctx);

        if (
            this.state === 'PLAYING' ||
            this.state === 'PAUSED' ||
            this.state === 'LEVEL_CLEAR' ||
            this.state === 'LEVEL_INTRO'
        ) {
            this.drawWorld(ctx);
        }

        /* Clima por cima do mundo */
        if (this.weather && this.levelData) {
            this.weather.draw(ctx);
        }

        ctx.restore();

        if (this.state === 'LEVEL_INTRO') {
            MenuManager.drawLevelIntro(
                ctx, this.width, this.height,
                this.levelData.name,
                this.introTimer,
                this.introDuration
            );
        } else {
            MenuManager.draw(ctx, this.width, this.height);
        }

        EffectsManager.drawOverlay(ctx);
        UI.drawFpsCounter(ctx, this.fps.value);
    }

    drawBackground(ctx) {
        if (!this.levelData) {
            const g = ctx.createLinearGradient(0, 0, 0, this.height);
            g.addColorStop(0, '#0a0a1e');
            g.addColorStop(1, '#1a1a2e');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, this.width, this.height);
            return;
        }

        const theme = CONFIG.THEMES[this.levelData.theme]
            || CONFIG.THEMES.overworld;

        if (this.backgrounds) {
            this.backgrounds.draw(ctx, this.cameraX, theme);
        } else {
            const g = ctx.createLinearGradient(0, 0, 0, this.height);
            g.addColorStop(0, theme.bgTop);
            g.addColorStop(1, theme.bgBottom);
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, this.width, this.height);
        }
    }

    drawParallaxClouds(ctx) {
        const camFactor = this.cameraX * 0.2;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        for (let i = 0; i < 8; i++) {
            const baseX = i * 400 - camFactor;
            const x = ((baseX % 3200) + 3200) % 3200 - 200;
            const y = 60 + (i * 37) % 80;
            this.drawCloud(ctx, x, y, 40 + (i % 3) * 15);
        }
    }

    drawCloud(ctx, x, y, size) {
        ctx.beginPath();
        ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
        ctx.arc(x + size * 0.5, y - size * 0.2, size * 0.6, 0, Math.PI * 2);
        ctx.arc(x + size * 1.0, y, size * 0.5, 0, Math.PI * 2);
        ctx.arc(x + size * 0.5, y + size * 0.2, size * 0.55, 0, Math.PI * 2);
        ctx.fill();
    }

    drawParallaxHills(ctx) {
        const camFactor = this.cameraX * 0.4;
        ctx.fillStyle = 'rgba(0, 100, 0, 0.3)';
        for (let i = 0; i < 6; i++) {
            const baseX = i * 500 - camFactor;
            const x = ((baseX % 3000) + 3000) % 3000 - 150;
            ctx.beginPath();
            ctx.moveTo(x, this.height);
            ctx.quadraticCurveTo(x + 100, this.height - 150, x + 200, this.height);
            ctx.fill();
        }
    }

    drawParallaxBricks(ctx) {
        const camFactor = this.cameraX * 0.15;
        ctx.fillStyle = 'rgba(50, 50, 60, 0.5)';
        for (let i = 0; i < 30; i++) {
            const x = (i * 60 - camFactor) % 900;
            const y = 40 + (i * 23) % 60;
            ctx.fillRect(x, y, 20, 10);
        }
    }

    drawParallaxLava(ctx) {
        const camFactor = this.cameraX * 0.1;
        const grad = ctx.createLinearGradient(0, this.height - 150, 0, this.height);
        grad.addColorStop(0, 'rgba(255, 87, 34, 0)');
        grad.addColorStop(1, 'rgba(255, 87, 34, 0.5)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, this.height - 150, this.width, 150);

        const t = Date.now() / 500;
        for (let i = 0; i < 6; i++) {
            const x = (i * 200 - camFactor) % 900;
            const y = this.height - 30 + Math.sin(t + i) * 5;
            ctx.fillStyle = 'rgba(255, 200, 0, 0.4)';
            ctx.beginPath();
            ctx.arc(x, y, 6 + Math.sin(t + i) * 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawWorld(ctx) {
        const time = this.themeTime;

        Tiles.ground(ctx, this.cameraX, this.levelData, this.width);
        Tiles.hazards(ctx, this.cameraX, this.levelData, time);
        this.drawPlatforms(ctx);
        this.drawPipes(ctx);
        this.drawCoins(ctx);

        /* Checkpoints + estrelas */
        for (const cp of this.checkpoints) cp.draw(ctx, this.cameraX);
        for (const star of this.stars) star.draw(ctx, this.cameraX);

        for (const item of this.items) {
            item.draw(ctx, this.cameraX);
        }

        for (const fb of this.fireballs) {
            fb.draw(ctx, this.cameraX);
        }

        for (const enemy of this.enemies) {
            enemy.draw(ctx, this.cameraX);
        }

        if (this.boss) {
            this.boss.draw(ctx, this.cameraX);
        }

        if (this.player) {
            this.player.draw(ctx, this.cameraX);
        }

        EffectsManager.draw(ctx, this.cameraX);
        UI.drawTimeWarning(ctx, this.timeLeft);
        UI.drawCombo(ctx, this.combo);
        UI.drawStatus(ctx, this.player, this.currentLevelStars());
    }

    drawPlatforms(ctx) {
        const theme = CONFIG.THEMES[this.levelData.theme]
            || CONFIG.THEMES.overworld;
        for (const p of this.levelData.platforms) {
            if (p.broken) continue;
            const sx = p.x - this.cameraX;
            if (sx + p.width < 0 || sx > this.width) continue;
            Tiles.platform(ctx, sx, p, theme, this.themeTime);
        }
    }

    drawBrick(ctx, sx, p) {
        const used = p.type === 'used';
        const base = used ? CONFIG.COLORS.USED : CONFIG.COLORS.BRICK;

        ctx.fillStyle = base;
        ctx.fillRect(sx, p.y, p.width, p.height);

        const grad = ctx.createLinearGradient(sx, p.y, sx, p.y + p.height);
        grad.addColorStop(0, 'rgba(255,255,255,0.15)');
        grad.addColorStop(1, 'rgba(0,0,0,0.2)');
        ctx.fillStyle = grad;
        ctx.fillRect(sx, p.y, p.width, p.height);

        ctx.strokeStyle = 'rgba(0,0,0,0.4)';
        ctx.lineWidth = 1;
        for (let i = 1; i < p.width / 16; i++) {
            ctx.beginPath();
            ctx.moveTo(sx + i * 16, p.y);
            ctx.lineTo(sx + i * 16, p.y + p.height);
            ctx.stroke();
        }
        for (let j = 1; j < p.height / 16; j++) {
            ctx.beginPath();
            ctx.moveTo(sx, p.y + j * 16);
            ctx.lineTo(sx + p.width, p.y + j * 16);
            ctx.stroke();
        }

        ctx.strokeStyle = '#000';
        ctx.strokeRect(sx + 0.5, p.y + 0.5, p.width - 1, p.height - 1);
    }

    drawQuestionBlock(ctx, sx, p) {
        const t = Date.now() / 300;
        const pulse = 0.5 + 0.5 * Math.sin(t);

        ctx.fillStyle = CONFIG.COLORS.QUESTION;
        ctx.fillRect(sx, p.y, p.width, p.height);

        ctx.fillStyle = `rgba(255, 235, 59, ${0.2 + 0.2 * pulse})`;
        ctx.fillRect(sx, p.y, p.width, p.height);

        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeRect(sx + 1, p.y + 1, p.width - 2, p.height - 2);

        ctx.fillStyle = '#FFF';
        ctx.font = 'bold 20px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('?', sx + p.width / 2, p.y + p.height / 2 + 8);
        ctx.textAlign = 'left';

        ctx.fillStyle = '#F57F17';
        ctx.fillRect(sx + 2, p.y + 2, 4, 4);
        ctx.fillRect(sx + p.width - 6, p.y + 2, 4, 4);
        ctx.fillRect(sx + 2, p.y + p.height - 6, 4, 4);
        ctx.fillRect(sx + p.width - 6, p.y + p.height - 6, 4, 4);
    }

    drawFlagpole(ctx, sx, p) {
        ctx.fillStyle = '#E0E0E0';
        ctx.fillRect(sx + 5, p.y, 6, p.height);

        ctx.fillStyle = '#757575';
        ctx.fillRect(sx, p.y + p.height - 12, 16, 12);

        const wave = Math.sin(Date.now() / 200) * 3;
        ctx.fillStyle = '#4CAF50';
        ctx.beginPath();
        ctx.moveTo(sx + 11, p.y + 20);
        ctx.lineTo(sx + 11 + 32, p.y + 25 + wave);
        ctx.lineTo(sx + 11 + 32, p.y + 45 + wave);
        ctx.lineTo(sx + 11, p.y + 50);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#FFF';
        ctx.beginPath();
        ctx.arc(sx + 11 + 16, p.y + 35 + wave, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(sx + 8, p.y + 5, 6, 0, Math.PI * 2);
        ctx.fill();
    }

    drawCastle(ctx, sx, p) {
        ctx.fillStyle = '#8D6E63';
        ctx.fillRect(sx, p.y, p.width, p.height);

        ctx.fillStyle = '#5D4037';
        for (let i = 0; i < 4; i++) {
            ctx.fillRect(sx + i * 16, p.y - 8, 8, 8);
        }

        ctx.fillStyle = '#212121';
        ctx.fillRect(sx + p.width / 2 - 10, p.y + p.height - 30, 20, 30);

        ctx.fillStyle = '#000';
        ctx.fillRect(sx + 10, p.y + 15, 8, 10);
        ctx.fillRect(sx + p.width - 18, p.y + 15, 8, 10);

        ctx.fillStyle = '#FFD700';
        ctx.fillRect(sx + p.width / 2 - 1, p.y - 20, 2, 20);
        ctx.beginPath();
        ctx.moveTo(sx + p.width / 2 + 1, p.y - 20);
        ctx.lineTo(sx + p.width / 2 + 15, p.y - 15);
        ctx.lineTo(sx + p.width / 2 + 1, p.y - 10);
        ctx.fill();
    }

    /* ========================================================
       TUBOS (v1.1 — corrigido + texto "vai ds")
    ======================================================== */

    drawPipes(ctx) {
        const theme = CONFIG.THEMES[this.levelData.theme]
            || CONFIG.THEMES.overworld;
        for (const p of this.levelData.pipes) {
            const sx = p.x - this.cameraX;
            if (sx + p.width < 0 || sx > this.width) continue;
            Tiles.pipe(ctx, sx, p, theme);
        }
    }

    /* ========================================================
       TEXTO "vai ds" NOS TUBOS
    ======================================================== */
    drawPipeText(ctx, sx, pipe, pipeColor) {
        const cx = sx + pipe.width / 2;
        const cy = pipe.y + 20 + (pipe.height - 20) / 2;

        ctx.save();

        /* Fundo escuro para dar contraste */
        const textW = 64;
        const textH = 14;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.fillRect(cx - textW / 2, cy - textH / 2, textW, textH);

        /* Borda decorativa dourada */
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.8)';
        ctx.lineWidth = 1;
        ctx.strokeRect(
            cx - textW / 2 + 0.5,
            cy - textH / 2 + 0.5,
            textW - 1,
            textH - 1
        );

        /* Texto "vai ds" */
        ctx.font = 'bold 9px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        /* Sombra preta */
        ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        ctx.fillText('vai ds', cx + 1, cy + 1);

        /* Texto amarelo brilhante */
        ctx.fillStyle = '#FFD700';
        ctx.shadowBlur = 4;
        ctx.shadowColor = '#FFD700';
        ctx.fillText('vai ds', cx, cy);

        ctx.shadowBlur = 0;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';

        ctx.restore();
    }

    drawCoins(ctx) {
        for (const c of this.coins_entities) {
            const sx = c.x - this.cameraX;
            if (sx + 16 < 0 || sx > this.width) continue;

            const t = c.animTimer * 3;
            const scaleX = Math.abs(Math.cos(t));
            const bob = Math.sin(c.animTimer * 4) * 1.5;

            ctx.save();
            ctx.translate(sx + 8, c.y + 8 + bob);
            ctx.scale(scaleX, 1);

            ctx.fillStyle = '#FFC107';
            ctx.beginPath();
            ctx.arc(0, 0, 8, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#FFEB3B';
            ctx.beginPath();
            ctx.arc(0, 0, 6, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#F57F17';
            ctx.fillRect(-1, -4, 2, 8);

            ctx.restore();
        }
    }
}

/* ============================================================
   BOOT
============================================================ */
window.addEventListener('DOMContentLoaded', () => {
    window.GAME = new Game();
});

window.Game = Game;