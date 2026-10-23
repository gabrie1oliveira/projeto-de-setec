/**
 * ============================================================
 * PLAYER.JS
 * ------------------------------------------------------------
 * Física e controle do jogador (Mario).
 *
 * v2.0 — Sistema de poderes em STACK:
 *   powers = {
 *     suit:    'none'|'fire'|'ice'|'hammer'|'cape',  // exclusivo
 *     baseSize:'small'|'super',                       // exclusivo
 *     temporary: [{ type:'star'|'mega', timer, max }]
 *   }
 *
 * Habilidades ativas:
 *   X → fireball / iceball / martelo / investida (capa)
 *   C → planar (capa no ar) / giro (martelo no chão)
 *
 * Modificadores de run (rng.js) influenciam gravidade, fricção,
 * pulo, dano e habilidades.
 * ============================================================
 */
"use strict";

class Player {
    constructor(x, y) {
        /* Posição e dimensões */
        this.x = x;
        this.y = y;
        this.width = CONFIG.PLAYER.WIDTH;
        this.height = CONFIG.PLAYER.HEIGHT_SMALL;

        /* Física */
        this.vx = 0;
        this.vy = 0;
        this.isGrounded = false;
        this.facingRight = true;

        /* Pulo */
        this.coyoteTimer = 0;
        this.jumpBufferTimer = 0;
        this.jumpHoldTimer = 0;
        this.jumpHeld = false;
        this.airJumpUsed = false;

        /* Estado de poderes (STACK) */
        this.powers = {
            suit: 'none',
            baseSize: 'small',
            temporary: [],
        };

        /* Projéteis (referência ao array do GAME) */
        this.fireballs = [];
        this.fireCooldown = 0;

        /* Habilidades ativas */
        this.specialHeld = false;
        this.dashTimer = 0;
        this.dashCooldown = 0;
        this.spinTimer = 0;
        this.spinCooldown = 0;

        /* Dano */
        this.invulnerable = false;
        this.invulnerableTimer = 0;
        this.hurtTimer = 0;

        /* Vida */
        this.lives = CONFIG.PLAYER.START_LIVES;
        this.dead = false;
        this.deadTimer = 0;

        /* Animação */
        this.animFrame = 0;
        this.animTimer = 0;
        this.animState = 'idle';
        this.blinkTimer = 0;
        this.crouching = false;

        /* Estatísticas */
        this.jumpCount = 0;

        /* Aplica dimensões iniciais */
        this.applySize(false);
    }

    /* ========================================================
       PROPRIEDADES DERIVADAS
    ======================================================== */

    /** Size efetivo (considera temporário mega). */
    get sizeState() {
        if (this.powers.temporary.some(t => t.type === 'mega')) return 'mega';
        return this.powers.baseSize;
    }

    get suit() { return this.powers.suit; }
    get isMega() { return this.sizeState === 'mega'; }
    get isBig() { return this.sizeState === 'super' || this.sizeState === 'mega'; }
    get isFire() { return this.powers.suit === 'fire'; }
    get isStarPowered() { return this.powers.temporary.some(t => t.type === 'star'); }
    get isSpinning() { return this.spinTimer > 0; }

    /** Compat: string resumida do estado de poder. */
    get powerState() {
        if (this.powers.suit !== 'none') return this.powers.suit;
        if (this.isMega) return 'super';
        if (this.powers.baseSize === 'super') return 'super';
        return 'small';
    }

    /* ========================================================
       TAMANHO
    ======================================================== */
    applySize(keepFeet = true) {
        const dims = CONFIG.PLAYER.SIZES[this.sizeState]
            || CONFIG.PLAYER.SIZES.small;
        const bottom = this.y + this.height;
        this.width = dims.width;
        this.height = dims.height;
        if (keepFeet) this.y = bottom - this.height;
    }

    /* ========================================================
       MODIFICADORES DE RUN
    ======================================================== */
    hasMod(id) {
        return !!(window.RunModifier && RunModifier.has(id));
    }

    getGravity() {
        let g = CONFIG.CANVAS.GRAVITY;
        if (this.hasMod('heavy_gravity')) g *= 1.25;
        if (this.hasMod('low_gravity')) g *= 0.75;
        return g;
    }

    getMaxSpeed() {
        let s = CONFIG.PLAYER.MAX_SPEED;
        if (this.isMega) s *= 0.7;
        if (this.dashTimer > 0) s = CONFIG.POWERS.CAPE_DASH_SPEED;
        return s;
    }

