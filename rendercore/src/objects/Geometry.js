/**
 * Created by Ziga & Primoz on 1.4.2016.
 */

import {_Math} from '../math/Math.js';
import {Vector3} from '../math/Vector3.js';
import {Box3} from '../math/Box3.js';
import {Sphere} from '../math/Sphere.js';

import {BufferAttribute, Uint32Attribute, Float32Attribute} from '../core/BufferAttribute.js';

export class Geometry {

	/**
	 * Create new Geometry object.
	 */
	constructor() {
		this._uuid = _Math.generateUUID();
		this.type = "Geometry";

		// Buffers
		this._indices = null;
		this._vertices = null;
		this._normals = null;
		this._vertColor = null;
		this._uv = null;
		this._wireframeIndices = null;
		//Added by Sebastien
		this._MMat = null;

		// Bounding
		this._boundingBox = null;
		this._boundingSphere = null;

		// Parameter on change listener
		this._onChangeListener = null;

		// If this is set to true.. wireframe will be rendered instead of planes
		this._drawWireframe = false;
	}

	/**
	 * Build wireframe buffer from geometry triangles.
	 */
	/**
	 * Modified by Sebastien
	 */
	/*buildWireframeBuffer() {
		if (this._vertices.count() === 0)
			return;

		var indices = [];
		var array = this._vertices.array;

		for ( var i = 0, l = ( array.length / 3 ) - 1; i < l; i += 3 ) {
			var a = i;
			var b = i + 1;
			var c = i + 2;

			 // A - B - C - A
			indices.push( a, b, b, c, c, a );
		}

		// Create new buffer geometry for the wireframe
		this._wireframeIndices = new BufferAttribute(new Uint32Array(indices), 1);
	}*/
	buildWireframeBuffer() {
		let vertexMap = new Map();
		let indices = [];

		if (this._indices !== null && this._indices.count() > 0) {
			//INDICES
			let array = this._indices.array;
			let a,b,c;

			for ( let i = 0, l = array.length; i < l; i += 3 ) {
				a = array[i];
				b = array[i+1];
				c = array[i+2];

				// A - B - C - A
				//indices.push( a, b, b, c, c, a );
				this.sanitize(vertexMap, a, b, indices);
				this.sanitize(vertexMap, b, c, indices);
				this.sanitize(vertexMap, c, a, indices);

				/*if(this.checkContamination(indices, a, b, i) === false){
					indices.push(a, b);
				}
				if(this.checkContamination(indices, b, c, i) === false){
					indices.push(b, c);
				}
				if(this.checkContamination(indices, c, a, i) === false){
					indices.push(c, a);
				}*/

				//if(i % 10000 === 0) console.log(i/array.length);
			}
		}else if(this._vertices !== null && this._vertices.count() > 0){
			//VERTICES
			let array = this._vertices.array;
			let a,b,c;

			for ( let i = 0, l = ( array.length / 3 ) - 1; i < l; i += 3 ) {
				a = i;
				b = i + 1;
				c = i + 2;

				// A - B - C - A
				indices.push( a, b, b, c, c, a );
				//this.sanitize(vertexMap, a, b, indices);
				//this.sanitize(vertexMap, b, c, indices);
				//this.sanitize(vertexMap, c, a, indices);


				/*if(this.checkContamination(indices, a, b, i) === false){
					indices.push(a, b);
				}
				if(this.checkContamination(indices, b, c, i) === false){
					indices.push(b, c);
				}
				if(this.checkContamination(indices, c, a, i) === false){
					indices.push(c, a);
				}*/

				//if(i % 10000 === 0) console.log(i/array.length);
			}
		}else{
			return;
		}

		//clean; for each pair check for occurrences
		/*console.log(indices);
		let newIndices = [];
		let a,b;
		for (let i = 0; i < indices.length; i+=2){
			a = indices[i];
			b = indices[i+1];

			/*for(let j = i+2; j < indices.length; j+=2) {
				if (indices[j] === a && indices[j+1] === b || indices[j] === b && indices[j+1] === a) {
					indices.splice(j, 2);
					j -= 2;
				}
			}*/
			/*let contaminated = false;
			for(let j = 0; j < newIndices.length; j+=2) {
				if (newIndices[j] === a && newIndices[j+1] === b || newIndices[j] === b && newIndices[j+1] === a) {
					contaminated = true;
					break;
				}
			}
			if(!contaminated) newIndices.push(a, b);
		}
		indices = newIndices;*/
		console.log(indices);


		// Create new buffer geometry for the wireframe
		this._wireframeIndices = new BufferAttribute(new Uint32Array(indices), 1);
	}
	checkContamination(buffer, x, y, triIndex){
		triIndex = triIndex*6 - 3*6;
		if(triIndex < 0) triIndex = 0;
		for(let i = triIndex; i < buffer.length; i+=2) {
			if (buffer[i] === x && buffer[i+1] === y || buffer[i] === y && buffer[i+1] === x) {
				return true;
			}
		}

		return false;
	}
	sanitize(vertexMap, x, y, indices){
		let foundX = false, foundY = false, foundXY = false, foundYX = false;
		let arrayX, arrayY;


		if(vertexMap.has(x)){
			foundX = true;
			arrayX = vertexMap.get(x);

			for(let i = 0; i < arrayX.length; i++){
				if(arrayX[i] === y){
					foundXY = true;
					break;
				}
			}
		}

		if(vertexMap.has(y)){
			foundY = true;
			arrayY = vertexMap.get(y);

			for(let i = 0; i < arrayY.length; i++){
				if(arrayY[i] === x){
					foundYX = true;
					break;
				}
			}
		}



		if(!foundX){
			vertexMap.set(x, [y]);
		}
		if(!foundY){
			vertexMap.set(y, [x]);
		}
		if(foundX){

			if(!foundXY){
				arrayX.push(y);
				//vertexMap.set(x, arrayX);
			}
		}
		if(foundY){

			if(!foundYX){
				arrayY.push(x);
				//vertexMap.set(y, arrayY);
			}
		}
		if(!foundX || !foundY || !foundXY || !foundYX){
			indices.push(x, y);
		}
	}

