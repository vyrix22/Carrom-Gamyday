// Game.js — Central game controller and state machine

import { BOARD } from './Board.js';
import { Physics } from './Physics.js';
import { Coin } from './Coin.js';
import { Striker } from './Striker.js';
import { Bot } from './Bot.js';
import { Rules } from './Rules.js';
import { Input } from './Input.js';

/**
 * Game states:
 * MENU, STARTING, PLAYER_TURN, PLAYER_AIMING, SIMULATING,
 * EVALUATING, BOT_TURN, BOT_THINKING, BOT_SHOOTING, GAME_OVER
 */
const State = {
    MENU: 'MENU',
    STARTING: 'STARTING',
    PLAYER_TURN: 'PLAYER_TURN',
    PLAYER_AIMING: 'PLAYER_AIMING',
    SIMULATING: 'SIMULATING',
    EVALUATING: 'EVALUATING',
    BOT_TURN: 'BOT_TURN',
    BOT_THINKING: 'BOT_THINKING',
    BOT_SHOOTING: 'BOT_SHOOTING',
    GAME_OVER: 'GAME_OVER',
};

export class Game {
    /**
     * @param {import('../ui/Renderer.js').Renderer} renderer
     * @param {import('../ui/HUD.js').HUD} hud
     * @param {import('../ui/SoundManager.js').SoundManager} sound
     */
    constructor(renderer, hud, sound) {
        this.renderer = renderer;
        this.hud = hud;
        this.sound = sound;

        this.physics = null;
        this.coins = [];
        this.striker = null;
        this.bot = new Bot();
        this.rules = new Rules();
        this.input = null;

        // Slider DOM references (set via setSliderElements)
        this._sliderEl = null;
        this._sliderContainerEl = null;

        this.state = State.MENU;
        this.currentTurn = 'player'; // 'player' | 'bot'
        this.pocketedThisShot = [];
        this.strikerPocketed = false;
        this.settleTimer = 0; // frames to wait after pieces stop

        // Track who shot to determine whose shot to evaluate
        this.shotBy = 'player';

        this._lastTime = 0;
        this._running = false;
    }

    /**
     * Attach striker position slider DOM elements
     * @param {HTMLInputElement} slider
     * @param {HTMLElement} container
     */
    setSliderElements(slider, container) {
        this._sliderEl = slider;
        this._sliderContainerEl = container;
    }

    /**
     * Start a new game
     */
    start() {
        // ── Initialize physics ──
        if (this.physics) {
            this.physics.clear();
        }
        this.physics = new Physics();

        // ── Create coins ──
        this.coins = Coin.createFormation();
        for (const coin of this.coins) {
            this.physics.addBody(coin.body);
        }

        // ── Create striker ──
        this.striker = new Striker(this.physics);

        // ── Setup input ──
        this.input = new Input(
            this.renderer.canvas,
            () => this.renderer.getScale(),
            () => this.renderer.getOffset()
        );
        if (this._sliderEl && this._sliderContainerEl) {
            this.input.setSlider(this._sliderEl, this._sliderContainerEl);
        }

        // ── Physics callbacks ──
        this.physics.onPocket = (body, pocketIdx) => {
            this._onPocket(body, pocketIdx);
        };
        this.physics.onCollision = (bodyA, bodyB, velocity) => {
            this._onCollision(bodyA, bodyB, velocity);
        };

        // ── Reset state ──
        this.rules.reset();
        this.currentTurn = 'player';
        this.state = State.STARTING;
        this.pocketedThisShot = [];
        this.strikerPocketed = false;
        this.settleTimer = 0;

        this.hud.hideGameOver();
        this.hud.updateScores(0, 0);

        // Start game loop if not already running
        if (!this._running) {
            this._running = true;
            this._lastTime = performance.now();
            requestAnimationFrame((t) => this._loop(t));
        }

        // Short delay then start player turn
        setTimeout(() => {
            this._startTurn('player');
        }, 500);
    }

