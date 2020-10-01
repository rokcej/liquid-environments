#version 300 es
precision mediump float;
precision highp int;


uniform int selectedHitVisible;
uniform float selectedHitID;
uniform float selected_hit_size;
uniform float selected_hit_alpha;
uniform vec3 selected_hit_color;
uniform int selected_hit_color_type;

uniform int selectedTrackVisible;
uniform vec3 hit_color;
uniform float hit_alpha;
uniform int hit_color_type;
uniform float selectedTrackID;
uniform vec2 minMaxBeamPipe;
uniform vec2 minMaxPix;
uniform vec2 minMaxPST;
uniform vec2 minMaxSStrip;
uniform vec2 minMaxLStrip;
uniform vec3 colorBeamPipe;
uniform vec3 colorPix;
uniform vec3 colorPST;
uniform vec3 colorSStrip;
uniform vec3 colorLStrip;


in vec3 vPosition;
//in vec3 vMomentum;
in float vHit_id;
in float vHit_particle_id;


out vec4 color;


void main() {
    if(hit_color_type == 0){
        float distance = length(vPosition.xy);

        if(distance >= minMaxBeamPipe[0] && distance <= minMaxBeamPipe[1]){
            color = vec4(colorBeamPipe, hit_alpha);
        }else if(distance >= minMaxPix[0] && distance <= minMaxPix[1]){
            color = vec4(colorPix, hit_alpha);
        }else if(distance >= minMaxPST[0] && distance <= minMaxPST[1]){
            color = vec4(colorPST, hit_alpha);
        }else if(distance >= minMaxSStrip[0] && distance <= minMaxSStrip[1]){
            color = vec4(colorSStrip, hit_alpha);
        }else if(distance >= minMaxLStrip[0] && distance <= minMaxLStrip[1]){
            color = vec4(colorLStrip, hit_alpha);
        }else{
            color = vec4(1.0, 1.0, 1.0, hit_alpha);
        }
    }else if(hit_color_type == 1){
        color = vec4(hit_color, hit_alpha); //color = vec4(0.6, 0.4, 0.6, 0.5);
    }

    if(selectedTrackVisible == 1)
    if(selectedTrackID != -1.0){
        if(vHit_particle_id != selectedTrackID) color = color / 2.0;
    }

    if(selectedHitVisible == 1)
    if(vHit_id == selectedHitID){
        if(selected_hit_color_type == 0){
            float distance = length(vPosition.xy);

            if(distance >= minMaxBeamPipe[0] && distance <= minMaxBeamPipe[1]){
                color = vec4(colorBeamPipe, selected_hit_alpha);
            }else if(distance >= minMaxPix[0] && distance <= minMaxPix[1]){
                color = vec4(colorPix, selected_hit_alpha);
            }else if(distance >= minMaxPST[0] && distance <= minMaxPST[1]){
                color = vec4(colorPST, selected_hit_alpha);
            }else if(distance >= minMaxSStrip[0] && distance <= minMaxSStrip[1]){
                color = vec4(colorSStrip, selected_hit_alpha);
            }else if(distance >= minMaxLStrip[0] && distance <= minMaxLStrip[1]){
                color = vec4(colorLStrip, selected_hit_alpha);
            }else{
                color = vec4(1.0, 1.0, 1.0, selected_hit_alpha);
            }
        }else if(selected_hit_color_type == 1){
            color = vec4(selected_hit_color, selected_hit_alpha);
        }
    }


    //Circle
    vec2 cxy = 2.0 * gl_PointCoord - 1.0;
    float pct = dot(cxy, cxy);
    if (pct > 1.0) {
        //discard; //performance trap
        color = vec4(1.0, 1.0, 1.0, 0.0);
    }else{
        //color = vec4(vec3(color.rgb * (1.0-pct)), color.a - pct);
        color = vec4(vec3(color.rgb), color.a);
    }
}