/**
 * Created by primoz on 18.5.2016.
 */

import {Object3D} from '../core/Object3D.js';
import {Color} from '../math/Color.js';

export class Light extends Object3D {

	constructor(color, intensity) {
		super(Object3D);

		this.type = "Light";

		this._color = new Color(color);
		this._intensity  = intensity !== undefined ? intensity : 1;
	}

	get color () { return this._color; }
	get intensity () { return this._intensity; }
	
	set color (val) {
		this._color = val;

		// Notify onChange subscriber
		if (this._onChangeListener) {
			var update = {uuid: this._uuid, changes: {color: this._color.getHex()}};
			this._onChangeListener.objectUpdate(update)
		}
	}
	set intensity (val) {
		this._intensity = val;

		// Notify onChange subscriber
		if (this._onChangeListener) {
			var update = {uuid: this._uuid, changes: {intensity: this._intensity}};
			this._onChangeListener.objectUpdate(update)
		}
	}
	
	
	toJson() {
		var obj = super.toJson();

		// Light params
		obj.color = this._color.getHex();
		obj.intensity = this.intensity;

		return obj;
	}

	static fromJson(data, light) {

		if (!light) {
				var light = new Light(data.color, data.intensity);
		}

		// Object3D fromJson
		light = super.fromJson(data, light);

		return light;
	}

	update(data) {
		super.update(data);

		for (var prop in data) {
			switch(prop) {
				case "color":
					this._color.setHex(data.color);
					delete data.color;
					break;
				case "intensity":
					this._intensity = data.intensity;
					delete data.intensity;
					break;
			}
		}
	}
};