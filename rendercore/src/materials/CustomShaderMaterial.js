/**
 * Created by Primoz on 8. 11. 2016.
 */

import {FRONT_SIDE, BACK_SIDE, FRONT_AND_BACK_SIDE} from '../constants.js';

import {Material} from './Material.js';

import {MaterialProgramTemplate} from '../program_management/MaterialProgramTemplate.js';

export class CustomShaderMaterial  extends Material {

	constructor(programName, uniforms = {}, attributes = {}) {
		super(Material);

		this.type = "CustomShaderMaterial";

		/**
		 * Javascript maps of custom uniforms and attributes where the key represents attribute/uniform name and value
		 * represents values (values must be presented in the correct format).
		 */
		this._uniforms = uniforms;
		this._attributes = attributes;

		// ShaderBuilder flags, values
		this._flagsSB = [];
		this._valuesSB = {};

		// PAY ATTENTION TO THIS - Custom programs have prefix custom in order to avoid collisions with other programs
		this.programName = "custom_" + programName;
		//this._requiredProgramTemplate = null; //do we need this here? Material has one allready
	}

	addSBFlag(flag) {
		this._flagsSB.push(flag);
	}

	rmSBFlag(flag) {
		this._flagsSB.remove(flag);
	}

	clearSBFlags() {
		this._flagsSB.clear();
	}

	addSBValue(name, value) {
		this._valuesSB[name] = value;
	}

	rmSBFlag(flag) {
		delete this._valuesSB[name];
	}

	clearSBFlags() {
		this._valuesSB = {};
	}

	// region UNIFORM/ATTRIBUTE MANAGEMENT
	setUniform(name, value) {
		this._uniforms[name] = value;
	}

	removeUniform(name) {
		delete this._uniforms[name];
	}

	// Added by Aljaz 23.10.2019
	getUniform(name) {
		return this._uniforms[name];
	}

	setAttribute(name, value) {
		this._attributes[name] = value;
	}

	removeAttribute(name) {
		delete this._attributes[name];
	}

	// Added by Aljaz 23.10.2019
	getAttribute(name) {
		return this._attributes[name];
	}
	// endregion


	// Added by Sebastien
	resetProgramFlagsAndValues(){
		super.resetProgramFlagsAndValues();


		// Add user defined flags
		for (let i = 0; i < this._flagsSB.length; i++) {
			this.flags.push(this._flagsSB[i]);
		}

		// Add user defined values
		for (let name in this._valuesSB) {
			if (this._valuesSB.hasOwnProperty(name)) {
				this.values[name] = this._valuesSB[name];
			}
		}
	}

	requiredProgram(renderer = undefined, override = false) {
		if(override){//TODO DELETE if statemenet
			console.warn("THIS SEGMENT IS DEPRECATED");
			//super.requiredProgram();
			this.resetProgramFlagsAndValues();
			return;
		}


		// If the template is already generate use it
		if (this._requiredProgramTemplate !== null) {
			return this._requiredProgramTemplate;
		}


		// Create program specification
		//let flags = [];
		//let values = {};

		//super.requiredProgram();
		this.resetProgramFlagsAndValues();


		//Commented by Sebastien
		/*// Add user defined flags
		for (let i = 0; i < this._flagsSB.length; i++) {
			this.flags.push(this._flagsSB[i]);
		}

		// Add user defined values
		for (let name in this._valuesSB) {
			if (this._valuesSB.hasOwnProperty(name)) {
				this.values[name] = this._valuesSB[name];
			}
		}*/


		/**
		 * Changed by Sebastien
		 */
		//return new MaterialProgramTemplate(this._programName, flags, values);
		this._requiredProgramTemplate = new MaterialProgramTemplate(this.programName2, this.flags, this.values, renderer);
		return this._requiredProgramTemplate;
	}
}