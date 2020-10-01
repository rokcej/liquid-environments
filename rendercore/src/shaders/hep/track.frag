#version 300 es
precision mediump float;
precision highp int;


uniform vec3 cameraPosition;
uniform int selectedTrackVisible;
uniform vec3 track_color;
uniform float track_alpha;
uniform int track_color_type;
uniform float selectedTrackID;
uniform float numTracks;
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
in vec3 vMomentum;
in float vMomentumMagnitude;
in float vTrack_id;


out vec4 color;


void main() {
    float track_dynamic_alpha;


    if(distance(vPosition, cameraPosition) <= 500.0){
        track_dynamic_alpha = track_alpha/2.0;
    }else{
        track_dynamic_alpha = track_alpha;
    }

    if(track_color_type == 0){
        //color = vec4(vMomentum, track_dynamic_alpha); //ORIG
        color = vec4(vMomentum, vMomentumMagnitude*track_dynamic_alpha);
    }else if(track_color_type == 1){
        color = vec4(track_color, track_dynamic_alpha);
    }else if(track_color_type == 2){
        float distance = length(vPosition.xy);

        if(distance >= minMaxBeamPipe[0] && distance <= minMaxBeamPipe[1]){
            color = vec4(colorBeamPipe, track_dynamic_alpha);

        }else if(distance >= minMaxPix[0] && distance <= minMaxPix[1]){
            color = vec4(colorPix, track_dynamic_alpha);

        }else if(distance >= minMaxPST[0] && distance <= minMaxPST[1]){
            color = vec4(colorPST, track_dynamic_alpha);

        }else if(distance >= minMaxSStrip[0] && distance <= minMaxSStrip[1]){
            color = vec4(colorSStrip, track_dynamic_alpha);

        }else if(distance >= minMaxLStrip[0] && distance <= minMaxLStrip[1]){
            color = vec4(colorLStrip, track_dynamic_alpha);

        }else{
            color = vec4(1.0, 1.0, 1.0, track_dynamic_alpha);
        }
    }

    if(selectedTrackVisible == 1)
    if(selectedTrackID != -1.0){
        color = vec4(color.rgb * 0.4, track_dynamic_alpha);
    }
}