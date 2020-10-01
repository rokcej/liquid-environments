import {CustomShaderMaterial} from './CustomShaderMaterial.js';
import {Color} from "../math/Color.js";
import {Vector3} from '../math/Vector3.js';


export class Text2DMaterial extends CustomShaderMaterial {
    constructor(programName = "text2D", uniforms = {}, attributes = {}){
        super(programName, uniforms, attributes);

        this.type = "Text2DMaterial";
    }
}