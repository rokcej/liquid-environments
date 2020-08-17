#version 300 es
precision mediump float;

#define M_PI 3.141592653589793238462643

out vec4 oColor[2];

uniform vec2  uRes;
uniform float uTime;

uniform float uContrast;
uniform float uScale;
uniform float uSpeed;
uniform int   uOctaves;
uniform float uPersistence;
uniform float uLacunarity;

// Xorshift random number generator
// https://en.wikipedia.org/wiki/Xorshift
uint xorshift32_state = 0u;
uint xorshift32(uint s) {
	s ^= (s << 13u);
	s ^= (s >> 17u);
	s ^= (s << 5u);
	return s;
}
float rand() {
	xorshift32_state = xorshift32(xorshift32_state);
	return float(xorshift32_state) / float(0xFFFFFFFFu);
}
void srand(float seed) {
	xorshift32_state = uint(seed * float(0xFFFFFFFFu));
}

// Map random number to 2D/3D position
// https://stackoverflow.com/a/4275343/4808188
float rand_constant(vec2 xy) {
    return fract(sin(dot(xy.xy, vec2(12.9898, 78.233))) * 43758.5453);
}
// http://byteblacksmith.com/improvements-to-the-canonical-one-liner-glsl-rand-for-opengl-es-2-0/
float rand_constant(vec3 xyz) { // Edited for 3D
    return fract(sin(mod(dot(xyz.xyz, vec3(12.9898, 78.233, 5.1337)), 3.14)) * 43667.146508724461335325378948);
}


// Random unit-length vector
vec2 getGradient2D(vec2 ixy) {
	srand(rand_constant(ixy + 1.0)); // +1 to avoid 0

	// // Cartesian coordinates
	// float x = rand() * 2.0 - 1.0;
	// float y = sqrt(1.0 - x * x);
	// if (rand() < 0.5) y *= -1.0; // Flip coin to decide y sign 
	// return vec2(x, y);

	// Polar coordinates
	float phi = 2.0 * M_PI * rand();
	return vec2(cos(phi), sin(phi));
}
vec3 getGradient3D(vec3 ixyz) {
	srand(rand_constant(ixyz + 1.0)); // +1 to avoid 0

	// Uniform sampling of unit sphere surface
	// http://corysimon.github.io/articles/uniformdistn-on-sphere/
	float cosTheta = 1.0 - 2.0 * rand();
	float sinTheta = sqrt(1.0 - cosTheta * cosTheta);
	//float theta = acos(1.0 - 2.0 * rand());
	float phi = 2.0 * M_PI * rand();
	return vec3(
		sinTheta * cos(phi),
		sinTheta * sin(phi),
		cosTheta
	);
}

// Interpolation function, has zero first and second derivative at grid nodes
vec2 fade(vec2 x) {
	return x * x * x * (x * (x * 6.0 - 15.0) + 10.0); // 6x^5 - 15x^4 + 10x^3
}
vec3 fade(vec3 x) {
	return x * x * x * (x * (x * 6.0 - 15.0) + 10.0); // 6x^5 - 15x^4 + 10x^3
}

