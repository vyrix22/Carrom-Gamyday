// Coin.js — Carrom coins with 2.5D rendering

import { BOARD } from './Board.js';

export class Coin {
    /**
     * @param {'black'|'white'|'queen'} type
     * @param {number} x
     * @param {number} y
     */
    constructor(type, x, y) {
        this.type = type;
        this.radius = type === 'queen' ? BOARD.COIN_RADIUS + 1 : BOARD.COIN_RADIUS;
        this.pocketed = false;
        this.pocketAnim = 0; // 0..1 animation progress
        this.pocketing = false;

        const { Bodies } = Matter;
        // Physics body has a +1 radius to create an invisible 1px buffer to prevent visual overlapping
        this.body = Bodies.circle(x, y, this.radius + 1, {
            restitution: 0.8, // High restitution for realistic carrom clicks
            friction: 0.01,   // Minimal contact friction
            frictionAir: 0.008, // Reduced friction to allow tokens to travel more distance
            density: 0.02, // 10x heavier than before for smoother, slower movement
            label: `coin_${type}`,
        });
        this.body.coinRef = this; // back-reference
    }

    get x() { return this.body.position.x; }
    get y() { return this.body.position.y; }

    /**
     * Start pocketing animation
     */
    startPocket() {
        this.pocketing = true;
        this.pocketAnim = 0;
    }

    /**
     * Update pocket animation
     * @returns {boolean} true when animation is complete
     */
    updatePocketAnim(dt) {
        if (!this.pocketing) return false;
        this.pocketAnim += dt * 3; // ~0.33s animation
        if (this.pocketAnim >= 1) {
            this.pocketAnim = 1;
            this.pocketing = false;
            this.pocketed = true;
            return true;
        }
        return false;
    }

    /**
     * Draw the coin with 2.5D appearance
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} scale
     */
    draw(ctx, scale) {
        if (this.pocketed && !this.pocketing) return;

        const x = this.x * scale;
        const y = this.y * scale;
        const r = this.radius * scale;

        ctx.save();

        // Pocket animation: shrink + fade
        if (this.pocketing) {
            const t = this.pocketAnim;
            const s = 1 - t * 0.7;
            const alpha = 1 - t;
            ctx.globalAlpha = alpha;
            ctx.translate(x, y);
            ctx.scale(s, s);
            ctx.translate(-x, -y);
        }

        // ── Drop shadow ──
        ctx.beginPath();
        ctx.arc(x + 2 * scale, y + 3 * scale, r + 1, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fill();

        // ── Main body ──
        const colors = this._getColors();
        const grad = ctx.createRadialGradient(
            x - r * 0.3, y - r * 0.3, r * 0.1,
            x, y, r
        );
        grad.addColorStop(0, colors.highlight);
        grad.addColorStop(0.7, colors.main);
        grad.addColorStop(1, colors.edge);

        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // ── Bevel / rim ──
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.strokeStyle = colors.rim;
        ctx.lineWidth = 1.5 * scale;
        ctx.stroke();

        // ── Top highlight arc ──
        ctx.beginPath();
        ctx.arc(x, y, r * 0.7, -Math.PI * 0.8, -Math.PI * 0.2);
        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.lineWidth = 1.5 * scale;
        ctx.lineCap = 'round';
        ctx.stroke();

        // ── Queen special decoration ──
        if (this.type === 'queen') {
            // Gold ring
            ctx.beginPath();
            ctx.arc(x, y, r * 0.55, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255,215,0,0.6)';
            ctx.lineWidth = 1.5 * scale;
            ctx.stroke();

            // Center dot
            ctx.beginPath();
            ctx.arc(x, y, r * 0.15, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255,215,0,0.7)';
            ctx.fill();
        }

        ctx.restore();
    }

    _getColors() {
        switch (this.type) {
            case 'black':
                return {
                    main: '#1a1a1a',
                    highlight: '#4a4a4a',
                    edge: '#0a0a0a',
                    rim: 'rgba(80,80,80,0.6)',
                };
            case 'white':
                return {
                    main: '#f0e6d2',
                    highlight: '#fffff0',
                    edge: '#c8b89a',
                    rim: 'rgba(180,160,130,0.6)',
                };
            case 'queen':
                return {
                    main: '#cc2233',
                    highlight: '#ff6666',
                    edge: '#881122',
                    rim: 'rgba(200,150,50,0.7)',
                };
            default:
                return { main: '#888', highlight: '#ccc', edge: '#555', rim: '#666' };
        }
    }

    /**
     * Create the traditional carrom starting formation.
     * Queen in center, surrounded by alternating coins in concentric rings.
     * @returns {Coin[]}
     */
    static createFormation() {
        const cx = BOARD.CENTER_X;
        const cy = BOARD.CENTER_Y;
        const coins = [];
        const coinDiam = BOARD.COIN_RADIUS * 2 + 2; // small gap

        // Queen in the center
        coins.push(new Coin('queen', cx, cy));

        // Inner ring: 6 coins alternating
        const innerR = coinDiam;
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i - Math.PI / 6;
            const x = cx + Math.cos(angle) * innerR;
            const y = cy + Math.sin(angle) * innerR;
            const type = i % 2 === 0 ? 'white' : 'black';
            coins.push(new Coin(type, x, y));
        }

        // Outer ring: 12 coins alternating (between inner positions)
        const outerR = coinDiam * 2;
        for (let i = 0; i < 12; i++) {
            const angle = (Math.PI / 6) * i - Math.PI / 6;
            const x = cx + Math.cos(angle) * outerR;
            const y = cy + Math.sin(angle) * outerR;
            const type = i % 2 === 0 ? 'black' : 'white';
            coins.push(new Coin(type, x, y));
        }

        return coins; // 1 queen + 6 inner + 12 outer = 19 coins
    }
}
