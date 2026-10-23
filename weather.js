/**
 * ============================================================
 * WEATHER.JS
 * ------------------------------------------------------------
 * Sistema de clima em tela cheia (independente da câmera):
 *   - snow  : flocos caindo com balanço
 *   - sand  : rajadas horizontais
 *   - embers: brasas subindo
 *   - rain  : chuva inclinada
 *
 * A intensidade (0..1) controla a densidade de partículas.
 * ============================================================
 */
"use strict";

class WeatherFlake {
    constructor(type, W, H) {
        this.type = type;
        this.reset(true, W, H);
    }

    reset(initial, W, H) {
        const w = W || CONFIG.CANVAS.WIDTH;
        const h = H || CONFIG.CANVAS.HEIGHT;

        this.x = Utils.random(-40, w + 40);
        this.y = initial ? Utils.random(-h, h) : Utils.random(-40, -10);

        switch (this.type) {
            case 'snow':
                this.size = Utils.random(1.5, 3.5);
                this.vy = Utils.random(0.4, 1.1);
                this.vx = Utils.random(-0.3, 0.3);
                this.sway = Utils.random(0.2, 0.6);
                this.phase = Math.random() * Math.PI * 2;
                this.color = Math.random() < 0.3
                    ? 'rgba(255,255,255,0.95)'
                    : 'rgba(255,255,255,0.7)';
                break;
            case 'sand':
                this.size = Utils.random(1, 2.5);
                this.vy = Utils.random(-0.1, 0.2);
                this.vx = Utils.random(2.5, 4.5);
                this.sway = 0;
                this.phase = 0;
                this.y = Utils.random(0, h);
                this.color = Math.random() < 0.5
                    ? 'rgba(255,224,178,0.6)'
                    : 'rgba(215,180,120,0.5)';
                break;
            case 'embers':
                this.size = Utils.random(1, 3);
                this.vy = Utils.random(-0.8, -0.3);
                this.vx = Utils.random(-0.4, 0.4);
                this.sway = Utils.random(0.3, 0.8);
                this.phase = Math.random() * Math.PI * 2;
                this.y = initial ? Utils.random(0, h) : Utils.random(h, h + 40);
                this.color = Utils.pick([
                    'rgba(255,109,0,0.8)',
                    'rgba(255,61,0,0.75)',
                    'rgba(255,193,7,0.7)',
                ]);
                break;
            case 'rain':
            default:
                this.size = Utils.random(6, 12);
                this.vy = Utils.random(7, 10);
                this.vx = Utils.random(-1.5, -0.5);
                this.sway = 0;
                this.phase = 0;
                this.color = 'rgba(174,213,255,0.5)';
                break;
        }
    }

    update(dt, wind) {
        const step = dt * 60;
        this.y += this.vy * step;
        this.x += (this.vx + (wind || 0)) * step;

        if (this.sway) {
            this.phase += dt * 2;
            this.x += Math.sin(this.phase) * this.sway * step;
        }

        /* Reciclagem ao sair da tela */
        if (this.type === 'embers') {
            if (this.y < -20) this.reset(false);
        } else if (this.y > CONFIG.CANVAS.HEIGHT + 20) {
            this.reset(false);
        }
        if (this.x > CONFIG.CANVAS.WIDTH + 50) this.x = -40;
        if (this.x < -50) this.x = CONFIG.CANVAS.WIDTH + 40;
    }

    draw(ctx) {
        if (this.type === 'rain') {
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.x + this.vx, this.y + this.size);
            ctx.stroke();
            return;
        }

        ctx.fillStyle = this.color;
        if (this.type === 'sand') {
            ctx.fillRect(this.x, this.y, this.size + 1, this.size * 0.6);
        } else {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

class Weather {
    constructor() {
        this.type = null;
        this.intensity = 0;
        this.particles = [];
        this.wind = 0;
        this.windTimer = 0;
    }

    /** Define o clima pelo tema da fase. */
    setTheme(theme) {
        const preset = CONFIG.WEATHER[theme] || { type: null, intensity: 0 };
        this.set(preset.type, preset.intensity);
    }

    /** Define tipo + intensidade e regenera as partículas. */
    set(type, intensity) {
        this.type = type || null;
        this.intensity = intensity || 0;
        this.particles = [];

        if (!this.type || this.intensity <= 0) return;

        const maxCount = this.type === 'rain' ? 140 : 110;
        const count = Math.floor(maxCount * this.intensity);
        for (let i = 0; i < count; i++) {
            this.particles.push(new WeatherFlake(this.type));
        }
    }

    clear() {
        this.particles = [];
        this.type = null;
        this.intensity = 0;
    }

    update(dt) {
        if (!this.type || !this.particles.length) return;

        /* Vendaval ocasional para dar vida */
        this.windTimer -= dt;
        if (this.windTimer <= 0) {
            this.windTimer = Utils.random(2, 5);
            this.wind = Utils.random(-0.6, 0.6);
        }

        for (const p of this.particles) p.update(dt, this.wind);
    }

    draw(ctx) {
        if (!this.type || !this.particles.length) return;
        for (const p of this.particles) p.draw(ctx);
    }
}

window.WeatherFlake = WeatherFlake;
window.Weather = Weather;
window.weather = new Weather();
