/**
 * ============================================================
 * CHECKPOINTS.JS
 * ------------------------------------------------------------
 * Entidades de progresso de fase:
 *   - Checkpoint  → mastro com bandeira que salva o respawn
 *   - LevelStar   → coletável opcional (3 por fase)
 * ============================================================
 */
"use strict";

/* ============================================================
   CHECKPOINT
============================================================ */
class Checkpoint {
    /**
     * @param {number} x
     * @param {number} y   Base do mastro (ponto do chão)
     * @param {number} index  Índice do checkpoint (para id/save)
     */
    constructor(x, y, index = 0) {
        this.x = x;
        this.y = y;
        this.index = index;

        this.width = 24;
        this.height = 96;        // altura visual do mastro
        this.touchWidth = 28;
        this.touchHeight = 96;

        this.active = false;     // já ativado?
        this.activateTimer = 0;  // animação de ativação
        this.animTimer = 0;
        this.wave = 0;
    }

    update(dt) {
        this.animTimer += dt;
        if (this.activateTimer > 0) this.activateTimer -= dt;
        this.wave = Math.sin(this.animTimer * 4) * 3;
    }

    /** Retângulo de colisão com o player. */
    getRect() {
        return {
            x: this.x - (this.touchWidth - this.width) / 2,
            y: this.y - this.touchHeight,
            width: this.touchWidth,
            height: this.touchHeight,
        };
    }

    activate() {
        if (this.active) return false;
        this.active = true;
        this.activateTimer = 0.8;

        SoundManager.playCheckpoint();
        EffectsManager.emitSparkles(this.x + 12, this.y - 70, 14, '#FFD700');
        EffectsManager.text(
            this.x + 12, this.y - 90,
            'CHECKPOINT!',
            { color: '#FFD700', size: 11, life: 1.5 }
        );
        return true;
    }

    draw(ctx, cameraX) {
        const sx = this.x - cameraX;
        if (sx + 40 < 0 || sx - 40 > CONFIG.CANVAS.WIDTH) return;

        const poleTop = this.y - this.height;
        const poleColor = this.active ? '#FFD700' : '#9E9E9E';
        const flagColor = this.active ? '#4CAF50' : '#BDBDBD';

        /* Brilho ao ativar */
        if (this.activateTimer > 0) {
            ctx.save();
            ctx.globalAlpha = this.activateTimer * 0.6;
            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            ctx.arc(sx + 12, this.y - 60, 40, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        /* Base */
        ctx.fillStyle = '#616161';
        ctx.fillRect(sx, this.y - 6, 24, 6);

        /* Mastro */
        ctx.fillStyle = poleColor;
        ctx.fillRect(sx + 10, poleTop, 4, this.height);

        /* Topo bola */
        ctx.fillStyle = this.active ? '#FFEB3B' : '#9E9E9E';
        ctx.beginPath();
        ctx.arc(sx + 12, poleTop, 5, 0, Math.PI * 2);
        ctx.fill();

        /* Bandeira */
        ctx.fillStyle = flagColor;
        ctx.beginPath();
        ctx.moveTo(sx + 14, poleTop + 6);
        ctx.lineTo(sx + 40, poleTop + 14 + this.wave);
        ctx.lineTo(sx + 40, poleTop + 30 + this.wave);
        ctx.lineTo(sx + 14, poleTop + 34);
        ctx.closePath();
        ctx.fill();

        /* Símbolo na bandeira */
        ctx.fillStyle = '#FFF';
        ctx.font = 'bold 10px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('!', sx + 26, poleTop + 24 + this.wave);
        ctx.textAlign = 'left';
    }
}

/* ============================================================
   LEVEL STAR (coletável opcional — 3 por fase)
============================================================ */
class LevelStar {
    constructor(x, y, index = 0) {
        this.x = x;
        this.y = y;
        this.index = index;

        this.width = 22;
        this.height = 22;

        this.collected = false;
        this.active = true;
        this.animTimer = 0;
        this.spawnBase = y;
    }

    update(dt) {
        if (!this.active) return;
        this.animTimer += dt;
        this.y = this.spawnBase + Math.sin(this.animTimer * 2.5) * 4;
    }

    collect() {
        if (this.collected) return false;
        this.collected = true;
        this.active = false;

        SoundManager.playStarCollect();
        EffectsManager.emitSparkles(this.x + 11, this.y + 11, 18, '#FFD700');
        EffectsManager.text(
            this.x + 11, this.y - 8,
            'ESTRELA!',
            { color: '#FFD700', size: 12, life: 1.3 }
        );
        return true;
    }

    draw(ctx, cameraX) {
        if (this.collected || !this.active) return;

        const sx = this.x - cameraX;
        if (sx + 30 < 0 || sx - 30 > CONFIG.CANVAS.WIDTH) return;

        const t = this.animTimer;
        const pulse = 0.5 + 0.5 * Math.sin(t * 5);

        /* Halo pulsante */
        ctx.save();
        ctx.globalAlpha = 0.35 + 0.25 * pulse;
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(sx + 11, this.y + 11, 16 + pulse * 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        /* Estrela rotacionando devagar */
        ctx.save();
        ctx.translate(sx + 11, this.y + 11);
        ctx.rotate(Math.sin(t * 1.5) * 0.25);

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

        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.beginPath();
        ctx.arc(-3, -3, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#000';
        ctx.fillRect(-4, -1, 2, 3);
        ctx.fillRect(2, -1, 2, 3);

        ctx.restore();
    }
}

window.Checkpoint = Checkpoint;
window.LevelStar = LevelStar;
