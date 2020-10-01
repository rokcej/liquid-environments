import {Line} from "./Line.js";
import {Vector3} from "../math/Vector3.js";
import {BufferAttribute} from "../core/BufferAttribute.js";


export class VertexNormal extends Line {
    constructor(object, isChild = false) {
        super(undefined, object.material, undefined);
        //super(object.geometry.normalRepresentation.array, object.material, undefined);
        this._normalRepresentation = this.buildNormalRepresentation(object.geometry, object, isChild);
        this.geometry.vertices = this._normalRepresentation;
        this.geometry.computeVertexNormals();
        if(isChild) this.scale = new Vector3(1/object.scale.x, 1/object.scale.y, 1/object.scale.z);

        this.type = "VertexNormal";
    }


    //GET SET
    //get drawNormals() { return this._drawNormals; }
    //set drawNormals(drawNormals) { this._drawNormals = drawNormals; }
    get normalRepresentation() {
        if (this._normalRepresentation === null) this.buildNormalRepresentation();
        return this._normalRepresentation;
    }
    set normalRepresentation(normalRepresentation) { this._normalRepresentation = normalRepresentation; }


    //FUNC
    buildNormalRepresentation(geometry, object, isChild){
        let normalRepresentation = null;

        if (geometry.indices !== null && geometry.indices.count() > 0) {
            if (geometry.normals === null) geometry.computeVertexNormals();

            //INDICES
            let indexArray = geometry.indices.array;
            let vertexArray = geometry.vertices.array;
            let normalArray = geometry.normals.array;

            let x, y, z, nx, ny, nz;
            let normalLines = [];


            for (let i = 0; i < indexArray.length; i++) {
                let vertexIndex = indexArray[i];

                x = vertexArray[vertexIndex * 3];
                y = vertexArray[vertexIndex * 3 + 1];
                z = vertexArray[vertexIndex * 3 + 2];
                let vertex = new Vector3(x, y, z);
                if(isChild) vertex.multiplyVectors(vertex, object.scale);

                nx = normalArray[vertexIndex * 3];
                ny = normalArray[vertexIndex * 3 + 1];
                nz = normalArray[vertexIndex * 3 + 2];
                let normal = new Vector3(nx, ny, nz);

                let vertex2 = new Vector3().addVectors(vertex, normal);


                normalLines.push(vertex.x, vertex.y, vertex.z, vertex2.x, vertex2.y, vertex2.z);
            }


            // Create new buffer geometry for the normal representation
            normalRepresentation = new BufferAttribute(new Float32Array(normalLines), 3);
        }else if (geometry.vertices !== null && geometry.vertices.count() > 0) {
            if (geometry.normals === null) geometry.computeVertexNormals();

            //VERTICES
            let vertexArray = geometry.vertices.array;
            let normalArray = geometry.normals.array;

            let x, y, z, nx, ny, nz;
            let normalLines = [];


            for ( let i = 0; i < vertexArray.length; i += 3) {
                x = vertexArray[i];
                y = vertexArray[i + 1];
                z = vertexArray[i + 2];
                let vertex = new Vector3(x, y, z);
                if(isChild) vertex.multiplyVectors(vertex, object.scale);

                nx = normalArray[i];
                ny = normalArray[i + 1];
                nz = normalArray[i + 2];
                let normal = new Vector3(nx, ny, nz);

                let vertex2 = new Vector3().addVectors(vertex, normal);


                normalLines.push(vertex.x, vertex.y, vertex.z, vertex2.x, vertex2.y, vertex2.z);
            }


            // Create new buffer geometry for the normal representation
            normalRepresentation = new BufferAttribute(new Float32Array(normalLines), 3);
        }else{
            console.warn("Can not build normal representation!");
        }


        return normalRepresentation;
    }
}