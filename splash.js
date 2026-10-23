/**
 * ============================================================
 * SPLASH.JS
 * ------------------------------------------------------------
 * Tela de abertura animada. Desenha parallax no canvas próprio
 * (#splash-canvas) e transiciona para o menu principal ao
 * clicar em "ENTRAR" ou pressionar Enter/Espaço.
 *
 * - Canvas 100% independente do #gameCanvas do jogo
 * - Áudio só é inicializado no enter() (política de autoplay)
 * - Após o fade, o elemento #splash-screen é removido do DOM
 * ============================================================
 */
"use strict";

const SplashScreen = {
    canvas: null,
    ctx: null,
    W: 800,
    H: 450,
    running: true,
    animTime: 0,
    lastTime: 0,

    /* Elementos decorativos animados */
    clouds: [],
    coins: [],
    stars: [],
    goombas: [],

    /* ========================================================
       INICIALIZAÇÃO
    ======================================================== */
    init() {
        this.canvas = document.getElementById('splash-canvas');
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');

        this.resize();
        window.addEventListener('resize', () => this.resize());

        this.spawnDecorations();
        this.bindEvents();

        this.lastTime = performance.now();
        requestAnimationFrame((t) => this.loop(t));
    },

    /**
     * Ajusta o canvas mantendo proporção 16:9 dentro da viewport.
     */
    resize() {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const ratio = 16 / 9;
        let w = vw;
        let h = vw / ratio;
        if (h > vh) {
            h = vh;
            w = vh * ratio;
        }
        this.canvas.width = w;
        this.canvas.height = h;
        this.W = w;
        this.H = h;
        this.canvas.style.width = w + 'px';
        this.canvas.style.height = h + 'px';
    },

    /**
     * Cria nuvens, moedas, estrelas e goombas com posições
     * aleatórias para o cenário animado.
     */
    spawnDecorations() {
        /* Nuvens */
        this.clouds = [];
        for (let i = 0; i < 6; i++) {
            this.clouds.push({
                x: Math.random() * 1200,
                y: 40 + Math.random() * 120,
                size: 30 + Math.random() * 30,
                speed: 0.2 + Math.random() * 0.4,
                withText: Math.random() < 0.33, /* "vai ds" */
            });
        }

        /* Moedas flutuando */
        this.coins = [];
        for (let i = 0; i < 8; i++) {
            this.coins.push({
                x: Math.random() * 800,
                y: 150 + Math.random() * 200,
                size: 8 + Math.random() * 6,
                phase: Math.random() * Math.PI * 2,
                amp: 10 + Math.random() * 20,
                speed: 0.5 + Math.random() * 1.5,
            });
        }

        /* Estrelas piscando */
        this.stars = [];
        for (let i = 0; i < 20; i++) {
            this.stars.push({
                x: Math.random() * 800,
                y: Math.random() * 200,
                size: 1 + Math.random() * 2,
                phase: Math.random() * Math.PI * 2,
            });
        }

        /* Goombas andando no chão */
        this.goombas = [];
        for (let i = 0; i < 3; i++) {
            this.goombas.push({
                x: Math.random() * 800,
                dir: Math.random() < 0.5 ? -1 : 1,
                speed: 0.4 + Math.random() * 0.6,
                frame: 0,
                frameTimer: 0,
            });
        }
    },

    /**
     * Liga clique do botão e teclas Enter/Espaço para entrar.
     */
    bindEvents() {
        const btn = document.getElementById('splash-start-btn');
        if (btn) {
            btn.addEventListener('click', () => this.enter());
        }

        window.addEventListener('keydown', (e) => {
            if (e.code === 'Enter' || e.code === 'Space') {
                e.preventDefault();
                this.enter();
            }
        });
    },

    /* ========================================================
       LOOP
    ======================================================== */
    loop(t) {
        if (!this.running) return;

        const dt = Math.min((t - this.lastTime) / 1000, 0.05);
        this.lastTime = t;
        this.animTime += dt;

        this.update(dt);
        this.draw();

        requestAnimationFrame((tt) => this.loop(tt));
    },

    /**
     * Atualiza posições/fases dos decorativos.
     * @param {number} dt
     */
    update(dt) {
        /* Nuvens */
        for (const c of this.clouds) {
            c.x -= c.speed * dt * 60;
            if (c.x < -c.size * 2) {
                c.x = this.W + c.size * 2;
                c.y = 40 + Math.random() * 120;
            }
        }

        /* Moedas */
        for (const coin of this.coins) {
            coin.phase += dt * coin.speed;
        }

        /* Estrelas */
        for (const s of this.stars) {
            s.phase += dt * 2;
        }

        /* Goombas */
        for (const g of this.goombas) {
            g.x += g.dir * g.speed * dt * 60;
            if (g.x < -30) {
                g.x = this.W + 30;
                g.dir = -1;
            }
            if (g.x > this.W + 30) {
                g.x = -30;
                g.dir = 1;
            }
            g.frameTimer += dt;
            if (g.frameTimer > 0.15) {
                g.frameTimer = 0;
                g.frame = (g.frame + 1) % 2;
            }
        }
    },

    /**
     * Desenha o cenário completo da splash.
     */
    draw() {
        const ctx = this.ctx;
        const W = this.W;
        const H = this.H;
        const t = this.animTime;

        /* Céu com gradiente animado */
        const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
        const shift = (Math.sin(t * 0.3) + 1) * 0.5;
        skyGrad.addColorStop(0, shift > 0.5 ? '#1A237E' : '#0D47A1');
        skyGrad.addColorStop(0.5, '#42A5F5');
        skyGrad.addColorStop(1, '#64B5F6');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, W, H);

        /* Estrelas (parte de cima) */
        ctx.fillStyle = '#FFF';
        for (const s of this.stars) {
            const a = 0.3 + 0.7 * (Math.sin(s.phase) + 1) * 0.5;
            ctx.globalAlpha = a;
            ctx.beginPath();
            ctx.arc(s.x * (W / 800), s.y * (H / 450), s.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        /* Nuvens (algumas com "vai ds") */
        for (const c of this.clouds) {
            this.drawCloud(ctx, c.x, c.y, c.size);
            if (c.withText) {
                this.drawCloudText(ctx, c.x + c.size * 0.5, c.y + 2, c.size);
            }
        }

        /* Moedas girando */
        for (const coin of this.coins) {
            this.drawCoin(ctx, coin);
        }

        /* Chão (tiles verdes + marrons) */
        this.drawGround(ctx, W, H);

        /* Goombas */
        for (const g of this.goombas) {
            this.drawGoomba(ctx, g, H);
        }

        /* Vinheta nas bordas */
        const vig = ctx.createRadialGradient(
            W / 2, H / 2, H * 0.3,
            W / 2, H / 2, H * 0.9
        );
        vig.addColorStop(0, 'rgba(0,0,0,0)');
        vig.addColorStop(1, 'rgba(0,0,0,0.5)');
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, W, H);
    },

    /**
     * Desenha uma nuvem estilo Mario (círculos sobrepostos).
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} x
     * @param {number} y
     * @param {number} size
     */
    drawCloud(ctx, x, y, size) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.beginPath();
        ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
        ctx.arc(x + size * 0.5, y - size * 0.2, size * 0.6, 0, Math.PI * 2);
        ctx.arc(x + size * 1.0, y, size * 0.5, 0, Math.PI * 2);
        ctx.arc(x + size * 0.5, y + size * 0.2, size * 0.55, 0, Math.PI * 2);
        ctx.fill();
    },

    /**
     * Escreve "vai ds" dentro de uma nuvem (easter egg).
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} cx
     * @param {number} cy
     * @param {number} size
     */
    drawCloudText(ctx, cx, cy, size) {
        ctx.save();
        const fontSize = Math.max(8, Math.floor(size * 0.16));
        ctx.font = `bold ${fontSize}px "Press Start 2P", monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        /* Sombra suave para contraste no branco */
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.fillText('vai ds', cx + 1, cy + 1);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.fillText('vai ds', cx, cy);

        ctx.restore();
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
    },

    /**
     * Desenha uma moeda girando e flutuando.
     * @param {CanvasRenderingContext2D} ctx
     * @param {object} coin
     */
    drawCoin(ctx, coin) {
        const y = coin.y + Math.sin(coin.phase) * coin.amp;
        const scaleX = Math.abs(Math.cos(coin.phase * 2));

        ctx.save();
        ctx.translate(coin.x, y);
        ctx.scale(scaleX, 1);

        /* Corpo */
        ctx.fillStyle = '#FFC107';
        ctx.beginPath();
        ctx.arc(0, 0, coin.size, 0, Math.PI * 2);
        ctx.fill();

        /* Interior */
        ctx.fillStyle = '#FFEB3B';
        ctx.beginPath();
        ctx.arc(0, 0, coin.size * 0.7, 0, Math.PI * 2);
        ctx.fill();

        /* Detalhe */
        ctx.fillStyle = '#F57F17';
        ctx.fillRect(-1, -coin.size * 0.5, 2, coin.size);

        ctx.restore();
    },

    /**
     * Desenha o chão com tiles verdes (topo) e marrons (corpo).
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} W
     * @param {number} H
     */
    drawGround(ctx, W, H) {
        const groundY = H - 60;
        const tile = 32;

        for (let x = 0; x < W; x += tile) {
            /* Topo verde */
            ctx.fillStyle = '#4CAF50';
            ctx.fillRect(x, groundY, tile, 8);

            /* Corpo marrom */
            ctx.fillStyle = '#795548';
            ctx.fillRect(x, groundY + 8, tile, H - groundY - 8);

            /* Detalhe */
            ctx.strokeStyle = 'rgba(0,0,0,0.15)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x, groundY + 16);
            ctx.lineTo(x + tile, groundY + 16);
            ctx.moveTo(x + tile / 2, groundY + 8);
            ctx.lineTo(x + tile / 2, groundY + 16);
            ctx.stroke();
        }
    },

    /**
     * Desenha um goomba andando (corpo + olhos + pés animados).
     * @param {CanvasRenderingContext2D} ctx
     * @param {object} g
     * @param {number} H
     */
    drawGoomba(ctx, g, H) {
        const groundY = H - 60;
        const bob = g.frame === 0 ? -1 : 1;
        const sx = g.x;
        const sy = groundY - 24;

        ctx.save();
        if (g.dir < 0) {
            ctx.translate(sx + 12, sy);
            ctx.scale(-1, 1);
            ctx.translate(-12, 0);
        } else {
            ctx.translate(sx, sy);
        }

        /* Corpo */
        ctx.fillStyle = '#8D6E63';
        ctx.beginPath();
        ctx.arc(12, 10, 11, Math.PI, 0, false);
        ctx.fill();
        ctx.fillRect(1, 10, 22, 8);

        /* Olhos */
        ctx.fillStyle = '#FFF';
        ctx.fillRect(5, 10, 4, 5);
        ctx.fillRect(15, 10, 4, 5);
        ctx.fillStyle = '#000';
        ctx.fillRect(7, 12, 2, 3);
        ctx.fillRect(17, 12, 2, 3);

        /* Pés */
        ctx.fillStyle = '#4E342E';
        ctx.fillRect(1, 20 + bob, 8, 5);
        ctx.fillRect(15, 20 - bob, 8, 5);

        ctx.restore();
    },

    /* ========================================================
       ENTRAR NO JOGO
    ======================================================== */
    /**
     * Toca som, faz fade out e chama MenuManager.setState('MAIN_MENU').
     * Protegido contra duplo-clique/tecla repetida.
     */
    enter() {
        if (!this.running) return;

        /* Evita duplo-clique / Enter segurado */
        this.running = false;

        /* Desbloqueia áudio e toca moeda */
        try {
            SoundManager.init();
            SoundManager.resume();
            SoundManager.playCoin();
        } catch (e) {
            /* áudio é opcional — não quebra a splash */
        }

        /* Fade out */
        const screen = document.getElementById('splash-screen');
        if (screen) screen.classList.add('hide');

        /* Transiciona para o menu após o fade e remove do DOM */
        setTimeout(() => {
            if (screen && screen.parentNode) {
                screen.parentNode.removeChild(screen);
            }
            if (window.MenuManager) {
                MenuManager.setState('MAIN_MENU');
            }
        }, 650);
    },
};

/* Boot: a splash inicializa sozinha, antes/atualmente do Game */
window.addEventListener('DOMContentLoaded', () => {
    SplashScreen.init();
});

window.SplashScreen = SplashScreen;
