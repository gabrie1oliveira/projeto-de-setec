/**
 * ============================================================
 * RNG.JS
 * ------------------------------------------------------------
 * Camada roguelite do jogo:
 *   - RunModifier : mutadores sorteados por run (via seed)
 *   - RandomEvent : eventos aleatórios durante a partida
 *
 * Tudo é determinístico a partir da seed guardada em
 * SAVE.currentRun.seed, para que a "run" seja reproduzível.
 * ============================================================
 */
"use strict";

/* ============================================================
   MUTADORES DE RUN
============================================================ */
class RunModifier {

    /** Sempre recriado a cada run. */
    static active = [];

    /** Catálogo completo de mutadores. */
    static MUTATORS = [
        {
            id: 'heavy_gravity',
            name: 'Gravidade Pesada',
            desc: 'Você cai mais rápido.',
            icon: '\u2193',
            color: '#795548',
            good: false,
        },
        {
            id: 'low_gravity',
            name: 'Baixa Gravidade',
            desc: 'Pulos mais flutuantes.',
            icon: '\u2191',
            color: '#26C6DA',
            good: true,
        },
        {
            id: 'slippery_floor',
            name: 'Piso Escorregadio',
            desc: 'Freia com dificuldade.',
            icon: '\u2744',
            color: '#4FC3F7',
            good: false,
        },
        {
            id: 'double_jump',
            name: 'Pulo Duplo',
            desc: 'Pule uma vez no ar.',
            icon: '\u21C5',
            color: '#66BB6A',
            good: true,
        },
        {
            id: 'iron_boots',
            name: 'Botas de Ferro',
            desc: 'Quica alto ao pisar.',
            icon: '\u25A0',
            color: '#9E9E9E',
            good: true,
        },
        {
            id: 'pacifist',
            name: 'Pacifista',
            desc: 'Não pode esmagar inimigos.',
            icon: '\u2716',
            color: '#E91E63',
            good: false,
        },
        {
            id: 'fragile_world',
            name: 'Mundo Frágil',
            desc: 'Blocos quebram ao toque.',
            icon: '\uD83D\uDCA5',
            color: '#D32F2F',
            good: false,
        },
        {
            id: 'glass_cannon',
            name: 'Canhão de Vidro',
            desc: 'Um único golpe te derruba.',
            icon: '\u2620',
            color: '#B71C1C',
            good: false,
        },
        {
            id: 'enemy_speed',
            name: 'Fúria Inimiga',
            desc: 'Inimigos mais rápidos.',
            icon: '\u26A1',
            color: '#FF6D00',
            good: false,
        },
        {
            id: 'extra_enemies',
            name: 'Horda',
            desc: 'Mais inimigos na fase.',
            icon: '\u263B',
            color: '#8E24AA',
            good: false,
        },
        {
            id: 'coin_bonus',
            name: 'Cobiça',
            desc: 'Moedas valem o dobro.',
            icon: '\u25CF',
            color: '#FFD700',
            good: true,
        },
        {
            id: 'time_rush',
            name: 'Contra o Tempo',
            desc: 'Tempo corre mais rápido.',
            icon: '\u23F1',
            color: '#F4511E',
            good: false,
        },
        {
            id: 'friendly_skies',
            name: 'Céus Amigos',
            desc: 'Nuvens viram plataformas.',
            icon: '\u2601',
            color: '#90CAF9',
            good: true,
        },
        {
            id: 'lucky',
            name: 'Sortudo',
            desc: 'Itens raros são comuns.',
            icon: '\u2605',
            color: '#FFC107',
            good: true,
        },
    ];

    /** Índice id → definição. */
    static get(id) {
        return RunModifier.MUTATORS.find(m => m.id === id) || null;
    }

    /** Retorna true se o mutador está ativo nesta run. */
    static has(id) {
        return RunModifier.active.includes(id);
    }

    /** Definições completas dos mutadores ativos. */
    static get activeDefs() {
        return RunModifier.active.map(id => RunModifier.get(id)).filter(Boolean);
    }

    /** Limpa todos os mutadores. */
    static clear() {
        RunModifier.active = [];
    }

    /**
     * Sorteia mutadores usando um gerador determinístico.
     * @param {object} rng        Gerador de Utils.createRng
     * @param {number} count      Quantos sortear
     */
    static roll(rng, count = CONFIG.RUN.MODIFIER_COUNT) {
        RunModifier.active = [];
        const pool = rng.shuffle(RunModifier.MUTATORS.slice());
        const n = Math.min(count, pool.length);
        for (let i = 0; i < n; i++) {
            RunModifier.active.push(pool[i].id);
        }
        return RunModifier.activeDefs;
    }
}

