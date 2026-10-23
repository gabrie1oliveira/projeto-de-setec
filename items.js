/**
 * ============================================================
 * ITEMS.JS
 * ------------------------------------------------------------
 * Power-ups colecionáveis e projéteis do jogo.
 *
 * Power-ups:
 *   - Mushroom     → cresce (small → super)
 *   - FireFlower   → suit de fogo
 *   - IceFlower    → suit de gelo (congela inimigos)
 *   - Hammer       → suit de martelo (projétil em arco)
 *   - Cape         → suit de capa (planar + investida)
 *   - Mega         → gigante destruidor (temporário)
 *   - Star         → invencibilidade temporária
 *   - Coin         → +1 moeda
 *
 * Projéteis:
 *   - Fireball     → quica no chão
 *   - Iceball      → quica e congela
 *   - Hammer       → arco + rotação, quebra blocos
 *   - BossFireball → projétil do chefão
 * ============================================================
 */
"use strict";

/* ============================================================
   ITEM BASE (power-up)
============================================================ */
class Item {
    constructor(x, y, type) {
        /* Blindagem: poder "mini" foi removido do jogo */
        if (type === 'mini') {
            if (window.DEBUG) {
                console.warn('[Item] Poder "mini" foi desativado. Ignorando.');
            }
            this.x = x;
            this.y = y;
            this.width = 0;
            this.height = 0;
            this.type = type;
            this.active = false;
            this.collected = true;
            this.mobile = false;
            this.gravity = 0;
            this.animTimer = 0;
            return;
        }

        this.x = x;
        this.y = y;
        this.width = 24;
        this.height = 24;
        this.type = type;
        this.vx = 0;
        this.vy = 0;
        this.collected = false;
        this.active = true;
        this.spawnY = y;
        this.spawnTimer = 0.5;      // sobe do bloco antes de andar
        this.isRising = true;
        this.facing = 1;
        this.animTimer = 0;

        /* Power-ups móveis (andam sozinhos) */
        this.mobile = (type === 'mushroom' || type === 'star');

        if (type === 'mushroom') {
            this.vx = CONFIG.ITEM.MUSHROOM_SPEED;
        } else if (type === 'star') {
            this.vx = CONFIG.ITEM.STAR_SPEED;
            this.vy = -3;   // pequeno pulo ao sair do bloco
        }

        /* Estrela é afetada por gravidade */
        this.gravity = type === 'star' ? 0.4 : 0;
    }

    /* ========================================================
       RARIDADE
    ======================================================== */

    /**
     * Sorteia uma raridade conforme CONFIG.RARITY.
     * @param {function} [rng] função aleatória (default Math.random)
     * @returns {'common'|'uncommon'|'rare'|'epic'}
     */
    static rollRarity(rng = Math.random) {
        const r = rng();
        const { COMMON, UNCOMMON, RARE } = CONFIG.RARITY;
        if (r < COMMON) return 'common';
        if (r < COMMON + UNCOMMON) return 'uncommon';
        if (r < COMMON + UNCOMMON + RARE) return 'rare';
        return 'epic';
    }

    /**
     * Define a recompensa de um bloco "?" conforme raridade.
     * @param {string} rarity
     * @param {string} authoredItem  item originalmente projetado na fase
     * @returns {{itemType:string|null, coins:number, oneUp:boolean, rarity:string}}
     */
    static rewardForRarity(rarity, authoredItem, rng = Math.random) {
        const rarePool = ['iceflower', 'hammer', 'cape', 'mega'];
        const pick = (arr) => arr[Math.floor(rng() * arr.length)];

        switch (rarity) {
            case 'uncommon':
                return {
                    itemType: pick(['fireflower', 'star']),
                    coins: 0, oneUp: false, rarity,
                };
            case 'rare':
                return { itemType: pick(rarePool), coins: 0, oneUp: false, rarity };
            case 'epic':
                return { itemType: 'mushroom', coins: 5, oneUp: true, rarity };
            default:
                return {
                    itemType: authoredItem || 'coin',
                    coins: 0, oneUp: false, rarity: 'common',
                };
        }
    }

