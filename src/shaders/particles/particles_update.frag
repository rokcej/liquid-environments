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
uniform float uDT; // Delta time
uniform float uTime; // Total time
uniform float uSeed;
uniform vec3 uCameraPos;
uniform int  uNumComp;

layout (location = 0) out vec4 oWrite;
layout (location = 1) out vec4 oColor;

struct Particle {
	vec3 pos;
	float life;
	vec3 vel;
	float seed;
	vec3 rot;
	float age;
};


float uScale = 4.0;
float uEvolutionSpeed = 0.5;
float uMovementSpeed = 0.5;






// RNG

// Xorshift https://en.wikipedia.org/wiki/Xorshift
uint xorshift32_state = 0u; 
uint xorshift32_state_temp = 0u;
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

float rand_temp() {
	xorshift32_state_temp = xorshift32(xorshift32_state_temp);
	return float(xorshift32_state_temp) / float(0xFFFFFFFFu);
}
void srand_temp(float seed) {
	xorshift32_state_temp = uint(seed * float(0xFFFFFFFFu));
}

// Map random number to 4D position
float rand_constant(vec4 p) {
    return fract(sin(mod(dot(p.xyzw, vec4(12.9898, 78.233, 144.712, 5.1337)), 3.14)) * 43667.146508724461335325378948);
}








////////////////////////////////////////////
// 4D Perlin noise (using RNG algorithms) //
////////////////////////////////////////////

// Random unit-length vector
// https://mathworld.wolfram.com/HyperspherePointPicking.html
// http://corysimon.github.io/articles/uniformdistn-on-sphere/
vec4 getGradient4D(vec4 ip) {
	srand_temp(rand_constant(ip + 0.5)); // Add 0.5 to avoid 0

	// return normalize(vec4(rand_temp(), rand_temp(), rand_temp(), rand_temp()) * 2.0 - 1.0); // Wrong! Not uniformly distributed on hypersphere surface!

	// https://en.wikipedia.org/wiki/Box%E2%80%93Muller_transform
	vec4 ru = vec4(rand_temp(), rand_temp(), rand_temp(), rand_temp()); // Uniformly distributed random variables
	vec2 A = sqrt(-2.0 * log(ru.xy * .9998 + .0001)); // Correct to avoid 0 and infinity vectors
	vec2 B = 2.0 * M_PI * ru.zw;
	vec4 rn = vec4(A * cos(B), A * sin(B)); // Normally distributed random variables
	return normalize(rn);
}

// Interpolation function, has zero first and second derivative at grid nodes
vec4 fade(vec4 x) {
	return x * x * x * (x * (x * 6.0 - 15.0) + 10.0); // 6x^5 - 15x^4 + 10x^3
}