	/**
	 * Normalize normals.
	 */
	_normalizeNormals() {
		var normals = this._normals.array;

		var x, y, z, n;

		for (var i = 0; i < normals.length; i += 3) {
			x = normals[i];
			y = normals[i + 1];
			z = normals[i + 2];

			n = 1.0 / Math.sqrt(x * x + y * y + z * z);

			normals[i] *= n;
			normals[i + 1] *= n;
			normals[i + 2]  *= n;
		}
	}

	/**
	 * Compute vertex normals.
	 */
	computeVertexNormals() {

		if (this._vertices) {
			var positions = this._vertices.array;

			if (!this._normals) {
				this._normals = new BufferAttribute(new Float32Array(positions.length), 3);
			}
			else {
				// reset existing normals to zero
				var array = this._normals.array;

				for (var i = 0; i < array.length; i ++) {
					array[ i ] = 0;
				}
			}

			var normals = this._normals.array;

			var vA, vB, vC,
				pA = new Vector3(),
				pB = new Vector3(),
				pC = new Vector3(),

				cb = new Vector3(),
				ab = new Vector3();


			// Vertices are indexed
			if (this._indices) {
				var indices = this._indices.array;

				for (var i = 0; i < indices.length; i += 3 ) {
					vA = indices[i] * 3;
					vB = indices[i + 1] * 3;
					vC = indices[i + 2] * 3;

					pA.fromArray(positions, vA);
					pB.fromArray(positions, vB);
					pC.fromArray(positions, vC);

					cb.subVectors(pC, pB);
					ab.subVectors(pA, pB);
					cb.cross(ab);

					normals[vA] += cb.x;
					normals[vA + 1] += cb.y;
					normals[vA + 2] += cb.z;

					normals[vB] += cb.x;
					normals[vB + 1] += cb.y;
					normals[vB + 2] += cb.z;

					normals[vC ] += cb.x;
					normals[vC + 1] += cb.y;
					normals[vC + 2] += cb.z;
				}
			}
			else {
				// non-indexed elements (unconnected triangle soup)
				for (var i = 0; i < positions.length; i += 9) {

					pA.fromArray( positions, i );
					pB.fromArray( positions, i + 3 );
					pC.fromArray( positions, i + 6 );

					cb.subVectors( pC, pB );
					ab.subVectors( pA, pB );
					cb.cross( ab );

					normals[ i ] = cb.x;
					normals[ i + 1 ] = cb.y;
					normals[ i + 2 ] = cb.z;

					normals[ i + 3 ] = cb.x;
					normals[ i + 4 ] = cb.y;
					normals[ i + 5 ] = cb.z;

					normals[ i + 6 ] = cb.x;
					normals[ i + 7 ] = cb.y;
					normals[ i + 8 ] = cb.z;
				}
			}

			this._normalizeNormals();

			this._normals.needsUpdate = true;
		}
	}

