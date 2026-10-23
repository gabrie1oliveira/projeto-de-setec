/**
 * ============================================================
 * SPLASH.JS
 * ------------------------------------------------------------
 * Tela de abertura animada. Desenha parallax no canvas próprio
 * (#splash-canvas) e transiciona para o menu principal ao
 * clicar em "ENTRAR" ou pressionar Enter/Espaço.
 *
 * Cenário em 9 camadas:
 *   1. Céu pulsante
 *   2. Estrelas + estrelas cadentes
 *   3. Montanhas distantes (parallax 0.2)
 *   4. Nuvens fofas (parallax 0.4)
 *   5. Colinas verdes (parallax 0.6)
 *   6. Moedas 3D girando
 *   7. Chão tileado pixel-art
 *   8. Goombas animados
 *   9. Vinheta
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
    meteors: [],

    /* Constantes de cenário (sem números mágicos soltos) */
    GROUND_H: 60,
    PARALLAX_MOUNTAINS: 0.2,
    PARALLAX_CLOUDS: 0.4,
    PARALLAX_HILLS: 0.6,
    GOOMBA_SCALE: 1.5,
    GOOMBA_BODY_W: 24,
    GOOMBA_BODY_H: 28,
    METEOR_SPAWN_CHANCE: 0.005,
    METEOR_LIFE_RATE: 0.8,
    COIN_SPIN_SPEED: 3,
    COIN_GLOW_SPEED: 4,
    SKY_PULSE_SPEED: 0.2,

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

        /* Pausa o loop quando a aba fica invisível (performance) */
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.running = false;
            } else if (!this.running && document.getElementById('splash-screen')) {
                this.running = true;
                this.lastTime = performance.now();
                requestAnimationFrame((t) => this.loop(t));
            }
        });

        this.lastTime = performance.now();
        requestAnimationFrame((t) => this.loop(t));
    },

    /**
     * Ajusta o canvas para preencher 100% da viewport.
     * O desenho usa this.W/this.H dinâmicos, então não há
     * necessidade de forçar proporção 16:9.
     */
    resize() {
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        this.canvas.width = vw;
        this.canvas.height = vh;
        this.W = vw;
        this.H = vh;

        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
    },

    /**
     * Cria nuvens, moedas, estrelas e goombas com posições
     * aleatórias para o cenário animado. Usa this.W/this.H
     * dinâmicos (sem dimensões fixas).
     */
    spawnDecorations() {
        const W = this.W;
        const H = this.H;

        /* Nuvens fofas (1/3 com easter egg "vai ds") */
        this.clouds = [];
        for (let i = 0; i < 7; i++) {
            this.clouds.push({
                x: Math.random() * (W + 400),
                y: 30 + Math.random() * 130,
                size: 36 + Math.random() * 34,
                speed: 0.2 + Math.random() * 0.4,
                withText: Math.random() < 0.33,
            });
        }

        /* Moedas 3D flutuando */
        this.coins = [];
        for (let i = 0; i < 8; i++) {
            this.coins.push({
                x: Math.random() * W,
                y: 140 + Math.random() * Math.max(100, H * 0.45),
                size: 10 + Math.random() * 6,
                phase: Math.random() * Math.PI * 2,
                amp: 10 + Math.random() * 18,
                speed: 0.5 + Math.random() * 1.2,
            });
        }

        /* Estrelas piscando */
        this.stars = [];
        for (let i = 0; i < 22; i++) {
            this.stars.push({
                x: Math.random() * W,
                y: Math.random() * Math.max(120, H * 0.45),
                size: 1 + Math.random() * 2,
                phase: Math.random() * Math.PI * 2,
            });
        }

        /* Goombas andando no chão */
        this.goombas = [];
        for (let i = 0; i < 3; i++) {
            this.goombas.push({
                x: Math.random() * W,
                dir: Math.random() < 0.5 ? -1 : 1,
                speed: 0.4 + Math.random() * 0.6,
                frame: 0,
                frameTimer: 0,
            });
        }

        /* Estrelas cadentes (inicialmente vazio) */
        this.meteors = [];
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
     * Atualiza posições/fases dos decorativos e gera estrelas cadentes.
     * @param {number} dt
     */
    update(dt) {
        /* Nuvens */
        for (const c of this.clouds) {
            c.x -= c.speed * dt * 60;
            if (c.x < -c.size * 2) {
                c.x = this.W + c.size * 2;
                c.y = 30 + Math.random() * 130;
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
            if (g.x < -40) {
                g.x = this.W + 40;
                g.dir = -1;
            }
            if (g.x > this.W + 40) {
                g.x = -40;
                g.dir = 1;
            }
            g.frameTimer += dt;
            if (g.frameTimer > 0.15) {
                g.frameTimer = 0;
                g.frame = (g.frame + 1) % 2;
            }
        }

        /* Estrelas cadentes — gerar ocasionais */
        if (Math.random() < this.METEOR_SPAWN_CHANCE) {
            this.meteors.push({
                x: Math.random() * this.W,
                y: -10,
                vx: -2 - Math.random() * 2,
                vy: 3 + Math.random() * 2,
                life: 1.0,
                size: 2 + Math.random() * 2,
            });
        }

        /* Atualizar e remover estrelas cadentes */
        for (let i = this.meteors.length - 1; i >= 0; i--) {
            const m = this.meteors[i];
            m.x += m.vx;
            m.y += m.vy;
            m.life -= dt * this.METEOR_LIFE_RATE;
            if (m.life <= 0 || m.y > this.H) {
                this.meteors.splice(i, 1);
            }
        }
    },

    /**
     * Interpola duas cores hexadecimais (#RRGGBB).
     * @param {string} c1
     * @param {string} c2
     * @param {number} t 0 a 1
     * @returns {string} cor rgb()
     */
    mixColor(c1, c2, t) {
        const r1 = parseInt(c1.slice(1, 3), 16);
        const g1 = parseInt(c1.slice(3, 5), 16);
        const b1 = parseInt(c1.slice(5, 7), 16);
        const r2 = parseInt(c2.slice(1, 3), 16);
        const g2 = parseInt(c2.slice(3, 5), 16);
        const b2 = parseInt(c2.slice(5, 7), 16);
        const r = Math.round(r1 + (r2 - r1) * t);
        const g = Math.round(g1 + (g2 - g1) * t);
        const b = Math.round(b1 + (b2 - b1) * t);
        return `rgb(${r},${g},${b})`;
    },

    /* ========================================================
       DESENHO — CAMADAS
    ======================================================== */

    /**
     * Desenha o cenário completo da splash (9 camadas).
     */
    draw() {
        const ctx = this.ctx;
        const W = this.W;
        const H = this.H;
        const t = this.animTime;
        const cam = t * 30;

        /* 1. Céu pulsante */
        const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
        const pulse = (Math.sin(t * this.SKY_PULSE_SPEED) + 1) * 0.5;
        skyGrad.addColorStop(0, this.mixColor('#0D47A1', '#1A237E', pulse));
        skyGrad.addColorStop(0.5, '#42A5F5');
        skyGrad.addColorStop(1, '#90CAF9');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, W, H);

        /* 2. Estrelas piscando (fundo) */
        for (const s of this.stars) {
            const a = 0.3 + 0.7 * (Math.sin(s.phase) + 1) * 0.5;
            ctx.globalAlpha = a;
            ctx.fillStyle = '#FFF';
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        /* 2b. Estrelas cadentes (atrás das montanhas) */
        for (const m of this.meteors) {
            ctx.save();
            ctx.globalAlpha = m.life;
            ctx.fillStyle = '#FFEB3B';
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#FFEB3B';
            ctx.beginPath();
            ctx.arc(m.x, m.y, m.size, 0, Math.PI * 2);
            ctx.fill();
            /* Rastro */
            ctx.shadowBlur = 0;
            ctx.fillStyle = 'rgba(255, 235, 59, 0.3)';
            ctx.fillRect(m.x - m.vx * 5, m.y - m.vy * 5, m.vx * 5, m.vy * 5);
            ctx.restore();
        }

        /* 3. Montanhas distantes (parallax lento) */
        this.drawMountains(ctx, W, H, cam * this.PARALLAX_MOUNTAINS);

        /* 4. Nuvens fofas (parallax médio) */
        for (const c of this.clouds) {
            this.drawCloud(ctx, c.x, c.y, c.size);
            if (c.withText) {
                this.drawCloudText(ctx, c.x + c.size * 0.55, c.y + 2, c.size);
            }
        }

        /* 5. Colinas verdes (parallax mais rápido) */
        this.drawHills(ctx, W, H, cam * this.PARALLAX_HILLS);

        /* 6. Moedas 3D girando */
        for (const coin of this.coins) {
            this.drawCoin(ctx, coin);
        }

        /* 7. Chão tileado pixel-art */
        this.drawGround(ctx, W, H);

        /* 8. Goombas animados */
        for (const g of this.goombas) {
            this.drawGoomba(ctx, g, H);
        }

        /* 9. Vinheta nas bordas */
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
     * Desenha montanhas distantes translúcidas (camada 1 do parallax).
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} W
     * @param {number} H
     * @param {number} camFactor
     */
    drawMountains(ctx, W, H, camFactor) {
        ctx.fillStyle = 'rgba(21, 101, 192, 0.4)';
        const MOUNTAIN_COUNT = 5;
        const MOUNTAIN_W = 400;
        const WRAP_W = 2000;
        const baseY = H - 80;

        for (let i = 0; i < MOUNTAIN_COUNT; i++) {
            const baseX = i * MOUNTAIN_W - camFactor;
            const x = ((baseX % WRAP_W) + WRAP_W) % WRAP_W - 300;
            const mountainH = 120 + (i % 3) * 30;
            ctx.beginPath();
            ctx.moveTo(x, baseY);
            ctx.lineTo(x + 200, baseY - mountainH);
            ctx.lineTo(x + 400, baseY);
            ctx.closePath();
            ctx.fill();
        }
    },

    /**
     * Desenha colinas verdes suaves (camada 3 do parallax).
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} W
     * @param {number} H
     * @param {number} camFactor
     */
    drawHills(ctx, W, H, camFactor) {
        ctx.fillStyle = 'rgba(76, 175, 80, 0.5)';
        const HILL_COUNT = 6;
        const HILL_W = 300;
        const WRAP_W = 1800;
        const baseY = H - 60;

        for (let i = 0; i < HILL_COUNT; i++) {
            const baseX = i * HILL_W - camFactor;
            const x = ((baseX % WRAP_W) + WRAP_W) % WRAP_W - 200;
            ctx.beginPath();
            ctx.moveTo(x, baseY);
            ctx.quadraticCurveTo(x + 100, baseY - 120, x + 200, baseY);
            ctx.fill();
        }
    },

    /**
     * Desenha uma nuvem fofa branca com sombra suave e highlight.
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} x
     * @param {number} y
     * @param {number} size
     */
    drawCloud(ctx, x, y, size) {
        /* Sombra suave (deslocada) */
        ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
        this.drawCloudShape(ctx, x + 2, y + 3, size);

        /* Nuvem branca principal */
        ctx.fillStyle = '#FFFFFF';
        this.drawCloudShape(ctx, x, y, size);

        /* Highlight na parte de cima */
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.beginPath();
        ctx.arc(x + size * 0.4, y - size * 0.15, size * 0.35, 0, Math.PI * 2);
        ctx.fill();
    },

    /**
     * Forma base da nuvem (círculos sobrepostos).
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} x
     * @param {number} y
     * @param {number} size
     */
    drawCloudShape(ctx, x, y, size) {
        ctx.beginPath();
        ctx.arc(x + size * 0.25, y + size * 0.1, size * 0.35, 0, Math.PI * 2);
        ctx.arc(x + size * 0.55, y - size * 0.15, size * 0.45, 0, Math.PI * 2);
        ctx.arc(x + size * 0.85, y + size * 0.1, size * 0.35, 0, Math.PI * 2);
        ctx.arc(x + size * 0.55, y + size * 0.25, size * 0.4, 0, Math.PI * 2);
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
        const fontSize = Math.max(8, Math.floor(size * 0.14));
        ctx.font = `bold ${fontSize}px "Press Start 2P", monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        /* Sombra suave para contraste no branco */
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillText('vai ds', cx + 1, cy + 1);

        ctx.fillStyle = 'rgba(60, 60, 60, 0.9)';
        ctx.fillText('vai ds', cx, cy);

        ctx.restore();
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
    },

    /**
     * Desenha uma moeda 3D girando no eixo Y com aura brilhante.
     * @param {CanvasRenderingContext2D} ctx
     * @param {object} coin
     */
    drawCoin(ctx, coin) {
        const t = this.animTime + coin.phase;
        const y = coin.y + Math.sin(t) * coin.amp;
        const scaleX = Math.abs(Math.cos(t * this.COIN_SPIN_SPEED));

        ctx.save();
        ctx.translate(coin.x, y);

        /* Aura brilhante (radialGradient — mais barato que shadowBlur) */
        const glow = 0.4 + 0.4 * Math.sin(t * this.COIN_GLOW_SPEED);
        const auraGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, coin.size * 2.5);
        auraGrad.addColorStop(0, `rgba(255, 235, 59, ${glow})`);
        auraGrad.addColorStop(1, 'rgba(255, 235, 59, 0)');
        ctx.fillStyle = auraGrad;
        ctx.beginPath();
        ctx.arc(0, 0, coin.size * 2.5, 0, Math.PI * 2);
        ctx.fill();

        /* Moeda (achatada no eixo X = rotação 3D) */
        ctx.scale(scaleX, 1);

        /* Corpo externo */
        ctx.fillStyle = '#FFC107';
        ctx.beginPath();
        ctx.arc(0, 0, coin.size, 0, Math.PI * 2);
        ctx.fill();

        /* Interior mais claro */
        ctx.fillStyle = '#FFEB3B';
        ctx.beginPath();
        ctx.arc(0, 0, coin.size * 0.7, 0, Math.PI * 2);
        ctx.fill();

        /* Detalhe central */
        ctx.fillStyle = '#F57F17';
        ctx.fillRect(-1, -coin.size * 0.4, 2, coin.size * 0.8);

        ctx.restore();
    },

    /**
     * Desenha o chão tileado com grama e terra em pixel art.
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} W
     * @param {number} H
     */
    drawGround(ctx, W, H) {
        const groundY = H - this.GROUND_H;
        const tile = 32;
        const grassH = 8;

        /* Base de terra contínua */
        ctx.fillStyle = '#795548';
        ctx.fillRect(0, groundY, W, H - groundY);

        /* Tiles de grama + relevo */
        for (let x = 0; x < W; x += tile) {
            /* Terra com relevo alternado */
            ctx.fillStyle = x % 64 === 0 ? '#6D4C41' : '#795548';
            ctx.fillRect(x, groundY + grassH, tile, H - groundY - grassH);

            /* Grama no topo */
            ctx.fillStyle = '#4CAF50';
            ctx.fillRect(x, groundY, tile, grassH);

            /* Detalhe da grama (linha escura inferior) */
            ctx.fillStyle = '#388E3C';
            ctx.fillRect(x, groundY + grassH - 2, tile, 2);

            /* Pedras na terra (a cada 3 tiles) */
            if ((x / tile) % 3 === 0) {
                ctx.fillStyle = '#5D4037';
                ctx.fillRect(x + 8, groundY + 20, 6, 4);
                ctx.fillRect(x + 18, groundY + 28, 4, 3);
            }
        }
    },

    /**
     * Desenha um goomba grande (1.5x) com sombra, olhos expressivos
     * e pés animados.
     * @param {CanvasRenderingContext2D} ctx
     * @param {object} g
     * @param {number} H
     */
    drawGoomba(ctx, g, H) {
        const groundY = H - this.GROUND_H;
        const bob = g.frame === 0 ? -1 : 1;
        const scale = this.GOOMBA_SCALE;
        const bw = this.GOOMBA_BODY_W;
        const bh = this.GOOMBA_BODY_H;
        const sy = groundY - bh;
        const halfW = bw * scale * 0.5;

        /* Sombra elíptica no chão */
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(g.x + halfW, groundY + 2, halfW * 0.9, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        if (g.dir < 0) {
            ctx.translate(g.x + halfW, sy);
            ctx.scale(-1, 1);
            ctx.translate(-halfW, 0);
        } else {
            ctx.translate(g.x, sy);
        }
        ctx.scale(scale, scale);

        /* Corpo (cogumelo) */
        ctx.fillStyle = '#8D6E63';
        ctx.beginPath();
        ctx.arc(12, 10, 11, Math.PI, 0, false);
        ctx.fill();
        ctx.fillRect(1, 10, 22, 8);

        /* Olhos expressivos (branco) */
        ctx.fillStyle = '#FFF';
        ctx.fillRect(5, 10, 4, 5);
        ctx.fillRect(15, 10, 4, 5);

        /* Pupilas que "olham" na direção do movimento */
        ctx.fillStyle = '#000';
        const pupilOffset = g.dir > 0 ? 1 : 0;
        ctx.fillRect(7 + pupilOffset, 12, 2, 3);
        ctx.fillRect(17 + pupilOffset, 12, 2, 3);

        /* Sobrancelhas (põe carrancudo) */
        ctx.fillStyle = '#3E2723';
        ctx.fillRect(4, 8, 6, 1);
        ctx.fillRect(14, 8, 6, 1);

        /* Pés animados (alternam com o bob) */
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
