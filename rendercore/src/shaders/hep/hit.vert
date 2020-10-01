#version 300 es
precision mediump float;
precision highp int;


uniform mat4 MVMat; // Model View Matrix
uniform mat4 PMat;  // Projection Matrix
uniform vec3 cameraPosition; //

uniform int selectedHitVisible;
uniform float selectedHitID;
uniform float selected_hit_size;
uniform float selected_hit_alpha;

uniform int selectedTrackVisible;
uniform float hit_size;
uniform float selectedTrackID;



in vec3 VPos;       // Vertex position
//in vec3 momentum;
in float hit_id;
in float hit_particle_id;


out vec3 vPosition;
//out vec3 vMomentum;
out float vHit_id;
out float vHit_particle_id;


void main() {
	vPosition = VPos;
    //vMomentum = normalize(momentum)*0.5 + 0.5;
    vHit_id = hit_id;
    vHit_particle_id = hit_particle_id;


    //vec4 MVPos = MVMat * vec4(VPos, 1.0);
    gl_Position = PMat * MVMat * vec4(VPos, 1.0);


    gl_PointSize = hit_size;
    if(distance(VPos, cameraPosition) <= 500.0){
        gl_PointSize = gl_PointSize * 500.0/distance(VPos, cameraPosition); //near clipping plane poreze zelo bliznje   /// + ali *
    }


    if(selectedTrackVisible == 1)
    if(hit_particle_id == selectedTrackID) gl_PointSize = gl_PointSize + 16.0;

    if(selectedHitVisible == 1)
    if(hit_id == selectedHitID) gl_PointSize = gl_PointSize + selected_hit_size;
}