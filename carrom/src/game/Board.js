// Board.js — Carrom board geometry constants & rendering (using asset)

export const BOARD = {
    // Canonical board size (physics space). Everything is relative to this.
    SIZE: 700,

    // Playable inner area (calibrated from cropped asset)
    get INNER_LEFT() { return 41; },
    get INNER_RIGHT() { return 656; },
    get INNER_TOP() { return 42; },
    get INNER_BOTTOM() { return 650; },

    // Pocket geometry (calibrated from cropped asset)
    POCKET_RADIUS: 28,
    get POCKET_POSITIONS() {
        return [
            { x: 72, y: 75 },       // top-left
            { x: 623, y: 74 },       // top-right
            { x: 71, y: 614 },      // bottom-left
            { x: 623, y: 613 },      // bottom-right
        ];
    },

    // Baselines — 4-player: one per side, each independently calibrated.
    // Bottom (Player)
    get PLAYER_BASELINE_Y() { return 552; },
    get PLAYER_BASELINE_LEFT() { return 169; },
    get PLAYER_BASELINE_RIGHT() { return 527; },

    // Top (Bot)
    get BOT_BASELINE_Y() { return 131; },
    get BOT_BASELINE_LEFT() { return 169; },
    get BOT_BASELINE_RIGHT() { return 527; },

    // Left side
    get LEFT_BASELINE_X() { return 134; },
    get LEFT_BASELINE_TOP() { return 169; },
    get LEFT_BASELINE_BOTTOM() { return 518; },

    // Right side
    get RIGHT_BASELINE_X() { return 560; },
    get RIGHT_BASELINE_TOP() { return 169; },
    get RIGHT_BASELINE_BOTTOM() { return 520; },

    // Center, calibrated from the midpoint between opposite board markers.
    get CENTER_X() { return 347; },
    get CENTER_Y() { return 337; },

    // Coin sizes
    COIN_RADIUS: 13,
    STRIKER_RADIUS: 17,

    // Wall thickness (invisible physics walls)
    WALL_THICKNESS: 20,
};


export class BoardRenderer {
    /**
     * Draw the carrom board asset on a canvas context.
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} scale - scale factor from board-space to canvas-space
     * @param {HTMLImageElement} image - the board asset
     */
    static draw(ctx, scale, image) {
        if (!image) return;
        ctx.save();
        ctx.scale(scale, scale);

        // Draw the image filling the canonical board size
        ctx.drawImage(image, 0, 0, BOARD.SIZE, BOARD.SIZE);

        ctx.restore();
    }
}