// Internal Perlin noise functions
float _perlinNoise2D(vec2 p) {
	// Integer position
	vec2 ip = floor(p);
	// Difference in position
	vec2 dp = fract(p);
	// Interpolation parameter
	vec2 t = fade(dp);
	// Weights
	float w00 = dot(getGradient2D(ip + vec2(0.0, 0.0)), dp - vec2(0.0, 0.0));
	float w10 = dot(getGradient2D(ip + vec2(1.0, 0.0)), dp - vec2(1.0, 0.0));
	float w01 = dot(getGradient2D(ip + vec2(0.0, 1.0)), dp - vec2(0.0, 1.0));
	float w11 = dot(getGradient2D(ip + vec2(1.0, 1.0)), dp - vec2(1.0, 1.0));
	// Interpolate weights
	float w_xy = mix(
		mix(w00, w10, t.x),
		mix(w01, w11, t.x),
		t.y
	);
	// Output range or Perlin noise is [-sqrt(n)/2, sqrt(n)/2], where n is the number of dimensions
	// https://www.gamedev.net/forums/topic/285533-2d-perlin-noise-gradient-noise-range--/#entry2794056
	// Scale output to range [-1, 1]
	return w_xy * 1.414213562373095048801689; // * 2 / sqrt(2)
}
float _perlinNoise3D(vec3 p) {
	// Integer position
	vec3 ip = floor(p);
	// Difference in position
	vec3 dp = fract(p);
	// Interpolation parameter
	vec3 t = fade(dp);
	// Weights
	float w000 = dot(getGradient3D(ip + vec3(0., 0., 0.)), dp - vec3(0., 0., 0.));
	float w100 = dot(getGradient3D(ip + vec3(1., 0., 0.)), dp - vec3(1., 0., 0.));
	float w010 = dot(getGradient3D(ip + vec3(0., 1., 0.)), dp - vec3(0., 1., 0.));
	float w110 = dot(getGradient3D(ip + vec3(1., 1., 0.)), dp - vec3(1., 1., 0.));
	float w001 = dot(getGradient3D(ip + vec3(0., 0., 1.)), dp - vec3(0., 0., 1.));
	float w101 = dot(getGradient3D(ip + vec3(1., 0., 1.)), dp - vec3(1., 0., 1.));
	float w011 = dot(getGradient3D(ip + vec3(0., 1., 1.)), dp - vec3(0., 1., 1.));
	float w111 = dot(getGradient3D(ip + vec3(1., 1., 1.)), dp - vec3(1., 1., 1.));
	// Interpolate weights
	vec4 w_x = mix(vec4(w000, w001, w010, w011), vec4(w100, w101, w110, w111), t.x);
	vec2 w_xy = mix(w_x.xy,	w_x.zw,	t.y);
	float w_xyz = mix(w_xy.x, w_xy.y, t.z);
	// Output range or Perlin noise is [-sqrt(n)/2, sqrt(n)/2], where n is the number of dimensions
	// https://www.gamedev.net/forums/topic/285533-2d-perlin-noise-gradient-noise-range--/#entry2794056
	// Scale output to range [-1, 1]
	return w_xyz * 1.15470053837925152901830; // * 2 / sqrt(3)
}

// Callable Perlin noise functions
float perlinNoise2D(vec2 xy, float scale, int octaves) {
	float octaveAmplitude = 1.0;
	float octaveFrequency = 1.0 / scale;

	float noiseSum = 0.0;
	float amplitudeSum = 0.0;
	for (int o = 0; o < octaves; ++o) {
		noiseSum += octaveAmplitude * _perlinNoise2D(xy * octaveFrequency);
		amplitudeSum += octaveAmplitude;

		octaveAmplitude *= uPersistence;
		octaveFrequency *= uLacunarity;
	}
	noiseSum /= amplitudeSum; // Normalize noise back to [-1, 1]

	return (noiseSum * uContrast + 1.0) * 0.5; // Convert to range [0, 1]
}
float perlinNoise3D(vec3 xyz, float scale, int octaves) { // 3D
	float octaveAmplitude = 1.0;
	vec3  octaveFrequency = 1.0 / vec3(scale, scale, 1.0);

	float noiseSum = 0.0;
	float amplitudeSum = 0.0;
	for (int o = 0; o < octaves; ++o) {
		// Should z (time) be scaled or not?
		noiseSum += octaveAmplitude * _perlinNoise3D(xyz * octaveFrequency);
		amplitudeSum += octaveAmplitude;

		octaveAmplitude *= uPersistence;
		octaveFrequency *= uLacunarity;
	}
	noiseSum /= amplitudeSum; // Normalize noise back to [-1, 1]

	return (noiseSum * uContrast + 1.0) * 0.5; // Convert to range [0, 1]
}

void main() {
	vec3 xyz = vec3(gl_FragCoord.xy - 0.5 * uRes, uTime * uSpeed);

	// // Reset time after 10 hours to avoid RNG malfunction
	// if (xyz.z > 36000.0)
	// xyz.z -= 36000.0;

	//float val = perlinNoise2D(xyz.xy, uScale, uOctaves);
	float val = perlinNoise3D(xyz, uScale, uOctaves);
	float val2 = perlinNoise3D(xyz + vec3(0.0, 0.0, 6.283), uScale, uOctaves);

	oColor[0] = vec4(vec3(clamp(val, 0.0, 1.0)), 1.0);
	oColor[1] = vec4(vec3(clamp(val2, 0.0, 1.0)), 1.0);
}
