#version 300 es
precision mediump float;
precision highp int;


uniform mat4 MVMat; // Model View Matrix
uniform mat4 PMat;  // Projection Matrix


in vec3 VPos;       // Vertex position
in vec3 momentum;
in float momentumMagnitude;
in float nhits;
in float track_id;


out vec3 vPosition;
out vec3 vMomentum;
out float vMomentumMagnitude;
out float vTrack_id;


void main() {
	vPosition = VPos;
    vMomentum = momentum;    //vMomentum = normalize(momentum)*0.5 + 0.5;
    vMomentumMagnitude = momentumMagnitude;
    vTrack_id = track_id;


    gl_Position = PMat * MVMat * vec4(VPos, 1.0);
    // ORIG (no size parameter)
    //gl_LineWidth = nhits*10.0;
}