float _perlinNoise4D(vec4 p) {
	// Integer position
	vec4 ip = floor(p);
	// Difference in position
	vec4 dp = fract(p);
	// Interpolation parameter
	vec4 t = fade(dp);
	// Weights
	float w0000 = dot(getGradient4D(ip + vec4(0., 0., 0., 0.)), dp - vec4(0., 0., 0., 0.));
	float w1000 = dot(getGradient4D(ip + vec4(1., 0., 0., 0.)), dp - vec4(1., 0., 0., 0.));
	float w0100 = dot(getGradient4D(ip + vec4(0., 1., 0., 0.)), dp - vec4(0., 1., 0., 0.));
	float w1100 = dot(getGradient4D(ip + vec4(1., 1., 0., 0.)), dp - vec4(1., 1., 0., 0.));
	float w0010 = dot(getGradient4D(ip + vec4(0., 0., 1., 0.)), dp - vec4(0., 0., 1., 0.));
	float w1010 = dot(getGradient4D(ip + vec4(1., 0., 1., 0.)), dp - vec4(1., 0., 1., 0.));
	float w0110 = dot(getGradient4D(ip + vec4(0., 1., 1., 0.)), dp - vec4(0., 1., 1., 0.));
	float w1110 = dot(getGradient4D(ip + vec4(1., 1., 1., 0.)), dp - vec4(1., 1., 1., 0.));
	float w0001 = dot(getGradient4D(ip + vec4(0., 0., 0., 1.)), dp - vec4(0., 0., 0., 1.));
	float w1001 = dot(getGradient4D(ip + vec4(1., 0., 0., 1.)), dp - vec4(1., 0., 0., 1.));
	float w0101 = dot(getGradient4D(ip + vec4(0., 1., 0., 1.)), dp - vec4(0., 1., 0., 1.));
	float w1101 = dot(getGradient4D(ip + vec4(1., 1., 0., 1.)), dp - vec4(1., 1., 0., 1.));
	float w0011 = dot(getGradient4D(ip + vec4(0., 0., 1., 1.)), dp - vec4(0., 0., 1., 1.));
	float w1011 = dot(getGradient4D(ip + vec4(1., 0., 1., 1.)), dp - vec4(1., 0., 1., 1.));
	float w0111 = dot(getGradient4D(ip + vec4(0., 1., 1., 1.)), dp - vec4(0., 1., 1., 1.));
	float w1111 = dot(getGradient4D(ip + vec4(1., 1., 1., 1.)), dp - vec4(1., 1., 1., 1.));
	// Interpolate weights
	vec4  w_x_0  = mix(vec4(w0000, w0001, w0010, w0011), vec4(w1000, w1001, w1010, w1011), t.x);
	vec4  w_x_1  = mix(vec4(w0100, w0101, w0110, w0111), vec4(w1100, w1101, w1110, w1111), t.x);
	vec4  w_xy   = mix(w_x_0, w_x_1, t.y);
	vec2  w_xyz  = mix(w_xy.xy, w_xy.zw, t.z);
	float w_xyzw = mix(w_xyz.x, w_xyz.y, t.w);
	// Output range or Perlin noise is [-sqrt(n)/2, sqrt(n)/2], where n is the number of dimensions
	// https://www.gamedev.net/forums/topic/285533-2d-perlin-noise-gradient-noise-range--/#entry2794056
	// Scale output to range [-1, 1]
	return w_xyzw; // 2 / sqrt(4) = 1
}

vec3 getPotentialP(vec4 p) {
	return vec3(
		_perlinNoise4D(p),
		_perlinNoise4D(vec4(p.z + 12.7, p.x - 3.14, p.w - 8.2, p.y + 9.77)),
		_perlinNoise4D(vec4(p.w - 15.69, p.z - 9.6, p.y - 2.32, p.x + 11.97))
	);
}

vec3 getVelocityP(vec3 pos, float time) {
	vec4 p = vec4(pos / uScale, time * uEvolutionSpeed);
	vec3 pot = getPotentialP(p);

	float eps = 0.0001; // Epsilon
	vec4 dx = vec4(eps, 0.0, 0.0, 0.0);
	vec4 dy = vec4(0.0, eps, 0.0, 0.0);
	vec4 dz = vec4(0.0, 0.0, eps, 0.0);

	// Partial derivatives
	vec3 dp_dx = getPotentialP(p + dx);
	vec3 dp_dy = getPotentialP(p + dy);
	vec3 dp_dz = getPotentialP(p + dz);

	float dp3_dy = (dp_dy.z - pot.z) / eps;
	float dp2_dz = (dp_dz.y - pot.y) / eps;
	float dp1_dz = (dp_dz.x - pot.x) / eps;
	float dp3_dx = (dp_dx.z - pot.z) / eps;
	float dp2_dx = (dp_dx.y - pot.y) / eps;
	float dp1_dy = (dp_dy.x - pot.x) / eps;

	return vec3(dp3_dy - dp2_dz, dp1_dz - dp3_dx, dp2_dx - dp1_dy) * uMovementSpeed;
}








//////////////////////////////////////////////////////
// 4D Perlin Noise (using permutation lookup table) //
//////////////////////////////////////////////////////

