// main.js — Entry point: wires everything together

import { Game } from './game/Game.js';
import { Renderer } from './ui/Renderer.js';
import { HUD } from './ui/HUD.js';
import { SoundManager } from './ui/SoundManager.js';

// Wait for DOM
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    const renderer = new Renderer(canvas);
    const hud = new HUD();
    const sound = new SoundManager();
    const game = new Game(renderer, hud, sound);

    // ── Striker position slider ──
    const strikerSlider = document.getElementById('strikerSlider');
    const strikerSliderContainer = document.getElementById('strikerSliderContainer');
    game.setSliderElements(strikerSlider, strikerSliderContainer);

    // ── Load board asset ──
    const boardImg = new Image();
    boardImg.src = 'src/assets/board.jpg';
    boardImg.onload = () => {
        renderer.setBoardImage(boardImg);
    };

    // ── Menu: Start button ──
    const startBtn = document.getElementById('startBtn');
    const menuOverlay = document.getElementById('menuOverlay');

    startBtn.addEventListener('click', () => {
        sound.playClick();
        menuOverlay.classList.remove('visible');
        game.start();
    });

    // ── Control buttons ──
    const restartBtn = document.getElementById('restartBtn');
    restartBtn.addEventListener('click', () => {
        sound.playClick();
        game.restart();
    });

    const pauseBtn = document.getElementById('pauseBtn');
    pauseBtn.addEventListener('click', () => {
        sound.playClick();
        game.togglePause();
    });

    const soundBtn = document.getElementById('soundBtn');
    soundBtn.addEventListener('click', () => {
        const enabled = sound.toggle();
        hud.updateSoundButton(enabled);
        if (enabled) sound.playClick();
    });

    // Pause overlay resume
    const resumeBtn = document.getElementById('resumeBtn');
    if (resumeBtn) {
        resumeBtn.addEventListener('click', () => {
            sound.playClick();
            hud.hidePause();
        });
    }

    // Game over rematch
    const rematchBtn = document.getElementById('rematchBtn');
    if (rematchBtn) {
        rematchBtn.addEventListener('click', () => {
            sound.playClick();
            hud.hideGameOver();
            game.restart();
        });
    }

    // Show menu
    menuOverlay.classList.add('visible');

    // Initialize sound button state
    hud.updateSoundButton(sound.enabled);
});
