#version 300 es
precision mediump float;
precision highp int;


uniform mat4 MVMat; // Model View Matrix
uniform mat4 PMat;  // Projection Matrix
uniform vec3 cameraPosition;

uniform int selectedTrackVisible;
uniform float selectedTrackID;
uniform float particle_size;


in vec3 VPos;       // Vertex position
in vec3 momentum;
in float momentumMagnitude;
in float nhits;
in float particle_id;


out vec3 vMomentum;
out float vMomentumMagnitude;
out float vParticle_id;


void main() {
	vMomentum = momentum; //vMomentum = normalize(momentum)*0.5 + 0.5;
	vMomentumMagnitude = momentumMagnitude;
	vParticle_id = particle_id;


	//vec4 MVPos = MVMat * vec4(VPos, 1.0);
	gl_Position = PMat * MVMat * vec4(VPos, 1.0);


	//gl_PointSize = particle_size; //ORIG
	gl_PointSize = nhits*particle_size;
	//if(distance(MVPos.xyz, cameraPosition) <= 500.0){
	if(distance(VPos, cameraPosition) <= 4.0){
		//gl_PointSize = gl_PointSize * 500.0/distance(MVPos.xyz, cameraPosition);
		gl_PointSize = gl_PointSize * 4.0/distance(VPos, cameraPosition);
	}


	if(selectedTrackVisible == 1)
	if(particle_id == selectedTrackID) gl_PointSize = gl_PointSize + 16.0;
 }