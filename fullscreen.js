/**
 * ============================================================
 * FULLSCREEN.JS
 * ------------------------------------------------------------
 * Alterna modo tela cheia no container do jogo.
 * Atalho: tecla F. Botão: #fullscreen-btn.
 * ============================================================
 */
"use strict";

const FullscreenManager = {
    container: null,
    btn: null,
    isFullscreen: false,

    /**
     * Inicializa referências e listeners de fullscreen.
     */
    init() {
        this.container = document.getElementById('game-container');
        this.btn = document.getElementById('fullscreen-btn');
        if (!this.container || !this.btn) return;

        this.btn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggle();
        });

        window.addEventListener('keydown', (e) => {
            if (e.code === 'KeyF' && !e.ctrlKey && !e.altKey && !e.metaKey) {
                /* Não intercepta se estiver digitando */
                const tag = document.activeElement?.tagName;
                if (tag === 'INPUT' || tag === 'TEXTAREA') return;
                e.preventDefault();
                this.toggle();
            }
        });

        document.addEventListener('fullscreenchange', () => {
            this.isFullscreen = !!document.fullscreenElement;
            this.updateIcon();
        });
    },

    /**
     * Alterna entre entrar e sair do modo fullscreen.
     */
    toggle() {
        if (!document.fullscreenElement) {
            const el = this.container;
            if (el.requestFullscreen) {
                el.requestFullscreen().catch(err => {
                    if (window.DEBUG) console.warn('[Fullscreen]', err);
                });
            } else if (el.webkitRequestFullscreen) {
                el.webkitRequestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            }
        }
    },

    /**
     * Atualiza ícone e tooltip do botão conforme estado.
     */
    updateIcon() {
        if (!this.btn) return;
        this.btn.textContent = this.isFullscreen ? '⛉' : '⛶';
        this.btn.title = this.isFullscreen
            ? 'Sair da tela cheia (F)'
            : 'Tela cheia (F)';
    },
};

window.addEventListener('DOMContentLoaded', () => {
    FullscreenManager.init();
});

window.FullscreenManager = FullscreenManager;
