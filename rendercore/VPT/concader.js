/*#!/usr/bin/env node

var source = '';
var programs = {};
var mixins = {};

// Read shaders from stdin
process.stdin.setEncoding('utf8');
process.stdin.on('data', function(chunk) {
    source += chunk;
});


// Process input
var fromIndex = 0;
process.stdin.on('end', function() {
    //process.stdout.write(data);
    var regex = /%%(\w+)(?:(:(\w+))?)/;
    split = source.split(regex);
    for (var i = 1; i < split.length - 3; i += 4) {
        var mainName = split[i];
        var subName = split[i + 2];
        var programSource = split[i + 3].trim();
        var isMixin = !subName;
        if (isMixin) {
            mixins[mainName] = programSource;
        } else {
            if (!programs[mainName]) {
                programs[mainName] = {};
            }
            programs[mainName][subName] = programSource;
        }
    }
    process.stdout.write('var SHADERS = ');
    process.stdout.write(JSON.stringify(programs));
    process.stdout.write(';\nvar MIXINS = ');
    process.stdout.write(JSON.stringify(mixins));
    process.stdout.write(';\n');
});*/


/**
 *
 */
var source = '';
var programs = {};
var mixins = {};
var SHADERS, MIXINS;
let VPTProgramsLoaded = false;

let VPTSMLoadingManager = new M3D.LoadingManager(
    function(){
        console.log("VPT load complete.");

        var regex = /%%(\w+)(?:(:(\w+))?)/;
        split = source.split(regex);
        for (var i = 1; i < split.length - 3; i += 4) {
            var mainName = split[i];
            var subName = split[i + 2];
            var programSource = split[i + 3].trim();
            var isMixin = !subName;
            if (isMixin) {
                mixins[mainName] = programSource;
            } else {
                if (!programs[mainName]) {
                    programs[mainName] = {};
                }
                programs[mainName][subName] = programSource;
            }
        }


        //SHADERS = JSON.stringify(programs);
        //MIXINS = JSON.stringify(mixins);
        SHADERS = programs;
        MIXINS = mixins;
        //console.log(SHADERS);
        VPTProgramsLoaded = true;
    },
    function(){
    },
    function(){
        console.log("VPT load error.");
    }
);

let read = new M3D.XHRLoader(VPTSMLoadingManager, "text");
read.load(
    "VPT/vpt-master/app/glsl/mixins/unproject.glsl",
    function (data) {
        console.log("VPT unproject.glsl load complete.");

        source += data;
    },
    function (xhr){
        console.log("VPT unproject.glsl " + (xhr.loaded / xhr.total * 100) + "% loaded.");
    },
    function (err){
        console.error("VPT unproject.glsl load error.");
    }
);
read.load(
    "VPT/vpt-master/app/glsl/mixins/intersectCube.glsl",
    function (data) {
        console.log("VPT intersectCube.glsl load complete.");

        source += data;
    },
    function (xhr){
        console.log("VPT intersectCube.glsl " + (xhr.loaded / xhr.total * 100) + "% loaded.");
    },
    function (err){
        console.error("VPT intersectCube.glsl load error.");
    }
);

//REND
read.load(
    "VPT/vpt-master/app/glsl/quad.glsl",
    function (data) {
        console.log("VPT quad.glsl load complete.");

        source += data;
    },
    function (xhr){
        console.log("VPT quad.glsl " + (xhr.loaded / xhr.total * 100) + "% loaded.");
    },
    function (err){
        console.error("VPT quad.glsl load error.");
    }
);
read.load(
    "VPT/vpt-master/app/glsl/renderers/EAMRenderer.glsl",
    function (data) {
        console.log("VPT EAMRenderer.glsl load complete.");

        source += data;
    },
    function (xhr){
        console.log("VPT EAMRenderer.glsl " + (xhr.loaded / xhr.total * 100) + "% loaded.");
    },
    function (err){
        console.error("VPT EAMRenderer.glsl load error.");
    }
);
read.load(
    "VPT/vpt-master/app/glsl/renderers/ISORenderer.glsl",
    function (data) {
        console.log("VPT ISORenderer.glsl load complete.");

        source += data;
    },
    function (xhr){
        console.log("VPT ISORenderer.glsl " + (xhr.loaded / xhr.total * 100) + "% loaded.");
    },
    function (err){
        console.error("VPT ISORenderer.glsl load error.");
    }
);
read.load(
    "VPT/vpt-master/app/glsl/renderers/MCSRenderer.glsl",
    function (data) {
        console.log("VPT MCSRenderer.glsl load complete.");

        source += data;
    },
    function (xhr){
        console.log("VPT MCSRenderer.glsl " + (xhr.loaded / xhr.total * 100) + "% loaded.");
    },
    function (err){
        console.error("VPT MCSRenderer.glsl load error.");
    }
);
read.load(
    "VPT/vpt-master/app/glsl/renderers/MIPRenderer.glsl",
    function (data) {
        console.log("VPT MIPRenderer.glsl load complete.");

        source += data;
    },
    function (xhr){
        console.log("VPT MIPRenderer.glsl " + (xhr.loaded / xhr.total * 100) + "% loaded.");
    },
    function (err){
        console.error("VPT MIPRenderer.glsl load error.");
    }
);

read.load(
    "VPT/vpt-master/app/glsl/mixins/XYZITU2002.glsl",
    function (data) {
        console.log("VPT XYZITU2002.glsl load complete.");

        source += data;
    },
    function (xhr){
        console.log("VPT XYZITU2002.glsl " + (xhr.loaded / xhr.total * 100) + "% loaded.");
    },
    function (err){
        console.error("VPT XYZITU2002.glsl load error.");
    }
);

//TONE
read.load(
    "VPT/vpt-master/app/glsl/tonemappers/RangeToneMapper.glsl",
    function (data) {
        console.log("VPT RangeToneMapper.glsl load complete.");

        source += data;
    },
    function (xhr){
        console.log("VPT RangeToneMapper.glsl " + (xhr.loaded / xhr.total * 100) + "% loaded.");
    },
    function (err){
        console.error("VPT RangeToneMapper.glsl load error.");
    }
);
read.load(
    "VPT/vpt-master/app/glsl/tonemappers/ReinhardToneMapper.glsl",
    function (data) {
        console.log("VPT ReinhardToneMapper.glsl load complete.");

        source += data;
    },
    function (xhr){
        console.log("VPT ReinhardToneMapper.glsl " + (xhr.loaded / xhr.total * 100) + "% loaded.");
    },
    function (err){
        console.error("VPT ReinhardToneMapper.glsl load error.");
    }
);


let VPT = {};
VPT.programs = [
    "VPT/vpt-master/app/glsl/mixins/rand.glsl",
    "VPT/vpt-master/app/glsl/mixins/unprojectRand.glsl",
    "VPT/vpt-master/app/glsl/renderers/MultipleScatteringRenderer.glsl"
];

for(let i = 0; i < VPT.programs.length; i++){
    let program = VPT.programs[i];
    let programName = program.substring(program.lastIndexOf('/')+1);

    read.load(
        program,
        function (data) {
            console.log("VPT " + programName + " load complete.");

            source += data;
        },
        function (xhr){
            console.log("VPT " + programName + " " + (xhr.loaded / xhr.total * 100) + "% loaded.");
        },
        function (err){
            console.error("VPT " + programName + " load error.");
        }
    );
}