    /**
     * Main game loop
     */
    _loop(timestamp) {
        if (!this._running) return;

        const dt = Math.min((timestamp - this._lastTime) / 1000, 0.05); // cap dt
        this._lastTime = timestamp;

        this._update(dt);
        this._render();

        requestAnimationFrame((t) => this._loop(t));
    }

    _update(dt) {
        // ── Update physics ──
        if (this.state === State.SIMULATING || this.state === State.BOT_SHOOTING) {
            this.physics.update(1000 / 60);
        }

        // ── Update pocket animations ──
        for (const coin of this.coins) {
            if (coin.pocketing) {
                const done = coin.updatePocketAnim(dt);
                if (done) {
                    this.physics.removeBody(coin.body);
                }
            }
        }

        // ── State-specific updates ──
        switch (this.state) {
            case State.PLAYER_TURN:
                // Wait for input — handled by Input class
                if (this.input) {
                    this.striker.setPositionX(this.input.strikerX);
                    if (this.input.released) {
                        this._playerShoot();
                    }
                }
                break;

            case State.PLAYER_AIMING:
                if (this.input) {
                    this.striker.setPositionX(this.input.strikerX);
                    if (this.input.released) {
                        this._playerShoot();
                    }
                }
                break;

            case State.SIMULATING:
                this._checkSettled(dt);
                break;

            case State.BOT_TURN:
                // Already started thinking in _startTurn
                break;

            case State.BOT_THINKING:
                if (this.bot.update(dt)) {
                    this._botShoot();
                }
                break;

            case State.BOT_SHOOTING:
                this._checkSettled(dt);
                break;

            case State.EVALUATING:
                // Handled immediately in _evaluateShot
                break;
        }
    }

    _checkSettled(dt) {
        // Gather all dynamic bodies
        const bodies = this.coins
            .filter(c => !c.pocketed && !c.pocketing)
            .map(c => c.body);
        if (this.striker.body) bodies.push(this.striker.body);

        if (this.physics.allAtRest(bodies, 0.2)) {
            this.settleTimer += dt;
            if (this.settleTimer > 0.3) { // 0.3s of calm
                // Stop everything completely
                this.physics.stopAll(bodies);
                this.settleTimer = 0;
                this._evaluateShot();
            }
        } else {
            this.settleTimer = 0;
        }
    }

    _startTurn(who) {
        this.currentTurn = who;
        this.pocketedThisShot = [];
        this.strikerPocketed = false;

        this.hud.setTurn(who);
        this.sound.playTurnChange();

        if (who === 'player') {
            this.state = State.PLAYER_TURN;
            this.striker.placeOnBaseline('player');
            this.input.strikerX = BOARD.CENTER_X;
            this.input.enable();
        } else {
            this.state = State.BOT_THINKING;
            this.striker.placeOnBaseline('bot');

            // Start bot AI
            this.bot.startThinking(this.coins, this.rules.botColor);
            this.hud.showMessage('Bot is thinking...', 1500);
        }
    }

    _playerShoot() {
        if (!this.input) return;

        const angle = this.input.aimAngle;
        const power = this.input.power;

        this.input.disable();
        this.striker.shoot(angle, power);
        this.sound.playShoot(power);
        this.shotBy = 'player';
        this.state = State.SIMULATING;
    }

    _botShoot() {
        const shot = this.bot.getShot();
        if (!shot) return;

        this.striker.setPositionX(shot.strikerX);

        // Small delay for visual positioning
        setTimeout(() => {
            this.striker.shoot(shot.angle, shot.power);
            this.sound.playShoot(shot.power);
            this.shotBy = 'bot';
            this.state = State.BOT_SHOOTING;
        }, 200);
    }

    _onPocket(body, pocketIdx) {
        // Check if it's the striker
        if (body.label === 'striker') {
            this.strikerPocketed = true;
            this.striker.remove();
            this.sound.playPocket();
            return;
        }

        // Find the coin
        const coin = body.coinRef;
        if (coin && !coin.pocketed && !coin.pocketing) {
            coin.startPocket();
            this.pocketedThisShot.push(coin);

            // Move coin toward pocket center visually
            const pocket = BOARD.POCKET_POSITIONS[pocketIdx];
            Matter.Body.setPosition(body, { x: pocket.x, y: pocket.y });
            Matter.Body.setVelocity(body, { x: 0, y: 0 });

            if (coin.type === 'queen') {
                this.sound.playQueenPocket();
            } else {
                this.sound.playPocket();
            }
        }
    }

