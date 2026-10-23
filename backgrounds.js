/**
 * ============================================================
 * BACKGROUNDS.JS
 * ------------------------------------------------------------
 * Cenário de fundo por tema, com parallax em várias camadas.
 * Não depende da fase: usa apenas o tema + câmera.
 *
 * Camadas:
 *   1. Gradiente de céu
 *   2. Silhueta distante (montanhas/colunas/dunas)
 *   3. Elementos médios (nuvens/estalactites/tochas/flocos)
 *   4. Detalhes próximos (arbustos/pedras)
 * ============================================================
 */
"use strict";

class Backgrounds {
    constructor() {
        this.theme = 'overworld';
        this.t = 0;
        this.layers = null;
    }

    setTheme(theme) {
        this.theme = theme || 'overworld';
        this.layers = this.buildLayers(this.theme);
    }

    update(dt) {
        this.t += dt;
    }

    /* Gera posições determinísticas para cada camada. */
    buildLayers(theme) {
        const rng = Utils.createRng(Utils.hashString('bg:' + theme));
        const far = [];
        const mid = [];
        const near = [];

        for (let i = 0; i < 40; i++) {
            far.push({
                x: i * 260 + rng.range(-40, 40),
                h: rng.range(60, 140),
                w: rng.range(140, 240),
            });
        }
        for (let i = 0; i < 30; i++) {
            mid.push({
                x: i * 200 + rng.range(-50, 50),
                y: rng.range(40, 140),
                s: rng.range(0.6, 1.4),
            });
        }
        for (let i = 0; i < 30; i++) {
            near.push({
                x: i * 320 + rng.range(-60, 60),
                s: rng.range(0.7, 1.3),
            });
        }
        return { far, mid, near };
    }