    getJumpForce() {
        let j = CONFIG.PLAYER.JUMP_FORCE;
        if (this.isMega) j *= 0.85;
        return j;
    }

    /* ========================================================
       HELPER: retângulo REAL do tubo (altura correta)
    ======================================================== */
    getPipeRect(p) {
        const h = p.height
            ?? (CONFIG.CANVAS.GROUND_Y - p.y)
            ?? 96;

        return {
            x: p.x,
            y: p.y,
            width: p.width,
            height: h,
        };
    }

    /* ========================================================
       UPDATE
    ======================================================== */
    update(dt, keys, levelData, fireballs) {
        if (this.dead) return;

        this.fireballs = fireballs;

        /* Timers */
        if (this.invulnerable) {
            this.invulnerableTimer -= dt;
            if (this.invulnerableTimer <= 0) this.invulnerable = false;
        }
        if (this.hurtTimer > 0) this.hurtTimer -= dt;
        if (this.fireCooldown > 0) this.fireCooldown -= dt;
        if (this.dashCooldown > 0) this.dashCooldown -= dt;
        if (this.spinCooldown > 0) this.spinCooldown -= dt;
        if (this.dashTimer > 0) this.dashTimer -= dt;
        if (this.spinTimer > 0) this.spinTimer -= dt;

        /* Temporários (star/mega) */
        this.updateTemporaries(dt);

        /* Controles */
        const left  = keys['ArrowLeft']  || keys['KeyA'];
        const right = keys['ArrowRight'] || keys['KeyD'];
        const jump  = keys['Space'] || keys['KeyZ'] || keys['ArrowUp'] || keys['KeyW'];
        const down  = keys['ArrowDown'] || keys['KeyS'];
        const shoot = keys['KeyX'] || keys['ShiftRight'];
        const special = keys['KeyC'];

        this.crouching = down && this.isGrounded;

        this.handleHorizontal(dt, left, right);
        this.handleJump(dt, jump);
        this.handleSpecials(dt, special, shoot, left, right);

        if (shoot && !this.canShootDisabled()) this.shootProjectile();

        /* Gravidade (com planar da capa) */
        let gravity = this.getGravity();
        this.vy += gravity;
        const maxFall = (this.powers.suit === 'cape' && special && !this.isGrounded && this.vy > 0)
            ? CONFIG.POWERS.CAPE_GLIDE_FALL
            : CONFIG.PLAYER.MAX_FALL_SPEED;
        if (this.vy > maxFall) this.vy = maxFall;

        /* Colisão X */
        this.x += this.vx;
        this.resolveCollisionsX(levelData);

        /* Colisão Y */
        this.y += this.vy;
        const wasGrounded = this.isGrounded;
        this.isGrounded = false;
        this.resolveCollisionsY(levelData);

        if (this.isGrounded) this.airJumpUsed = false;

        /* Coyote time */
        if (wasGrounded && !this.isGrounded && this.vy >= 0) {
            this.coyoteTimer = CONFIG.PLAYER.COYOTE_FRAMES / 60;
        }
        if (this.coyoteTimer > 0) this.coyoteTimer -= dt;
        if (this.isGrounded) this.coyoteTimer = 0;

        /* Morte por queda */
        if (this.y > levelData.groundY + 200) {
            this.kill();
        }

        this.updateAnimation(dt);
    }

    /* ========================================================
       TEMPORÁRIOS
    ======================================================== */
    updateTemporaries(dt) {
        const temp = this.powers.temporary;
        if (!temp.length) return;

        const prevSize = this.sizeState;

        for (let i = temp.length - 1; i >= 0; i--) {
            const t = temp[i];
            t.timer -= dt;

            if (t.type === 'star' && Math.random() < 0.6) {
                EffectsManager.emitStarTrail(
                    this.x + this.width / 2,
                    this.y + this.height / 2
                );
                if (Math.random() < 0.15 && EffectsManager.emitNote) {
                    EffectsManager.emitNote(
                        this.x + this.width / 2,
                        this.y + this.height / 2
                    );
                }
            }

            if (t.timer <= 0) {
                const wasType = t.type;
                Utils.removeAt(temp, i);
                this.onTemporaryEnd(wasType);
            }
        }

        if (this.sizeState !== prevSize) {
            this.applySize(true);
        }
    }