const int _P[256] = int[] (
	151,160,137,91,90,15,
	131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,
	190, 6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,
	88,237,149,56,87,174,20,125,136,171,168, 68,175,74,165,71,134,139,48,27,166,
	77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,
	102,143,54, 65,25,63,161, 1,216,80,73,209,76,132,187,208, 89,18,169,200,196,
	135,130,116,188,159,86,164,100,109,198,173,186, 3,64,52,217,226,250,124,123,
	5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,
	223,183,170,213,119,248,152, 2,44,154,163, 70,221,153,101,155,167, 43,172,9,
	129,22,39,253, 19,98,108,110,79,113,224,232,178,185, 112,104,218,246,97,228,
	251,34,242,193,238,210,144,12,191,179,162,241, 81,51,145,235,249,14,239,107,
	49,192,214, 31,181,199,106,157,184, 84,204,176,115,121,50,45,127, 4,150,254,
	138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180

	// 12, 48, 19, 52, 50, 49, 23, 27, 16, 18, 46, 55, 53, 57, 1, 34, 31, 3, 56, 38,
	// 13, 21, 51, 14, 47, 22, 41, 54, 4, 28, 40, 58, 2, 17, 44, 15, 59, 30, 63, 26,
	// 33, 10, 11, 61, 7, 37, 39, 42, 36, 20, 24, 9, 60, 35, 32, 43, 6, 25, 29, 8, 0,
	// 5, 62, 45
);
int P(int i) {
	return _P[i & 255];
}
float grad(int hash, vec4 dp) {
	//return dp.x + dp.y + dp.z;
	int h = hash & 31;
	vec3 v = dp.xyz;
	// switch (h >> 3) {
	// 	case 1: v = dp.wxy; break;
	// 	case 2: v = dp.zwx; break;
	// 	case 3: v = dp.yzw; break;
	// }
	if (h == 8)
		v = dp.wxy;
	else if (h == 16)
		v = dp.zwx;
	else if (h == 24)
		v = dp.yzw;
	return ((h & 4) == 0 ? -v.x : v.x) + ((h & 2) == 0 ? -v.y : v.y) + ((h & 1) == 0 ? -v.z : v.z);
}
float improvedNoise4D(vec4 p) {
	ivec4 ip = ivec4(floor(p)) & 255;
	vec4  dp = fract(p);
	vec4  t  = fade(dp);

	int AAA = P(P(P(ip.x    ) + ip.y    ) + ip.z    ) + ip.w;
	int BAA = P(P(P(ip.x + 1) + ip.y    ) + ip.z    ) + ip.w;
	int ABA = P(P(P(ip.x    ) + ip.y + 1) + ip.z    ) + ip.w;
	int BBA = P(P(P(ip.x + 1) + ip.y + 1) + ip.z    ) + ip.w;
	int AAB = P(P(P(ip.x    ) + ip.y    ) + ip.z + 1) + ip.w;
	int BAB = P(P(P(ip.x + 1) + ip.y    ) + ip.z + 1) + ip.w;
	int ABB = P(P(P(ip.x    ) + ip.y + 1) + ip.z + 1) + ip.w;
	int BBB = P(P(P(ip.x + 1) + ip.y + 1) + ip.z + 1) + ip.w;

	vec4 lerp_x0 = mix(vec4(
			grad(P(AAA    ), dp - vec4(0.0, 0.0, 0.0, 0.0)),
			grad(P(AAB    ), dp - vec4(0.0, 0.0, 1.0, 0.0)),
			grad(P(AAA + 1), dp - vec4(0.0, 0.0, 0.0, 1.0)),
			grad(P(AAB + 1), dp - vec4(0.0, 0.0, 1.0, 1.0))
		), vec4(
			grad(P(BAA    ), dp - vec4(1.0, 0.0, 0.0, 0.0)),
			grad(P(BAB    ), dp - vec4(1.0, 0.0, 1.0, 0.0)),
			grad(P(BAA + 1), dp - vec4(1.0, 0.0, 0.0, 1.0)),
			grad(P(BAB + 1), dp - vec4(1.0, 0.0, 1.0, 1.0))
		), t.x
	);
	vec4 lerp_x1 = mix(vec4(
			grad(P(ABA    ), dp - vec4(0.0, 1.0, 0.0, 0.0)),
			grad(P(ABB    ), dp - vec4(0.0, 1.0, 1.0, 0.0)),
			grad(P(ABA + 1), dp - vec4(0.0, 1.0, 0.0, 1.0)),
			grad(P(ABB + 1), dp - vec4(0.0, 1.0, 1.0, 1.0))
		), vec4(
			grad(P(BBA    ), dp - vec4(1.0, 1.0, 0.0, 0.0)),
			grad(P(BBB    ), dp - vec4(1.0, 1.0, 1.0, 0.0)),
			grad(P(BBA + 1), dp - vec4(1.0, 1.0, 0.0, 1.0)),
			grad(P(BBB + 1), dp - vec4(1.0, 1.0, 1.0, 1.0))
		), t.x
	);
	vec4  lerp_xy   = mix(lerp_x0,    lerp_x1,    t.y);
	vec2  lerp_xyz  = mix(lerp_xy.xz, lerp_xy.yw, t.z);
	float lerp_xyzw = mix(lerp_xyz.x, lerp_xyz.y, t.w);

	return lerp_xyzw;
}

