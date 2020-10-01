/**
 * Created by Primoz on 3.4.2016.
 */

import {FRONT_SIDE, BACK_SIDE, FRONT_AND_BACK_SIDE, FUNC_LEQUAL, FlatShading, SmoothShading} from '../constants.js';

import {_Math} from '../math/Math.js';

export class Material {

	constructor() {

		if (new.target === Material) {
			throw new TypeError("Cannot construct abstract Material class.");
		}

		this._uuid = _Math.generateUUID();
		this.type = "Material";

		this._onChangeListener = null;

		this._name = '';

		// Defines which of the face sides will be rendered - front, back or both
		this._side = FRONT_SIDE;

		this._depthFunc = FUNC_LEQUAL;
		this._depthTest = true;
		this._depthWrite = true;

		// Is transparent
		this._transparent = false;

		// 0.0f fully transparent 1.0f if fully opaque
		this._opacity = 1;

		// Should use vertex colors
		this._useVertexColors = false;

		// Shader program template
		this._requiredProgramTemplate = null;

		/**
		 * Added by Sebastien
		 */
		// Using points
		this._usePoints = false;
        this._pointSize = 1.0;
		this._drawCircles = false;
		// Using clipping planes
		this._useClippingPlanes = false;
		this._clippingPlanes = null;
		this._programName = "base";
		this._shadingType = SmoothShading;
		// Is affected by lights
		this._lights = true;
		// Textures
		this._maps = [];
		// Program specification
		this._flags = [];
		this._values = {};
		// INSTANCING
		this._instanced = false;
	}


	set onChangeListener(listener) { this._onChangeListener = listener; }
	set name(val) {
		if (val !== this._name) {
			this._name = val;

			// Notify onChange subscriber
			if (this._onChangeListener) {
				var update = {uuid: this._uuid, changes: {name: this._name}};
				this._onChangeListener.materialUpdate(update)
			}
		}
	}

	set side(val) {
		if (val !== this._side) {
			this._side = val;

			// Notify onChange subscriber
			if (this._onChangeListener) {
				var update = {uuid: this._uuid, changes: {side: this._side}};
				this._onChangeListener.materialUpdate(update)
			}
		}
	}

	set depthFunc(val) {
		if (val !== this._depthFunc) {
			this._depthFunc = val;

			// Notify onChange subscriber
			if (this._onChangeListener) {
				var update = {uuid: this._uuid, changes: {depthFunc: this._depthFunc}};
				this._onChangeListener.materialUpdate(update)
			}
		}
	}

	set depthTest(val) {
		if (val !== this._depthTest) {
			this._depthTest = val;

			// Notify onChange subscriber
			if (this._onChangeListener) {
				var update = {uuid: this._uuid, changes: {depthTest: this._depthTest}};
				this._onChangeListener.materialUpdate(update)
			}
		}
	}

	set depthWrite(val) {
		if (val !== this._depthWrite) {
			this._depthWrite = val;

			// Notify onChange subscriber
			if (this._onChangeListener) {
				var update = {uuid: this._uuid, changes: {depthWrite: this._depthWrite}};
				this._onChangeListener.materialUpdate(update)
			}
		}
	}

	set transparent(val) {
		if (val !== this._transparent) {
			this._transparent = val;

			// Notify onChange subscriber
			if (this._onChangeListener) {
				var update = {uuid: this._uuid, changes: {transparent: this._transparent}};
				this._onChangeListener.materialUpdate(update)
			}
		}
	}

	set opacity(val) {
		if (val !== this._opacity) {
			this._opacity = val;

			// Notify onChange subscriber
			if (this._onChangeListener) {
				var update = {uuid: this._uuid, changes: {opacity: this._opacity}};
				this._onChangeListener.materialUpdate(update)
			}
		}
	}

	set useVertexColors(val) {
		if (val !== this._useVertexColors) {
			// Invalidate required program template
			this._requiredProgramTemplate = null;

			this._useVertexColors = val;

			// Notify onChange subscriber
			if (this._onChangeListener) {
				var update = {uuid: this._uuid, changes: {useVertexColors: this._useVertexColors}};
				this._onChangeListener.materialUpdate(update)
			}
		}
	}