    onTemporaryEnd(type) {
        if (type === 'star') {
            EffectsManager.text(
                this.x + this.width / 2, this.y - 10,
                'FIM!', { color: '#FF9800', size: 10, life: 0.8 }
            );
        } else if (type === 'mega') {
            this.applySize(true);
            SoundManager.playPowerDown();
            EffectsManager.emitSparkles(
                this.x + this.width / 2, this.y + this.height / 2,
                8, CONFIG.COLORS.MEGA_MAGENTA
            );
        }
    }

    addTemporary(type, duration) {
        const temp = this.powers.temporary;
        /* Renova se já existir */
        const existing = temp.find(t => t.type === type);
        if (existing) {
            existing.timer = duration;
            existing.max = duration;
        } else {
            temp.push({ type, timer: duration, max: duration });
        }
    }

    /* ========================================================
       CONTROLE HORIZONTAL
    ======================================================== */
    handleHorizontal(dt, left, right) {
        const onGround = this.isGrounded;
        const accel = CONFIG.PLAYER.ACCEL;
        let friction = onGround
            ? CONFIG.PLAYER.FRICTION
            : CONFIG.PLAYER.AIR_FRICTION;

        if (this.hasMod('slippery_floor') && onGround) friction = 0.95;

        if (this.hurtTimer > 0) {
            this.vx *= 0.95;
            return;
        }

        /* Durante a investida da capa: mantém velocidade */
        if (this.dashTimer > 0) return;

        if (left && !right) {
            this.vx -= accel;
            this.facingRight = false;
        } else if (right && !left) {
            this.vx += accel;
            this.facingRight = true;
        } else {
            this.vx *= friction;
            if (Math.abs(this.vx) < 0.05) this.vx = 0;
        }

        const maxSpeed = this.getMaxSpeed();
        this.vx = Utils.clamp(this.vx, -maxSpeed, maxSpeed);
    }

    /* ========================================================
       PULO
    ======================================================== */
    handleJump(dt, jumpPressed) {
        if (jumpPressed && !this.jumpHeld) {
            this.jumpBufferTimer = CONFIG.PLAYER.JUMP_BUFFER_FRAMES / 60;
        }
        this.jumpHeld = jumpPressed;

        if (this.jumpBufferTimer > 0) this.jumpBufferTimer -= dt;

        const canGroundJump = this.isGrounded || this.coyoteTimer > 0;
        const canAirJump = this.hasMod('double_jump')
            && !this.airJumpUsed
            && !canGroundJump
            && !this.isGrounded;

        if (this.jumpBufferTimer > 0 && (canGroundJump || canAirJump)) {
            this.vy = this.getJumpForce();
            if (canAirJump) {
                this.airJumpUsed = true;
                EffectsManager.emitSparkles(
                    this.x + this.width / 2, this.y + this.height,
                    6, '#4FC3F7'
                );
            }
            this.isGrounded = false;
            this.coyoteTimer = 0;
            this.jumpBufferTimer = 0;
            this.jumpHoldTimer = CONFIG.PLAYER.JUMP_HOLD_FRAMES / 60;
            this.jumpCount++;

            if (this.isBig) SoundManager.playBigJump();
            else SoundManager.playJump();

            EffectsManager.emitDust(
                this.x + this.width / 2,
                this.y + this.height,
                5,
                '#FFFFFF'
            );
        }

        if (this.jumpHoldTimer > 0) {
            /* Iron Boots: pula sempre no máximo */
            if (this.hasMod('iron_boots')) {
                this.jumpHoldTimer = 0;
            } else if (jumpPressed && this.vy < 0) {
                this.jumpHoldTimer -= dt;
            } else {
                if (this.vy < 0) this.vy *= 0.5;
                this.jumpHoldTimer = 0;
            }
        }
    }

    /* ========================================================
       HABILIDADES ESPECIAIS (C / investida)
    ======================================================== */
    handleSpecials(dt, special, shoot, left, right) {
        const justPressed = special && !this.specialHeld;
        this.specialHeld = special;

        /* Cape: investida no chão com X */
        if (this.powers.suit === 'cape') {
            if (shoot && this.isGrounded && this.dashCooldown <= 0) {
                this.startDash(left, right);
            }
        }

        /* Hammer: giro com C no chão */
        if (this.powers.suit === 'hammer') {
            if (justPressed && this.isGrounded && this.spinCooldown <= 0) {
                this.startSpin();
            }
        }
    }

