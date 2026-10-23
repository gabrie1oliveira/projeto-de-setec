/**
 * ============================================================
 * TILES.JS
 * ------------------------------------------------------------
 * Renderização de blocos/cenário por tema. Centraliza o visual
 * de chão, plataformas, tubos e perigos para que o game.js só
 * orquestre.
 *
 * Tipos de plataforma suportados:
 *   brick | used | question | ice | cloud | flagpole | castle
 * ============================================================
 */
"use strict";

class Tiles {

    /* ========================================================
       CHÃO (tiles repetidos, respeitando gaps)
    ======================================================== */
    static ground(ctx, cameraX, levelData, screenW) {
        const theme = CONFIG.THEMES[levelData.theme] || CONFIG.THEMES.overworld;
        const tile = CONFIG.CANVAS.TILE;
        const gy = levelData.groundY;
        const len = levelData.length;

        const startX = Math.floor(cameraX / tile) * tile;
        const endX = startX + screenW + tile;

        for (let x = startX; x < endX; x += tile) {
            if (x < 0 || x >= len) continue;

            const inGap = levelData.gaps.some(g =>
                x >= g.x && x < g.x + g.width
            );
            if (inGap) continue;

            const sx = x - cameraX;
            const alt = ((x / tile) % 2) === 0;

            /* Corpo */
            ctx.fillStyle = alt ? theme.groundBody
                : Utils.shade(theme.groundBody, -0.08);
            ctx.fillRect(sx, gy, tile, CONFIG.CANVAS.HEIGHT - gy);

            /* Topo (grama/neve/areia) */
            ctx.fillStyle = theme.ground;
            ctx.fillRect(sx, gy, tile, 8);

            /* Faixa de brilho no topo */
            ctx.fillStyle = 'rgba(255,255,255,0.18)';
            ctx.fillRect(sx, gy, tile, 2);

            /* Textura interna */
            ctx.strokeStyle = 'rgba(0,0,0,0.15)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(sx, gy + 16);
            ctx.lineTo(sx + tile, gy + 16);
            ctx.moveTo(sx + tile / 2, gy + 8);
            ctx.lineTo(sx + tile / 2, gy + 16);
            ctx.stroke();

            if (levelData.theme === 'snow') {
                ctx.fillStyle = 'rgba(255,255,255,0.85)';
                ctx.fillRect(sx, gy - 3, tile, 3);
            }
            if (levelData.theme === 'desert') {
                ctx.fillStyle = 'rgba(255,255,255,0.25)';
                ctx.fillRect(sx, gy, tile, 3);
            }
        }
    }

    /* ========================================================
       PLATAFORMAS (dispatch por tipo)
    ======================================================== */
    static platform(ctx, sx, p, theme, time) {
        switch (p.type) {
            case 'brick':
            case 'used':
                Tiles.brick(ctx, sx, p, theme);
                break;
            case 'question':
                Tiles.question(ctx, sx, p, time);
                break;
            case 'ice':
                Tiles.ice(ctx, sx, p, time);
                break;
            case 'cloud':
                Tiles.cloud(ctx, sx, p, time);
                break;
            case 'flagpole':
                Tiles.flagpole(ctx, sx, p, time);
                break;
            case 'castle':
                Tiles.castle(ctx, sx, p);
                break;
            default:
                ctx.fillStyle = CONFIG.COLORS.BRICK;
                ctx.fillRect(sx, p.y, p.width, p.height);
                ctx.strokeStyle = '#000';
                ctx.strokeRect(sx + 0.5, p.y + 0.5, p.width - 1, p.height - 1);
        }
    }