	/**
	 * Added by Sebastien
	 */
	set usePoints(val){
		if (val !== this._usePoints) {
			// Invalidate required program template
			this._requiredProgramTemplate = null;

			this._usePoints = val;

			// Notify onChange subscriber
			if (this._onChangeListener) {
				var update = {uuid: this._uuid, changes: {usePoints: this._usePoints}};
				this._onChangeListener.materialUpdate(update)
			}
		}
	}
    set pointSize(val){
        if (val !== this._pointSize) {
            // Invalidate required program template
            this._requiredProgramTemplate = null;

            this._pointSize = val;

            // Notify onChange subscriber
            if (this._onChangeListener) {
                var update = {uuid: this._uuid, changes: {pointSize: this._pointSize}};
                this._onChangeListener.materialUpdate(update)
            }
        }
    }
	set useClippingPlanes(val){
		if (val !== this._useClippingPlanes) {
			// Invalidate required program template
			this._requiredProgramTemplate = null;

			this._useClippingPlanes = val;

			// Notify onChange subscriber
			if (this._onChangeListener) {
				var update = {uuid: this._uuid, changes: {useClippingPlanes: this._useClippingPlanes}};
				this._onChangeListener.materialUpdate(update)
			}
		}
	}
	set clippingPlanes(val){
		if (val !== this._clippingPlanes) {
			// Invalidate required program template
			this._requiredProgramTemplate = null;

			this._clippingPlanes = val;

			// Notify onChange subscriber
			if (this._onChangeListener) {
				var update = {uuid: this._uuid, changes: {clippingPlanes: this._clippingPlanes}};
				this._onChangeListener.materialUpdate(update)
			}
		}
	}
	set shadingType(val){
		if (val !== this._shadingType) {
			// Invalidate required program template
			this._requiredProgramTemplate = null;

			this._shadingType = val;
			//this.programName = this.programName;

			// Notify onChange subscriber
			if (this._onChangeListener) {
				var update = {uuid: this._uuid, changes: {shadingType: this._shadingType}};
				this._onChangeListener.materialUpdate(update)
			}
		}
	}
	set instanced(val){
		if (val !== this._instanced) {
			// Invalidate required program template
			this._requiredProgramTemplate = null;

			this._instanced = val;
			//this.programName = this.programName;

			// Notify onChange subscriber
			if (this._onChangeListener) {
				var update = {uuid: this._uuid, changes: {instanced: this._instanced}};
				this._onChangeListener.materialUpdate(update)
			}
		}
	}
	/**
	 * Set if material is affected by lights.
	 *
	 * @param val True if material is affected by lights.
	 */
	set lights(val) {
		if (this._lights !== val) {
			// Invalidate required program template
			this._requiredProgramTemplate = null;

			this._lights = val;

			// Notify onChange subscriber
			if (this._onChangeListener) {
				var update = {uuid: this._uuid, changes: {lights: this._lights}};
				this._onChangeListener.materialUpdate(update)
			}
		}
	}
	set programName(programName){
		this._programName = programName;
	}

	get name() { return this._name; }
	get side() { return this._side; }
	get depthFunc() { return this._depthFunc; }
	get depthTest() { return this._depthTest; }
	get depthWrite() { return this._depthWrite; }
	get transparent() { return this._transparent; }
	get opacity() { return this._opacity; }
	get useVertexColors() { return this._useVertexColors; }
	/**
	 * Added by Sebastien
	 */
	get usePoints() {return this._usePoints;}
	get pointSize() {return this._pointSize;}
	get drawCircles(){ return this._drawCircles; }
	set drawCircles(val){
		if (val !== this._drawCircles) {
			// Invalidate required program template
			this._requiredProgramTemplate = null;

			this._drawCircles = val;

			// Notify onChange subscriber
			if (this._onChangeListener) {
				var update = {uuid: this._uuid, changes: {drawCircles: this._drawCircles}};
				this._onChangeListener.materialUpdate(update)
			}
		}
	}
	get useClippingPlanes() {return this._useClippingPlanes;}
	get clippingPlanes() {return this._clippingPlanes;}
	get shadingType() {return this._shadingType;}
	get instanced() {return this._instanced;}
	/**
	 * Check if material is affected by lights.
	 *
	 * @returns True if material is affected by lights.
	 */
	get lights() { return this._lights; }
	/**
	 * Get UV maps of the material.
	 *
	 * @returns Array of UV maps.
	 */
	get maps() { return this._maps; }
	get programName(){ return this._programName; }
	get programName2() {
		switch (this.shadingType) {
			case FlatShading: return this.programName + '-' + "FLAT";
			case SmoothShading: return this.programName;
			default: return this.programName;
		}
	}
	get values(){
		return this._values;
	}
	set values(values){
		this._values = values;
	}
	get flags(){
		return this._flags;
	}
	set flags(flags){
		this._flags = flags;
	}


	// region MAP MANAGEMENT
	/**
	 * Add a UV map to the maps array.
	 *
	 * @param map Map to be added.
	 */
	addMap(map) {
		// Invalidate required program template
		this._requiredProgramTemplate = null;

		this._maps.push(map)
	}

	/**
	 * Remove a map from the maps array.
	 *
	 * @param map Map to be removed.
	 */
	removeMap(map) {
		let index = this._maps.indexOf(map);

		if (index > -1) {
			// Invalidate required program template
			this._requiredProgramTemplate = null;

			this._maps.splice(index, 1);
		}
	}

