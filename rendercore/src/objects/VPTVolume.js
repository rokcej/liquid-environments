/**
 * Created by Jan on 29.12.2018
 * Holds information and volume render buffers
 */

import {FRONT_AND_BACK_SIDE} from '../constants.js';
import {Float32Attribute, Uint32Attribute} from '../core/BufferAttribute.js';
import {Mesh} from '../objects/Mesh.js';
import {Geometry} from '../objects/Geometry.js';
import {CustomShaderMaterial} from '../materials/CustomShaderMaterial.js';
import {Texture} from '../textures/Texture.js';
import {Color} from '../math/Color.js';

export class VPTVolume extends Mesh {
	constructor(data, meta) {
		//super();//js dodal
		//this._meshBlendRatio = 0; //js


		var material = new CustomShaderMaterial("volumeProject");
		material.lights = false;
		material.transparent = false;   //TODO: maybe issue with multiple objects?
		material.color = new Color("#49b2b2").toArray();
		material.specular = new Color("#444444").toArray();
		material.shininess = 8;

		material.setUniform("meshBlendRatio", 0.0);
		material.setUniform("material.diffuse", material.color);
		material.setUniform("material.specular", material.specular);
		material.setUniform("material.shininess", material.shininess);


		//js dodal
		material.setUniform("meshLight", true);
		material.side = FRONT_AND_BACK_SIDE;


		var textur = new Texture();
		textur._dirty = false;
		textur._glTex = null;
		material.addMap(textur);  //Can't set tex later, or template gets set wrong


		//Geometry setup - Base geometry, replaced by Marching cubes asynchronously (todo)
		var geometry = new Geometry();

		// Quad vertices
		geometry.vertices = Float32Attribute([
			// Front face
			-0.5, -0.5, 0.5,
			0.5, -0.5, 0.5,
			0.5, 0.5, 0.5,
			-0.5, 0.5, 0.5,

			// Back face
			-0.5, -0.5, -0.5,
			-0.5, 0.5, -0.5,
			0.5, 0.5, -0.5,
			0.5, -0.5, -0.5,

			// Top face
			-0.5, 0.5, -0.5,
			-0.5, 0.5, 0.5,
			0.5, 0.5, 0.5,
			0.5, 0.5, -0.5,

			// Bottom face
			-0.5, -0.5, -0.5,
			0.5, -0.5, -0.5,
			0.5, -0.5, 0.5,
			-0.5, -0.5, 0.5,

			// Right face
			0.5, -0.5, -0.5,
			0.5, 0.5, -0.5,
			0.5, 0.5, 0.5,
			0.5, -0.5, 0.5,

			// Left face
			-0.5, -0.5, -0.5,
			-0.5, -0.5, 0.5,
			-0.5, 0.5, 0.5,
			-0.5, 0.5, -0.5
		], 3);


		geometry.indices = Uint32Attribute([
			0, 1, 2, 0, 2, 3,    // Front face
			4, 5, 6, 4, 6, 7,    // Back face
			8, 9, 10, 8, 10, 11,  // Top face
			12, 13, 14, 12, 14, 15, // Bottom face
			16, 17, 18, 16, 18, 19, // Right face
			20, 21, 22, 20, 22, 23  // Left face
		], 1);

		geometry.computeVertexNormals();

		super(geometry, material);


		this._meshBlendRatio = 0; //js
		this._meshLightning = true; //js


		//  ==== VPT specific data ==== //
		this.type = "VPTVolume";
		this._meta = meta;
		this._width = this._meta.dimensions[0];
		this._height = this._meta.dimensions[1];
		this._depth = this._meta.dimensions[2];
		this._bitdepth = this._meta.bitSize;
		this._rawData = data;   //Used for marching cubes data cloning
		if (this._bitdepth === 8) {
			this._data = new Float32Array(new Uint8Array(data)).map(function (x) { return x / (1 << 8); });
		} else if (this._bitdepth === 16) {
			this._data = new Float32Array(new Uint16Array(data)).map(function (x) { return x / (1 << 16); });
		}else{
			console.error("Unknown bit depth: " + this._bitdepth + "!");
		}

		this._lastMVPMatrix = null;

		//Buffers for each volume object;
		this._frameBuffer = null;
		this._accumulationBuffer = null;
		this._renderBuffer = null;
		this._outputBuffer = null;
		this._volumeTexture = null;
		this._environmentTexture = null;

		//When using new renderer type, accumulationBuffer should be reset.
		this._lastRendererTypeID = 0;



		// ==== General render data ==== //
		this._vptMaterial = material;
		this._cubeGeometry = geometry;
		this._mccGeometry = null;
	}


	//========== Setters and Getters ==============//

	get data() { return this._data; }
	get rawDataCopy() { return this._rawData.slice(); }
	get meta() { return this._meta; }
	get dimensions() { return this._meta.dimensions; }
	set data(newD) { this._data = newD; }
	set meta(newM) { this._meta = newM; }
	get width() { return this._width; }
	get height() { return this._height; }
	get depth() { return this._depth; }
	get bitdepth() { return this._bitdepth; }
	get lastRenderTypeID() { return this._lastRendererTypeID; }
	set lastRenderTypeID(id) { this._lastRendererTypeID = id; }
	get frameBuffer() { return this._frameBuffer; }
	get accumulationBuffer() { return this._accumulationBuffer; }
	get renderBuffer() { return this._renderBuffer; }
	get volumeTexture() { return this._volumeTexture; }

	getTexture() { return this._volumeTexture; } //JS

	get environmentTexture() { return this._environmentTexture; }
	get lastMVPMatrix() { return this._lastMVPMatrix; }
	set lastMVPMatrix(newP) { this._lastMVPMatrix = newP; }


	// ========== ============ //

	/**
	 *Extended clear to gc buffers
	 */
	clear() {
		super.clear();
		this._frameBuffer.destroy();
		this._accumulationBuffer.destroy();
		this._renderBuffer.destroy();
		this._outputBuffer.destroy();
	}

	/** Switches render modes */
	switchRenderModes(useMCCgeo) {
		this._geometry = (useMCCgeo && this._mccGeometry) ? this._mccGeometry : this._cubeGeometry;
	}


	toJson() {
		var obj = super.toJson();

		// Add reference to geometry and material
		obj.vData = Array.from(this._rawData);
		obj.vMeta = this.meta;

		return obj;
	}

	static fromJson(data, object) {
		// Create mesh object
		if (!object) {
			var object = new VPTVolume(data.vData, data.vMeta);
		}

		// Import Object3D parameters
		object = super.fromJson(data, null, null, object);

		return object;
	}

	streamExportGeometry(writer, onProgressCallback, onLoad) {
		this._mccGeometry.streamExportOBJ(writer, onProgressCallback, onLoad);  //TODO: change to only MCC geometry later.
	}
	
};