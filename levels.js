/**
 * ============================================================
 * LEVELS.JS
 * ------------------------------------------------------------
 * Banco de dados das fases.
 *
 * v2.0 — 8 fases em 2 mundos:
 *   Mundo 1 (Overworld): 1-1, 1-2 (underground), 1-3 (desert), 1-4 (boss)
 *   Mundo 2 (Castle/Sky): 2-1 (snow), 2-2 (lava), 2-3 (sky), 2-4 (boss final)
 *
 * Cada fase tem:
 *   - checkpoints: [{ x, y }]  → respawn intermediário
 *   - stars: [{ x, y }]        → 3 estrelas opcionais
 *   - hazards: [{ x, width }]  → lava (dano por contato)
 *
 * Tubos: y = topo, height = altura TOTAL (topo → chão).
 * ============================================================
 */
"use strict";

const LEVELS = {

    /* ========================================================
       FASE 1 — 1-1 Overworld
    ======================================================== */
    1: {
        id: '1-1',
        name: '1-1',
        theme: 'overworld',
        length: 3400,
        groundY: CONFIG.CANVAS.GROUND_Y,

        gaps: [
            { x: 960, width: 96 },
            { x: 1920, width: 128 },
            { x: 2700, width: 96 },
        ],

        platforms: [
            { x: 256, y: 284, width: 32, height: 32, type: 'brick' },
            { x: 288, y: 284, width: 32, height: 32, type: 'question', item: 'mushroom' },
            { x: 320, y: 284, width: 32, height: 32, type: 'brick' },
            { x: 352, y: 284, width: 32, height: 32, type: 'question', item: 'coin' },
            { x: 384, y: 284, width: 32, height: 32, type: 'brick' },

            { x: 320, y: 188, width: 32, height: 32, type: 'question', item: 'fireflower' },

            { x: 640, y: 284, width: 32, height: 32, type: 'brick' },
            { x: 672, y: 284, width: 32, height: 32, type: 'brick' },
            { x: 704, y: 284, width: 32, height: 32, type: 'question', item: 'coin' },
            { x: 736, y: 284, width: 32, height: 32, type: 'brick' },

            { x: 1280, y: 284, width: 128, height: 32, type: 'brick' },
            { x: 1440, y: 220, width: 96, height: 32, type: 'brick' },
            { x: 1600, y: 284, width: 96, height: 32, type: 'brick' },

            /* Seção secreta (plataforma alta → estrela) */
            { x: 1664, y: 156, width: 96, height: 32, type: 'brick' },

            { x: 2400, y: 240, width: 128, height: 32, type: 'brick' },
            { x: 2560, y: 240, width: 32, height: 32, type: 'question', item: 'coin' },

            { x: 3150, y: 124, width: 16, height: 256, type: 'flagpole' },
            { x: 3220, y: 320, width: 64, height: 60, type: 'castle' },
        ],

        pipes: [
            { x: 480,  y: 316, width: 64, height: 64,  hasText: true  },
            { x: 700,  y: 284, width: 64, height: 96,  hasText: true  },
            { x: 1400, y: 316, width: 64, height: 64,  hasText: true  },
            { x: 2200, y: 284, width: 64, height: 96,  hasText: false },
        ],

        enemies: [
            { x: 400,  y: 356, minX: 300,  maxX: 460,  type: 'goomba' },
            { x: 600,  y: 356, minX: 550,  maxX: 680,  type: 'goomba' },
            { x: 1100, y: 356, minX: 1000, maxX: 1380, type: 'koopa' },
            { x: 1600, y: 356, minX: 1480, maxX: 1800, type: 'goomba' },
            { x: 1750, y: 356, minX: 1700, maxX: 1850, type: 'goomba' },
            { x: 2050, y: 200, minX: 1950, maxX: 2350, type: 'flying' },
            { x: 2800, y: 356, minX: 2700, maxX: 3000, type: 'koopa' },
        ],

        coins: [
            { x: 292, y: 250 }, { x: 356, y: 250 },
            { x: 648, y: 250 }, { x: 712, y: 250 },
            { x: 1300, y: 250 }, { x: 1340, y: 250 },
            { x: 1470, y: 190 }, { x: 2560, y: 200 },
            { x: 1680, y: 122 }, { x: 1712, y: 122 }, { x: 1744, y: 122 },
        ],

        checkpoints: [ { x: 1700, y: 380 } ],
        stars: [
            { x: 1720, y: 120 },
            { x: 2450, y: 206 },
            { x: 2860, y: 340 },
        ],
        hazards: [],

        items: [],
        hasBoss: false,
    },

    /* ========================================================
       FASE 2 — 1-2 Subterrâneo
    ======================================================== */
    2: {
        id: '1-2',
        name: '1-2',
        theme: 'underground',
        length: 3200,
        groundY: CONFIG.CANVAS.GROUND_Y,

        gaps: [
            { x: 1100, width: 160 },
            { x: 2200, width: 130 },
        ],

        platforms: [
            { x: 200,  y: 284, width: 96,  height: 32, type: 'brick' },
            { x: 450,  y: 252, width: 64,  height: 32, type: 'question', item: 'fireflower' },
            { x: 600,  y: 220, width: 128, height: 32, type: 'brick' },
            { x: 800,  y: 284, width: 160, height: 32, type: 'brick' },
            { x: 1000, y: 240, width: 32,  height: 32, type: 'question', item: 'coin' },
            { x: 1450, y: 252, width: 96,  height: 32, type: 'brick' },
            { x: 1700, y: 220, width: 128, height: 32, type: 'brick' },
            { x: 1900, y: 284, width: 128, height: 32, type: 'brick' },
            { x: 2400, y: 240, width: 96,  height: 32, type: 'brick' },
            { x: 2600, y: 240, width: 32,  height: 32, type: 'question', item: 'mushroom' },

            /* Seção secreta */
            { x: 2620, y: 124, width: 128, height: 32, type: 'brick' },
            { x: 2780, y: 180, width: 64,  height: 32, type: 'brick' },

            { x: 2960, y: 124, width: 16, height: 256, type: 'flagpole' },
            { x: 3030, y: 320, width: 64, height: 60,  type: 'castle' },
        ],

        pipes: [
            { x: 350,  y: 284, width: 64, height: 96,  hasText: true  },
            { x: 1250, y: 252, width: 64, height: 128, hasText: true  },
            { x: 2000, y: 284, width: 64, height: 96,  hasText: false },
        ],

        enemies: [
            { x: 500,  y: 356, minX: 400,  maxX: 750,  type: 'koopa' },
            { x: 900,  y: 356, minX: 800,  maxX: 1050, type: 'goomba' },
            { x: 1000, y: 356, minX: 800,  maxX: 1050, type: 'goomba' },
            { x: 1500, y: 200, minX: 1300, maxX: 1800, type: 'flying' },
            { x: 1800, y: 356, minX: 1700, maxX: 2000, type: 'koopa' },
            { x: 2450, y: 200, minX: 2300, maxX: 2600, type: 'flying' },
        ],

        coins: [
            { x: 220,  y: 250 }, { x: 260,  y: 250 },
            { x: 620,  y: 190 }, { x: 660,  y: 190 },
            { x: 820,  y: 250 }, { x: 860,  y: 250 },
            { x: 1460, y: 220 }, { x: 1500, y: 220 },
            { x: 2410, y: 210 }, { x: 2450, y: 210 },
            { x: 2740, y: 140 }, { x: 2780, y: 140 },
        ],

        checkpoints: [ { x: 1750, y: 220 } ],
        stars: [
            { x: 2660, y: 96 },
            { x: 2800, y: 152 },
            { x: 1200, y: 320 },
        ],
        hazards: [],

        items: [],
        hasBoss: false,
    },

    /* ========================================================
       FASE 3 — 1-3 Deserto
    ======================================================== */
    3: {
        id: '1-3',
        name: '1-3',
        theme: 'desert',
        length: 3600,
        groundY: CONFIG.CANVAS.GROUND_Y,

        gaps: [
            { x: 900,  width: 128 },
            { x: 1750, width: 150 },
            { x: 2600, width: 128 },
        ],

        platforms: [
            { x: 300,  y: 284, width: 32, height: 32, type: 'question', item: 'mushroom' },
            { x: 500,  y: 252, width: 128, height: 32, type: 'brick' },
            { x: 700,  y: 220, width: 96,  height: 32, type: 'brick' },

            /* Pirâmide de plataformas */
            { x: 1150, y: 284, width: 64,  height: 32, type: 'brick' },
            { x: 1230, y: 220, width: 64,  height: 32, type: 'brick' },
            { x: 1310, y: 156, width: 64,  height: 32, type: 'brick' },

            { x: 1500, y: 284, width: 128, height: 32, type: 'brick' },
            { x: 1560, y: 252, width: 32,  height: 32, type: 'question', item: 'fireflower' },

            { x: 2000, y: 240, width: 160, height: 32, type: 'brick' },
            { x: 2200, y: 200, width: 32,  height: 32, type: 'question', item: 'coin' },

            { x: 2450, y: 284, width: 96,  height: 32, type: 'brick' },
            { x: 2700, y: 220, width: 128, height: 32, type: 'brick' },

            /* Seção secreta — oásis suspenso */
            { x: 2760, y: 124, width: 128, height: 32, type: 'brick' },

            { x: 3350, y: 124, width: 16, height: 256, type: 'flagpole' },
            { x: 3420, y: 320, width: 64, height: 60,  type: 'castle' },
        ],

        pipes: [
            { x: 400,  y: 316, width: 64, height: 64, hasText: true  },
            { x: 1450, y: 316, width: 64, height: 64, hasText: false },
            { x: 2900, y: 284, width: 64, height: 96, hasText: true  },
        ],

        enemies: [
            { x: 600,  y: 356, minX: 500,  maxX: 780,  type: 'goomba' },
            { x: 1000, y: 356, minX: 950,  maxX: 1150, type: 'koopa' },
            { x: 1250, y: 200, minX: 1100, maxX: 1450, type: 'flying' },
            { x: 1600, y: 356, minX: 1500, maxX: 1720, type: 'goomba' },
            { x: 2050, y: 356, minX: 1950, maxX: 2350, type: 'koopa' },
            { x: 2500, y: 356, minX: 2400, maxX: 2650, type: 'goomba' },
            { x: 3000, y: 200, minX: 2800, maxX: 3200, type: 'flying' },
        ],

        coins: [
            { x: 520,  y: 220 }, { x: 560,  y: 220 },
            { x: 720,  y: 190 }, { x: 760,  y: 190 },
            { x: 1240, y: 190 }, { x: 1280, y: 190 },
            { x: 1320, y: 124 }, { x: 1356, y: 124 },
            { x: 2020, y: 210 }, { x: 2060, y: 210 },
            { x: 2800, y: 96 },  { x: 2840, y: 96 }, { x: 2880, y: 96 },
        ],

        checkpoints: [ { x: 1800, y: 380 }, { x: 2500, y: 380 } ],
        stars: [
            { x: 1335, y: 98 },
            { x: 2230, y: 168 },
            { x: 2830, y: 94 },
        ],
        hazards: [],

        items: [],
        hasBoss: false,
    },

    /* ========================================================
       FASE 4 — 1-4 Castelo (BOSS)
    ======================================================== */
    4: {
        id: '1-4',
        name: '1-4',
        theme: 'castle',
        length: 3000,
        groundY: CONFIG.CANVAS.GROUND_Y,

        gaps: [
            { x: 700,  width: 150 },
            { x: 1400, width: 150 },
            { x: 2050, width: 128 },
        ],

        platforms: [
            { x: 300,  y: 284, width: 64,  height: 32, type: 'question', item: 'mushroom' },
            { x: 500,  y: 220, width: 128, height: 32, type: 'brick' },
            { x: 900,  y: 252, width: 128, height: 32, type: 'brick' },
            { x: 1100, y: 190, width: 32,  height: 32, type: 'question', item: 'fireflower' },

            { x: 1600, y: 252, width: 128, height: 32, type: 'brick' },
            { x: 1800, y: 220, width: 96,  height: 32, type: 'brick' },

            /* Seção secreta */
            { x: 1850, y: 124, width: 128, height: 32, type: 'brick' },

            { x: 2300, y: 240, width: 128, height: 32, type: 'brick' },
            { x: 2450, y: 240, width: 32,  height: 32, type: 'question', item: 'coin' },

            { x: 2760, y: 124, width: 16, height: 256, type: 'flagpole' },
        ],

        pipes: [
            { x: 450,  y: 316, width: 64, height: 64, hasText: true  },
            { x: 1550, y: 316, width: 64, height: 64, hasText: false },
        ],

        enemies: [
            { x: 400,  y: 356, minX: 300,  maxX: 460,  type: 'koopa' },
            { x: 600,  y: 356, minX: 500,  maxX: 700,  type: 'goomba' },
            { x: 1000, y: 356, minX: 950,  maxX: 1250, type: 'koopa' },
            { x: 1200, y: 200, minX: 1000, maxX: 1400, type: 'flying' },
            { x: 1750, y: 356, minX: 1700, maxX: 1950, type: 'koopa' },
            { x: 2200, y: 200, minX: 2100, maxX: 2400, type: 'flying' },
        ],

        coins: [
            { x: 320,  y: 250 },
            { x: 520,  y: 190 }, { x: 560,  y: 190 },
            { x: 920,  y: 220 }, { x: 960,  y: 220 },
            { x: 1620, y: 220 },
            { x: 1880, y: 96 },  { x: 1920, y: 96 }, { x: 1956, y: 96 },
            { x: 2320, y: 210 },
        ],

        checkpoints: [ { x: 1450, y: 380 } ],
        stars: [
            { x: 1900, y: 94 },
            { x: 1130, y: 160 },
            { x: 2480, y: 206 },
        ],
        hazards: [],

        items: [],
        hasBoss: true,
        bossSpawn: { x: 2200, y: 316, minX: 1900, maxX: 2650 },
    },

    /* ========================================================
       FASE 5 — 2-1 Neve
    ======================================================== */
    5: {
        id: '2-1',
        name: '2-1',
        theme: 'snow',
        length: 3800,
        groundY: CONFIG.CANVAS.GROUND_Y,

        gaps: [
            { x: 850,  width: 128 },
            { x: 1700, width: 128 },
            { x: 2600, width: 160 },
            { x: 3200, width: 110 },
        ],

        platforms: [
            { x: 300,  y: 284, width: 32, height: 32, type: 'question', item: 'mushroom' },
            { x: 450,  y: 252, width: 128, height: 32, type: 'brick' },
            { x: 650,  y: 220, width: 96,  height: 32, type: 'ice' },

            { x: 1000, y: 252, width: 160, height: 32, type: 'ice' },
            { x: 1250, y: 200, width: 64,  height: 32, type: 'brick' },

            { x: 1500, y: 284, width: 128, height: 32, type: 'ice' },
            { x: 1900, y: 220, width: 128, height: 32, type: 'brick' },

            /* Seção secreta — pico nevado */
            { x: 2000, y: 124, width: 128, height: 32, type: 'ice' },

            { x: 2300, y: 284, width: 96,  height: 32, type: 'ice' },
            { x: 2800, y: 220, width: 128, height: 32, type: 'brick' },
            { x: 3050, y: 252, width: 32,  height: 32, type: 'question', item: 'coin' },

            { x: 3550, y: 124, width: 16, height: 256, type: 'flagpole' },
            { x: 3620, y: 320, width: 64, height: 60,  type: 'castle' },
        ],

        pipes: [
            { x: 400,  y: 316, width: 64, height: 64, hasText: true  },
            { x: 2200, y: 284, width: 64, height: 96, hasText: false },
        ],

        /* Snow: koopas azuis congelados */
        enemies: [
            { x: 500,  y: 356, minX: 400,  maxX: 700,  type: 'koopa', variant: 'blue' },
            { x: 900,  y: 356, minX: 850,  maxX: 1100, type: 'goomba' },
            { x: 1200, y: 200, minX: 1000, maxX: 1400, type: 'flying' },
            { x: 1550, y: 356, minX: 1450, maxX: 1680, type: 'koopa', variant: 'blue' },
            { x: 2000, y: 356, minX: 1900, maxX: 2150, type: 'goomba' },
            { x: 2400, y: 356, minX: 2300, maxX: 2600, type: 'koopa', variant: 'blue' },
            { x: 2850, y: 356, minX: 2750, maxX: 3000, type: 'goomba' },
            { x: 3100, y: 200, minX: 2950, maxX: 3300, type: 'flying' },
        ],

        coins: [
            { x: 470,  y: 220 }, { x: 510,  y: 220 },
            { x: 680,  y: 190 }, { x: 720,  y: 190 },
            { x: 1030, y: 220 }, { x: 1070, y: 220 },
            { x: 1530, y: 250 }, { x: 1570, y: 250 },
            { x: 2040, y: 96 },  { x: 2080, y: 96 }, { x: 2116, y: 96 },
            { x: 2820, y: 190 }, { x: 2860, y: 190 },
        ],

        checkpoints: [ { x: 1850, y: 380 }, { x: 2700, y: 380 } ],
        stars: [
            { x: 2060, y: 96 },
            { x: 1300, y: 172 },
            { x: 3100, y: 222 },
        ],
        hazards: [],

        items: [],
        hasBoss: false,
    },

    /* ========================================================
       FASE 6 — 2-2 Lava
    ======================================================== */
    6: {
        id: '2-2',
        name: '2-2',
        theme: 'lava',
        length: 4000,
        groundY: CONFIG.CANVAS.GROUND_Y,

        gaps: [
            { x: 800,  width: 170 },
            { x: 1500, width: 170 },
            { x: 2300, width: 200 },
            { x: 3100, width: 170 },
        ],

        /* Rios de lava ao fundo dos buracos (dano por contato) */
        hazards: [
            { x: 800,  width: 170 },
            { x: 1500, width: 170 },
            { x: 2300, width: 200 },
            { x: 3100, width: 170 },
        ],

        platforms: [
            { x: 300,  y: 284, width: 32, height: 32, type: 'question', item: 'mushroom' },
            { x: 480,  y: 252, width: 128, height: 32, type: 'brick' },
            { x: 680,  y: 220, width: 64,  height: 32, type: 'brick' },

            { x: 1050, y: 284, width: 96,  height: 32, type: 'brick' },
            { x: 1200, y: 220, width: 96,  height: 32, type: 'brick' },
            { x: 1320, y: 156, width: 64,  height: 32, type: 'question', item: 'fireflower' },

            { x: 1750, y: 284, width: 128, height: 32, type: 'brick' },
            { x: 1900, y: 220, width: 96,  height: 32, type: 'brick' },

            { x: 2550, y: 252, width: 128, height: 32, type: 'brick' },
            { x: 2700, y: 190, width: 96,  height: 32, type: 'brick' },

            /* Seção secreta */
            { x: 2750, y: 124, width: 128, height: 32, type: 'brick' },

            { x: 3300, y: 284, width: 128, height: 32, type: 'brick' },
            { x: 3450, y: 220, width: 32,  height: 32, type: 'question', item: 'coin' },

            { x: 3750, y: 124, width: 16, height: 256, type: 'flagpole' },
            { x: 3820, y: 320, width: 64, height: 60,  type: 'castle' },
        ],

        pipes: [
            { x: 400,  y: 316, width: 64, height: 64, hasText: true  },
            { x: 2600, y: 316, width: 64, height: 64, hasText: false },
        ],

        enemies: [
            { x: 550,  y: 356, minX: 480,  maxX: 760,  type: 'koopa' },
            { x: 1100, y: 356, minX: 1050, maxX: 1300, type: 'goomba' },
            { x: 1250, y: 200, minX: 1100, maxX: 1450, type: 'flying' },
            { x: 1800, y: 356, minX: 1750, maxX: 1950, type: 'koopa' },
            { x: 2600, y: 356, minX: 2550, maxX: 2750, type: 'goomba' },
            { x: 2900, y: 200, minX: 2700, maxX: 3100, type: 'flying' },
            { x: 3350, y: 356, minX: 3300, maxX: 3520, type: 'koopa' },
        ],

        coins: [
            { x: 500,  y: 220 }, { x: 540,  y: 220 },
            { x: 1070, y: 250 }, { x: 1110, y: 250 },
            { x: 1340, y: 124 }, { x: 1376, y: 124 },
            { x: 1780, y: 250 }, { x: 1820, y: 250 },
            { x: 2580, y: 220 }, { x: 2620, y: 220 },
            { x: 2780, y: 96 },  { x: 2820, y: 96 }, { x: 2860, y: 96 },
            { x: 3330, y: 250 },
        ],

        checkpoints: [ { x: 1650, y: 380 }, { x: 2500, y: 380 } ],
        stars: [
            { x: 2800, y: 94 },
            { x: 1345, y: 122 },
            { x: 3350, y: 252 },
        ],
        items: [],
        hasBoss: false,
    },

    /* ========================================================
       FASE 7 — 2-3 Céu (plataformas flutuantes)
    ======================================================== */
    7: {
        id: '2-3',
        name: '2-3',
        theme: 'sky',
        length: 4200,
        groundY: CONFIG.CANVAS.GROUND_Y,

        /* Céu: muito poucos pedaços de chão; foco em plataformas */
        gaps: [
            { x: 400,  width: 1200 },
            { x: 1800, width: 1400 },
            { x: 3400, width: 800 },
        ],

        platforms: [
            /* Trecho inicial (chão 0-400) */
            { x: 200,  y: 316, width: 64, height: 32, type: 'question', item: 'mushroom' },

            /* Ponte de nuvens 1 */
            { x: 520,  y: 300, width: 96, height: 28, type: 'cloud' },
            { x: 700,  y: 260, width: 96, height: 28, type: 'cloud' },
            { x: 900,  y: 300, width: 96, height: 28, type: 'cloud' },
            { x: 1100, y: 240, width: 96, height: 28, type: 'cloud' },
            { x: 1300, y: 300, width: 128, height: 28, type: 'cloud' },

            /* Ilha intermediária */
            { x: 1600, y: 284, width: 96, height: 40, type: 'brick' },
            { x: 1600, y: 188, width: 32, height: 32, type: 'question', item: 'fireflower' },

            /* Ponte de nuvens 2 */
            { x: 1950, y: 260, width: 96, height: 28, type: 'cloud' },
            { x: 2150, y: 220, width: 96, height: 28, type: 'cloud' },
            { x: 2350, y: 280, width: 96, height: 28, type: 'cloud' },
            { x: 2550, y: 220, width: 96, height: 28, type: 'cloud' },
            { x: 2750, y: 280, width: 96, height: 28, type: 'cloud' },

            /* Seção secreta — ninho de estrelas */
            { x: 2200, y: 124, width: 160, height: 28, type: 'cloud' },

            /* Ilha final */
            { x: 3200, y: 284, width: 128, height: 40, type: 'brick' },
            { x: 3260, y: 220, width: 32,  height: 32, type: 'question', item: 'coin' },

            { x: 3900, y: 124, width: 16, height: 256, type: 'flagpole' },
            { x: 3970, y: 320, width: 64, height: 60,  type: 'castle' },
        ],

        pipes: [
            { x: 200, y: 316, width: 64, height: 64, hasText: true },
        ],

        enemies: [
            { x: 300,  y: 356, minX: 200,  maxX: 380,  type: 'goomba' },
            { x: 560,  y: 200, minX: 500,  maxX: 650,  type: 'flying' },
            { x: 950,  y: 200, minX: 880,  maxX: 1050, type: 'flying' },
            { x: 1150, y: 160, minX: 1080, maxX: 1250, type: 'flying' },
            { x: 1650, y: 356, minX: 1600, maxX: 1700, type: 'koopa' },
            { x: 2000, y: 180, minX: 1900, maxX: 2250, type: 'flying' },
            { x: 2400, y: 200, minX: 2300, maxX: 2650, type: 'flying' },
            { x: 3250, y: 356, minX: 3200, maxX: 3350, type: 'koopa' },
        ],

        coins: [
            { x: 540,  y: 270 }, { x: 720,  y: 230 },
            { x: 920,  y: 270 }, { x: 1120, y: 210 },
            { x: 1340, y: 270 },
            { x: 2240, y: 96 },  { x: 2280, y: 96 }, { x: 2320, y: 96 },
            { x: 2370, y: 250 }, { x: 2570, y: 190 },
            { x: 3220, y: 250 }, { x: 3280, y: 190 },
        ],

        checkpoints: [ { x: 1600, y: 284 } ],
        stars: [
            { x: 2280, y: 94 },
            { x: 1180, y: 210 },
            { x: 3250, y: 252 },
        ],
        hazards: [],

        items: [],
        hasBoss: false,
    },

    /* ========================================================
       FASE 8 — 2-4 Castelo final (BOSS)
    ======================================================== */
    8: {
        id: '2-4',
        name: '2-4',
        theme: 'castle',
        length: 4500,
        groundY: CONFIG.CANVAS.GROUND_Y,

        gaps: [
            { x: 700,  width: 160 },
            { x: 1300, width: 160 },
            { x: 2100, width: 180 },
            { x: 2800, width: 160 },
            { x: 3500, width: 160 },
        ],

        hazards: [
            { x: 700,  width: 160 },
            { x: 1300, width: 160 },
            { x: 2100, width: 180 },
            { x: 2800, width: 160 },
            { x: 3500, width: 160 },
        ],

        platforms: [
            { x: 300,  y: 284, width: 64,  height: 32, type: 'question', item: 'mushroom' },
            { x: 480,  y: 220, width: 128, height: 32, type: 'brick' },
            { x: 900,  y: 252, width: 128, height: 32, type: 'brick' },
            { x: 1100, y: 190, width: 32,  height: 32, type: 'question', item: 'fireflower' },

            { x: 1550, y: 252, width: 128, height: 32, type: 'brick' },
            { x: 1750, y: 220, width: 96,  height: 32, type: 'brick' },

            { x: 2350, y: 252, width: 128, height: 32, type: 'brick' },
            { x: 2550, y: 190, width: 96,  height: 32, type: 'brick' },

            /* Seção secreta */
            { x: 2600, y: 124, width: 160, height: 32, type: 'brick' },

            { x: 3050, y: 240, width: 128, height: 32, type: 'brick' },
            { x: 3250, y: 190, width: 32,  height: 32, type: 'question', item: 'coin' },

            { x: 3750, y: 252, width: 128, height: 32, type: 'brick' },
            { x: 3950, y: 190, width: 32,  height: 32, type: 'question', item: 'star' },

            { x: 4250, y: 124, width: 16, height: 256, type: 'flagpole' },
        ],

        pipes: [
            { x: 450,  y: 316, width: 64, height: 64, hasText: true  },
            { x: 1550, y: 316, width: 64, height: 64, hasText: false },
            { x: 3050, y: 316, width: 64, height: 64, hasText: false },
        ],

        enemies: [
            { x: 400,  y: 356, minX: 300,  maxX: 460,  type: 'koopa' },
            { x: 600,  y: 356, minX: 500,  maxX: 680,  type: 'goomba' },
            { x: 1000, y: 356, minX: 900,  maxX: 1250, type: 'koopa' },
            { x: 1150, y: 200, minX: 950,  maxX: 1300, type: 'flying' },
            { x: 1600, y: 356, minX: 1550, maxX: 1750, type: 'goomba' },
            { x: 1850, y: 356, minX: 1750, maxX: 2050, type: 'koopa' },
            { x: 2400, y: 356, minX: 2350, maxX: 2750, type: 'goomba' },
            { x: 2900, y: 200, minX: 2750, maxX: 3050, type: 'flying' },
            { x: 3100, y: 356, minX: 3050, maxX: 3300, type: 'koopa' },
            { x: 3800, y: 356, minX: 3750, maxX: 3980, type: 'goomba' },
        ],

        coins: [
            { x: 320,  y: 250 },
            { x: 500,  y: 190 }, { x: 540,  y: 190 },
            { x: 920,  y: 220 }, { x: 960,  y: 220 },
            { x: 1120, y: 160 },
            { x: 1570, y: 220 }, { x: 1610, y: 220 },
            { x: 2380, y: 220 }, { x: 2420, y: 220 },
            { x: 2640, y: 96 },  { x: 2680, y: 96 }, { x: 2720, y: 96 },
            { x: 3080, y: 210 }, { x: 3120, y: 210 },
            { x: 3780, y: 220 }, { x: 3820, y: 220 },
        ],

        checkpoints: [ { x: 2000, y: 380 }, { x: 3450, y: 380 } ],
        stars: [
            { x: 2660, y: 94 },
            { x: 4000, y: 168 },
            { x: 3120, y: 208 },
        ],
        items: [],
        hasBoss: true,
        bossSpawn: { x: 3600, y: 316, minX: 3250, maxX: 4150 },
    },
};

