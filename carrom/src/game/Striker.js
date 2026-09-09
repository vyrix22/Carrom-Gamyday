// Striker.js — Player/Bot striker with 2.5D rendering

import { BOARD } from './Board.js';

export class Striker {
    constructor(physics) {
        this.physics = physics;
        this.radius = BOARD.STRIKER_RADIUS;
        this.active = false; // is the striker on the board?
        this.body = null;
        this.currentPlayer = 'player'; // 'player' | 'bot'
    }

    /**
     * Place the striker on the given player's baseline
     * @param {'player'|'bot'} player
     */
    placeOnBaseline(player) {
        this.currentPlayer = player;
        const y = player === 'player' ? BOARD.PLAYER_BASELINE_Y : BOARD.BOT_BASELINE_Y;
        const x = BOARD.CENTER_X;

        if (this.body) {
            this.physics.removeBody(this.body);
        }

        this.body = Matter.Bodies.circle(x, y, this.radius, {
            restitution: 0.8,
            friction: 0.005,
            frictionAir: 0.0004,
            density: 0.005, // Lighter = faster movement
            label: 'striker',
        });
        this.body.coinRef = null; // not a coin
        this.physics.addBody(this.body);
        this.active = true;
    }

    /**
     * Move striker horizontally along baseline (clamped)
     */
    setPositionX(x) {
        if (!this.body || !this.active) return;
        const clamped = Math.max(BOARD.BASELINE_LEFT, Math.min(BOARD.BASELINE_RIGHT, x));
        const y = this.currentPlayer === 'player' ? BOARD.PLAYER_BASELINE_Y : BOARD.BOT_BASELINE_Y;
        this.physics.setPosition(this.body, { x: clamped, y });
    }

    /**
     * Shoot the striker
     * @param {number} angle - direction in radians
     * @param {number} power - 0..1
     */
    shoot(angle, power) {
        if (!this.body) return;

        // Calibrated force to perfectly reach halfway back after 2 bounces at 100% power
        const maxForce = 0.45;
        const force = power * maxForce;
        const fx = Math.cos(angle) * force;
        const fy = Math.sin(angle) * force;

        // Make body dynamic (not static) before shooting
        this.physics.setStatic(this.body, false);
        this.physics.applyForce(this.body, { x: fx, y: fy });
    }

    /**
     * Remove striker from board (e.g., when pocketed or after shot)
     */
    remove() {
        if (this.body) {
            this.physics.removeBody(this.body);
            this.body = null;
        }
        this.active = false;
    }

    /**
     * Get current position
     */
    get x() { return this.body ? this.body.position.x : 0; }
    get y() { return this.body ? this.body.position.y : 0; }

    /**
     * Draw striker with 2.5D look
     */
    draw(ctx, scale) {
        if (!this.body || !this.active) return;

        const x = this.x * scale;
        const y = this.y * scale;
        const r = this.radius * scale;

        ctx.save();

        // Drop shadow
        ctx.beginPath();
        ctx.arc(x + 2 * scale, y + 3.5 * scale, r + 2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fill();

        // Main body - steel gradient
        const grad = ctx.createRadialGradient(
            x - r * 0.25, y - r * 0.25, r * 0.1,
            x, y, r
        );
        grad.addColorStop(0, '#e8e0d0');
        grad.addColorStop(0.4, '#d0c8b8');
        grad.addColorStop(0.8, '#a89880');
        grad.addColorStop(1, '#8a7a62');

        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // Rim
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(120,100,70,0.7)';
        ctx.lineWidth = 2 * scale;
        ctx.stroke();

        // Inner ring
        ctx.beginPath();
        ctx.arc(x, y, r * 0.6, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(180,160,120,0.4)';
        ctx.lineWidth = 1 * scale;
        ctx.stroke();

        // Top highlight
        ctx.beginPath();
        ctx.arc(x, y, r * 0.75, -Math.PI * 0.85, -Math.PI * 0.15);
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 2 * scale;
        ctx.lineCap = 'round';
        ctx.stroke();

        ctx.restore();
    }
}
