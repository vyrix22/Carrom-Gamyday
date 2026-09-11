// Physics.js — Matter.js wrapper for the carrom game

import { BOARD } from './Board.js';

export class Physics {
    constructor() {
        const { Engine, World, Bodies, Events, Body } = Matter;

        this.engine = Engine.create({
            enableSleeping: false,
            positionIterations: 12, // High accuracy to prevent overlapping
            velocityIterations: 8,  // High accuracy to prevent overlapping
        });
        // Top-down: no gravity
        this.engine.gravity.x = 0;
        this.engine.gravity.y = 0;

        this.world = this.engine.world;

        // Collision callbacks
        this.onPocket = null;       // (bodyA, bodyB, pocketIndex) => {}
        this.onCollision = null;    // (bodyA, bodyB, relativeVelocity) => {}

        this._createWalls();
        this._createPockets();
        this._setupCollisionEvents();
    }

    _createWalls() {
        const { Bodies, World } = Matter;
        const B = BOARD;
        const T = B.WALL_THICKNESS;
        const PR = B.POCKET_RADIUS + 4; // leave gaps for pockets

        // Each wall is split into segments with gaps at pocket corners
        const wallOpts = {
            isStatic: true,
            restitution: 0.7,
            friction: 0.01,
            label: 'wall',
            render: { visible: false },
        };

        const IL = B.INNER_LEFT;
        const IR = B.INNER_RIGHT;
        const IT = B.INNER_TOP;
        const IB = B.INNER_BOTTOM;
        const midX = B.CENTER_X;
        const midY = B.CENTER_Y;

        // Top wall (gap at TL and TR pockets)
        const topLen = (IR - IL) - PR * 2;
        this.walls = [
            // Top
            Bodies.rectangle(midX, IT - T / 2, topLen, T, wallOpts),
            // Bottom
            Bodies.rectangle(midX, IB + T / 2, topLen, T, wallOpts),
            // Left
            Bodies.rectangle(IL - T / 2, midY, T, topLen, wallOpts),
            // Right
            Bodies.rectangle(IR + T / 2, midY, T, topLen, wallOpts),
        ];

        World.add(this.world, this.walls);
    }

    _createPockets() {
        const { Bodies, World } = Matter;

        this.pocketSensors = BOARD.POCKET_POSITIONS.map((p, i) => {
            // Use a tiny inner radius (e.g., 20% of the visual pocket size) 
            // so coins must actually move *into* the hole to trigger it.
            const sensorRadius = BOARD.POCKET_RADIUS * 0.2;
            const sensor = Bodies.circle(p.x, p.y, sensorRadius, {
                isStatic: true,
                isSensor: true,
                label: `pocket_${i}`,
                render: { visible: false },
            });
            return sensor;
        });

        World.add(this.world, this.pocketSensors);
    }

    _setupCollisionEvents() {
        const { Events } = Matter;

        Events.on(this.engine, 'collisionStart', (event) => {
            for (const pair of event.pairs) {
                const a = pair.bodyA;
                const b = pair.bodyB;

                // Check pocket sensors
                const pocketIdx = this._getPocketIndex(a, b);
                if (pocketIdx !== -1) {
                    const coinBody = a.isSensor ? b : a;
                    if (this.onPocket) {
                        this.onPocket(coinBody, pocketIdx);
                    }
                    continue;
                }

                // Regular collision
                if (a.label !== 'wall' && b.label !== 'wall') {
                    const relVel = Math.sqrt(
                        Math.pow(a.velocity.x - b.velocity.x, 2) +
                        Math.pow(a.velocity.y - b.velocity.y, 2)
                    );
                    if (this.onCollision) {
                        this.onCollision(a, b, relVel);
                    }
                } else {
                    // Wall collision
                    const coinBody = a.label === 'wall' ? b : a;
                    const vel = Math.sqrt(coinBody.velocity.x ** 2 + coinBody.velocity.y ** 2);
                    if (this.onCollision) {
                        this.onCollision(coinBody, null, vel);
                    }
                }
            }
        });
    }

    _getPocketIndex(bodyA, bodyB) {
        for (let i = 0; i < this.pocketSensors.length; i++) {
            const ps = this.pocketSensors[i];
            if (bodyA === ps || bodyB === ps) {
                return i;
            }
        }
        return -1;
    }

    addBody(body) {
        Matter.World.add(this.world, body);
    }

    removeBody(body) {
        Matter.World.remove(this.world, body);
    }

    applyForce(body, force) {
        Matter.Body.applyForce(body, body.position, force);
    }

    setVelocity(body, velocity) {
        Matter.Body.setVelocity(body, velocity);
    }

    setPosition(body, position) {
        Matter.Body.setPosition(body, position);
    }

    setStatic(body, isStatic) {
        Matter.Body.setStatic(body, isStatic);
    }

    /**
     * Check if all dynamic bodies are effectively at rest.
     * @param {Matter.Body[]} bodies - array of bodies to check
     * @param {number} threshold - speed threshold
     * @returns {boolean}
     */
    allAtRest(bodies, threshold = 0.15) {
        for (const b of bodies) {
            if (!b || b.isStatic) continue;
            const speed = Math.sqrt(b.velocity.x ** 2 + b.velocity.y ** 2);
            if (speed > threshold) return false;
        }
        return true;
    }

    /**
     * Force-stop all bodies (zero velocity + angular velocity)
     */
    stopAll(bodies) {
        for (const b of bodies) {
            if (!b || b.isStatic) continue;
            Matter.Body.setVelocity(b, { x: 0, y: 0 });
            Matter.Body.setAngularVelocity(b, 0);
        }
    }

    update(delta = 1000 / 60) {
        Matter.Engine.update(this.engine, delta);
    }

    clear() {
        Matter.World.clear(this.world, false);
        Matter.Engine.clear(this.engine);
    }
}