/* ============================================================
   GERENCIADOR DE FASES
   getLevel(id, opts):
     opts.procedural = true → embaralha conteúdo (moedas / itens)
     opts.seed       = número da run
============================================================ */
const WorldManager = {
    currentId: 1,

    getLevel(id, opts = {}) {
        const raw = LEVELS[id] || LEVELS[1];
        const level = JSON.parse(JSON.stringify(raw));

        if (opts.procedural) {
            this.applyProcedural(level, opts.seed ?? 1);
        }

        return level;
    },

    /**
     * Layout procedural leve: embaralha posições de moedas e os
     * tipos de item dos blocos "?" — sem tocar no terreno/inimigos.
     */
    applyProcedural(level, seed) {
        const rng = Utils.createRng(seed ^ (String(level.id).length * 2654435761));

        /* 1) Embaralha os X das moedas entre si (mantém Y) */
        if (level.coins && level.coins.length > 1) {
            const xs = level.coins.map(c => c.x);
            rng.shuffle(xs);
            for (let i = 0; i < level.coins.length; i++) {
                level.coins[i].x = xs[i];
            }
        }

        /* 2) Reatribui tipos de item dos blocos "?" */
        const itemPool = [
            'mushroom', 'mushroom', 'coin', 'coin', 'coin',
            'fireflower', 'star', 'iceflower', 'hammer', 'cape',
            'mini', 'mega',
        ];
        for (const p of level.platforms) {
            if (p.type === 'question') {
                p.item = rng.pick(itemPool);
            }
        }
    },

    get total() {
        return Object.keys(LEVELS).length;
    },

    hasNext(id) {
        return id < this.total;
    },
};

window.LEVELS = LEVELS;
window.WorldManager = WorldManager;
