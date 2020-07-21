import * as RC from "/rendercore/src/RenderCore.js"

class Particle {
	constructor() {
		this.position = new RC.Vector3(0, 0, 0);
		this.velocity = new RC.Vector3(0, 0, 0);
		this.life = 0.0;
	}
}

export class ParticleManager {
	constructor(scene, source, numParticles, particleSize, range, spawnRate) {
		this.scene = scene;
		this.source = source;
		this.range = range;
		this.numParticles = numParticles;
		this.particleSize = particleSize;
		this.spawnRate = spawnRate; // Particles per second

		this.particles = [];
		this.quads = [];
		for (let i = 0; i < this.numParticles; ++i) {
			const p = new Particle();
			this.particles.push(p);

			let sz = this.particleSize / 2;
			let q = new RC.Quad({ x: -sz, y: -sz }, { x: sz, y: sz }, new RC.MeshBasicMaterial());
			q.material.color = new RC.Color("#778899");
			q.material.side = RC.FRONT_AND_BACK_SIDE;
			q.visible = false;
			this.scene.add(q);
			this.quads.push(q);
		}

		this._lastDeadParticle = -1;
	}

	update(dt) {
		// Update living particles
		for (let i = 0; i < this.numParticles; ++i) {
			const p = this.particles[i];
			p.life -= dt;
			if (p.life > 0.0) {
				p.position.addScaledVector(p.velocity, dt);
				this.quads[i].visible = true;
				this.quads[i].position = p.position;
				this.quads[i].updateMatrix();
			} else {
				this.quads[i].visible = false;
			}


		}

		// Spawn new particles
		let numNew = this.spawnRate * dt;
		for (let _i = 0; _i < numNew; ++_i) {
			const i = this.firstDeadParticle();
			if (i >= 0)
				this.respawnParticle(this.particles[i]);
			else
				break;
		}
	}

	firstDeadParticle() {
		for (let i = this._lastDeadParticle + 1; i < this.numParticles; ++i) {
			if (this.particles[i].life <= 0) {
				this._lastDeadParticle = i;
				return i;
			}
		}

		for (let i = 0; i <= this._lastDeadParticle; ++i) {
			if (this.particles[i].life <= 0) {
				this._lastDeadParticle = i;
				return i;
			}
		}

		this._lastDeadParticle = -1;
		return -1;
	}

	respawnParticle(p) {
		p.position.copy(this.source.position);
		p.position.x += (Math.random() * 2.0 - 1.0) * this.range;
		p.position.y += (Math.random() * 2.0 - 1.0) * this.range;
		p.position.z += (Math.random() * 2.0 - 1.0) * this.range;

		p.life = Math.random() * 5.0 + 15.0;

		p.velocity.x = Math.random() * 2 - 1;
		p.velocity.y = Math.random() * 2 - 1;
		p.velocity.z = Math.random() * 2 - 1;
		p.velocity.multiplyScalar(0.05);
	}
}
