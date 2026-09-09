// Board.js — Carrom board geometry constants & rendering (using asset)

export const BOARD = {
    // Canonical board size (physics space). Everything is relative to this.
    SIZE: 700,

    // Playable inner area (calibrated from cropped asset)
    get INNER_LEFT() { return 87; },
    get INNER_RIGHT() { return 605; },
    get INNER_TOP() { return 70; },
    get INNER_BOTTOM() { return 627; },

    // Pocket geometry (calibrated from cropped asset)
    POCKET_RADIUS: 25,
    get POCKET_POSITIONS() {
        return [
            { x: 88, y: 73 },       // top-left
            { x: 606, y: 67 },       // top-right
            { x: 88, y: 627 },      // bottom-left
            { x: 605, y: 627 },      // bottom-right
        ];
    },

    // Baselines, calibrated from the decorative red baseline markers in the board art.
    get PLAYER_BASELINE_Y() { return 552; },
    get BOT_BASELINE_Y() { return 131; },
    // Baselines: perfectly encompass the red baseline circles
    get BASELINE_LEFT() { return 169; },
    get BASELINE_RIGHT() { return 523; },

    // Center, calibrated from the midpoint between opposite board markers.
    get CENTER_X() { return 346; },
    get CENTER_Y() { return 342; },

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