vec3 getPotentialI(vec4 p) {
	return vec3(
		improvedNoise4D(p),
		improvedNoise4D(vec4(p.z + 12.7, p.x - 3.14, p.w - 8.2, p.y + 9.77)),
		improvedNoise4D(vec4(p.w - 15.69, p.z - 9.6, p.y - 2.32, p.x + 11.97))
	);
}

vec3 getVelocityI(vec3 pos, float time) {
	vec4 p = vec4(pos / uScale, time * uEvolutionSpeed);
	vec3 pot = getPotentialI(p);

	float eps = 0.0001; // Epsilon
	float epsInv = 1.0 / eps;
	vec4 dx = vec4(eps, 0.0, 0.0, 0.0);
	vec4 dy = vec4(0.0, eps, 0.0, 0.0);
	vec4 dz = vec4(0.0, 0.0, eps, 0.0);


	// Partial derivatives
	vec3 dp_dx = getPotentialI(p + dx);
	vec3 dp_dy = getPotentialI(p + dy);
	vec3 dp_dz = getPotentialI(p + dz);

	float dp3_dy = (dp_dy.z - pot.z) / eps;
	float dp2_dz = (dp_dz.y - pot.y) / eps;
	float dp1_dz = (dp_dz.x - pot.x) / eps;
	float dp3_dx = (dp_dx.z - pot.z) / eps;
	float dp2_dx = (dp_dx.y - pot.y) / eps;
	float dp1_dy = (dp_dy.x - pot.x) / eps;

	return vec3(dp3_dy - dp2_dz, dp1_dz - dp3_dx, dp2_dx - dp1_dy) * uMovementSpeed;
}








/////////////////////////////////////////////////////////////////////////////////////////
// 4D Simplex noise https://github.com/ashima/webgl-noise/blob/master/src/noise4D.glsl //
/////////////////////////////////////////////////////////////////////////////////////////

vec4 mod289(vec4 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0; }

float mod289(float x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0; }

vec4 permute(vec4 x) {
	 return mod289(((x*34.0)+1.0)*x);
}

float permute(float x) {
	 return mod289(((x*34.0)+1.0)*x);
}

vec4 taylorInvSqrt(vec4 r)
{
  return 1.79284291400159 - 0.85373472095314 * r;
}

float taylorInvSqrt(float r)
{
  return 1.79284291400159 - 0.85373472095314 * r;
}

vec4 grad4(float j, vec4 ip)
  {
  const vec4 ones = vec4(1.0, 1.0, 1.0, -1.0);
  vec4 p,s;

  p.xyz = floor( fract (vec3(j) * ip.xyz) * 7.0) * ip.z - 1.0;
  p.w = 1.5 - dot(abs(p.xyz), ones.xyz);
  s = vec4(lessThan(p, vec4(0.0)));
  p.xyz = p.xyz + (s.xyz*2.0 - 1.0) * s.www; 

  return p;
  }
						
// (sqrt(5) - 1)/4 = F4, used once below
#define F4 0.309016994374947451