    _onCollision(bodyA, bodyB, velocity) {
        if (!bodyB) {
            // Wall collision
            this.sound.playWallHit(velocity);
        } else {
            // Coin/striker collision
            this.sound.playCoinHit(velocity);
        }
    }

    _evaluateShot() {
        this.state = State.EVALUATING;

        const result = this.rules.evaluateShot(
            this.pocketedThisShot,
            this.strikerPocketed,
            this.shotBy,
            this.coins
        );

        // Update HUD
        this.hud.updateScores(this.rules.playerScore, this.rules.botScore);

        // Show messages
        for (const msg of result.messages) {
            this.hud.showMessage(msg, 2000);
        }

        // Handle queen return
        if (result.returnQueen) {
            const queen = this.coins.find(c => c.type === 'queen');
            if (queen) {
                queen.pocketed = false;
                queen.pocketing = false;
                queen.pocketAnim = 0;
                // Recreate body at center
                queen.body = Matter.Bodies.circle(BOARD.CENTER_X, BOARD.CENTER_Y, queen.radius, {
                    restitution: 0.5,
                    friction: 0.04,
                    frictionAir: 0.025,
                    density: 0.002,
                    label: 'coin_queen',
                });
                queen.body.coinRef = queen;
                this.physics.addBody(queen.body);
            }
        }

        // Handle foul — return a coin if any were previously pocketed
        if (result.foul) {
            this._returnOneCoin(this.shotBy);
        }

        // Check game over
        if (result.gameOver) {
            this.state = State.GAME_OVER;
            setTimeout(() => {
                this.hud.showGameOver(result.winner, this.rules.playerScore, this.rules.botScore);
            }, 500);
            return;
        }

        // Determine next turn
        const nextTurn = result.anotherTurn ? this.shotBy :
            (this.shotBy === 'player' ? 'bot' : 'player');

        setTimeout(() => {
            this._startTurn(nextTurn);
        }, 800);
    }

    _returnOneCoin(player) {
        const myColor = player === 'player' ? this.rules.playerColor : this.rules.botColor;
        const pocketed = this.coins.find(c => c.pocketed && c.type === myColor);
        if (!pocketed) return;

        pocketed.pocketed = false;
        pocketed.pocketing = false;
        pocketed.pocketAnim = 0;

        // Find an empty spot near center
        const cx = BOARD.CENTER_X + (Math.random() - 0.5) * 20;
        const cy = BOARD.CENTER_Y + (Math.random() - 0.5) * 20;

        pocketed.body = Matter.Bodies.circle(cx, cy, pocketed.radius, {
            restitution: 0.5,
            friction: 0.04,
            frictionAir: 0.025,
            density: 0.002,
            label: `coin_${pocketed.type}`,
        });
        pocketed.body.coinRef = pocketed;
        this.physics.addBody(pocketed.body);
    }

    _render() {
        const r = this.renderer;
        r.clear();
        r.drawBoard();
        r.drawDebugBounds(); // Show physics boundaries and pockets
        r.drawCoins(this.coins);
        r.drawStriker(this.striker);

        if (this.state === State.PLAYER_TURN || this.state === State.PLAYER_AIMING) {
            r.drawAimUI(this.input);
        }
    }

    /**
     * Restart the game
     */
    restart() {
        if (this.input) this.input.disable();
        this.start();
    }

    /**
     * Pause/unpause
     */
    togglePause() {
        // Simple pause — could freeze the loop, but for now just show overlay
        if (this.hud.elements.pauseOverlay.classList.contains('visible')) {
            this.hud.hidePause();
        } else {
            this.hud.showPause();
        }
    }

    stop() {
        this._running = false;
    }
}