    /* ========================================================
       UPDATE
    ======================================================== */
    update(dt, levelData) {
        if (this.collected || !this.active) return;

        this.animTimer += dt;

        if (this.isRising) {
            this.y -= 40 * dt;
            this.spawnTimer -= dt;
            if (this.spawnTimer <= 0) {
                this.isRising = false;
            }
            return;
        }

        /* Movimento horizontal (só power-ups móveis) */
        if (this.mobile) {
            this.x += this.vx;

            for (const p of levelData.pipes) {
                const pipeRect = this.getPipeRect(p);
                if (Utils.aabb(this, pipeRect)) {
                    if (this.vx > 0) this.x = pipeRect.x - this.width;
                    else this.x = pipeRect.x + pipeRect.width;
                    this.vx *= -1;
                    this.facing *= -1;
                }
            }

            for (const p of levelData.platforms) {
                if (p.type === 'flagpole') continue;
                if (Utils.aabb(this, p)) {
                    if (this.vx > 0) this.x = p.x - this.width;
                    else this.x = p.x + p.width;
                    this.vx *= -1;
                    this.facing *= -1;
                }
            }
        }

        /* Gravidade (só estrela) */
        if (this.gravity > 0) {
            this.vy += this.gravity;
            this.y += this.vy;

            if (this.y + this.height >= levelData.groundY) {
                this.y = levelData.groundY - this.height;
                this.vy = -6;
            }

            for (const p of levelData.platforms) {
                if (p.type === 'flagpole') continue;
                if (this.vy > 0 && Utils.aabb(this, p)) {
                    this.y = p.y - this.height;
                    this.vy = -5;
                }
            }
        }
    }

    getPipeRect(p) {
        return {
            x: p.x,
            y: p.y,
            width: p.width,
            height: p.height ?? 200,
        };
    }