    startDash(left, right) {
        const dir = right ? 1 : (left ? -1 : (this.facingRight ? 1 : -1));
        this.facingRight = dir > 0;
        this.vx = CONFIG.POWERS.CAPE_DASH_SPEED * dir;
        this.dashTimer = CONFIG.POWERS.CAPE_DASH_TIME;
        this.dashCooldown = CONFIG.POWERS.CAPE_DASH_COOLDOWN;

        SoundManager.playCapeDash();
        EffectsManager.emitDust(
            this.x + this.width / 2, this.y + this.height,
            8, '#E53935'
        );
        EffectsManager.text(
            this.x + this.width / 2, this.y - 10,
            'DASH!', { color: '#E53935', size: 10, life: 0.6 }
        );
    }

    startSpin() {
        this.spinTimer = 0.5;
        this.spinCooldown = CONFIG.POWERS.HAMMER_SPIN_COOLDOWN;
        this.invulnerable = true;
        this.invulnerableTimer = Math.max(
            this.invulnerableTimer, CONFIG.POWERS.HAMMER_SPIN_INVULN
        );

        SoundManager.playHammer();
        EffectsManager.emitSparkles(
            this.x + this.width / 2, this.y + this.height / 2,
            10, CONFIG.COLORS.HAMMER_BROWN
        );
    }

    canShootDisabled() {
        if (this.hasMod('pacifist')) return true;
        return false;
    }

    /* ========================================================
       COLISÕES
    ======================================================== */

    resolveCollisionsX(levelData) {
        for (const p of levelData.platforms) {
            if (p.type === 'flagpole' || p.broken) continue;
            if (!Utils.aabb(this, p)) continue;

            /* Fragile World: blocos quebram ao toque lateral */
            if ((p.type === 'brick' || p.type === 'ice')
                && this.hasMod('fragile_world')) {
                p.broken = true;
                EffectsManager.emitExplosion(
                    p.x + p.width / 2, p.y + p.height / 2, '#D32F2F'
                );
                continue;
            }

            /* Mega destrói blocos ao tocar */
            if (this.isMega && (p.type === 'brick' || p.type === 'ice' || p.type === 'question')) {
                p.broken = true;
                EffectsManager.emitExplosion(
                    p.x + p.width / 2, p.y + p.height / 2, CONFIG.COLORS.MEGA_MAGENTA
                );
                SoundManager.playStomp();
                continue;
            }

            if (this.vx > 0) this.x = p.x - this.width;
            else if (this.vx < 0) this.x = p.x + p.width;
            this.vx = 0;
        }

        for (const p of levelData.pipes) {
            const r = this.getPipeRect(p);
            if (Utils.aabb(this, r)) {
                if (this.vx > 0) this.x = r.x - this.width;
                else if (this.vx < 0) this.x = r.x + r.width;
                this.vx = 0;
            }
        }

        /* Inimigos congelados funcionam como paredes sólidas */
        for (const e of (levelData._frozenEnemies || [])) {
            const r = { x: e.x, y: e.y, width: e.width, height: e.height };
            if (Utils.aabb(this, r)) {
                if (this.vx > 0) this.x = r.x - this.width;
                else if (this.vx < 0) this.x = r.x + r.width;
                this.vx = 0;
            }
        }
    }

    resolveCollisionsY(levelData) {
        const inGap = levelData.gaps.some(g =>
            this.x + this.width / 2 >= g.x &&
            this.x + this.width / 2 <= g.x + g.width
        );

        if (!inGap && this.y + this.height >= levelData.groundY) {
            this.y = levelData.groundY - this.height;
            this.vy = 0;
            this.isGrounded = true;
        }

        for (const p of levelData.platforms) {
            if (p.type === 'flagpole' || p.broken) continue;
            if (!Utils.aabb(this, p)) continue;

            if (this.vy > 0 && this.y + this.height - this.vy <= p.y + 8) {
                this.y = p.y - this.height;
                this.vy = 0;
                this.isGrounded = true;
            } else if (this.vy < 0) {
                this.y = p.y + p.height;
                this.vy = 0;

                /* Mega destrói blocos; "?" dá item; brick/ice são sólidos
                   para Mario normal (NÃO quebra — só som) */
                if (this.isMega && (p.type === 'brick' || p.type === 'ice' || p.type === 'question')) {
                    p.broken = true;
                    EffectsManager.emitExplosion(
                        p.x + p.width / 2, p.y + p.height / 2,
                        CONFIG.COLORS.MEGA_MAGENTA
                    );
                } else if (p.type === 'question' && p.item) {
                    this.hitQuestionBlock(p, levelData);
                } else {
                    SoundManager.playStomp();
                }
            }
        }

        for (const p of levelData.pipes) {
            const r = this.getPipeRect(p);
            if (!Utils.aabb(this, r)) continue;

            if (this.vy > 0 && this.y + this.height - this.vy <= r.y + 8) {
                this.y = r.y - this.height;
                this.vy = 0;
                this.isGrounded = true;
            } else if (this.vy < 0) {
                this.y = r.y + r.height;
                this.vy = 0;
            }
        }

        /* Inimigos congelados: pisa em cima, bate a cabeça embaixo */
        for (const e of (levelData._frozenEnemies || [])) {
            const r = { x: e.x, y: e.y, width: e.width, height: e.height };
            if (!Utils.aabb(this, r)) continue;

            if (this.vy > 0 && this.y + this.height - this.vy <= r.y + 8) {
                this.y = r.y - this.height;
                this.vy = 0;
                this.isGrounded = true;
            } else if (this.vy < 0) {
                this.y = r.y + r.height;
                this.vy = 0;
            }
        }
    }