	/**
	 * Compute vertex normals for selected range of index buffer.
	 */
	computeVertexNormalsIdxRange(start, count) {

		if ( ! this._vertices || ! this._indices) return;

		var positions = this._vertices.array;

		if (!this._normals) {
			this._normals = new BufferAttribute(new Float32Array(positions.length), 3);
		}
		else {
			// reset existing normals to zero
			var array = this._normals.array;

			for (var i = 0; i < array.length; i ++) {
				array[ i ] = 0;
			}
		}

		var normals = this._normals.array;

		var vA, vB, vC,
			pA = new Vector3(),
			pB = new Vector3(),
			pC = new Vector3(),

			cb = new Vector3(),
			ab = new Vector3();


		var indices = this._indices.array;

	   for (var i = start, i_end = start + count; i < i_end; i += 3 ) {
			vA = indices[i] * 3;
			vB = indices[i + 1] * 3;
			vC = indices[i + 2] * 3;

			pA.fromArray(positions, vA);
			pB.fromArray(positions, vB);
			pC.fromArray(positions, vC);

			cb.subVectors(pC, pB);
			ab.subVectors(pA, pB);
			cb.cross(ab);

			normals[vA] += cb.x;
			normals[vA + 1] += cb.y;
			normals[vA + 2] += cb.z;

			normals[vB] += cb.x;
			normals[vB + 1] += cb.y;
			normals[vB + 2] += cb.z;

			normals[vC ] += cb.x;
			normals[vC + 1] += cb.y;
			normals[vC + 2] += cb.z;
		}
		this._normalizeNormals();
		this._normals.needsUpdate = true;
	}

        /**
	 * Compute minimal bounding box that encapsulates all triangles.
	 */
	computeBoundingBox() {

		// Check if the bounding box already exist
		if ( this._boundingBox === null ) {
			this._boundingBox = new Box3();
		}

		// Create new bounding box using the vertices
		if (this._vertices) {
			this._boundingBox.setFromArray(this._vertices.array);
		}
		else {
			this._boundingBox.makeEmpty();
		}

		if ( isNaN( this._boundingBox.min.x ) || isNaN( this._boundingBox.min.y ) || isNaN( this._boundingBox.min.z ) ) {
			console.error('Geometry error: One or more of bounding box axis min is NaN.');
		}
	}

	/**
	 * Compute minimal bounding sphere that encapsulates all triangles.
	 */
	computeBoundingSphere() {
		let box = new Box3();
		let vector = new Vector3();

		// Check if the sphere already exists
		if (this._boundingSphere === null) {
			this._boundingSphere = new Sphere();
		}

		if (this._vertices) {
			let array = this._vertices.array;
			let center = this._boundingSphere.center;

			// Set initial bounding sphere based on the bounding box
			box.setFromArray(array);
			box.center(center);

			// Optimize sphere radius
			let maxRadiusSq = 0;

			for (let i = 0; i < array.length; i += 3) {
				vector.fromArray(array, i);
				maxRadiusSq = Math.max(maxRadiusSq, center.distanceToSquared(vector));
			}

			this._boundingSphere.radius = Math.sqrt(maxRadiusSq);

			if (isNaN(this._boundingSphere.radius)) {
				console.error('Geometry error: Bounding sphere radius is NaN.');
			}
		}
	}

	/**
	 * Set range for triangle mesh rendering or lines. ??
	 */
   setDrawRange(start, count) {
		if ( ! this._indices) { console.error('Geometry error: setDrawRange called before indices were set.'); return; }
		this._indexStart = start; this._indexCount = count; this._drawRangeSet = true;
	}
   get indexStart() { return this._drawRangeSet ? this._indexStart : 0; }
   get indexCount() { return this._drawRangeSet ? this._indexCount : this.indices.count(); }

	// region GETTERS
	/**
	 * Get geometry indices.
	 *
	 * @returns Geometry indices.
	 */
	get indices() { return this._indices; }

	/**
	 * Get geometry vertices.
	 *
	 * @returns Geometry vertices.
	 */
	get vertices() { return this._vertices; }

	/**
	 * Get geometry normals.
	 *
	 * @returns Geometry normals.
	 */
	get normals() { return this._normals; }

	/**
	 * Get vertex colors.
	 *
	 * @returns Vertex colors.
	 */
	get vertColor() { return this._vertColor; }

	/**
	 * Get UV coordinates of the geometry.
	 *
	 * @returns UV coordinates.
	 */
	get uv() { return this._uv; }

	/**
	 * Get wireframe indices.
	 *
	 * @returns Wireframe indices.
	 */
	get wireframeIndices() { return this._wireframeIndices; }

	//Added by Sebastien
	get MMat() { return this._MMat; }

	/**
	 * Check if wireframe drawing is on or off.
	 *
	 * @returns True if wireframe drawing is on.
	 */
	get drawWireframe() { return this._drawWireframe; }

	/**
	 * Get minimal bounding box that encapsulates all triangles.
	 *
	 * @returns Minimal bounding box.
	 */
	get boundingBox() { return this._boundingBox; }

	/**
	 * Get minimal bounding sphere that encapsulates all triangles.
	 *
	 * @returns Minimal bounding sphere.
	 */
	get boundingSphere() {
		// If the bounding sphere was not jet computed compute it
		if (this._boundingSphere === null) {
			this.computeBoundingSphere();
		}

		return this._boundingSphere;
	}
	// endregion