/* ============================================================
   EVENTOS ALEATÓRIOS
============================================================ */
class RandomEvent {

    static timer = 0;
    static recent = [];

    /** Catálogo de eventos. apply(game) executa o efeito. */
    static EVENTS = [
        {
            id: 'coin_rain',
            name: 'Chuva de Moedas!',
            color: '#FFD700',
            apply(game) {
                const px = game.player ? game.player.x : 0;
                for (let i = 0; i < 5; i++) {
                    const x = px + Utils.random(-120, 260);
                    const y = Utils.random(-80, 0);
                    game.spawnCoinBurst(x, y, 1);
                }
                EffectsManager.text(
                    (game.player ? game.player.x : 200),
                    120, 'CHUVA DE MOEDAS!', { color: '#FFD700', size: 14 }
                );
            },
        },
        {
            id: 'meteor',
            name: 'Chuva de Meteoros!',
            color: '#FF5722',
            apply(game) {
                const px = game.player ? game.player.x : 0;
                for (let i = 0; i < 4; i++) {
                    const x = px + Utils.random(120, 420) + i * 60;
                    const y = Utils.random(20, 160);
                    EffectsManager.emitExplosion(x, y, '#FF5722');
                }
                EffectsManager.shake(10, 0.5);
                EffectsManager.text(
                    (game.player ? game.player.x : 200),
                    120, 'METEOROS!', { color: '#FF5722', size: 14 }
                );
            },
        },
        {
            id: 'gift',
            name: 'Presente!',
            color: '#4CAF50',
            apply(game) {
                game.addLife();
                EffectsManager.text1UP(
                    game.player ? game.player.x : 200,
                    (game.player ? game.player.y - 30 : 200)
                );
            },
        },
        {
            id: 'treasure',
            name: 'Tesouro!',
            color: '#FFC107',
            apply(game) {
                const bonus = 1500;
                game.addScore(bonus);
                EffectsManager.textScore(
                    game.player ? game.player.x : 200,
                    (game.player ? game.player.y - 30 : 200),
                    bonus, '#FFC107'
                );
            },
        },
        {
            id: 'freeze_wave',
            name: 'Onda de Gelo!',
            color: '#4FC3F7',
            apply(game) {
                if (!game.enemies) return;
                for (const e of game.enemies) {
                    if (e.isAlive && e.freeze) e.freeze();
                }
                EffectsManager.flashScreen('#4FC3F7', 0.4);
                EffectsManager.text(
                    (game.player ? game.player.x : 200),
                    120, 'CONGELADOS!', { color: '#4FC3F7', size: 14 }
                );
            },
        },
        {
            id: 'heal',
            name: 'Bênção!',
            color: '#66BB6A',
            apply(game) {
                game.addLife();
            },
        },
    ];

    /** Reseta o cronômetro para uma nova run. */
    static reset() {
        RandomEvent.recent = [];
        RandomEvent.timer = Utils.random(
            CONFIG.RUN.EVENT_MIN, CONFIG.RUN.EVENT_MAX
        );
    }

    /**
     * Conta o tempo e dispara um evento ao atingir o intervalo.
     * @param {number} dt
     * @param {object} game
     */
    static update(dt, game) {
        if (dt <= 0) return;
        RandomEvent.timer -= dt;
        if (RandomEvent.timer > 0) return;

        RandomEvent.timer = Utils.random(
            CONFIG.RUN.EVENT_MIN, CONFIG.RUN.EVENT_MAX
        );

        /* Evita repetir o mesmo evento seguido */
        let ev = null;
        let tries = 0;
        do {
            ev = RandomEvent.EVENTS[
                Math.floor(Math.random() * RandomEvent.EVENTS.length)
            ];
            tries++;
        } while (
            RandomEvent.recent.includes(ev.id)
            && tries < 6
            && RandomEvent.EVENTS.length > 1
        );

        RandomEvent.recent.push(ev.id);
        if (RandomEvent.recent.length > 2) RandomEvent.recent.shift();

        SoundManager.playMenuConfirm();
        try {
            ev.apply(game);
        } catch (e) {
            /* Silencioso: evento nunca deve travar o jogo */
        }
    }
}

window.RunModifier = RunModifier;
window.RandomEvent = RandomEvent;
