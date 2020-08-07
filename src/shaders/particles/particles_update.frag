#version 300 es
precision mediump float;

const float M_PI  = 3.141592653589793238462643;
const float M_PHI = 1.618033988749894848204587; // Golden ratio

in vec2 fragUV;

struct Material {
	sampler2D texture0;
};

uniform Material material;
uniform vec2 uRes;
uniform float uDT;
uniform float uSeed;
uniform vec3 uCameraPos;

out vec4 oWrite;

struct Particle {
	vec3 pos;
	float life;
	vec3 vel;
	float seed;
};

// Xorshift https://en.wikipedia.org/wiki/Xorshift
uint xorshift32_state = 0u;
uint xorshift32(uint s) {
	s ^= (s << 13u);
	s ^= (s >> 17u);
	s ^= (s << 5u);
	return s;
}

// Gold Noise by Dominic Cerisano https://stackoverflow.com/a/28095165
float gold_noise_state = 0.0;
float gold_noise(vec2 xy, float seed) {
    return fract(tan(distance(xy * M_PHI, xy) * seed) * xy.x);
}

float rand2() {
    float val = gold_noise(gl_FragCoord.xy, uSeed + gold_noise_state);
	gold_noise_state += val;
	return val;
}

float rand() {
	xorshift32_state = xorshift32(xorshift32_state);
	return float(xorshift32_state) / float(0xFFFFFFFFu);
}

Particle readData(int texelOffset) {
	float baseOffset = float(-texelOffset);
	vec4 texel0 = texture(material.texture0, (gl_FragCoord.xy + vec2(baseOffset + 0.0, 0.0)) / uRes);
	vec4 texel1 = texture(material.texture0, (gl_FragCoord.xy + vec2(baseOffset + 1.0, 0.0)) / uRes);

	return Particle(
		texel0.xyz,
		texel0.w,
		texel1.xyz,
		texel1.w
	);
}

void writeData(Particle p, int texelOffset) {
	if (texelOffset == 0) { // Write position
		oWrite = vec4(p.pos, p.life);
	} else { // Write velocity
		oWrite = vec4(p.vel, p.seed);
	}
}

vec3 sampleUnitCube() {
	return vec3(rand(), rand(), rand()) * 2.0 - 1.0;
}

vec3 sampleUnitSphere() {
	// // Cube method
	// vec3 pos;
	// do {
	// 	pos = vec3(rand(), rand(), rand()) * 2.0 - 1.0;
	// } while (length(pos) > 1.0);
	// return pos;

	// // Non-uniform spherical coordinates
	// float r = rand();
	// float phi = rand() * 2.0 * M_PI;
	// float theta = rand() * M_PI;
	// return vec3(
	// 	r * sin(theta) * cos(phi),
	// 	r * sin(theta) * sin(phi),
	// 	r * cos(theta)
	// );

	// Uniform spherical coordinates
	float u   = rand(); // u ∈ [0, 1]
	float v   = rand() * 2.0 - 1.0; // v ∈ [-1, 1]
	float phi = rand() * 2.0 * M_PI; // φ ∈ [0, 2π)

	float r = pow(u, 1.0 / 3.0); // r ∈ [0, 1]
	float cosTheta = -v; // θ ∈ [0, π]
	float sinTheta = sqrt(1.0 - v * v);

	return vec3(
		r * sinTheta * cos(phi),
		r * sinTheta * sin(phi),
		r * cosTheta
	);
}

void main() {
	int texelOffset = int(mod(gl_FragCoord.x, 2.0));
	Particle p = readData(texelOffset);

	// Init RNG
	gold_noise_state = (p.seed + uSeed) * 0.5;
	xorshift32_state = uint(((p.seed + uSeed) * 0.5) * float(0xFFFFFFFFu));

	// Process particle
	p.life -= uDT;
	if (p.life > 0.0) { // Update particle
		p.pos += p.vel * uDT;
	} else { // Respawn particle
		p.pos = sampleUnitSphere() * 20.0 + uCameraPos;
		p.life = rand() * 25.0 + 5.0;
		p.vel = vec3(rand(), rand(), rand()) * 0.1 - 0.05;
	}

	writeData(p, texelOffset);
}
