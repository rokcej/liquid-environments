import {Mesh} from "./Mesh.js";
import {Geometry} from "./Geometry.js";
import {Float32Attribute} from "../core/BufferAttribute.js";
import {Vector2} from "../math/Vector2.js";
import {Vector3} from "../math/Vector3.js";
import { Text2DMaterial } from "../materials/Text2DMaterial.js";
import {ImageLoader} from "../loaders/ImageLoader.js";
import {Texture} from "../textures/Texture.js";


//Text2D API
export class Text2D extends Mesh{
    constructor(string, fontTexture, xPos = 0, yPos = 0, fontSize = 32){
        super();
        this.type = "Text2D";
        this.frustumCulled = false;
        this.remove(this.outline);

        
        this._string = string;
        //this._fontTexture = this.initializeText2D(fontTexturePath);
        this._fontTexture = fontTexture;
        //this._scene = scene;
        this._xPos = xPos;
        this._yPos = yPos;
        this._fontSize = fontSize;
        

        this.geometry = this.setText2D(string, xPos, yPos, fontSize);
        this.material = new Text2DMaterial();
        this.material.addMap(this._fontTexture);
    }


    set string(string){
        this._string = string;
        this.geometry = this.setText2D(this._string, this._xPos, this._yPos, this._fontSize);
    }
    get string(){
        return this._string;
    }
    set fontTexture(fontTexture){
        this._fontTexture = fontTexture;
        this.material.clearMaps();
        this.material.addMap(this._fontTexture);
    }
    get fontTexture(){
        return this._fontTexture;
    }
    set xPos(xPos){
        this._xPos = xPos;
    }
    get xPos(){
        return this._xPos;
    }
    set yPos(yPos){
        this._yPos = yPos;
    }
    get yPos(){
        return this._yPos;
    }
    set fontSize(fntSize){
        this._fontSize = this.fontSize;
    }
    get fontSize(){
        return this._fontSize;
    }


    /*initializeText2D(imagePath){
        const this_pointer = this;
        const imgLoader = new ImageLoader();

        imgLoader.load(imagePath, function (image) {

            const texture = new Texture(
                image, 
                Texture.ClampToEdgeWrapping, 
                Texture.ClampToEdgeWrapping,
                Texture.LinearFilter, 
                Texture.LinearFilter,
                Texture.RGBA, 
                Texture.RGBA, 
                Texture.UNSIGNED_BYTE
                );


                this_pointer._fontTexture = texture;
                this_pointer.material.addMap(texture);
                this_pointer._scene.add(this_pointer);
        });
    }*/

    setText2D(text, x, y, fontSize){
        const vertices_positions = new Array();
        const vertices_uvs = new Array();


        //FOR EVERY CHARACTER OF THE TEXT STRING
        for(let c = 0; c < text.length; c++){

            //POSITIONs
            const position_up_left = new Vector2(x + c*fontSize, y + fontSize);
            const position_up_right = new Vector2(x + c*fontSize + fontSize, y + fontSize);
            const position_down_left = new Vector2(x + c*fontSize, y);
            const position_down_right = new Vector2(x + c*fontSize + fontSize, y);

            vertices_positions.push(position_up_left.x, position_up_left.y);
            vertices_positions.push(position_down_left.x, position_down_left.y);
            vertices_positions.push(position_up_right.x, position_up_right.y);
            vertices_positions.push(position_up_right.x, position_up_right.y);
            vertices_positions.push(position_down_left.x, position_down_left.y);
            vertices_positions.push(position_down_right.x, position_down_right.y);


            //UVs
            const character = text.charAt(c);
            const uv_x = (character.charCodeAt() % 16) / 16.0;
            const uv_y = (Math.floor(character.charCodeAt() / 16)) / 16.0;
            const uv_step = 1.0/16.0;

            const uv_up_left = new Vector2(uv_x, 1.0 - uv_y);
            const uv_up_right = new Vector2(uv_x + uv_step, 1.0 - uv_y);
            const uv_down_left = new Vector2(uv_x, 1.0 - (uv_y + uv_step));
            const uv_down_right = new Vector2(uv_x + uv_step, 1.0 - (uv_y + uv_step));
            
            vertices_uvs.push(uv_up_left.x, uv_up_left.y);
            vertices_uvs.push(uv_down_left.x, uv_down_left.y);
            vertices_uvs.push(uv_up_right.x, uv_up_right.y);
            vertices_uvs.push(uv_up_right.x, uv_up_right.y);
            vertices_uvs.push(uv_down_left.x, uv_down_left.y);
            vertices_uvs.push(uv_down_right.x, uv_down_right.y);
        }


        const geometry = new Geometry();
        geometry.vertices = new Float32Attribute(vertices_positions, 2);
        geometry.uv = new Float32Attribute(vertices_uvs, 2);


        return geometry;
    }

}
