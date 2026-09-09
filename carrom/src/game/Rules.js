// Rules.js — Carrom game rules, scoring, turn logic

export class Rules {
    constructor() {
        this.playerScore = 0;
        this.botScore = 0;
        this.queenClaimed = false; // has queen been covered?
        this.queenPendingCover = null; // 'player' | 'bot' | null — who needs to cover
        this.playerColor = 'white'; // player plays white
        this.botColor = 'black';    // bot plays black
    }

    reset() {
        this.playerScore = 0;
        this.botScore = 0;
        this.queenClaimed = false;
        this.queenPendingCover = null;
    }

    /**
     * Evaluate results of a shot
     * @param {Array<{type: string, coinRef: object}>} pocketedCoins - coins pocketed this shot
     * @param {boolean} strikerPocketed - was the striker pocketed?
     * @param {'player'|'bot'} currentTurn
     * @param {Coin[]} allCoins - all coins to check game state
     * @returns {{
     *   scoreDelta: number,
     *   anotherTurn: boolean,
     *   foul: boolean,
     *   messages: string[],
     *   returnCoins: Coin[],
     *   returnQueen: boolean,
     *   gameOver: boolean,
     *   winner: string|null,
     * }}
     */
    evaluateShot(pocketedCoins, strikerPocketed, currentTurn, allCoins) {
        const result = {
            scoreDelta: 0,
            anotherTurn: false,
            foul: false,
            messages: [],
            returnCoins: [],
            returnQueen: false,
            gameOver: false,
            winner: null,
        };

        const myColor = currentTurn === 'player' ? this.playerColor : this.botColor;
        const ownPocketed = pocketedCoins.filter(c => c.type === myColor);
        const opponentPocketed = pocketedCoins.filter(c => c.type !== myColor && c.type !== 'queen');
        const queenPocketed = pocketedCoins.find(c => c.type === 'queen');

        // ── Foul: striker pocketed ──
        if (strikerPocketed) {
            result.foul = true;
            result.messages.push('Foul! Striker pocketed.');
            // Return one of the player's previously pocketed coins (handled by caller)
            result.anotherTurn = false;

            // If queen was pocketed in this shot, return it
            if (queenPocketed) {
                result.returnQueen = true;
                result.messages.push('Queen returned.');
                this.queenPendingCover = null;
            }
            return result;
        }

        // ── Scoring own coins ──
        if (ownPocketed.length > 0) {
            result.scoreDelta = ownPocketed.length;
            result.anotherTurn = true;
            result.messages.push(`+${ownPocketed.length} point${ownPocketed.length > 1 ? 's' : ''}!`);
        }

        // ── Queen handling ──
        if (queenPocketed) {
            if (ownPocketed.length > 0) {
                // Queen is covered in the same shot
                this.queenClaimed = true;
                result.scoreDelta += 3;
                result.messages.push('Queen pocketed & covered! +3 points');
                result.anotherTurn = true;
            } else {
                // Queen pocketed but not covered — need to cover next shot
                this.queenPendingCover = currentTurn;
                result.messages.push('Queen pocketed! Cover it next shot.');
                result.anotherTurn = true;
            }
        }

        // ── Check queen cover from previous turn ──
        if (!queenPocketed && this.queenPendingCover === currentTurn) {
            if (ownPocketed.length > 0) {
                // Covered!
                this.queenClaimed = true;
                this.queenPendingCover = null;
                result.scoreDelta += 3;
                result.messages.push('Queen covered! +3 points');
            } else {
                // Failed to cover — queen returns
                this.queenPendingCover = null;
                result.returnQueen = true;
                result.messages.push('Failed to cover queen. Queen returned.');
            }
        }

        // ── Opponent coins pocketed (no benefit, possibly a foul in strict rules, but keeping casual) ──
        // In casual mode, opponent coins pocketed don't give the opponent points
        // but also don't give another turn

        // ── No coins pocketed ──
        if (pocketedCoins.length === 0 && !strikerPocketed) {
            result.anotherTurn = false;
        }

        // ── Apply score ──
        if (currentTurn === 'player') {
            this.playerScore += result.scoreDelta;
        } else {
            this.botScore += result.scoreDelta;
        }

        // ── Check game over ──
        const remaining = allCoins.filter(c => !c.pocketed);
        const blackRemaining = remaining.filter(c => c.type === 'black').length;
        const whiteRemaining = remaining.filter(c => c.type === 'white').length;
        const queenRemaining = remaining.filter(c => c.type === 'queen').length;

        // Game ends when one side has pocketed all their coins
        if (whiteRemaining === 0 || blackRemaining === 0) {
            result.gameOver = true;
            if (this.playerScore > this.botScore) {
                result.winner = 'player';
            } else if (this.botScore > this.playerScore) {
                result.winner = 'bot';
            } else {
                result.winner = 'draw';
            }
            result.messages.push('Game Over!');
        }

        // Also end if no coins left at all
        if (remaining.length === 0) {
            result.gameOver = true;
            result.winner = this.playerScore >= this.botScore ? 'player' : 'bot';
        }

        return result;
    }
}