    /* ========================================================
       DRAW
    ======================================================== */
    draw(ctx, cameraX) {
        if (this.collected || !this.active) return;
        const sx = this.x - cameraX;

        /* Brilho pulsante ao redor */
        const pulse = 0.5 + 0.5 * Math.sin(this.animTimer * 6);
        ctx.save();
        ctx.globalAlpha = 0.4 * pulse;
        ctx.fillStyle = this.getGlowColor();
        ctx.beginPath();
        ctx.arc(sx + 12, this.y + 12, 18 + pulse * 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        switch (this.type) {
            case 'mushroom':   this.drawMushroom(ctx, sx, false); break;
            case 'mega':       this.drawMushroom(ctx, sx, true);  break;
            case 'fireflower': this.drawFlower(ctx, sx, '#FF5722', '#FFB74D'); break;
            case 'iceflower':  this.drawFlower(ctx, sx, '#4FC3F7', '#B3E5FC'); break;
            case 'hammer':     this.drawHammer(ctx, sx);          break;
            case 'cape':       this.drawCape(ctx, sx);            break;
            case 'star':       this.drawStar(ctx, sx);            break;
            case 'coin':       this.drawCoin(ctx, sx);            break;
        }
    }

    getGlowColor() {
        return {
            mushroom: '#FF5252',
            mega:     '#D81B60',
            fireflower: '#FFB74D',
            iceflower:  '#4FC3F7',
            hammer:     '#A1887F',
            cape:       '#E53935',
            star:       '#FFD700',
            coin:       '#FFEB3B',
        }[this.type] || '#FFFFFF';
    }

    drawMushroom(ctx, sx, mega) {
        const cap = mega ? '#D81B60' : '#E53935';
        const capDark = mega ? '#AD1457' : '#B71C1C';
        const scale = mega ? 1.15 : 1;

        ctx.save();
        ctx.translate(sx + 12, this.y + 12);
        ctx.scale(scale, scale);
        ctx.translate(-12, -12);

        /* Talo */
        ctx.fillStyle = '#FFF8E1';
        ctx.fillRect(6, 14, 12, 10);

        /* Chapéu */
        ctx.fillStyle = cap;
        ctx.beginPath();
        ctx.arc(12, 12, 12, Math.PI, 0);
        ctx.fill();
        ctx.fillRect(0, 12, 24, 4);

        /* Borda escura do chapéu */
        ctx.fillStyle = capDark;
        ctx.fillRect(0, 14, 24, 2);

        /* Bolinhas */
        ctx.fillStyle = '#FFF';
        ctx.beginPath();
        ctx.arc(7, 7, 2.5, 0, Math.PI * 2);
        ctx.arc(17, 7, 2.5, 0, Math.PI * 2);
        ctx.arc(12, 3, 2, 0, Math.PI * 2);
        ctx.fill();

        /* Olhos */
        ctx.fillStyle = '#000';
        ctx.fillRect(8, 17, 2, 3);
        ctx.fillRect(14, 17, 2, 3);

        ctx.restore();

        /* Coroa de brilho no mega */
        if (mega) {
            ctx.save();
            ctx.globalAlpha = 0.7 + 0.3 * Math.sin(this.animTimer * 8);
            ctx.strokeStyle = '#FFEB3B';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(sx + 12, this.y + 12, 20, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
    }

    drawFlower(ctx, sx, c1, c2) {
        const t = this.animTimer * 4;

        /* Talo */
        ctx.fillStyle = '#4CAF50';
        ctx.fillRect(sx + 10, this.y + 14, 4, 10);

        /* Folhas */
        ctx.beginPath();
        ctx.ellipse(sx + 6, this.y + 18, 4, 2, -0.3, 0, Math.PI * 2);
        ctx.ellipse(sx + 18, this.y + 18, 4, 2, 0.3, 0, Math.PI * 2);
        ctx.fill();

        /* Pétalas rotativas */
        const colors = [c1, c2, '#FFF'];
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI * 2 * i) / 6 + t;
            const px = sx + 12 + Math.cos(angle) * 7;
            const py = this.y + 9 + Math.sin(angle) * 7;
            ctx.fillStyle = colors[i % colors.length];
            ctx.beginPath();
            ctx.arc(px, py, 4, 0, Math.PI * 2);
            ctx.fill();
        }

        /* Centro */
        ctx.fillStyle = '#FFF';
        ctx.beginPath();
        ctx.arc(sx + 12, this.y + 9, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFC107';
        ctx.beginPath();
        ctx.arc(sx + 12, this.y + 9, 2, 0, Math.PI * 2);
        ctx.fill();
    }

    drawHammer(ctx, sx) {
        ctx.save();
        ctx.translate(sx + 12, this.y + 12);
        ctx.rotate(Math.sin(this.animTimer * 4) * 0.35);

        /* Cabo */
        ctx.fillStyle = CONFIG.COLORS.HAMMER_BROWN;
        ctx.fillRect(-2, -2, 4, 14);

        /* Cabeça */
        ctx.fillStyle = CONFIG.COLORS.HAMMER_DARK;
        ctx.fillRect(-10, -10, 20, 10);
        ctx.fillStyle = '#9E9E9E';
        ctx.fillRect(-10, -10, 20, 3);

        ctx.restore();
    }

    drawCape(ctx, sx) {
        const flap = Math.sin(this.animTimer * 5) * 2;
        ctx.save();
        ctx.translate(sx + 12, this.y + 12);

        /* Pena */
        ctx.fillStyle = CONFIG.COLORS.CAPE_RED;
        ctx.beginPath();
        ctx.moveTo(0, 12);
        ctx.quadraticCurveTo(-10 + flap, -4, 0, -12);
        ctx.quadraticCurveTo(10 + flap, -4, 0, 12);
        ctx.fill();

        /* Haste */
        ctx.strokeStyle = '#FFCDD2';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 12);
        ctx.lineTo(0, -12);
        ctx.stroke();

        ctx.restore();
    }

    drawStar(ctx, sx) {
        const t = this.animTimer * 3;
        const rotation = Math.sin(t) * 0.2;

        ctx.save();
        ctx.translate(sx + 12, this.y + 12);
        ctx.rotate(rotation);

        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const a1 = (Math.PI * 2 * i) / 5 - Math.PI / 2;
            const a2 = (Math.PI * 2 * (i + 0.5)) / 5 - Math.PI / 2;
            const r1 = 12, r2 = 5;
            if (i === 0) ctx.moveTo(Math.cos(a1) * r1, Math.sin(a1) * r1);
            else ctx.lineTo(Math.cos(a1) * r1, Math.sin(a1) * r1);
            ctx.lineTo(Math.cos(a2) * r2, Math.sin(a2) * r2);
        }
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#000';
        ctx.fillRect(-4, -1, 2, 3);
        ctx.fillRect(2, -1, 2, 3);

        ctx.restore();
    }

