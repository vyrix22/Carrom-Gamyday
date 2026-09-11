// Input.js — Unified mouse/touch input for striker positioning, aiming, and shooting

import { BOARD } from './Board.js';

export class Input {
    /**
     * @param {HTMLCanvasElement} canvas
     * @param {function} getScale - returns current board-to-canvas scale
     * @param {function} getOffset - returns {x,y} canvas offset for board origin
     */
    constructor(canvas, getScale, getOffset) {
        this.canvas = canvas;
        this.getScale = getScale;
        this.getOffset = getOffset;

        // State
        this.phase = 'idle'; // 'idle' | 'positioning' | 'aiming'
        this.strikerX = BOARD.CENTER_X; // board-space
        this.aimAngle = -Math.PI / 2; // pointing up by default
        this.power = 0; // 0..1
        this.released = false;

        // Internal tracking
        this._pointerDown = false;
        this._currentX = 0;
        this._currentY = 0;

        this._enabled = false;
        this._boundDown = this._onPointerDown.bind(this);
        this._boundMove = this._onPointerMove.bind(this);
        this._boundUp = this._onPointerUp.bind(this);
        this._boundCancel = this._onPointerCancel.bind(this);

        // Slider elements
        this._slider = null;
        this._sliderContainer = null;
        this._boundSliderInput = this._onSliderInput.bind(this);
    }

    /**
     * Attach the HTML range slider for striker positioning
     * @param {HTMLInputElement} slider - the range input
     * @param {HTMLElement} container - the slider container div (for show/hide)
     */
    setSlider(slider, container) {
        this._slider = slider;
        this._sliderContainer = container;
    }

    _onSliderInput() {
        if (!this._slider || this.phase === 'idle') return;
        const t = this._slider.value / 100; // 0..1
        this.strikerX = BOARD.PLAYER_BASELINE_LEFT + t * (BOARD.PLAYER_BASELINE_RIGHT - BOARD.PLAYER_BASELINE_LEFT);
    }

    _syncSlider() {
        if (!this._slider) return;
        const t = (this.strikerX - BOARD.PLAYER_BASELINE_LEFT) / (BOARD.PLAYER_BASELINE_RIGHT - BOARD.PLAYER_BASELINE_LEFT);
        this._slider.value = Math.round(t * 100);
    }

    enable() {
        if (this._enabled) return;
        this._enabled = true;
        this.phase = 'positioning';
        this.released = false;
        this.power = 0;
        this.aimAngle = -Math.PI / 2;

        this.canvas.addEventListener('pointerdown', this._boundDown);
        window.addEventListener('pointermove', this._boundMove);
        window.addEventListener('pointerup', this._boundUp);
        document.addEventListener('mouseleave', this._boundCancel);
        this.canvas.style.cursor = 'pointer';

        // Show slider and sync its value to current striker position
        if (this._slider && this._sliderContainer) {
            const t = (this.strikerX - BOARD.PLAYER_BASELINE_LEFT) / (BOARD.PLAYER_BASELINE_RIGHT - BOARD.PLAYER_BASELINE_LEFT);
            this._slider.value = Math.round(t * 100);
            this._slider.addEventListener('input', this._boundSliderInput);
            this._sliderContainer.classList.add('visible');
        }
    }

    disable() {
        this._enabled = false;
        this._pointerDown = false;
        this.phase = 'idle';
        this.released = false;
        this.power = 0;

        this.canvas.removeEventListener('pointerdown', this._boundDown);
        window.removeEventListener('pointermove', this._boundMove);
        window.removeEventListener('pointerup', this._boundUp);
        document.removeEventListener('mouseleave', this._boundCancel);
        this.canvas.style.cursor = 'default';

        // Hide slider
        if (this._slider && this._sliderContainer) {
            this._slider.removeEventListener('input', this._boundSliderInput);
            this._sliderContainer.classList.remove('visible');
        }
    }

    /**
     * Convert canvas pixel coords to board coords
     */
    _canvasToBoard(canvasX, canvasY) {
        const scale = this.getScale();
        const offset = this.getOffset();
        return {
            x: (canvasX - offset.x) / scale,
            y: (canvasY - offset.y) / scale,
        };
    }

    /**
     * Get striker position in canvas-pixel space
     */
    _strikerCanvasPos() {
        const scale = this.getScale();
        const offset = this.getOffset();
        return {
            x: this.strikerX * scale + offset.x,
            y: BOARD.PLAYER_BASELINE_Y * scale + offset.y,
        };
    }