    hitQuestionBlock(block, levelData) {
        SoundManager.playCoin();

        /* Raridade definida no load da fase (ou rola agora) */
        const rarity = block.rarity || Item.rollRarity();
        const reward = Item.rewardForRarity(rarity, block.item);

        if (reward.itemType === 'coin' && reward.coins === 0) {
            EffectsManager.textScore(block.x + 16, block.y - 12, CONFIG.SCORE.COIN);
            if (window.GAME) {
                GAME.addScore(CONFIG.SCORE.COIN);
                GAME.addCoin(1);
            }
        } else if (reward.itemType) {
            if (window.GAME && GAME.spawnItem) {
                GAME.spawnItem(block.x + 4, block.y - 24, reward.itemType);
            } else {
                levelData.items.push(new Item(block.x + 4, block.y - 24, reward.itemType));
            }
            EffectsManager.text(block.x + 16, block.y - 12, 'POWER!', {
                color: '#FFF',
                size: 10,
            });
        }

        /* Bônus épico: 1-UP + explosão de moedas */
        if (reward.oneUp && window.GAME) {
            GAME.addLife();
            EffectsManager.text1UP(block.x + 16, block.y - 30);
            GAME.spawnCoinBurst(block.x + 16, block.y - 20, reward.coins);
        }

        block.item = null;
        block.type = 'used';

        EffectsManager.emitSparkles(
            block.x + 16, block.y,
            6,
            rarity === 'rare' || rarity === 'epic' ? '#FFD700' : '#FFEB3B'
        );
    }

    /** Usado pelo martelo (item.js) ao acertar um bloco "?". */
    breakQuestionFromBelow(block, levelData) {
        if (block.item) this.hitQuestionBlock(block, levelData);
        else {
            block.type = 'used';
            SoundManager.playStomp();
        }
    }

    /* ========================================================
       DANO / PODER
    ======================================================== */
    takeDamage(instantKill = false) {
        if (this.dead) return;
        if (this.invulnerable && !instantKill) return;
        if (this.isStarPowered && !instantKill) return;
        if (this.isMega && !instantKill) return;

        if (instantKill) {
            this.kill();
            return;
        }

        /* Glass Cannon: morre em 1 hit */
        if (this.hasMod('glass_cannon')) {
            this.kill();
            return;
        }

        if (this.powers.suit !== 'none') {
            this.powers.suit = 'none';
            this.applyDamage();
        } else if (this.powers.baseSize === 'super') {
            this.powers.baseSize = 'small';
            this.applySize(true);
            this.applyDamage();
        } else {
            this.kill();
        }
    }

    applyDamage() {
        this.invulnerable = true;
        this.invulnerableTimer = CONFIG.PLAYER.INVULN_TIME;
        this.hurtTimer = 0.3;
        this.vx = this.facingRight ? -4 : 4;
        this.vy = -6;

        SoundManager.playPowerDown();
        EffectsManager.vignetteRed(0.5);
        EffectsManager.flashScreen('#FF0000', 0.4);
        EffectsManager.shake(8, 0.4);
    }

    kill() {
        if (this.dead) return;
        this.dead = true;
        this.vy = -10;
        this.vx = 0;

        SoundManager.stopMusic();
        SoundManager.playHit();
        EffectsManager.flashScreen('#FFF', 0.6);

        if (window.GAME && GAME.onPlayerDeath) {
            GAME.onPlayerDeath();
        }
    }

