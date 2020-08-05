#version 300 es
precision mediump float;

in vec4 vColor;
in float vProjSize;

out vec4 color;

void main() {
    float val = max(0.0, 1.0 - 2.0 * length(gl_PointCoord - vec2(0.5)));
    if (vProjSize < 1.0) val = 1.0;

    // if (length(gl_PointCoord * 2.0 - vec2(1.0)) > 1.0)
    //     discard;

    color = vColor;
    color.a *= val;
}