    _getPointerPos(e) {
        const rect = this.canvas.getBoundingClientRect();
        // Account for DPR: canvas internal coords = CSS coords * dpr
        const dpr = window.devicePixelRatio || 1;
        return {
            canvasX: (e.clientX - rect.left) * dpr,
            canvasY: (e.clientY - rect.top) * dpr,
        };
    }

    _onPointerCancel() {
        if (!this._pointerDown) return;
        this._pointerDown = false;
        this.phase = 'positioning';
        this.power = 0;
    }

    _onPointerDown(e) {
        e.preventDefault();
        const { canvasX, canvasY } = this._getPointerPos(e);
        this._pointerDown = true;
        this._startX = canvasX;
        this._startY = canvasY;
        this._currentX = canvasX;
        this._currentY = canvasY;

        if (this.phase === 'positioning') {
            this.phase = 'aiming';
            this.power = 0;
        }
    }

    _onPointerMove(e) {
        if (!this._enabled) return;
        e.preventDefault();
        const { canvasX, canvasY } = this._getPointerPos(e);
        this._currentX = canvasX;
        this._currentY = canvasY;

        if (this.phase === 'aiming' && this._pointerDown) {
            const dx = canvasX - this._startX;
            const dy = canvasY - this._startY;
            const pullDist = Math.sqrt(dx * dx + dy * dy);

            if (pullDist > 5) {
                // Aim is exactly opposite to drag direction
                this.aimAngle = Math.atan2(-dy, -dx);
                const dpr = window.devicePixelRatio || 1;
                // Max power at 75 CSS px drag distance
                this.power = Math.min(1, pullDist / (75 * dpr));
            } else {
                this.power = 0;
            }
        }
    }

    _onPointerUp(e) {
        if (!this._pointerDown) return;
        this._pointerDown = false;

        if (this.phase === 'aiming') {
            if (this.power > 0.05) {
                // Shoot!
                this.released = true;
            } else {
                // Too weak — go back to positioning
                this.phase = 'positioning';
                this.power = 0;
            }
        }
    }

    /**
     * Draw aim line and power indicator
     */
    drawAimUI(ctx, scale, offset) {
        if (this.phase !== 'aiming') return;
        if (this.released) return;
        if (this.power === 0) return; // Don't show the line until the user drags

        const sx = this.strikerX * scale + offset.x;
        const sy = BOARD.PLAYER_BASELINE_Y * scale + offset.y;

        ctx.save();

        // ── Aim direction line ──
        const baseLen = 140 * scale;
        const lineLen = baseLen * (0.4 + this.power * 0.6);
        const ex = sx + Math.cos(this.aimAngle) * lineLen;
        const ey = sy + Math.sin(this.aimAngle) * lineLen;

        // Glow
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.lineWidth = 8;
        ctx.stroke();

        // Main line (dashed)
        ctx.beginPath();
        ctx.setLineDash([8, 6]);
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        const alpha = 0.5 + this.power * 0.4;
        ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.setLineDash([]);

        // Arrowhead
        const arrowSize = 10;
        ctx.beginPath();
        ctx.moveTo(ex, ey);
        ctx.lineTo(
            ex - Math.cos(this.aimAngle - 0.4) * arrowSize,
            ey - Math.sin(this.aimAngle - 0.4) * arrowSize
        );
        ctx.moveTo(ex, ey);
        ctx.lineTo(
            ex - Math.cos(this.aimAngle + 0.4) * arrowSize,
            ey - Math.sin(this.aimAngle + 0.4) * arrowSize
        );
        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // ── Crosshair dot at aim tip ──
        ctx.beginPath();
        ctx.arc(ex, ey, 3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.fill();



        // ── Power bar ──
        const barWidth = 60 * scale;
        const barHeight = 6 * scale;
        const barX = sx - barWidth / 2;
        const barY = sy + 30 * scale;

        // Bar background
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.beginPath();
        ctx.roundRect(barX, barY, barWidth, barHeight, 3);
        ctx.fill();

        // Bar fill with gradient
        const fillWidth = barWidth * this.power;
        if (fillWidth > 0) {
            const barGrad = ctx.createLinearGradient(barX, barY, barX + barWidth, barY);
            barGrad.addColorStop(0, '#4CAF50');
            barGrad.addColorStop(0.5, '#FFC107');
            barGrad.addColorStop(1, '#F44336');
            ctx.fillStyle = barGrad;
            ctx.beginPath();
            ctx.roundRect(barX, barY, fillWidth, barHeight, 3);
            ctx.fill();
        }

        // Power percentage text
        const pct = Math.round(this.power * 100);
        ctx.font = `bold ${11 * scale}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.fillText(`${pct}%`, sx, barY + barHeight + 14 * scale);

        ctx.restore();
    }
}
