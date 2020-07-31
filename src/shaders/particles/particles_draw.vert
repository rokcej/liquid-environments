#version 300 es
precision highp float;

uniform mat4 MVMat; // Model View Matrix
uniform mat4 PMat;  // Projection Matrix

in vec3 VPos;       // Vertex position

struct Material {
	#if (TEXTURE)
		#for I_TEX in 0 to NUM_TEX
			sampler2D texture##I_TEX;
		#end
	#fi
};

uniform Material material;

// Output transformed vertex position
out vec3 fragVPos;

uniform float pointSize;

void main() {
    
    // Model view position
    vec3 pos = texture(material.texture0, VPos.xy).xyz;
    vec4 VPos4 = MVMat * vec4(pos, 1.0);

    // Projected position
    gl_Position = PMat * VPos4;
    fragVPos = vec3(VPos4) / VPos4.w;

    float distance = sqrt((fragVPos.x*fragVPos.x)+(fragVPos.y*fragVPos.y)+(fragVPos.z*fragVPos.z));
    if(pointSize < 0.0) gl_PointSize = 1.0;
    else gl_PointSize = pointSize/distance;
    //gl_PointSize = 10.0;

}
