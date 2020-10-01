/**
 * Created by Ziga on 25.3.2016.
 */
import {Object3D} from '../core/Object3D.js';
import {Matrix4} from '../math/Matrix4.js';
import {Vector3} from '../math/Vector3.js';

export class Camera extends Object3D {

	constructor() {
		super(Object3D);

		this.type = "Camera";

		this._matrixWorldInverse = new Matrix4(); 	//VMat
		this._projectionMatrix = new Matrix4(); 	//PMat

		// Camera up direction
		this._up = new Vector3(0, 1, 0);
	}


	set projectionMatrix (projection) { this._projectionMatrix = projection; }
	set matrixWorldInverse (inverse) { this._matrixWorldInverse = inverse; }

	get projectionMatrix () { return this._projectionMatrix; }
	get matrixWorldInverse () { return this._matrixWorldInverse; }
	get up() { return this._up; }
}