	/**
	 * Clear all maps from the maps array.
	 */
	clearMaps() {
		// Invalidate required program template
		this._requiredProgramTemplate = null;

		this._maps = [];
	}
	// endregion


	resetProgramFlagsAndValues(){
		//Added by Sebastien
		this._flags = [];
		this._values = {};


		// Add lights and map related values and flags
		if (this._lights) {
			this._flags.push("LIGHTS");
		}

		if (this._useVertexColors) {
			/**
			 * Changed by Sebastien
			 * Changed "flags.push("VERTEX_COLORS");" to "flags.push("COLORS");"
			 */
			this._flags.push("COLORS");
		}

		if (this._maps.length > 0) {
			this._flags.push("TEXTURE");
			// Specify number of used textures
			this._values["NUM_TEX"] = this._maps.length;
		}

		/**
		 * Added by Sebastien
		 */
		if(this._side === FRONT_SIDE){
			this._flags.push("FRONT_SIDE");
		}else if(this._side === BACK_SIDE){
			this._flags.push("BACK_SIDE");
		}else if(this._side === FRONT_AND_BACK_SIDE){
			this._flags.push("FRONT_AND_BACK_SIDE");
		}
		if(this._usePoints) this._flags.push("POINTS");
		if(this._drawCircles) this.flags.push("CIRCLES");
		if(this._useClippingPlanes){
			this._flags.push("CLIPPING_PLANES");
			this._values["NUM_CLIPPING_PLANES"] = this._clippingPlanes.length;
		}
		if(this._shadingType === SmoothShading){
			this._flags.push("SMOOTH_SHADING");
		}else {
			this._flags.push("FLAT_SHADING");
		}
		if(this._transparent === true) this._flags.push("TRANSPARENT");
		if(this._instanced === true) this._flags.push("INSTANCED");
	}

	toJson() {
		var obj = {};

		// Meta
		obj._uuid = this._uuid;
		obj.type = this.type;
		obj.name = this._name;

		// Culled side
		obj.side = this._side;

		// Depth test related parameters
		obj.depthFunc = this._depthFunc;
		obj.depthTest = this._depthTest;
		obj.depthWrite = this._depthWrite;

		// Visibility parameters
		obj.transparent = this._transparent;
		obj.opacity = this._opacity;

		// Color
		obj.useVertexColors = this._useVertexColors;

		// Light
		obj.lights = this._lights;

		return obj;
	}

	static fromJson(obj, material) {
		if (!material) {
			var material = new Material();
		}

		// Meta
		material._uuid = obj._uuid;
		material._name = obj.name;

		// Culled side
		material._side = obj.side;

		// Depth test related parameters
		material._depthFunc = obj.depthFunc;
		material._depthTest = obj.depthTest;
		material._depthWrite = obj.depthWrite;

		// Visibility parameters
		material._transparent = obj.transparent;
		material._opacity = obj.opacity;

		// Color
		material._useVertexColors = obj.useVertexColors;

		material._lights = obj.lights;

		return material;
	}

	update(data) {
		for (var prop in data) {
			switch (prop) {
				case "opacity":
					this._opacity = data.opacity;
					delete data.opacity;
					break;
				case "transparent":
					this._transparent = data.transparent;
					delete data.transparent;
					break;
				case "side":
					this._side = data.side;
					delete data.side;
					break;
				case "depthFunc":
					this._depthFunc = data.depthFunc;
					delete data.depthFunc;
					break;
				case "depthTest":
					this._depthTest = data.depthTest;
					delete data.depthTest;
					break;
				case "depthWrite":
					this._depthWrite = data.depthWrite;
					delete data.depthWrite;
					break;
				case "useVertexColors":
					this._useVertexColors = data.useVertexColors;
					delete data.useVertexColors;
					break;
				case "name":
					this._name = data.name;
					delete data.name;
					break;
				/**
				 * Added by Sebastien
				 */
				case "usePoints":
					this._usePoints = data.usePoints;
					delete data.usePoints;
					break;
                case "pointSize":
                    this._pointSize = data.pointSize;
                    delete data.pointSize;
                    break;
				case "drawCircles":
					this._drawCircles = data.drawCircles;
					delete data.drawCircles;
					break;
				case "useClippingPlanes":
					this._useClippingPlanes = data.useClippingPlanes;
					delete data.useClippingPlanes;
					break;
				case "clippingPlanes":
					this._clippingPlanes = data.clippingPlanes;
					delete data.clippingPlanes;
					break;
				case "shadingType":
					this._shadingType = data.shadingType;
					delete data.shadingType;
					break;
				case "shadingType":
					this._instanced = data.instanced;
					delete data.instanced;
					break;

				case "lights":
					this._lights = data.lights;
					delete data.lights;
					break;
			}
		}
	}
}