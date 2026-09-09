// Bot.js — Simple carrom bot AI

import { BOARD } from './Board.js';

export class Bot {
    constructor() {
        this.thinkingDelay = 0;
        this.isThinking = false;
        this.shotReady = false;
        this.shotParams = null; // { strikerX, angle, power }
    }

    /**
     * Start the bot's turn: begin thinking
     * @param {Coin[]} coins - all coins on the board
     * @param {'black'|'white'} botColor - bot's coin color
     */
    startThinking(coins, botColor) {
        this.isThinking = true;
        this.shotReady = false;
        this.thinkingDelay = 800 + Math.random() * 700; // 0.8-1.5s

        // Pre-calculate the shot
        this.shotParams = this._calculateShot(coins, botColor);
    }

    /**
     * Update thinking timer
     * @returns {boolean} true when ready to shoot
     */
    update(dt) {
        if (!this.isThinking) return false;

        this.thinkingDelay -= dt * 1000;
        if (this.thinkingDelay <= 0) {
            this.isThinking = false;
            this.shotReady = true;
            return true;
        }
        return false;
    }

    /**
     * Consume the shot parameters
     * @returns {{ strikerX: number, angle: number, power: number } | null}
     */
    getShot() {
        if (!this.shotReady) return null;
        this.shotReady = false;
        return this.shotParams;
    }

    /**
     * Calculate the best shot for the bot
     */
    _calculateShot(coins, botColor) {
        const pockets = BOARD.POCKET_POSITIONS;
        const baselineY = BOARD.BOT_BASELINE_Y;

        // Find bot's coins that are still on board
        const targetCoins = coins.filter(c => !c.pocketed && c.type === botColor);

        // If no own coins left, try for queen
        let candidates = targetCoins.length > 0 ? targetCoins :
            coins.filter(c => !c.pocketed && c.type === 'queen');

        // If nothing, just try any coin
        if (candidates.length === 0) {
            candidates = coins.filter(c => !c.pocketed);
        }

        if (candidates.length === 0) {
            // No coins — shoot randomly
            return {
                strikerX: BOARD.CENTER_X + (Math.random() - 0.5) * 100,
                angle: Math.PI / 2 + (Math.random() - 0.5) * 0.5,
                power: 0.4 + Math.random() * 0.3,
            };
        }

        let bestScore = -Infinity;
        let bestShot = null;

        for (const coin of candidates) {
            for (const pocket of pockets) {
                // Direction from coin to pocket
                const dx = pocket.x - coin.x;
                const dy = pocket.y - coin.y;
                const distToPocket = Math.sqrt(dx * dx + dy * dy);

                // Ideal striker position: line from pocket through coin, extended back
                const hitAngle = Math.atan2(dy, dx);
                const hitDist = BOARD.COIN_RADIUS + BOARD.STRIKER_RADIUS + 2;

                // Where the striker should hit the coin from
                const idealStrikerHitX = coin.x - Math.cos(hitAngle) * hitDist;
                const idealStrikerHitY = coin.y - Math.sin(hitAngle) * hitDist;

                // Striker starting position on baseline
                // Find the x that creates a line from (strikerX, baselineY) through the hit point
                const strikerX = idealStrikerHitX; // simplified: aim directly

                // Clamp to baseline
                const clampedStrikerX = Math.max(BOARD.BASELINE_LEFT, Math.min(BOARD.BASELINE_RIGHT, strikerX));

                // Angle from striker to coin
                const aimDx = coin.x - clampedStrikerX;
                const aimDy = coin.y - baselineY;
                const aimAngle = Math.atan2(aimDy, aimDx);

                // Distance from striker to coin
                const distToCoin = Math.sqrt(aimDx * aimDx + aimDy * aimDy);

                // Check if path is roughly clear (simplified — no full collision check)
                let blocked = false;
                for (const other of coins) {
                    if (other === coin || other.pocketed) continue;
                    // Point-to-line distance
                    const ax = clampedStrikerX, ay = baselineY;
                    const bx = coin.x, by = coin.y;
                    const cx2 = other.x, cy2 = other.y;
                    const t = Math.max(0, Math.min(1,
                        ((cx2 - ax) * (bx - ax) + (cy2 - ay) * (by - ay)) /
                        ((bx - ax) ** 2 + (by - ay) ** 2 + 0.001)
                    ));
                    const nearX = ax + t * (bx - ax);
                    const nearY = ay + t * (by - ay);
                    const d = Math.sqrt((cx2 - nearX) ** 2 + (cy2 - nearY) ** 2);
                    if (d < BOARD.COIN_RADIUS * 2 + BOARD.STRIKER_RADIUS) {
                        blocked = true;
                        break;
                    }
                }

                // Scoring heuristic
                let score = 100;
                score -= distToPocket * 0.3; // prefer closer pockets
                score -= distToCoin * 0.1;   // prefer closer coins
                if (blocked) score -= 80;
                // Prefer shots where the alignment is good
                const alignDiff = Math.abs(aimAngle - hitAngle);
                score -= alignDiff * 20;

                if (score > bestScore) {
                    bestScore = score;
                    bestShot = { strikerX: clampedStrikerX, angle: aimAngle, power: 0 };
                    // Power based on distance
                    bestShot.power = Math.min(0.8, Math.max(0.3, distToCoin / 400));
                }
            }
        }

        if (!bestShot) {
            bestShot = {
                strikerX: BOARD.CENTER_X,
                angle: Math.PI / 2,
                power: 0.5,
            };
        }

        // ── Add intentional errors ──
        bestShot.strikerX += (Math.random() - 0.5) * 30; // ±15px
        bestShot.strikerX = Math.max(BOARD.BASELINE_LEFT, Math.min(BOARD.BASELINE_RIGHT, bestShot.strikerX));
        bestShot.angle += (Math.random() - 0.5) * 0.15;  // ±~4.3°
        bestShot.power += (Math.random() - 0.5) * 0.15;  // ±7.5%
        bestShot.power = Math.max(0.2, Math.min(0.9, bestShot.power));

        return bestShot;
    }
}
