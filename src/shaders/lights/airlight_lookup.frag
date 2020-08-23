#version 300 es
precision mediump float;

#define NUM_STEPS 10000

in vec2 vUV;

out vec4 oColor;

float f(float u, float v) {
	return exp(-u * tan(v));
}

void main() {
	float u = vUV.x, v = vUV.y;

	// Integrate using composite trapezoidal rule
	// https://en.wikipedia.org/wiki/Numerical_integration#Quadrature_rules_based_on_interpolating_functions
	float dv = v / float(NUM_STEPS); // (b-a) / n
	float first = 0.0; // f(a) (equals 0 in this case)
	float last = f(u, v); // f(b)

	float mid = 0.0; // f(a + k * (b-a) / n) ; 1 <= k <= n-1
	for (int i = 1; i <= NUM_STEPS - 1; ++i) {
		mid += f(u, float(i) * dv);
	}

	float integral = dv * (0.5 * first + mid + 0.5 * last);

	oColor = vec4(vec3(integral), 1.0);
}