float snoise(vec4 v)
  {
  const vec4  C = vec4( 0.138196601125011,  // (5 - sqrt(5))/20  G4
						0.276393202250021,  // 2 * G4
						0.414589803375032,  // 3 * G4
					   -0.447213595499958); // -1 + 4 * G4

// First corner
  vec4 i  = floor(v + dot(v, vec4(F4)) );
  vec4 x0 = v -   i + dot(i, C.xxxx);

// Other corners

// Rank sorting originally contributed by Bill Licea-Kane, AMD (formerly ATI)
  vec4 i0;
  vec3 isX = step( x0.yzw, x0.xxx );
  vec3 isYZ = step( x0.zww, x0.yyz );
//  i0.x = dot( isX, vec3( 1.0 ) );
  i0.x = isX.x + isX.y + isX.z;
  i0.yzw = 1.0 - isX;
//  i0.y += dot( isYZ.xy, vec2( 1.0 ) );
  i0.y += isYZ.x + isYZ.y;
  i0.zw += 1.0 - isYZ.xy;
  i0.z += isYZ.z;
  i0.w += 1.0 - isYZ.z;

  // i0 now contains the unique values 0,1,2,3 in each channel
  vec4 i3 = clamp( i0, 0.0, 1.0 );
  vec4 i2 = clamp( i0-1.0, 0.0, 1.0 );
  vec4 i1 = clamp( i0-2.0, 0.0, 1.0 );

  //  x0 = x0 - 0.0 + 0.0 * C.xxxx
  //  x1 = x0 - i1  + 1.0 * C.xxxx
  //  x2 = x0 - i2  + 2.0 * C.xxxx
  //  x3 = x0 - i3  + 3.0 * C.xxxx
  //  x4 = x0 - 1.0 + 4.0 * C.xxxx
  vec4 x1 = x0 - i1 + C.xxxx;
  vec4 x2 = x0 - i2 + C.yyyy;
  vec4 x3 = x0 - i3 + C.zzzz;
  vec4 x4 = x0 + C.wwww;

// Permutations
  i = mod289(i); 
  float j0 = permute( permute( permute( permute(i.w) + i.z) + i.y) + i.x);
  vec4 j1 = permute( permute( permute( permute (
			 i.w + vec4(i1.w, i2.w, i3.w, 1.0 ))
		   + i.z + vec4(i1.z, i2.z, i3.z, 1.0 ))
		   + i.y + vec4(i1.y, i2.y, i3.y, 1.0 ))
		   + i.x + vec4(i1.x, i2.x, i3.x, 1.0 ));

// Gradients: 7x7x6 points over a cube, mapped onto a 4-cross polytope
// 7*7*6 = 294, which is close to the ring size 17*17 = 289.
  vec4 ip = vec4(1.0/294.0, 1.0/49.0, 1.0/7.0, 0.0) ;

  vec4 p0 = grad4(j0,   ip);
  vec4 p1 = grad4(j1.x, ip);
  vec4 p2 = grad4(j1.y, ip);
  vec4 p3 = grad4(j1.z, ip);
  vec4 p4 = grad4(j1.w, ip);

// Normalise gradients
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;
  p4 *= taylorInvSqrt(dot(p4,p4));

// Mix contributions from the five corners
  vec3 m0 = max(0.6 - vec3(dot(x0,x0), dot(x1,x1), dot(x2,x2)), 0.0);
  vec2 m1 = max(0.6 - vec2(dot(x3,x3), dot(x4,x4)            ), 0.0);
  m0 = m0 * m0;
  m1 = m1 * m1;
  return 49.0 * ( dot(m0*m0, vec3( dot( p0, x0 ), dot( p1, x1 ), dot( p2, x2 )))
			   + dot(m1*m1, vec2( dot( p3, x3 ), dot( p4, x4 ) ) ) );

}

vec3 getPotentialS(vec4 p) {
	return vec3(
		snoise(p),
		snoise(vec4(p.z + 12.7, p.x - 3.14, p.w - 8.2, p.y + 9.77)),
		snoise(vec4(p.w - 15.69, p.z - 9.6, p.y - 2.32, p.x + 11.97))
	);
}