    /* ========================================================
       COLETA DE POWER-UPS
    ======================================================== */
    collectPowerUp(type) {
        switch (type) {
            case 'mushroom':   this.gainSize(); break;
            case 'fireflower': this.gainSuit('fire', 'FIRE!', '#FF9800'); break;
            case 'iceflower':  this.gainSuit('ice', 'ICE!', CONFIG.COLORS.ICE_BLUE); break;
            case 'hammer':     this.gainSuit('hammer', 'MARTELO!', CONFIG.COLORS.HAMMER_BROWN); break;
            case 'cape':       this.gainSuit('cape', 'CAPA!', CONFIG.COLORS.CAPE_RED); break;
            case 'mega':       this.gainTemporary('mega', CONFIG.POWERS.MEGA_DURATION, 'MEGA!', CONFIG.COLORS.MEGA_MAGENTA); break;
            case 'star':       this.gainStar(); break;
        }
    }

    gainSize() {
        if (this.powers.baseSize === 'small') {
            this.powers.baseSize = 'super';
            this.applySize(true);
            EffectsManager.text(this.x + this.width / 2, this.y - 10, 'SUPER!',
                { color: '#4CAF50', size: 12 });
        } else if (window.GAME) {
            GAME.addScore(200);
        }
        SoundManager.playPowerUp();
        EffectsManager.emitSparkles(
            this.x + this.width / 2, this.y + this.height / 2, 10, '#4CAF50'
        );
    }

    gainSuit(suit, label, color) {
        const wasSmall = this.powers.baseSize === 'small';
        this.powers.suit = suit;
        /* Suits são "grandes" por padrão */
        if (wasSmall) {
            this.powers.baseSize = 'super';
            this.applySize(true);
        }
        SoundManager.playPowerUp();
        EffectsManager.emitSparkles(
            this.x + this.width / 2, this.y + this.height / 2, 12, color
        );
        EffectsManager.text(this.x + this.width / 2, this.y - 10, label,
            { color, size: 12 });
    }

    gainTemporary(type, duration, label, color) {
        this.addTemporary(type, duration);
        this.applySize(true);
        SoundManager.playPowerUp();
        EffectsManager.emitSparkles(
            this.x + this.width / 2, this.y + this.height / 2, 14, color
        );
        EffectsManager.text(this.x + this.width / 2, this.y - 10, label,
            { color, size: 13, life: 1.2 });
        EffectsManager.flashScreen(color, 0.25);
    }

    gainStar() {
        this.addTemporary('star', CONFIG.POWERS.STAR_DURATION);
        SoundManager.playPowerUp();
        EffectsManager.emitSparkles(
            this.x + this.width / 2, this.y + this.height / 2, 15, '#FFD700'
        );
        EffectsManager.text(this.x + this.width / 2, this.y - 10, 'INVENCÍVEL!',
            { color: '#FFD700', size: 12, life: 1.5 });
        EffectsManager.flashScreen('#FFD700', 0.5);
    }

    /* ========================================================
       PROJÉTEIS
    ======================================================== */
    shootProjectile() {
        if (this.fireCooldown > 0) return;
        if (!this.fireballs) return;
        if (this.fireballs.length >= CONFIG.ITEM.MAX_PROJECTILES) return;

        const suit = this.powers.suit;
        if (suit === 'none' || suit === 'cape') return;   // capa usa dash no chão

        const x = this.facingRight ? this.x + this.width : this.x - 12;
        const y = this.y + Math.min(12, this.height / 2);
        const dir = this.facingRight ? 1 : -1;

        if (suit === 'fire') {
            this.fireballs.push(new Fireball(
                x, y, dir * CONFIG.ITEM.FIREBALL_SPEED_X, 'player'
            ));
            SoundManager.playFireball();
            EffectsManager.emitSparkles(x, y + 5, 4, '#FF6D00');
        } else if (suit === 'ice') {
            this.fireballs.push(new Iceball(
                x, y, dir * CONFIG.POWERS.ICEBALL_SPEED_X
            ));
            SoundManager.playIce();
            EffectsManager.emitSparkles(x, y + 6, 4, CONFIG.COLORS.ICE_BLUE);
        } else if (suit === 'hammer') {
            this.fireballs.push(new Hammer(x, y, dir * CONFIG.POWERS.HAMMER_SPEED_X));
            SoundManager.playHammer();
            EffectsManager.emitSparkles(x, y + 8, 3, CONFIG.COLORS.HAMMER_BROWN);
        }

        this.fireCooldown = CONFIG.PLAYER.FIRE_COOLDOWN;
    }

