// HUD.js — DOM-based UI updates (scores, turn indicator, messages, overlays)

export class HUD {
    constructor() {
        this.elements = {
            playerScore: document.getElementById('playerScore'),
            botScore: document.getElementById('botScore'),
            turnIndicator: document.getElementById('turnIndicator'),
            messageOverlay: document.getElementById('messageOverlay'),
            messageText: document.getElementById('messageText'),
            gameOverOverlay: document.getElementById('gameOverOverlay'),
            gameOverTitle: document.getElementById('gameOverTitle'),
            gameOverScores: document.getElementById('gameOverScores'),
            pauseOverlay: document.getElementById('pauseOverlay'),
            soundBtn: document.getElementById('soundBtn'),
        };

        this._messageTimer = null;
    }

    updateScores(playerScore, botScore) {
        if (this.elements.playerScore) {
            this.elements.playerScore.textContent = playerScore;
            // Pulse animation
            this.elements.playerScore.parentElement.classList.add('score-pulse');
            setTimeout(() => this.elements.playerScore.parentElement.classList.remove('score-pulse'), 300);
        }
        if (this.elements.botScore) {
            this.elements.botScore.textContent = botScore;
            this.elements.botScore.parentElement.classList.add('score-pulse');
            setTimeout(() => this.elements.botScore.parentElement.classList.remove('score-pulse'), 300);
        }
    }

    setTurn(turn) {
        const el = this.elements.turnIndicator;
        if (!el) return;

        if (turn === 'player') {
            el.textContent = 'YOUR TURN';
            el.className = 'turn-indicator player-turn';
        } else if (turn === 'bot') {
            el.textContent = 'BOT\'S TURN';
            el.className = 'turn-indicator bot-turn';
        } else {
            el.textContent = '';
            el.className = 'turn-indicator';
        }
    }

    showMessage(text, duration = 2000) {
        const overlay = this.elements.messageOverlay;
        const textEl = this.elements.messageText;
        if (!overlay || !textEl) return;

        textEl.textContent = text;
        overlay.classList.add('visible');

        clearTimeout(this._messageTimer);
        this._messageTimer = setTimeout(() => {
            overlay.classList.remove('visible');
        }, duration);
    }

    showGameOver(winner, playerScore, botScore) {
        const overlay = this.elements.gameOverOverlay;
        if (!overlay) return;

        const title = this.elements.gameOverTitle;
        const scores = this.elements.gameOverScores;

        if (winner === 'player') {
            title.textContent = '🏆 YOU WIN!';
            title.style.color = '#FFD700';
        } else if (winner === 'bot') {
            title.textContent = 'BOT WINS';
            title.style.color = '#ff6b6b';
        } else {
            title.textContent = 'DRAW';
            title.style.color = '#aaa';
        }

        scores.textContent = `You: ${playerScore}  •  Bot: ${botScore}`;
        overlay.classList.add('visible');
    }

    hideGameOver() {
        const overlay = this.elements.gameOverOverlay;
        if (overlay) overlay.classList.remove('visible');
    }

    showPause() {
        const overlay = this.elements.pauseOverlay;
        if (overlay) overlay.classList.add('visible');
    }

    hidePause() {
        const overlay = this.elements.pauseOverlay;
        if (overlay) overlay.classList.remove('visible');
    }

    updateSoundButton(enabled) {
        const btn = this.elements.soundBtn;
        if (btn) {
            btn.textContent = enabled ? '🔊' : '🔇';
        }
    }
}