vec3 getVelocityS(vec3 pos, float time) {
	vec4 p = vec4(pos / uScale, time * uEvolutionSpeed);
	vec3 pot = getPotentialS(p);

	float eps = 0.0001;
	vec4 dx = vec4(eps, 0.0, 0.0, 0.0);
	vec4 dy = vec4(0.0, eps, 0.0, 0.0);
	vec4 dz = vec4(0.0, 0.0, eps, 0.0);

	// Partial derivatives
	vec3 dp_dx = getPotentialS(p + dx);
	vec3 dp_dy = getPotentialS(p + dy);
	vec3 dp_dz = getPotentialS(p + dz);

	float dp3_dy = (dp_dy.z - pot.z) / eps;
	float dp2_dz = (dp_dz.y - pot.y) / eps;
	float dp1_dz = (dp_dz.x - pot.x) / eps;
	float dp3_dx = (dp_dx.z - pot.z) / eps;
	float dp2_dx = (dp_dx.y - pot.y) / eps;
	float dp1_dy = (dp_dy.x - pot.x) / eps;

	return vec3(dp3_dy - dp2_dz, dp1_dz - dp3_dx, dp2_dx - dp1_dy) * uMovementSpeed;
}








Particle readData(int texelOffset) {
	float baseOffset = float(-texelOffset);
	vec4 texel0 = texture(material.texture0, (gl_FragCoord.xy + vec2(baseOffset + 0.0, 0.0)) / uRes);
	vec4 texel1 = texture(material.texture0, (gl_FragCoord.xy + vec2(baseOffset + 1.0, 0.0)) / uRes);
	vec4 texel2 = texture(material.texture0, (gl_FragCoord.xy + vec2(baseOffset + 2.0, 0.0)) / uRes);

	return Particle(
		texel0.xyz,
		texel0.w,
		texel1.xyz,
		texel1.w,
		texel2.xyz,
		texel2.w
	);
}

void writeData(Particle p, int texelOffset) {
	if (texelOffset == 0) { // Write position
		oWrite = vec4(p.pos, p.life);
	} else if (texelOffset == 1) { // Write velocity
		oWrite = vec4(p.vel, p.seed);
	} else {
		oWrite = vec4(p.rot, p.age);
	}
}

vec3 sampleUnitCube() {
	return vec3(rand(), rand(), rand()) * 2.0 - 1.0;
}

vec3 sampleUnitSphere() {
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
	int texelOffset = int(gl_FragCoord.x) % uNumComp; // int(mod(gl_FragCoord.x, uNumComp));
	Particle p = readData(texelOffset);

	// Init RNG
	srand((p.seed + uSeed) * 0.5);

	// Process particle
	p.life -= uDT;
	if (p.life > 0.0) { // Update particle
		//p.vel = getVelocityP(p.pos, uTime);
		//p.vel = getVelocityI(p.pos, uTime);
		p.vel = getVelocityS(p.pos / 1.4, uTime / 2.0) * 0.6;
		p.pos += p.vel * uDT;
		p.age += uDT;
	} else { // Respawn particle
		p.pos = sampleUnitSphere() * 25.0 + uCameraPos;
		p.life = rand() * 15.0 + 5.0;
		//p.vel = vec3(rand(), rand(), rand()) * 0.05 - 0.025;
		//p.vel = vec3(0.0);
		p.age = 0.0;
	}

	writeData(p, texelOffset);

	//float val = 0.2;
	//oColor = vec4(vec3(val), 1.0);
	//val = snoise(vec4(gl_FragCoord.xy / 300.0, uCameraPos.z / 10.0, uTime)) * 0.5 + 0.5;
	//val = _perlinNoise4D(vec4(gl_FragCoord.xy / 300.0, uCameraPos.z / 10.0, uTime)) * 0.5 + 0.5;
	//val = improvedNoise4D(vec4(gl_FragCoord.xy / 300.0 - 2.0, uCameraPos.z / 10.0, uTime)) * 0.5 + 0.5;
	//oColor = vec4(getVelocityP(vec3(gl_FragCoord.xy / 50.0, uCameraPos.z / 2.0), uTime), 1.0);
	//oColor = vec4(getVelocityI(vec3(gl_FragCoord.xy / 50.0, uCameraPos.z / 2.0), uTime), 1.0);
	//oColor = vec4(getVelocityS(vec3(gl_FragCoord.xy / 50.0 / 1.4, uCameraPos.z / 2.0 / 1.4), uTime / 2.0), 1.0) * 0.6;
}