    /* ========================================================
       ANIMAÇÃO
    ======================================================== */
    updateAnimation(dt) {
        const absVx = Math.abs(this.vx);

        if (this.crouching) {
            this.animState = 'crouch';
        } else if (!this.isGrounded) {
            this.animState = this.vy < 0 ? 'jump' : 'fall';
        } else if (this.dashTimer > 0) {
            this.animState = 'dash';
        } else if (absVx > 0.5) {
            const movingRight = this.vx > 0;
            this.animState = (movingRight !== this.facingRight) ? 'skid' : 'walk';
        } else {
            this.animState = 'idle';
        }

        /* Blink do idle */
        this.blinkTimer += dt;
        if (this.blinkTimer > 3.2) this.blinkTimer = 0;

        this.animTimer += dt;
        const frameSpeed = this.animState === 'walk'
            ? Math.max(0.04, 0.12 - absVx * 0.015)
            : 0.15;

        if (this.animTimer > frameSpeed) {
            this.animTimer = 0;
            this.animFrame = (this.animFrame + 1) % 4;
        }
    }

    /* ========================================================
       DRAW
    ======================================================== */
    draw(ctx, cameraX) {
        if (this.invulnerable && !this.isStarPowered
            && Math.floor(Date.now() / 80) % 2 === 0) return;

        const starPhase = this.isStarPowered
            ? Math.floor(Date.now() / 60) % 6
            : -1;

        const sx = this.x - cameraX;

        ctx.save();
        if (!this.facingRight) {
            ctx.translate(sx + this.width, this.y);
            ctx.scale(-1, 1);
        } else {
            ctx.translate(sx, this.y);
        }

        /* Escala por tamanho */
        const baseW = CONFIG.PLAYER.WIDTH;
        const baseH = CONFIG.PLAYER.HEIGHT_SMALL;
        const scaleX = this.width / baseW;
        const scaleY = this.height / baseH;
        ctx.scale(scaleX, scaleY);

        /* Capa atrás do corpo */
        if (this.powers.suit === 'cape' || this.isMega) {
            this.drawCape(ctx);
        }

        const colors = this.getColors(starPhase);
        this.drawMario(ctx, colors, starPhase);

        ctx.restore();
    }

    drawCape(ctx) {
        const flap = Math.sin(Date.now() / 120) * 3;
        const capeColor = this.isMega ? CONFIG.COLORS.MEGA_MAGENTA : CONFIG.COLORS.CAPE_RED;
        ctx.fillStyle = capeColor;
        ctx.beginPath();
        ctx.moveTo(3, 13);
        ctx.quadraticCurveTo(-6 + flap, 21, -3 + flap * 0.6, 31);
        ctx.lineTo(5, 28);
        ctx.lineTo(8, 15);
        ctx.closePath();
        ctx.fill();
    }

    getColors(starPhase) {
        const base = {
            cap:     '#D32F2F',
            capDark: '#B71C1C',
            skin:    '#FFCC80',
            hair:    '#3E2723',
            shirt:   '#D32F2F',
            overall: '#1976D2',
            shoe:    '#3E2723',
            button:  '#FFD700',
        };

        const suit = this.powers.suit;
        if (suit === 'fire') {
            base.cap = '#FFFFFF'; base.capDark = '#E0E0E0';
            base.shirt = '#FFFFFF'; base.overall = '#E53935';
        } else if (suit === 'ice') {
            base.cap = CONFIG.COLORS.ICE_BLUE; base.capDark = CONFIG.COLORS.ICE_DEEP;
            base.shirt = '#E1F5FE'; base.overall = CONFIG.COLORS.ICE_DEEP;
        } else if (suit === 'hammer') {
            base.cap = CONFIG.COLORS.HAMMER_BROWN; base.capDark = CONFIG.COLORS.HAMMER_DARK;
            base.shirt = CONFIG.COLORS.HAMMER_BROWN; base.overall = CONFIG.COLORS.HAMMER_DARK;
        } else if (suit === 'cape') {
            base.cap = CONFIG.COLORS.CAPE_RED; base.capDark = '#B71C1C';
            base.shirt = CONFIG.COLORS.CAPE_RED; base.overall = '#1976D2';
        }

        if (starPhase >= 0) {
            const palette = ['#FFD700', '#FF5252', '#4CAF50', '#2196F3', '#9C27B0', '#FFFFFF'];
            const c = palette[starPhase % palette.length];
            base.cap = c;
            base.shirt = c;
            base.overall = palette[(starPhase + 2) % palette.length];
        }

        return base;
    }