	// region SETTERS
	/**
	 * Set geometry indices.
	 *
	 * @param values Geometry ndices.
	 */
	set indices(values) {
		this._indices = values;

		// Notify onChange subscriber
		if (this._onChangeListener) {
			var update = {uuid: this._uuid, changes: {array: this._indices.array.buffer.slice(0), itemSize: this._indices.itemSize}};
			this._onChangeListener.geometryUpdate(update)
		}
	}

	/**
	 * Set geometry vertices.
	 *
	 * @param values Geometry vertices.
	 */
	set vertices(values) {
		this._vertices = values;

		// Notify onChange subscriber
		if (this._onChangeListener) {
			var update = {uuid: this._uuid, changes: {array: this._vertices.array.buffer.slice(0), itemSize: this._vertices.itemSize}};
			this._onChangeListener.geometryUpdate(update)
		}
	}

	/**
	 * Set geometry normals.
	 *
	 * @param values Geometry normals.
	 */
	set normals(values) {
		this._normals = values;

		// Notify onChange subscriber
		if (this._onChangeListener) {
			var update = {uuid: this._uuid, changes: {array: this._normals.array.buffer.slice(0), itemSize: this._normals.itemSize}};
			this._onChangeListener.geometryUpdate(update)
		}
	}

	/**
	 * Set vertex colors.
	 *
	 * @param values Vertex colors.
	 */
	set vertColor(values) {
		this._vertColor = values;

		// Notify onChange subscriber
		if (this._onChangeListener) {
			var update = {uuid: this._uuid, changes: {array: this._vertColor.array.buffer.slice(0), itemSize: this._vertColor.itemSize}};
			this._onChangeListener.geometryUpdate(update)
		}
	}

	/**
	 * Set UV coordinates.
	 *
	 * @param values UV coordinates.
	 */
	set uv(values) { this._uv = values; }

	/**
	 * Set wireframe indices.
	 *
	 * @param values Wireframe indices.
	 */
	set wireframeIndices(values) { this._wireframeIndices = values; }

	//Added by Sebastien
	set MMat(MMat) { this._MMat = MMat; }

	/**
	 * Turn wireframe drawing on or off.
	 *
	 * @param val True to turn wireframe drawing on.
	 */
	set drawWireframe(val) { this._drawWireframe = val; }

	/**
	 * Add on change listener to geometry.
	 *
	 * @param listener Listener to be added.
	 */
	set onChangeListener(listener) { this._onChangeListener = listener; }
	// endregion

	/**
	 * Serialize object to JSON.
	 *
	 * @returns JSON object.
	 */
	toJson() {
		var obj = {};

		obj._uuid = this._uuid;
		obj.type = this.type;

		if (this._indices) {
			obj.indices = {array: this._indices.array.buffer.slice(0), itemSize: this._indices.itemSize};
		}

		if (this._vertices) {
			obj.vertices = {array: this._vertices.array.buffer.slice(0), itemSize: this._vertices.itemSize};
		}

		if (this._normals) {
			obj.normals = {array: this._normals.array.buffer.slice(0), itemSize: this._normals.itemSize};
		}

		if (this._vertColor) {
			obj.vertColor = {array: this._vertColor.array.buffer.slice(0), itemSize: this._vertColor.itemSize};
		}

		return obj;
	}

	/**
	 * Create new geometry from the JSON data.
	 *
	 * @param obj JSON data.
	 * @returns Created geometry.
	 */
	static fromJson(obj) {
		var geometry = new Geometry();

		geometry._uuid = obj._uuid;

		if (obj.indices) {
			geometry._indices = Uint32Attribute(obj.indices.array, obj.indices.itemSize);
		}

		if (obj.vertices) {
			geometry._vertices = Float32Attribute(obj.vertices.array, obj.vertices.itemSize);
		}

		if (obj.normals) {
			geometry._normals = Float32Attribute(obj.normals.array, obj.normals.itemSize);
		}

		if (obj.vertColor) {
			geometry._vertColor = Float32Attribute(obj.vertColor.array, obj.vertColor.itemSize);
		}

		return geometry;
	}

	/**
	 * Update the geometry with settings from data.
	 *
	 * @param data Update data.
	 */
	update(data) {

		for (var prop in data) {
			switch (prop) {
				case "indices":
					this._indices = Uint32Attribute(data.indices.array, data.indices.itemSize);
					delete data.indices;
					break;
				case "vertices":
					this._vertices = Float32Attribute(data.vertices.array, data.vertices.itemSize);
					delete data.vertices;
					break;
				case "normals":
					this._normals = Float32Attribute(data.normals.array, data.normals.itemSize);
					delete data.normals;
					break;
				case "vertColor":
					this._vertColor = Float32Attribute(data.vertColor.array, data.vertColor.itemSize);
					delete data.vertColor;
					break;
			}
		}
	}
};
