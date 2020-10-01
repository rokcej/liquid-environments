/**
 * Created by Primoz on 18.5.2016.
 */

import {Light} from './Light.js';

export class DirectionalLight extends Light {

	constructor(color, intensity) {
		super(color, intensity);

		this.type = "DirectionalLight";

		// Direction
		this._position.set( 0, 1, 0 );

		this.updateMatrix();
	}

	// toJson >> Nothing to add

	static fromJson(data) {

		var light = new directionalLight(data.color, data.intensity);

		// Light fromJson
		light = super.fromJson(data, light);

		return light;
	}
};