    drawMario(ctx, c, starPhase) {
        const H = CONFIG.PLAYER.HEIGHT_SMALL;
        const scaleY = 1;

        /* Corpo encolhido (crouch) */
        if (this.animState === 'crouch') {
            ctx.save();
            ctx.scale(1, 0.7);
        }

        /* Boné */
        ctx.fillStyle = c.cap;
        ctx.fillRect(2, 0, 18, 8 * scaleY);
        ctx.fillRect(8, 2 * scaleY, 14, 4);
        ctx.fillStyle = c.capDark;
        ctx.fillRect(2, 6 * scaleY, 18, 2);

        /* Rosto */
        ctx.fillStyle = c.skin;
        ctx.fillRect(4, 8 * scaleY, 14, 10);

        /* Cabelo */
        ctx.fillStyle = c.hair;
        ctx.fillRect(4, 8 * scaleY, 3, 2);
        ctx.fillRect(15, 8 * scaleY, 3, 2);

        /* Olho (blink quando idle) */
        ctx.fillStyle = '#000';
        const blinking = this.animState === 'idle' && this.blinkTimer > 3.0;
        if (blinking) {
            ctx.fillRect(12, 11 * scaleY, 4, 1);
        } else if (this.animState === 'idle' || this.animState === 'walk'
                   || this.animState === 'crouch') {
            ctx.fillRect(13, 10 * scaleY, 2, 3);
        } else {
            ctx.fillRect(13, 11 * scaleY, 2, 2);
        }

        /* Bigode */
        ctx.fillStyle = c.hair;
        ctx.fillRect(10, 13 * scaleY, 8, 3);

        /* Camisa */
        ctx.fillStyle = c.shirt;
        ctx.fillRect(4, 18 * scaleY, 16, 6);

        /* Macacão */
        ctx.fillStyle = c.overall;
        ctx.fillRect(4, 22 * scaleY, 16, H - 24);

        /* Botões */
        ctx.fillStyle = c.button;
        ctx.fillRect(6, 19 * scaleY, 2, 2);
        ctx.fillRect(16, 19 * scaleY, 2, 2);

        /* Braços conforme estado */
        ctx.fillStyle = c.shirt;
        if (this.animState === 'jump' || this.animState === 'fall') {
            ctx.fillRect(0, 14 * scaleY, 4, 7);
            ctx.fillRect(20, 14 * scaleY, 4, 7);
        } else if (this.animState === 'walk') {
            const off = (this.animFrame % 2 === 0) ? 0 : 1;
            ctx.fillRect(0, (18 - off) * scaleY, 4, 6);
            ctx.fillRect(20, (18 + off) * scaleY, 4, 6);
        } else if (this.animState === 'dash') {
            ctx.fillRect(-2, 16 * scaleY, 6, 6);
            ctx.fillRect(20, 16 * scaleY, 4, 6);
        } else {
            ctx.fillRect(0, 18 * scaleY, 4, 6);
            ctx.fillRect(20, 18 * scaleY, 4, 6);
        }

        /* Mãos */
        ctx.fillStyle = '#FFF';
        ctx.fillRect(0, 24 * scaleY, 4, 3);
        ctx.fillRect(20, 24 * scaleY, 4, 3);

        /* Sapatos */
        const shoeY = H - 6;
        ctx.fillStyle = c.shoe;

        if (this.animState === 'jump' || this.animState === 'fall') {
            ctx.fillRect(0, shoeY - 2, 9, 6);
            ctx.fillRect(15, shoeY - 4, 9, 6);
        } else if (this.animState === 'walk' || this.animState === 'dash') {
            const off = (this.animFrame % 2 === 0) ? 0 : 2;
            ctx.fillRect(1, shoeY + off, 9, 6);
            ctx.fillRect(14, shoeY - off, 9, 6);
        } else if (this.animState === 'skid') {
            ctx.fillRect(0, shoeY, 10, 6);
            ctx.fillRect(14, shoeY, 10, 6);
        } else {
            ctx.fillRect(2, shoeY, 8, 6);
            ctx.fillRect(14, shoeY, 8, 6);
        }

        /* Rastro arco-íris da estrela */
        if (starPhase >= 0) {
            ctx.globalAlpha = 0.5;
            ctx.fillStyle = ['#FFD700', '#FF5252', '#4CAF50', '#2196F3'][starPhase % 4];
            ctx.fillRect(-6, 4, 4, H - 8);
            ctx.globalAlpha = 1;
        }

        if (this.animState === 'crouch') ctx.restore();
    }

    getRect() {
        return { x: this.x, y: this.y, width: this.width, height: this.height };
    }
}

window.Player = Player;