    drawCoin(ctx, sx) {
        const t = this.animTimer * 4;
        const scaleX = Math.abs(Math.cos(t));

        ctx.save();
        ctx.translate(sx + 12, this.y + 12);
        ctx.scale(scaleX, 1);

        ctx.fillStyle = '#FFC107';
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#FFEB3B';
        ctx.beginPath();
        ctx.arc(0, 0, 7, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#F57F17';
        ctx.fillRect(-1, -5, 2, 10);

        ctx.restore();
    }
}

/* ============================================================
   FIREBALL DO JOGADOR
============================================================ */
class Fireball {
    constructor(x, y, vx, owner = 'player') {
        this.x = x;
        this.y = y;
        this.width = 10;
        this.height = 10;
        this.vx = vx;
        this.vy = 2;
        this.owner = owner;
        this.active = true;
        this.life = CONFIG.ITEM.FIREBALL_LIFETIME;
        this.animTimer = 0;
        this.rotation = 0;
        this.trailTimer = 0;
        this.kind = 'fire';
    }

    update(dt, levelData) {
        if (!this.active) return;

        this.animTimer += dt;
        this.rotation += dt * 15;
        this.life -= dt;
        if (this.life <= 0) {
            this.active = false;
            return;
        }

        if (this.owner === 'player') {
            this.vy += CONFIG.ITEM.FIREBALL_GRAVITY;
        }

        this.x += this.vx;
        this.y += this.vy;

        if (this.y + this.height >= levelData.groundY) {
            this.y = levelData.groundY - this.height;
            this.vy = this.owner === 'player'
                ? CONFIG.ITEM.FIREBALL_BOUNCE
                : 0;
        }

        if (this.owner === 'player') {
            for (const p of levelData.platforms) {
                if (p.type === 'flagpole') continue;
                if (Utils.aabb(this, p)) {
                    if (this.vy > 0 && this.y + this.height - this.vy <= p.y + 4) {
                        this.y = p.y - this.height;
                        this.vy = CONFIG.ITEM.FIREBALL_BOUNCE;
                    } else if (this.vy < 0) {
                        this.active = false;
                        return;
                    } else {
                        this.active = false;
                        return;
                    }
                }
            }

            for (const p of levelData.pipes) {
                const pipeRect = {
                    x: p.x, y: p.y,
                    width: p.width,
                    height: p.height ?? 200,
                };
                if (Utils.aabb(this, pipeRect)) {
                    this.active = false;
                    return;
                }
            }

            this.trailTimer += dt;
            if (this.trailTimer > 0.03) {
                this.trailTimer = 0;
                EffectsManager.emitFireTrail(this.x + 5, this.y + 5);
            }
        }

        if (
            this.x < -50 ||
            this.x > levelData.length + 50 ||
            this.y > CONFIG.CANVAS.HEIGHT + 100
        ) {
            this.active = false;
        }
    }

