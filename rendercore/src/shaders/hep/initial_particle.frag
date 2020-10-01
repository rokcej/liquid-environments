#version 300 es
precision mediump float;
precision highp int;


uniform int selectedTrackVisible;
uniform int particle_color_type;
uniform float selectedTrackID;
uniform vec3 particle_color;
uniform float particle_alpha;


in vec3 vMomentum;
in float vMomentumMagnitude;
in float vParticle_id;


out vec4 color;


void main() {
    if(particle_color_type == 0){
        //color = vec4(vMomentum, particle_alpha); //ORIG
        color = vec4(vMomentum, vMomentumMagnitude*particle_alpha);
    }else if(particle_color_type == 1){
        color = vec4(particle_color, particle_alpha);
    }


    if(selectedTrackVisible == 1)
    if(selectedTrackID != -1.0){
        if(vParticle_id != selectedTrackID) color = color / 2.0;
    }


    vec2 cxy = 2.0 * gl_PointCoord - 1.0;
    float pct = dot(cxy, cxy);
    if (pct > 1.0) {
        //discard; //performance trap
        color = vec4(1.0, 1.0, 1.0, 0.0);
    }else{
        //color = vec4(vec3(color.rgb * (1.0-pct)), color.a - pct);
        color = vec4(vec3(color.rgb), color.a - pct);
    }
}