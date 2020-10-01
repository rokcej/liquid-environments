/**
 * Created by Sebastien.
 */
import {Quad} from './Quad.js';
import {SpriteBasicMaterial} from "../materials/SpriteBasicMaterial.js";
import {Uint32Attribute, Float32Attribute} from "../RenderCore.js"


export class Sprite extends Quad{
    constructor(geometry, material = new SpriteBasicMaterial()){
        super(null, null, material, geometry);
        //multiply geometry
        this.geometry = this._multiplyGeometry(this.geometry);
        this.material.setAttribute("deltaDirection", this._generateNormals(this.geometry));
        this.material.setUniform("aspect", window.innerWidth/window.innerHeight);
        //material.setUniform("spriteSize", [1.0, 1.0, 1.0]);


        this.type = "Sprite";


        //OUTLINE
        this.outline.material = new SpriteBasicMaterial();
        this.outline.scale.setScalar(1.1);
    }

    _multiplyGeometry(geometry){
        /*if(geometry.indices){
            const indices = [];

            for(let i = 0; i < geometry.indices.array.length; i += geometry.indices.itemSize){
                for(let j = 0; j < 4; j++){
                    for(let k = 0; k < geometry.indices.itemSize; k++){
                        indices.push(geometry.indices.array[i+k]);
                    }
                }
            }

            geometry.indices = new Uint32Attribute(indices, geometry.indices.itemSize);
        }*/
        const indices = [];

        for(let i = 0, j = 0; i < geometry.vertices.array.length; i += geometry.vertices.itemSize, j++){
            indices.push(i+j, i+1+j, i+2+j, i+2+j, i+1+j, i+3+j);
        }

        geometry.indices = new Uint32Attribute(indices, 1);


        if(geometry.vertices){
            const vertices = [];

            for(let i = 0; i < geometry.vertices.array.length; i += geometry.vertices.itemSize){
                for(let j = 0; j < 4; j++){
                    for(let k = 0; k < geometry.vertices.itemSize; k++){
                        vertices.push(geometry.vertices.array[i+k]);
                    }
                }
            }

            geometry.vertices = new Float32Attribute(vertices, geometry.vertices.itemSize);
        }


        if(geometry.normals){
            const normals = [];

            for(let i = 0; i < geometry.normals.array.length; i += geometry.normals.itemSize){
                for(let j = 0; j < 4; j++){
                    for(let k = 0; k < geometry.normals.itemSize; k++){
                        normals.push(geometry.normals.array[i+k]);
                    }
                }
            }

            geometry.normals = new Float32Attribute(normals, geometry.normals.itemSize);
        }


        if(geometry.uv){
            const uv = [];

            for(let i = 0; i < geometry.uv.array.length; i += geometry.uv.itemSize){
                for(let j = 0; j < 4; j++){
                    for(let k = 0; k < geometry.uv.itemSize; k++){
                        uv.push(geometry.uv.array[i+k]);
                    }
                }
            }

            geometry.uv = new Float32Attribute(uv, geometry.uv.itemSize);
        }


        if(geometry.vertColor){
            const vertColor = [];

            for(let i = 0; i < geometry.vertColor.array.length; i += geometry.vertColor.itemSize){
                for(let j = 0; j < 4; j++){
                    for(let k = 0; k < geometry.vertColor.itemSize; k++){
                        vertColor.push(geometry.vertColor.array[i+k]);
                    }
                }
            }

            geometry.vertColor = new Float32Attribute(vertColor, geometry.vertColor.itemSize);
        }


        return geometry;
    }

    _generateNormals(geometry){
        const normalDirection = [];
    
        for(let i = 0; i < geometry.vertices.array.length/geometry.vertices.itemSize; i += 4){
            normalDirection.push(-1, +1);
            normalDirection.push(-1, -1);
            normalDirection.push(+1, +1);
            normalDirection.push(+1, -1);
        }


        return new Float32Attribute(normalDirection, 2);
    }
}