    draw(ctx, cameraX) {
        if (!this.active) return;
        const sx = this.x - cameraX;

        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = '#FF6D00';
        ctx.beginPath();
        ctx.arc(sx + 5, this.y + 5, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.translate(sx + 5, this.y + 5);
        ctx.rotate(this.rotation);

        ctx.fillStyle = '#FF3D00';
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#FFEB3B';
        ctx.beginPath();
        ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

/* ============================================================
   ICEBALL (congela inimigos)
============================================================ */
class Iceball {
    constructor(x, y, vx) {
        this.x = x;
        this.y = y;
        this.width = 12;
        this.height = 12;
        this.vx = vx;
        this.vy = 2;
        this.active = true;
        this.life = CONFIG.POWERS.ICEBALL_LIFETIME;
        this.animTimer = 0;
        this.rotation = 0;
        this.trailTimer = 0;
        this.kind = 'ice';
    }

    update(dt, levelData) {
        if (!this.active) return;

        this.animTimer += dt;
        this.rotation += dt * 8;
        this.life -= dt;
        if (this.life <= 0) {
            this.active = false;
            return;
        }

        this.vy += CONFIG.POWERS.ICEBALL_GRAVITY;
        this.x += this.vx;
        this.y += this.vy;

        if (this.y + this.height >= levelData.groundY) {
            this.y = levelData.groundY - this.height;
            this.vy = CONFIG.POWERS.ICEBALL_BOUNCE;
        }

        for (const p of levelData.platforms) {
            if (p.type === 'flagpole') continue;
            if (Utils.aabb(this, p)) {
                if (this.vy > 0 && this.y + this.height - this.vy <= p.y + 4) {
                    this.y = p.y - this.height;
                    this.vy = CONFIG.POWERS.ICEBALL_BOUNCE;
                } else {
                    this.active = false;
                    return;
                }
            }
        }

        for (const p of levelData.pipes) {
            const pipeRect = {
                x: p.x, y: p.y,
                width: p.width,
                height: p.height ?? 200,
            };
            if (Utils.aabb(this, pipeRect)) {
                this.active = false;
                return;
            }
        }

        this.trailTimer += dt;
        if (this.trailTimer > 0.04) {
            this.trailTimer = 0;
            EffectsManager.emitIceTrail(this.x + 6, this.y + 6);
        }

        if (
            this.x < -50 ||
            this.x > levelData.length + 50 ||
            this.y > CONFIG.CANVAS.HEIGHT + 100
        ) {
            this.active = false;
        }
    }

    draw(ctx, cameraX) {
        if (!this.active) return;
        const sx = this.x - cameraX;

        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = '#4FC3F7';
        ctx.beginPath();
        ctx.arc(sx + 6, this.y + 6, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.translate(sx + 6, this.y + 6);
        ctx.rotate(this.rotation);

        ctx.fillStyle = '#0288D1';
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#B3E5FC';
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fill();

        /* Espinhos de gelo */
        ctx.strokeStyle = '#E1F5FE';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 4; i++) {
            const a = (Math.PI / 2) * i;
            ctx.beginPath();
            ctx.moveTo(Math.cos(a) * 6, Math.sin(a) * 6);
            ctx.lineTo(Math.cos(a) * 9, Math.sin(a) * 9);
            ctx.stroke();
        }

        ctx.restore();
    }
}

/* ============================================================
   HAMMER (arco + rotação, quebra blocos)
============================================================ */
class Hammer {
    constructor(x, y, vx) {
        this.x = x;
        this.y = y;
        this.width = 16;
        this.height = 16;
        this.vx = vx;
        this.vy = CONFIG.POWERS.HAMMER_SPEED_Y;
        this.active = true;
        this.life = CONFIG.POWERS.HAMMER_LIFETIME;
        this.animTimer = 0;
        this.rotation = 0;
        this.kind = 'hammer';
    }

    update(dt, levelData) {
        if (!this.active) return;

        this.animTimer += dt;
        this.rotation += dt * 12;
        this.life -= dt;
        if (this.life <= 0) {
            this.active = false;
            return;
        }

        this.vy += CONFIG.POWERS.HAMMER_GRAVITY;
        this.x += this.vx;
        this.y += this.vy;

        /* Bate no chão → some com poeira */
        if (this.y + this.height >= levelData.groundY) {
            this.active = false;
            EffectsManager.emitDust(this.x + 8, levelData.groundY, 5, '#A1887F');
            return;
        }

        /* Acerta blocos (quebra por baixo/lado) */
        for (const p of levelData.platforms) {
            if (p.type === 'flagpole') continue;
            if (Utils.aabb(this, p)) {
                if (p.type === 'question') {
                    if (typeof GAME !== 'undefined' && GAME.breakQuestionByHammer) {
                        GAME.breakQuestionByHammer(p);
                    }
                } else if (p.type === 'brick' || p.type === 'ice') {
                    p.broken = true;
                    EffectsManager.emitExplosion(p.x + p.width / 2, p.y + p.height / 2, '#A1887F');
                }
                this.active = false;
                return;
            }
        }

        if (
            this.x < -60 ||
            this.x > levelData.length + 60 ||
            this.y > CONFIG.CANVAS.HEIGHT + 120
        ) {
            this.active = false;
        }
    }

    draw(ctx, cameraX) {
        if (!this.active) return;
        const sx = this.x - cameraX;

        ctx.save();
        ctx.translate(sx + 8, this.y + 8);
        ctx.rotate(this.rotation);

        ctx.fillStyle = CONFIG.COLORS.HAMMER_BROWN;
        ctx.fillRect(-2, -2, 4, 12);

        ctx.fillStyle = CONFIG.COLORS.HAMMER_DARK;
        ctx.fillRect(-9, -9, 18, 9);
        ctx.fillStyle = '#9E9E9E';
        ctx.fillRect(-9, -9, 18, 3);

        ctx.restore();
    }
}

/* ============================================================
   BOSS FIREBALL
============================================================ */
class BossFireball {
    constructor(x, y, vx, vy) {
        this.x = x;
        this.y = y;
        this.width = 16;
        this.height = 16;
        this.vx = vx;
        this.vy = vy;
        this.active = true;
        this.life = 4.0;
        this.animTimer = 0;
        this.trailTimer = 0;
        this.startX = x;
    }

    update(dt, levelData) {
        if (!this.active) return;

        this.animTimer += dt;
        this.life -= dt;
        if (this.life <= 0) {
            this.active = false;
            return;
        }

        this.x += this.vx;
        this.y += this.vy;

        this.trailTimer += dt;
        if (this.trailTimer > 0.04) {
            this.trailTimer = 0;
            EffectsManager.particles.push(
                new Particle(this.x + 8, this.y + 8, {
                    vx: Utils.random(-0.5, 0.5),
                    vy: Utils.random(-0.5, 0.5),
                    gravity: 0,
                    size: Utils.random(3, 5),
                    color: Utils.pick(['#FF3D00', '#FF9100', '#FFC107']),
                    shape: 'circle',
                    life: 0.5,
                    decay: 0.06,
                })
            );
        }

        if (Math.abs(this.x - this.startX) > 800) this.active = false;
        if (this.y > CONFIG.CANVAS.HEIGHT + 100) this.active = false;
    }

    draw(ctx, cameraX) {
        if (!this.active) return;
        const sx = this.x - cameraX;
        const pulse = 0.5 + 0.5 * Math.sin(this.animTimer * 12);

        ctx.save();
        ctx.globalAlpha = 0.4 + 0.3 * pulse;
        ctx.fillStyle = '#FF5722';
        ctx.beginPath();
        ctx.arc(sx + 8, this.y + 8, 12 + pulse * 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.fillStyle = '#D50000';
        ctx.beginPath();
        ctx.arc(sx + 8, this.y + 8, 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#FF9100';
        ctx.beginPath();
        ctx.arc(sx + 8, this.y + 8, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#FFEB3B';
        ctx.beginPath();
        ctx.arc(sx + 8, this.y + 8, 2, 0, Math.PI * 2);
        ctx.fill();
    }
}

window.Item = Item;
window.Fireball = Fireball;
window.Iceball = Iceball;
window.Hammer = Hammer;
window.BossFireball = BossFireball;
