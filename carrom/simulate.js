const mass = 10.89; 
const restitution = 0.8; 

function simulate(v0, frictionAir) {
    let pos = 550; 
    let velocity = v0; 
    let time = 0;
    let bounces = 0;
    
    while(Math.abs(velocity) > 0.01 && time < 3000) {
        velocity *= (1 - frictionAir);
        pos -= velocity; 
        
        if (pos <= 50) { 
            pos = 50;
            velocity = -velocity * restitution;
            bounces++;
        } else if (pos >= 650) { 
            pos = 650;
            velocity = -velocity * restitution;
            bounces++;
        }
        time++;
    }
    return { bounces, finalPos: pos, v0, frictionAir };
}

console.log("Searching for 2 bounces, final pos ~350, with low friction (0.005 - 0.012)");
let best = null;
let bestDiff = 9999;

for (let v0 = 5; v0 <= 30; v0 += 0.5) {
    for (let f = 0.005; f <= 0.012; f += 0.0005) {
        let res = simulate(v0, f);
        if (res.bounces === 2) {
            let diff = Math.abs(res.finalPos - 350);
            if (diff < bestDiff) {
                bestDiff = diff;
                best = res;
            }
        }
    }
}
console.log("Best setting:", best);
