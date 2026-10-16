/**
 * ============================================================
 * CONFIG.JS
 * ------------------------------------------------------------
 * Constantes globais do jogo. Centralizar aqui evita "números
 * mágicos" espalhados pelo código e facilita o balanceamento.
 *
 * v2.0 — Expansão:
 *   - 7 temas visuais (overworld, underground, castle, sky,
 *     desert, snow, lava)
 *   - Constantes de PODERES (ice, hammer, cape, mini, mega, star)
 *   - Sistema de RARIDADE de itens
 *   - Constantes de RUN (mutadores + eventos aleatórios)
 *   - Presets de CLIMA por tema
 * ============================================================
 */
"use strict";

const CONFIG = {

    /* ========================================================
       CANVAS
    ======================================================== */
    CANVAS: {
        WIDTH: 800,
        HEIGHT: 450,
        TILE: 32,
        GROUND_Y: 380,
        GRAVITY: 0.65,
        MAX_DELTA: 0.05,   // limita deltaTime para evitar tunnelling
    },

    /* ========================================================
       FÍSICA DO JOGADOR
    ======================================================== */
    PLAYER: {
        WIDTH: 24,
        HEIGHT_SMALL: 32,
        HEIGHT_BIG: 48,
        ACCEL: 0.7,
        FRICTION: 0.82,
        AIR_FRICTION: 0.94,
        MAX_SPEED: 4.4,
        MAX_FALL_SPEED: 14,
        JUMP_FORCE: -12.5,
        JUMP_HOLD_FRAMES: 8,       // frames de "pulo variável"
        COYOTE_FRAMES: 6,          // frames após sair da plataforma
        JUMP_BUFFER_FRAMES: 8,     // frames de input pré-pulo
        INVULN_TIME: 2.0,
        FIRE_COOLDOWN: 0.25,
        START_LIVES: 3,

        /* Dimensões por "size" (mini/small/super/mega) */
        SIZES: {
            mini:  { width: 14, height: 18 },
            small: { width: 24, height: 32 },
            super: { width: 24, height: 48 },
            mega:  { width: 40, height: 72 },
        },
    },

    /* ========================================================
       INIMIGOS
    ======================================================== */
    ENEMY: {
        GOOMBA_SPEED: 1.2,
        KOOPA_SPEED: 1.4,
        SHELL_SPEED: 7.5,
        FLYING_AMPLITUDE: 35,
        FLYING_FREQ: 250,
        STOMP_BOUNCE: -8,
        BOSS_HP: 5,
        BOSS_PHASE2_HP: 2,
        FROZEN_TIME: 5.0,          // segundos congelado (vira plataforma)
    },

    /* ========================================================
       ITENS E PROJÉTEIS
    ======================================================== */
    ITEM: {
        MUSHROOM_SPEED: 1.5,
        STAR_SPEED: 2.0,
        FIREBALL_SPEED_X: 7,
        FIREBALL_GRAVITY: 0.4,
        FIREBALL_BOUNCE: -4,
        FIREBALL_LIFETIME: 3.0,
        MAX_PROJECTILES: 2,
    },

    /* ========================================================
       PODERES
    ======================================================== */
    POWERS: {
        /* Ice Flower */
        ICEBALL_SPEED_X: 6.5,
        ICEBALL_GRAVITY: 0.35,
        ICEBALL_BOUNCE: -3.5,
        ICEBALL_LIFETIME: 3.0,

        /* Hammer Suit */
        HAMMER_SPEED_X: 5.0,
        HAMMER_SPEED_Y: -6.5,
        HAMMER_GRAVITY: 0.45,
        HAMMER_SPIN: 0.35,         // rad/s de rotação visual
        HAMMER_LIFETIME: 2.2,
        HAMMER_SPIN_INVULN: 0.7,   // giro (C): invulnerabilidade curta
        HAMMER_SPIN_COOLDOWN: 1.4,

        /* Cape Feather */
        CAPE_GLIDE_FALL: 2.0,      // velocidade de queda ao planar
        CAPE_DASH_SPEED: 10.0,     // investida horizontal
        CAPE_DASH_TIME: 0.28,
        CAPE_DASH_COOLDOWN: 0.9,

        /* Durações temporárias (segundos) */
        STAR_DURATION: 10.0,
        MINI_DURATION: 30.0,
        MEGA_DURATION: 10.0,
    },

    /* ========================================================
       RARIDADE DOS ITENS (blocos "?")
    ======================================================== */
    RARITY: {
        COMMON:   0.70,   // moeda / cogumelo
        UNCOMMON: 0.20,   // fire flower / star
        RARE:     0.08,   // power-up novo (ice/hammer/cape/mini/mega)
        EPIC:     0.02,   // 1-UP + explosão de moedas
    },

    /* ========================================================
       RUN ROGUELITE (mutadores + eventos)
    ======================================================== */
    RUN: {
        MODIFIER_COUNT: 2,       // mutadores sorteados por run
        EVENT_MIN: 20,           // intervalo mínimo entre eventos (s)
        EVENT_MAX: 40,           // intervalo máximo entre eventos (s)
    },

    /* ========================================================
       MOEDAS E PONTUAÇÃO
    ======================================================== */
    SCORE: {
        COIN: 200,
        ENEMY: 200,
        BOSS_HIT: 300,
        BOSS_KILL: 5000,
        POWERUP: 1000,
        TIME_BONUS: 50,
        LEVEL_CLEAR: 2000,
        STAR: 1500,
    },

    /* ========================================================
       CÂMERA
    ======================================================== */
    CAMERA: {
        FOLLOW_SPEED: 0.1,
        LOOKAHEAD: 0,              // pixels à frente do player
        SHAKE_DECAY: 0.9,
        SHAKE_INTENSITY: 8,
    },

    /* ========================================================
       TIMER E PROGRESSÃO
    ======================================================== */
    GAME: {
        START_TIME: 400,
        TIME_WARNING: 100,
        LEVELS_TOTAL: 8,
    },

    /* ========================================================
       ÁUDIO
    ======================================================== */
    AUDIO: {
        MASTER_VOLUME: 0.7,
        SFX_VOLUME: 0.08,
    },

    /* ========================================================
       PALETA DE CORES
    ======================================================== */
    COLORS: {
        // Jogador
        MARIO_RED:    '#D32F2F',
        MARIO_SKIN:   '#FFCC80',
        MARIO_OVERALL:'#1976D2',
        MARIO_SHOE:   '#3E2723',
        MARIO_HAIR:   '#3E2723',
        FIRE_WHITE:   '#FFFFFF',
        FIRE_RED:     '#E53935',

        // Poderes / suits
        ICE_BLUE:     '#4FC3F7',
        ICE_DEEP:     '#0288D1',
        HAMMER_BROWN: '#6D4C41',
        HAMMER_DARK:  '#3E2723',
        CAPE_RED:     '#E53935',
        MINI_GREEN:   '#66BB6A',
        MEGA_MAGENTA: '#D81B60',

        // Inimigos
        GOOMBA_BODY:  '#8D6E63',
        GOOMBA_FEET:  '#4E342E',
        KOOPA_SHELL:  '#4CAF50',
        KOOPA_SKIN:   '#FFEB3B',
        BOSS_BODY:    '#2E7D32',
        BOSS_FURY:    '#D50000',
        BOSS_HORN:    '#FFD54F',

        // Cenário
        BRICK:        '#D32F2F',
        QUESTION:     '#FFC107',
        USED:         '#757575',
        PIPE:         '#2E7D32',
        GROUND_TOP:   '#4CAF50',
        GROUND_BODY:  '#795548',
        CASTLE_TOP:   '#D32F2F',
        CASTLE_BODY:  '#3E2723',

        // Itens
        MUSHROOM:     '#E53935',
        FLOWER_1:     '#FF9800',
        FLOWER_2:     '#FFF59D',
        STAR:         '#FFD700',
        FIREBALL:     '#FF3D00',

        // Efeitos
        PARTICLE_W:   '#FFFFFF',
        PARTICLE_Y:   '#FFD700',
        PARTICLE_R:   '#FF5722',
    },

    /* ========================================================
       TEMAS DAS FASES
       bgTop/bgBottom → céu; ground/groundBody → chão;
       pipe → tubos; sky → cor das nuvens distantes;
       accent → cor de destaque (grading/bloom)
    ======================================================== */
    THEMES: {
        overworld: {
            bgTop:    '#1A237E',
            bgBottom: '#64B5F6',
            ground:   '#4CAF50',
            groundBody:'#795548',
            pipe:     '#2E7D32',
            sky:      '#FFFFFF',
            accent:   '#4CAF50',
            dark:     false,
        },
        underground: {
            bgTop:    '#000000',
            bgBottom: '#212121',
            ground:   '#37474F',
            groundBody:'#263238',
            pipe:     '#1B5E20',
            sky:      '#263238',
            accent:   '#26C6DA',
            dark:     true,
        },
        castle: {
            bgTop:    '#210000',
            bgBottom: '#420000',
            ground:   '#D32F2F',
            groundBody:'#3E2723',
            pipe:     '#2E7D32',
            sky:      '#420000',
            accent:   '#FF5722',
            dark:     true,
        },
        sky: {
            bgTop:    '#0288D1',
            bgBottom: '#B3E5FC',
            ground:   '#FFFFFF',
            groundBody:'#B0BEC5',
            pipe:     '#4CAF50',
            sky:      '#FFFFFF',
            accent:   '#81D4FA',
            dark:     false,
        },
        desert: {
            bgTop:    '#FF8A65',
            bgBottom: '#FFE0B2',
            ground:   '#FDD835',
            groundBody:'#BCAAA4',
            pipe:     '#8D6E63',
            sky:      '#FFECB3',
            accent:   '#FFB300',
            dark:     false,
        },
        snow: {
            bgTop:    '#4A6FA5',
            bgBottom: '#DCE8F5',
            ground:   '#FFFFFF',
            groundBody:'#90CAF9',
            pipe:     '#4DD0E1',
            sky:      '#E3F2FD',
            accent:   '#4FC3F7',
            dark:     false,
        },
        lava: {
            bgTop:    '#1A0000',
            bgBottom: '#5D0000',
            ground:   '#3E2723',
            groundBody:'#211A17',
            pipe:     '#455A64',
            sky:      '#5D0000',
            accent:   '#FF6D00',
            dark:     true,
        },
    },

    /* ========================================================
       CLIMA POR TEMA (intensidade 0..1)
    ======================================================== */
    WEATHER: {
        overworld:   { type: null,     intensity: 0 },
        underground: { type: null,     intensity: 0 },
        castle:      { type: 'embers', intensity: 0.5 },
        sky:         { type: null,     intensity: 0 },
        desert:      { type: 'sand',   intensity: 0.7 },
        snow:        { type: 'snow',   intensity: 0.8 },
        lava:        { type: 'embers', intensity: 1.0 },
    },
};

// Congela para evitar mutação acidental
Object.freeze(CONFIG);
Object.freeze(CONFIG.CANVAS);
Object.freeze(CONFIG.PLAYER);
Object.freeze(CONFIG.PLAYER.SIZES);
Object.freeze(CONFIG.PLAYER.SIZES.mini);
Object.freeze(CONFIG.PLAYER.SIZES.small);
Object.freeze(CONFIG.PLAYER.SIZES.super);
Object.freeze(CONFIG.PLAYER.SIZES.mega);
Object.freeze(CONFIG.ENEMY);
Object.freeze(CONFIG.ITEM);
Object.freeze(CONFIG.POWERS);
Object.freeze(CONFIG.RARITY);
Object.freeze(CONFIG.RUN);
Object.freeze(CONFIG.SCORE);
Object.freeze(CONFIG.CAMERA);
Object.freeze(CONFIG.GAME);
Object.freeze(CONFIG.AUDIO);
Object.freeze(CONFIG.COLORS);
Object.freeze(CONFIG.THEMES);
Object.freeze(CONFIG.WEATHER);

// Exporta para escopo global (usado pelos outros scripts)
window.CONFIG = CONFIG;
