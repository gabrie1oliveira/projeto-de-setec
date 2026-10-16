/**
 * ============================================================
 * SAVE.JS
 * ------------------------------------------------------------
 * Sistema de persistência usando localStorage.
 * Guarda: progresso, vidas, moedas, fases desbloqueadas,
 * configurações e estatísticas.
 * ============================================================
 */
"use strict";

const SAVE = {

    /* ========================================================
       CONFIGURAÇÕES
    ======================================================== */
    key: 'superRetroSave_v1',
    version: 2,

    /* ========================================================
       DADOS PADRÃO
    ======================================================== */
    defaultData() {
        return {
            version: this.version,
            player: {
                lives: CONFIG.PLAYER.START_LIVES,
                coins: 0,
                score: 0,
                // Legado (migrado para `powers` em migrate())
                powerState: 'small',
                // Novo modelo de poderes em stack
                powers: {
                    suit: 'none',
                    baseSize: 'small',
                    temporary: [],
                },
                currentLevel: 1,
            },
            /* Mutadores e seed da run atual (roguelite leve) */
            currentRun: {
                seed: 0,
                modifiers: [],
            },
            progress: {
                unlockedLevel: 1,
                completedLevels: [],
                bestTimes: {},
                // stars[levelId] = [true, false, true]
                stars: {},
                // checkpoints[levelId] = { x, y }
                checkpoints: {},
            },
            settings: {
                music: true,
                sound: true,
                masterVolume: CONFIG.AUDIO.MASTER_VOLUME,
            },
            stats: {
                totalCoins: 0,
                totalEnemies: 0,
                totalDeaths: 0,
                totalJumps: 0,
                playTime: 0,
            },
            lastSaved: new Date().toISOString(),
        };
    },

    /* ========================================================
       MIGRAÇÃO DE VERSÕES ANTIGAS
    ======================================================== */
    migrate(data) {
        if (!data || typeof data !== 'object') return data;

        const v = data.version || 1;

        /* v1 → v2: powerState vira powers {} */
        if (v < 2) {
            const legacy = data.player && data.player.powerState;
            if (data.player && !data.player.powers) {
                const suit = legacy === 'fire' ? 'fire' : 'none';
                const baseSize = (legacy === 'super' || legacy === 'fire')
                    ? 'super'
                    : 'small';
                data.player.powers = {
                    suit,
                    baseSize,
                    temporary: [],
                };
            }
            data.version = 2;
        }

        /* Garante estruturas novas mesmo em saves v2 parciais */
        if (data.player && !data.player.powers) {
            data.player.powers = { suit: 'none', baseSize: 'small', temporary: [] };
        }
        if (!data.currentRun) {
            data.currentRun = { seed: 0, modifiers: [] };
        }
        if (data.progress) {
            if (!data.progress.stars) data.progress.stars = {};
            if (!data.progress.checkpoints) data.progress.checkpoints = {};
        }

        return data;
    },

    /* ========================================================
       CARREGAR
    ======================================================== */

    get() {
        try {
            const raw = localStorage.getItem(this.key);
            if (!raw) return this.defaultData();

            const data = JSON.parse(raw);
            return this.migrate(this.merge(this.defaultData(), data));
        } catch (err) {
            console.error('[SAVE] Erro ao ler:', err);
            return this.defaultData();
        }
    },

    /**
     * Mescla recursiva: preenche campos ausentes com defaults.
     * Preserva dados do save que ainda existem.
     */
    merge(defaults, saved) {
        const result = { ...defaults };
        for (const key of Object.keys(defaults)) {
            const defVal = defaults[key];
            const savVal = saved[key];

            if (savVal === undefined) continue;

            if (
                typeof defVal === 'object' &&
                defVal !== null &&
                !Array.isArray(defVal)
            ) {
                result[key] = this.merge(defVal, savVal);
            } else {
                result[key] = savVal;
            }
        }
        return result;
    },

    /* ========================================================
       SALVAR
    ======================================================== */

    save(data = null) {
        try {
            const payload = data || this.get();
            payload.version = this.version;
            payload.lastSaved = new Date().toISOString();
            localStorage.setItem(this.key, JSON.stringify(payload));
            return true;
        } catch (err) {
            console.error('[SAVE] Erro ao salvar:', err);
            return false;
        }
    },

    /**
     * Coleta dados do jogo atual (GAME, player) e salva.
     * Chamado periodicamente e em eventos-chave.
     */
    collect(game) {
        const data = this.get();

        if (game && game.player) {
            data.player.lives = game.player.lives ?? data.player.lives;
            data.player.coins = game.coins ?? data.player.coins;
            data.player.score = game.score ?? data.player.score;
            data.player.powers = game.player.powers ?? data.player.powers;
            data.player.currentLevel = game.currentStage ?? data.player.currentLevel;
        }

        if (game && game.currentStage !== undefined) {
            data.progress.unlockedLevel = Math.max(
                data.progress.unlockedLevel,
                game.currentStage
            );
        }

        return data;
    },

    /* ========================================================
       HELPERS DE PROGRESSO
    ======================================================== */

    setLives(n) {
        const data = this.get();
        data.player.lives = Math.max(0, n);
        this.save(data);
    },

    addLife(n = 1) {
        const data = this.get();
        data.player.lives += n;
        this.save(data);
        return data.player.lives;
    },

    loseLife() {
        const data = this.get();
        data.player.lives = Math.max(0, data.player.lives - 1);
        data.stats.totalDeaths++;
        this.save(data);
        return data.player.lives;
    },

    addCoins(n = 1) {
        const data = this.get();
        data.player.coins += n;
        data.stats.totalCoins += n;

        // 100 moedas → 1 vida
        if (data.player.coins >= 100) {
            const extra = Math.floor(data.player.coins / 100);
            data.player.lives += extra;
            data.player.coins %= 100;
        }

        this.save(data);
        return data.player.coins;
    },

    addScore(n) {
        const data = this.get();
        data.player.score += n;
        this.save(data);
        return data.player.score;
    },

    addPlayTime(seconds) {
        const data = this.get();
        data.stats.playTime += seconds;
        this.save(data);
    },

    /* ========================================================
       PROGRESSO DE FASES
    ======================================================== */

    unlockLevel(level) {
        const data = this.get();
        if (level > data.progress.unlockedLevel) {
            data.progress.unlockedLevel = level;
        }
        this.save(data);
    },

    completeLevel(level, time = 0) {
        const data = this.get();

        if (!data.progress.completedLevels.includes(level)) {
            data.progress.completedLevels.push(level);
        }

        if (time > 0) {
            const best = data.progress.bestTimes[level];
            if (!best || time < best) {
                data.progress.bestTimes[level] = time;
            }
        }

        if (level >= data.progress.unlockedLevel) {
            data.progress.unlockedLevel = Math.min(
                level + 1,
                CONFIG.GAME.LEVELS_TOTAL
            );
        }

        this.save(data);
    },

    /* ========================================================
       RUN ATUAL (mutadores + seed)
    ======================================================== */

    getRun() {
        return this.get().currentRun;
    },

    setRun(run) {
        const data = this.get();
        data.currentRun = { ...data.currentRun, ...run };
        this.save(data);
        return data.currentRun;
    },

    /* ========================================================
       ESTRELAS DE FASE
    ======================================================== */

    /** Retorna [bool,bool,bool] das estrelas de uma fase. */
    getStars(levelId) {
        const stars = this.get().progress.stars || {};
        const arr = stars[levelId];
        if (!Array.isArray(arr)) return [false, false, false];
        return [!!arr[0], !!arr[1], !!arr[2]];
    },

    /** Marca a estrela `index` (0..2) da fase como coletada. */
    collectStar(levelId, index) {
        const data = this.get();
        if (!data.progress.stars) data.progress.stars = {};
        const arr = data.progress.stars[levelId] || [false, false, false];
        if (index >= 0 && index < 3) arr[index] = true;
        data.progress.stars[levelId] = arr;
        this.save(data);
        return arr;
    },

    /* ========================================================
       CHECKPOINTS
    ======================================================== */

    getCheckpoint(levelId) {
        const cps = this.get().progress.checkpoints || {};
        return cps[levelId] || null;
    },

    setCheckpoint(levelId, cp) {
        const data = this.get();
        if (!data.progress.checkpoints) data.progress.checkpoints = {};
        data.progress.checkpoints[levelId] = { x: cp.x, y: cp.y };
        this.save(data);
    },

    /* ========================================================
       CONFIGURAÇÕES
    ======================================================== */

    getSettings() {
        return this.get().settings;
    },

    saveSettings(settings) {
        const data = this.get();
        data.settings = { ...data.settings, ...settings };
        this.save(data);
    },

    /* ========================================================
       ESTATÍSTICAS
    ======================================================== */

    getStats() {
        return this.get().stats;
    },

    /* ========================================================
       UTILITÁRIOS
    ======================================================== */

    exists() {
        try {
            return localStorage.getItem(this.key) !== null;
        } catch (err) {
            return false;
        }
    },

    reset() {
        try {
            localStorage.removeItem(this.key);
        } catch (err) {
            console.error('[SAVE] Erro ao apagar:', err);
        }
        console.log('[SAVE] Save apagado.');
    },

    /** Retorna o save como string base64 (para exportar). */
    export() {
        try {
            return btoa(encodeURIComponent(JSON.stringify(this.get())));
        } catch (err) {
            console.error('[SAVE] Erro ao exportar:', err);
            return null;
        }
    },

    /** Importa save de uma string base64. */
    import(code) {
        try {
            const json = decodeURIComponent(atob(code));
            const data = JSON.parse(json);
            this.save(this.merge(this.defaultData(), data));
            return true;
        } catch (err) {
            console.error('[SAVE] Erro ao importar:', err);
            return false;
        }
    },

    debug() {
        const d = this.get();
        console.log('=== SAVE DATA ===');
        console.table(d.player);
        console.table(d.progress);
        console.table(d.stats);
        console.table(d.settings);
    },
};

window.SAVE = SAVE;