    static brick(ctx, sx, p, theme) {
        const used = p.type === 'used';
        /* Tijolo de castelo fica avermelhado; resto usa BRICK */
        const base = used
            ? CONFIG.COLORS.USED
            : (theme && theme.dark ? Utils.shade(theme.ground, -0.1)
                : CONFIG.COLORS.BRICK);

        ctx.fillStyle = base;
        ctx.fillRect(sx, p.y, p.width, p.height);

        const grad = ctx.createLinearGradient(sx, p.y, sx, p.y + p.height);
        grad.addColorStop(0, 'rgba(255,255,255,0.15)');
        grad.addColorStop(1, 'rgba(0,0,0,0.25)');
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

    static question(ctx, sx, p, time) {
        const t = time * 3;
        const pulse = 0.5 + 0.5 * Math.sin(t);

        ctx.fillStyle = CONFIG.COLORS.QUESTION;
        ctx.fillRect(sx, p.y, p.width, p.height);

        ctx.fillStyle = 'rgba(255, 235, 59, ' + (0.2 + 0.2 * pulse) + ')';
        ctx.fillRect(sx, p.y, p.width, p.height);

        /* Aura brilhante */
        ctx.save();
        ctx.shadowBlur = 8 + pulse * 6;
        ctx.shadowColor = '#FFEB3B';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeRect(sx + 1, p.y + 1, p.width - 2, p.height - 2);
        ctx.restore();

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

    static ice(ctx, sx, p, time) {
        const grad = ctx.createLinearGradient(sx, p.y, sx, p.y + p.height);
        grad.addColorStop(0, '#B3E5FC');
        grad.addColorStop(0.5, '#4FC3F7');
        grad.addColorStop(1, '#0288D1');
        ctx.fillStyle = grad;
        ctx.fillRect(sx, p.y, p.width, p.height);

        /* Brilho diagonal animado */
        const shine = (Math.sin(time * 2 + sx * 0.02) * 0.5 + 0.5);
        ctx.strokeStyle = 'rgba(255,255,255,' + (0.3 + shine * 0.4) + ')';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(sx + 4, p.y + p.height - 4);
        ctx.lineTo(sx + p.width - 4, p.y + 4);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.strokeRect(sx + 0.5, p.y + 0.5, p.width - 1, p.height - 1);
        ctx.strokeStyle = 'rgba(2,136,209,0.8)';
        ctx.strokeRect(sx + 1.5, p.y + 1.5, p.width - 3, p.height - 3);
    }

    static cloud(ctx, sx, p, time) {
        const bob = Math.sin(time * 1.5 + sx * 0.01) * 1.5;
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        ctx.beginPath();
        ctx.arc(sx + 10, p.y + 10 + bob, 10, 0, Math.PI * 2);
        ctx.arc(sx + p.width / 2, p.y + 6 + bob, 13, 0, Math.PI * 2);
        ctx.arc(sx + p.width - 10, p.y + 10 + bob, 10, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(200,220,240,0.9)';
        ctx.fillRect(sx, p.y + 12 + bob, p.width, 8);
    }

    static flagpole(ctx, sx, p, time) {
        ctx.fillStyle = '#E0E0E0';
        ctx.fillRect(sx + 5, p.y, 6, p.height);

        ctx.fillStyle = '#757575';
        ctx.fillRect(sx, p.y + p.height - 12, 16, 12);

        const wave = Math.sin(time * 5) * 3;
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

    static castle(ctx, sx, p) {
        ctx.fillStyle = '#8D6E63';
        ctx.fillRect(sx, p.y, p.width, p.height);

        ctx.fillStyle = '#5D4037';
        for (let i = 0; i < Math.floor(p.width / 16); i++) {
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
       TUBOS
    ======================================================== */
    static pipe(ctx, sx, p, theme) {
        const h = p.height ?? 96;
        const pipeColor = (theme && theme.pipe) || CONFIG.COLORS.PIPE;
        const dark = Utils.shade(pipeColor, -0.3);
        const light = Utils.shade(pipeColor, 0.3);

        /* Sombra no chão */
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.ellipse(sx + p.width / 2, p.y + h, p.width, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        /* Corpo */
        ctx.fillStyle = pipeColor;
        ctx.fillRect(sx, p.y + 20, p.width, h - 20);

        /* Aro */
        ctx.fillRect(sx - 4, p.y, p.width + 8, 20);

        /* Sombra direita */
        ctx.fillStyle = dark;
        ctx.fillRect(sx + p.width - 12, p.y + 20, 12, h - 20);
        ctx.fillRect(sx + p.width - 2, p.y + 2, 6, 16);

        /* Brilho esquerdo */
        ctx.fillStyle = light;
        ctx.fillRect(sx + 4, p.y + 22, 6, h - 24);
        ctx.fillRect(sx + 4, p.y + 2, 6, 16);

        /* Bordas */
        ctx.strokeStyle = 'rgba(0,0,0,0.55)';
        ctx.lineWidth = 1;
        ctx.strokeRect(sx - 4.5, p.y + 0.5, p.width + 9, 20);
        ctx.beginPath();
        ctx.moveTo(sx + 0.5, p.y + 20);
        ctx.lineTo(sx + 0.5, p.y + h);
        ctx.moveTo(sx + p.width - 0.5, p.y + 20);
        ctx.lineTo(sx + p.width - 0.5, p.y + h);
        ctx.moveTo(sx - 4, p.y + 20);
        ctx.lineTo(sx + p.width + 4, p.y + 20);
        ctx.stroke();

        if (p.hasText) {
            Tiles.pipeText(ctx, sx, p, h);
        }
    }

    static pipeText(ctx, sx, pipe, h) {
        const cx = sx + pipe.width / 2;
        const cy = pipe.y + 20 + (h - 20) / 2;
        const textW = 64;
        const textH = 14;

        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.fillRect(cx - textW / 2, cy - textH / 2, textW, textH);

        ctx.strokeStyle = 'rgba(255, 215, 0, 0.8)';
        ctx.lineWidth = 1;
        ctx.strokeRect(cx - textW / 2 + 0.5, cy - textH / 2 + 0.5,
            textW - 1, textH - 1);

        ctx.font = 'bold 9px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        ctx.fillText('vai ds', cx + 1, cy + 1);

        ctx.fillStyle = '#FFD700';
        ctx.shadowBlur = 4;
        ctx.shadowColor = '#FFD700';
        ctx.fillText('vai ds', cx, cy);

        ctx.shadowBlur = 0;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.restore();
    }

    /* ========================================================
       PERIGOS (lava / espinhos)
    ======================================================== */
    static hazards(ctx, cameraX, levelData, time) {
        const hazards = levelData.hazards || [];
        for (const hz of hazards) {
            const sx = hz.x - cameraX;
            const y = (hz.y != null) ? hz.y : levelData.groundY;
            const h = (hz.height != null)
                ? hz.height
                : (CONFIG.CANVAS.HEIGHT - y);
            if (sx + hz.width < 0 || sx > CONFIG.CANVAS.WIDTH) continue;

            if (hz.type === 'spikes') {
                ctx.fillStyle = '#B0BEC5';
                ctx.beginPath();
                for (let x = 0; x < hz.width; x += 16) {
                    ctx.moveTo(sx + x, y + h);
                    ctx.lineTo(sx + x + 8, y);
                    ctx.lineTo(sx + x + 16, y + h);
                }
                ctx.closePath();
                ctx.fill();
                continue;
            }

            /* Lava */
            const grad = ctx.createLinearGradient(0, y, 0, y + h);
            grad.addColorStop(0, '#FF6D00');
            grad.addColorStop(0.5, '#E53935');
            grad.addColorStop(1, '#8E0000');
            ctx.fillStyle = grad;
            ctx.fillRect(sx, y, hz.width, h);

            /* Superfície ondulada */
            ctx.fillStyle = 'rgba(255,200,0,0.7)';
            ctx.beginPath();
            ctx.moveTo(sx, y + 3);
            for (let x = 0; x <= hz.width; x += 8) {
                ctx.lineTo(sx + x, y + 3 + Math.sin(time * 4 + x * 0.05) * 3);
            }
            ctx.lineTo(sx + hz.width, y + 10);
            ctx.lineTo(sx, y + 10);
            ctx.closePath();
            ctx.fill();

            if (Math.random() < 0.02) {
                EffectsManager.emitSparkles(
                    hz.x + Utils.random(0, hz.width), y, 2, '#FF6D00'
                );
            }
        }
    }
}

window.Tiles = Tiles;