    draw(ctx, cameraX, themeCfg) {
        const cfg = themeCfg || CONFIG.THEMES[this.theme]
            || CONFIG.THEMES.overworld;
        const W = CONFIG.CANVAS.WIDTH;
        const H = CONFIG.CANVAS.HEIGHT;

        /* ---- 1. Gradiente do céu ---- */
        const grad = ctx.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, cfg.bgTop);
        grad.addColorStop(1, cfg.bgBottom);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);

        /* ---- 2. Silhueta distante ---- */
        const farColor = Utils.shade(cfg.bgBottom, -0.25);
        this.drawFar(ctx, cameraX, farColor, cfg);

        /* ---- 3. Camada média ---- */
        this.drawMid(ctx, cameraX, cfg);

        /* ---- 4. Detalhes próximos ---- */
        const nearColor = Utils.shade(cfg.groundBody, -0.1);
        this.drawNear(ctx, cameraX, nearColor);
    }

    drawFar(ctx, cameraX, color, cfg) {
        const H = CONFIG.CANVAS.HEIGHT;
        const base = CONFIG.CANVAS.GROUND_Y;
        const offset = cameraX * 0.18;

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(0, H);

        const n = this.layers.far.length;
        let started = false;
        for (let i = 0; i < n; i++) {
            const o = this.layers.far[i];
            const x = o.x - offset;
            if (x < -300 || x > CONFIG.CANVAS.WIDTH + 300) continue;

            if (this.theme === 'castle' || this.theme === 'underground') {
                /* Torres / pilares retangulares */
                const w = o.w * 0.5;
                ctx.rect(x, base - o.h, w, o.h);
            } else if (this.theme === 'desert') {
                /* Dunas suaves */
                ctx.moveTo(x, base);
                ctx.quadraticCurveTo(x + o.w / 2, base - o.h, x + o.w, base);
            } else {
                /* Montanhas em triângulo */
                ctx.moveTo(x, base);
                ctx.lineTo(x + o.w / 2, base - o.h);
                ctx.lineTo(x + o.w, base);
            }
            started = true;
        }
        if (started) {
            ctx.lineTo(CONFIG.CANVAS.WIDTH, H);
            ctx.closePath();
            ctx.fill();
        }
    }

    drawMid(ctx, cameraX, cfg) {
        const offset = cameraX * 0.45;
        const drift = this.t * 8;
        const layer = this.layers.mid;

        switch (this.theme) {
            case 'underground':
                /* Estalactites */
                ctx.fillStyle = Utils.shade(cfg.groundBody, -0.3);
                for (const o of layer) {
                    const x = o.x - offset;
                    if (x < -80 || x > CONFIG.CANVAS.WIDTH + 80) continue;
                    const h = 30 + o.s * 30;
                    ctx.beginPath();
                    ctx.moveTo(x, 0);
                    ctx.lineTo(x + 12, 0);
                    ctx.lineTo(x + 6, h);
                    ctx.closePath();
                    ctx.fill();
                }
                break;

            case 'castle':
                /* Tochas na parede */
                for (const o of layer) {
                    const x = o.x - offset;
                    if (x < -40 || x > CONFIG.CANVAS.WIDTH + 40) continue;
                    const flick = 0.6 + 0.4 * Math.sin(this.t * 6 + o.x);
                    ctx.fillStyle = 'rgba(255,140,0,' + (0.5 * flick) + ')';
                    ctx.beginPath();
                    ctx.arc(x + 6, o.y + 60, 6 * o.s, 0, Math.PI * 2);
                    ctx.fill();
                }
                break;

            case 'lava':
                /* Bolhas/brilho de lava ao fundo */
                for (const o of layer) {
                    const x = o.x - offset;
                    if (x < -60 || x > CONFIG.CANVAS.WIDTH + 60) continue;
                    ctx.fillStyle = 'rgba(255,109,0,0.18)';
                    ctx.beginPath();
                    ctx.arc(x, CONFIG.CANVAS.GROUND_Y - o.y, 30 * o.s, 0, Math.PI * 2);
                    ctx.fill();
                }
                break;

            default:
                /* Nuvens */
                ctx.fillStyle = cfg.sky + '';
                for (let i = 0; i < layer.length; i++) {
                    const o = layer[i];
                    const x = o.x - offset + drift;
                    const xx = ((x % 1200) + 1200) % 1200;
                    const px = xx - 200;
                    if (px < -140 || px > CONFIG.CANVAS.WIDTH + 140) continue;
                    this.drawCloud(ctx, px, o.y, o.s, cfg);

                    /* "vai ds" em 1 a cada 3 nuvens */
                    if (i % 3 === 0) {
                        this.drawCloudText(ctx, px + 22 * o.s, o.y, o.s);
                    }
                }
                break;
        }
    }

    drawCloud(ctx, x, y, s, cfg) {
        const c = cfg.dark ? Utils.shade(cfg.sky, -0.4) : cfg.sky;
        ctx.fillStyle = c;
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.arc(x, y, 18 * s, 0, Math.PI * 2);
        ctx.arc(x + 20 * s, y - 6 * s, 22 * s, 0, Math.PI * 2);
        ctx.arc(x + 44 * s, y, 16 * s, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }

    /** Escreve "vai ds" dentro de uma nuvem (easter egg). */
    drawCloudText(ctx, cx, cy, s) {
        const fontSize = Math.max(7, Math.floor(10 * s));
        ctx.save();
        ctx.font = `bold ${fontSize}px "Press Start 2P", monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        /* Sombra suave para contraste no céu claro */
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.fillText('vai ds', cx + 1, cy + 1);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.fillText('vai ds', cx, cy);

        ctx.restore();
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
    }

    drawNear(ctx, cameraX, color) {
        const offset = cameraX * 0.75;
        const base = CONFIG.CANVAS.GROUND_Y + 20;

        for (const o of this.layers.near) {
            const x = o.x - offset;
            if (x < -120 || x > CONFIG.CANVAS.WIDTH + 120) continue;

            if (this.theme === 'desert') {
                /* Cactos */
                ctx.fillStyle = '#2E7D32';
                const h = 40 * o.s;
                ctx.fillRect(x, base - h, 10 * o.s, h);
                ctx.fillRect(x - 8 * o.s, base - h + 12, 8 * o.s, 6 * o.s);
                ctx.fillRect(x + 10 * o.s, base - h + 20, 8 * o.s, 6 * o.s);
            } else if (this.theme === 'snow') {
                /* Pinheiros nevados */
                ctx.fillStyle = '#37474F';
                const h = 46 * o.s;
                ctx.beginPath();
                ctx.moveTo(x, base - h);
                ctx.lineTo(x - 16 * o.s, base);
                ctx.lineTo(x + 16 * o.s, base);
                ctx.closePath();
                ctx.fill();
                ctx.fillStyle = 'rgba(255,255,255,0.85)';
                ctx.fillRect(x - 14 * o.s, base - h * 0.5, 28 * o.s, 4);
            } else {
                /* Arbustos / pedras */
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(x, base, 16 * o.s, Math.PI, 0);
                ctx.fill();
            }
        }
    }
}

window.Backgrounds = Backgrounds;
window.backgrounds = new Backgrounds();
