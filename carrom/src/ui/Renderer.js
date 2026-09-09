// Renderer.js — Canvas rendering pipeline with DPR scaling

import { BOARD, BoardRenderer } from '../game/Board.js';

export class Renderer {
    /**
     * @param {HTMLCanvasElement} canvas
     */
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.scale = 1;    // board-space to canvas-space scale
        this.offset = { x: 0, y: 0 }; // board origin offset on canvas
        this.dpr = window.devicePixelRatio || 1;

        // Pre-render board to offscreen canvas
        this.boardCanvas = null;

        this._resize();
        this._renderBoardOffscreen();

        window.addEventListener('resize', () => {
            this._resize();
            this._renderBoardOffscreen();
        });
    }

    _resize() {
        const container = this.canvas.parentElement;
        const maxW = container.clientWidth;
        const maxH = container.clientHeight;

        // Board is square — fit to smallest dimension, leave padding
        const padding = 10;
        const available = Math.min(maxW - padding * 2, maxH - padding * 2);
        const canvasSize = Math.max(300, available);

        this.canvas.style.width = canvasSize + 'px';
        this.canvas.style.height = canvasSize + 'px';
        this.canvas.width = canvasSize * this.dpr;
        this.canvas.height = canvasSize * this.dpr;

        this.scale = (canvasSize * this.dpr) / BOARD.SIZE;
        this.offset = { x: 0, y: 0 };
    }

    setBoardImage(img) {
        this.boardImage = img;
        this._renderBoardOffscreen();
    }

    _renderBoardOffscreen() {
        if (!this.boardImage) return;
        const size = Math.round(BOARD.SIZE * this.scale);
        this.boardCanvas = new OffscreenCanvas(size, size);
        const offCtx = this.boardCanvas.getContext('2d');
        BoardRenderer.draw(offCtx, this.scale, this.boardImage);
    }

    getScale() {
        return this.scale;
    }

    getOffset() {
        return this.offset;
    }

    /**
     * Begin frame
     */
    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    /**
     * Draw the cached board
     */
    drawBoard() {
        if (this.boardCanvas) {
            this.ctx.drawImage(this.boardCanvas, this.offset.x, this.offset.y);
        }
    }

    /**
     * Draw all coins
     * @param {Coin[]} coins
     */
    drawCoins(coins) {
        for (const coin of coins) {
            coin.draw(this.ctx, this.scale);
        }
    }

    /**
     * Draw the striker
     * @param {Striker} striker
     */
    drawStriker(striker) {
        striker.draw(this.ctx, this.scale);
    }

    /**
     * Draw aiming UI
     * @param {Input} input
     */
    drawAimUI(input) {
        input.drawAimUI(this.ctx, this.scale, this.offset);
    }

    /**
     * Draw visible debug lines for physics boundaries and pockets
     */
    drawDebugBounds() {
        const ctx = this.ctx;
        const scale = this.scale;
        const offset = this.offset;

        ctx.save();
        
        // Draw Inner Walls
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)'; // Red bounds
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(BOARD.INNER_LEFT * scale + offset.x, BOARD.INNER_TOP * scale + offset.y);
        ctx.lineTo(BOARD.INNER_RIGHT * scale + offset.x, BOARD.INNER_TOP * scale + offset.y);
        ctx.lineTo(BOARD.INNER_RIGHT * scale + offset.x, BOARD.INNER_BOTTOM * scale + offset.y);
        ctx.lineTo(BOARD.INNER_LEFT * scale + offset.x, BOARD.INNER_BOTTOM * scale + offset.y);
        ctx.closePath();
        ctx.stroke();

        // Draw Pockets
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.8)'; // Green pockets
        for (const p of BOARD.POCKET_POSITIONS) {
            ctx.beginPath();
            ctx.arc(p.x * scale + offset.x, p.y * scale + offset.y, BOARD.POCKET_RADIUS * scale, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        ctx.restore();
    }
}
