/**
 * Created by Primoz on 28.4.2016.
 */

import {FRONT_AND_BACK_SIDE, FRONT_SIDE, BACK_SIDE, FUNC_LEQUAL, FUNC_LESS, FUNC_GEQUAL, FUNC_GREATER, FUNC_EQUAL, FUNC_NOTEQUAL, FUNC_NEVER, FUNC_ALWAYS, POINTS, LINES, LINE_LOOP, LINE_STRIP, TRIANGLES, TRIANGLE_STRIP, TRIANGLE_FAN} from '../constants.js';

import {Renderer} from './Renderer.js';

import {Matrix4} from '../math/Matrix4.js';
import {Sphere} from '../math/Sphere.js';
import {Frustum} from '../math/Frustum.js';
import {Vector3} from '../math/Vector3.js';
import {Color} from '../math/Color.js';

import {Scene} from '../core/Scene.js';
import {Line} from '../objects/Line.js';
import {Mesh} from '../objects/Mesh.js';
import {PointCloud} from '../objects/PointCloud.js';
import {Group} from '../objects/Group.js';
import {VPTVolume} from '../objects/VPTVolume.js';
import {Light} from '../lights/Light.js';
import {AmbientLight} from '../lights/AmbientLight.js';
import {DirectionalLight} from '../lights/DirectionalLight.js';
import {PointLight} from '../lights/PointLight.js';
import {CustomShaderMaterial} from '../materials/CustomShaderMaterial.js';
import {VPTRendInterface} from '../extensions/VPTRendInterface.js';
import {Outline} from "../objects/Outline.js";
import {OutlineBasicMaterial} from "../materials/OutlineBasicMaterial.js";


export class MeshRenderer extends Renderer {

	/**
	 * Create new MeshRenderer object.
	 *
	 * @param canvas The canvas where the renderer draws its output.
	 * @param gl_version Version of the GL context to be used.
	 * @param optionalContextAttributes
	 */
	constructor(canvas, gl_version, optionalContextAttributes) {
		// Call abstract Renderer constructor
		super(canvas, gl_version, optionalContextAttributes);

		// Frustum
		this._projScreenMatrix = new Matrix4();
		this._sphere = new Sphere();
		this._frustum = new Frustum();

		//region Current frame render arrays
		this._opaqueObjects = [];
		this._transparentObjects = [];
		this._opaqueObjectsWithOutline = [];
		this._transparentObjectsWithOutline = [];
		this._lights = [];
		this._lightsCombined = {
			ambient: [0, 0, 0],
			directional: [],
			point: []
		};
		this._zVector = new Vector3();
		this._VPTObjects = [];
		// endregion

		// Enable depth testing (disable depth testing with gl.ALWAYS)
		this._gl.enable(this._gl.DEPTH_TEST);

		// Enable back-face culling by default
		this._gl.frontFace(this._gl.CCW);

		// Set the selected renderer
		this._selectedRenderer = this._meshRender;

		// VPT interface
		//this._VPTInterface = null;
		this.vptGD = {};
		this.vptGD.vptBundle = VPTRendInterface.defaultSettings;
		this.vptGD.vptBundle.objects =  this._VPTObjects;
		this._VPTInterface;
		this.notinit = true;

		this._wasReset = true;


		//picking
		this._pickEnabled = false;
		this._pickCoordinateX = 0;
		this._pickCoordinateY = 0;
		this._pickedColor = new Uint8Array(4);
		this._pickCallback = null;
		this.used = false;
	}


	//SET GET
	set selectedRenderer(selectedRenderer) { this._selectedRenderer = selectedRenderer; }
	get pickedColor() { return this._pickedColor; }


	/**
	 * Render mesh.
	 *
	 * @param scene Scene to be rendered.
	 * @param camera Camera observing the scene.
	 */
	_meshRender(scene, camera) {

		// Update scene graph and camera matrices
		if (scene.autoUpdate === true)
			scene.updateMatrixWorld();

		this._projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
		this._frustum.setFromMatrix(this._projScreenMatrix);

		// Clear the render arrays
		//this._opaqueObjects.length = 0;
		//this._transparentObjects.length = 0;
		//this._lights.length = 0;
		this._opaqueObjects = [];
		this._transparentObjects = [];
		this._opaqueObjectsWithOutline = [];
		this._transparentObjectsWithOutline = [];
		this._VPTObjects = [];
		this._lights = [];

		// Update objects attributes and set up lights
		this._projectObject(scene, camera);

		// Setup lights only if there are any lights (hope it fixes light settings)
		if (this._lights.length > 0)
			this._setupLights(this._lights, camera);

		// Programs need to be loaded after the lights
		if (!this._loadRequiredPrograms()) {
			console.warn("Required programs not loaded!");
			
			/*console.log("-----------------PRE-----------------");
			console.log("REQUIRED: " + this._requiredPrograms + " length: " + this._requiredPrograms.length);
			console.log(this._requiredPrograms);
			console.log("--------------------------------------");
			console.log("LOADING: " + this._loadingPrograms + " length: " + this._loadingPrograms.size);
			console.log(this._loadingPrograms);
			console.log("--------------------------------------");
			console.log("COMPILED: " + this._compiledPrograms + " length: " + this._compiledPrograms.size);
			console.log(this._compiledPrograms);
			console.log("--------------------------------------");*/
			this.succeeded = false;
			return;
		}
		this.succeeded = true;
		if(!this.used) {
			console.log("-----------------POST------------------");
			console.log("REQUIRED: " + this._requiredPrograms + " length: " + this._requiredPrograms.length);
			console.log(this._requiredPrograms);
			console.log("--------------------------------------");
			console.log("LOADING: " + this._loadingPrograms + " length: " + this._loadingPrograms.size);
			console.log(this._loadingPrograms);
			console.log("--------------------------------------");
			console.log("COMPILED: " + this._compiledPrograms + " length: " + this._compiledPrograms.size);
			console.log(this._compiledPrograms);
			console.log("--------------------------------------");
			this.used = true;
		}
		if(!this._VPTInterface){
			//if(VPTProgramsLoaded) this._VPTInterface = new VPTRendInterface(this.vptGD, this._gl, this._glManager);
			//return;
		}
		/**
		 * Added by Sebastien
		 */
		this._requiredPrograms = [];


		//RENDER OBJECTS

		// Render picking objects
		if(this._pickEnabled) {
			this._renderPickingObjects(this._opaqueObjects, this._transparentObjects, this._opaqueObjectsWithOutline, this._transparentObjectsWithOutline, camera);
		}

		// Render opaque objects
		this._renderOpaqueObjects(this._opaqueObjects, camera);

		// Render transparent objects
		this._renderTransparentObjects(this._transparentObjects, camera);

		// Render volume objects with VPT
		if (this._VPTObjects.length > 0){
			if(this.notinit) {
				this.notinit = false;
				this.vptGD = {};
				this.vptGD.vptBundle = VPTRendInterface.defaultSettings;
				this.vptGD.vptBundle.objects =  this._VPTObjects;
				this._VPTInterface = new VPTRendInterface(this.vptGD, this._gl, this._glManager);
				console.log("VPT INIT");
			}
		}
		if (this._VPTObjects.length > 0 && this._VPTInterface) {
			//if (this._wasReset) return; // After scene reset some attributes remained set to deleted buffers, therefore set new attributes in first pass + skip render. Todo: better solution ? delete non required programs ?
			//console.log("not");

			this._VPTInterface.renderObjects(this._VPTObjects, camera);
		}

		// Render outlines
		this._renderOutlinedObjects(this._opaqueObjectsWithOutline, this._transparentObjectsWithOutline, camera);
	}
	

	/**
	 * Added by Sebastien
	 */
	_renderPickingObjects(opaqueObjects, transparentObjects, opaqueObjectsWithOutline, transparentObjectsWithOutline, camera){
		this._renderPickableObjects(opaqueObjects, camera);
		this._renderPickableObjects(transparentObjects, camera);
		this._renderPickableObjects(opaqueObjectsWithOutline, camera);
		this._renderPickableObjects(transparentObjectsWithOutline, camera);


		//const pixelColor = new Uint8Array(4);
		this._gl.readPixels(this._pickCoordinateX, this._canvas.height-this._pickCoordinateY, 1, 1, this._gl.RGBA, this._gl.UNSIGNED_BYTE, this._pickedColor);


		this._glManager.clear(true, true, true);
		this._pickEnabled = false;
		this._pickCallback(this._pickedColor);
	}
	_renderOutlinedObjects(opaqueObjectsWithOutline, transparentObjectsWithOutline, camera){
		if (opaqueObjectsWithOutline.length + transparentObjectsWithOutline.length > 0) {
			// drawing will set stencil stencil
			this.gl.enable(this.gl.STENCIL_TEST);
			this.gl.clearStencil(1);
			this.gl.clear(this.gl.STENCIL_BUFFER_BIT);


			this._renderOpaqueOutlinedObjects(opaqueObjectsWithOutline, camera);
			this._renderTransparentOutlinedObjects(transparentObjectsWithOutline, camera);


			// done
			this.gl.disable(this.gl.STENCIL_TEST);
		}
	}
	_renderOpaqueOutlinedObjects(opaqueObjects, camera){
		if (opaqueObjects.length > 0) {
			// Sort the objects by render order
			opaqueObjects.sort(function(a, b) {
				return a.renderOrder - b.renderOrder;
			});


			this._renderOutlines(opaqueObjects, camera);
		}
	}
	_renderTransparentOutlinedObjects(transparentObjects, camera){
		// Sort the objects by Z
		transparentObjects.sort(function(a, b) {
			let renderOrderDiff = a.renderOrder - b.renderOrder;
			if(renderOrderDiff === 0){
				return b._z - a._z;
			}else{
				return renderOrderDiff;
			}
		});

		// Enable Blending
		this._gl.enable(this._gl.BLEND);

		// Set up blending equation and params
		this._gl.blendEquation(this._gl.FUNC_ADD);
		//added separate blending function
		this._gl.blendFuncSeparate(this._gl.SRC_ALPHA, this._gl.ONE_MINUS_SRC_ALPHA, this._gl.ONE, this._gl.ONE_MINUS_SRC_ALPHA);


		// Render transparent objects
		this._renderOutlines(transparentObjects, camera);


		// Clean up
		this._gl.disable(this._gl.BLEND);
	}
	_renderOutlines(objectsWithOutline, camera){

		/*
		// drawing will set stencil stencil
		this.gl.enable(this.gl.STENCIL_TEST);
		this.gl.clearStencil(1);
		this.gl.clear(this.gl.STENCIL_BUFFER_BIT);
 		*/


		// draw objects
		for (let i = 0; i < objectsWithOutline.length; i++) {
			this.gl.enable(this.gl.DEPTH_TEST);
			this.gl.depthFunc(this.gl.LESS);
			//this.gl.depthMask(true);


			/*--------------------------------------------------------------------------------------------------------*/
			this.gl.stencilFunc(this.gl.EQUAL, 1, 1); //stencil pass test function (the test | reference value | mask)
			this.gl.stencilOp(this.gl.KEEP, this.gl.INCR, this.gl.INCR); //stencil state change operator (s-buff fail | s-buff pass, d-buff fail | s-buff pass, d-buff pass)
			this.gl.stencilMask(0xFF); //STENCIL WRITE mask


			// draw objects
			this._setupProgram(objectsWithOutline[i], camera, objectsWithOutline[i].material.requiredProgram(this).programID);
			//this._setup_material_settings(objectsWithOutline[i].material);
			//COMPACT
			this._drawObject(objectsWithOutline[i]);
			/*--------------------------------------------------------------------------------------------------------*/


			this.gl.disable(this.gl.DEPTH_TEST); //DRAW OUTLINE ON TOP OF THE FLOR AND OTHER OBJECTS
			//this.gl.depthFunc(this.gl.ALWAYS);
			//this.gl.depthMask(false);


			/*--------------------------------------------------------------------------------------------------------*/
			// set stencil mode to only draw those not previous drawn
			this.gl.stencilFunc(this.gl.EQUAL, 1, 1);
			this.gl.stencilOp(this.gl.KEEP, this.gl.ZERO, this.gl.ZERO);
			this.gl.stencilMask(0xFF); //STENCIL WRITE mask


			// draw object halo
			this._setupProgram(objectsWithOutline[i].outline, camera, objectsWithOutline[i].outline.material.requiredProgram(this).programID);
			//this._setup_material_settings(objectsWithOutline[i].outline.material);
			//COMPACT
			this._drawObject(objectsWithOutline[i].outline);
			/*--------------------------------------------------------------------------------------------------------*/


			this.gl.enable(this.gl.DEPTH_TEST);
			this.gl.depthFunc(this.gl.NEVER);


			/*--------------------------------------------------------------------------------------------------------*/
			this.gl.stencilFunc(this.gl.EQUAL, 2, 1); //stencil pass test function (the test | reference value | mask)
			this.gl.stencilOp(this.gl.KEEP, this.gl.DECR, this.gl.DECR); //stencil state change operator (s-buff fail | s-buff pass, d-buff fail | s-buff pass, d-buff pass)
			this.gl.stencilMask(0xFF); //STENCIL WRITE mask


			// draw objects
			this._setupProgram(objectsWithOutline[i], camera, objectsWithOutline[i].material.requiredProgram(this).programID);
			//this._setup_material_settings(objectsWithOutline[i].material);
			//COMPACT
			this._drawObject(objectsWithOutline[i]);
			/*--------------------------------------------------------------------------------------------------------*/


			//this.gl.clear(this.gl.STENCIL_BUFFER_BIT);
			this.gl.enable(this.gl.DEPTH_TEST); //RE-ENABLE
		}


		/*
		// done
		this.gl.disable(this.gl.STENCIL_TEST);
		*/
	}

	_renderOpaqueObjects(opaqueObjects, camera){
		if (opaqueObjects.length > 0) {
			/**
			 * Added by Sebastien
			 */
			// Sort the objects by render order
			opaqueObjects.sort(function(a, b) {
				return a.renderOrder - b.renderOrder;
			});


			this._renderObjects(opaqueObjects, camera);
		}
	}
	_renderTransparentObjects(transparentObjects, camera){
		if (transparentObjects.length > 0) {
			// Sort the objects by Z
			transparentObjects.sort(function(a, b) {
				/**
				 * Modified by Sebastien
				 */
					//return b._z - a._z;

				let renderOrderDiff = a.renderOrder - b.renderOrder;
				if(renderOrderDiff === 0){
					return b._z - a._z;
				}else{
					return renderOrderDiff;
				}
			});

			// Enable Blending
			this._gl.enable(this._gl.BLEND);

			// Set up blending equation and params
			/**
			 * Modified by Sebastien
			 */
			this._gl.blendEquation(this._gl.FUNC_ADD);
			//this._gl.blendFunc(this._gl.SRC_ALPHA, this._gl.ONE_MINUS_SRC_ALPHA);
			//added separate blending function
			//this._gl.blendFuncSeparate(this._gl.SRC_ALPHA, this._gl.ONE_MINUS_SRC_ALPHA, this._gl.ONE, this._gl.ONE_MINUS_SRC_ALPHA); // Default
			this._gl.blendFuncSeparate(this._gl.SRC_ALPHA, this._gl.ONE, this._gl.ONE, this._gl.ONE); // Additive blending


			// Render transparent objects
			this._renderObjects(transparentObjects, camera);


			// Clean up
			this._gl.disable(this._gl.BLEND);
		}
	}
	/**
	 * Render objects.
	 *
	 * @param objects Objects to be rendered.
	 * @param camera Camera observing the scene.
	 */
	_renderObjects(objects, camera) {
		for (let i = 0; i < objects.length; i++) {
			//SET PROGRAM
			this._setupProgram(objects[i], camera, objects[i].material.requiredProgram(this).programID);


			this._setup_material_settings(objects[i].material);


			//COMPACT
			this._drawObject(objects[i]);
		}
	}
	_renderPickableObjects(objects, camera){
		for (let i = 0; i < objects.length; i++) {
			if(!objects[i].pickable) continue;
			//if(objects[i].pickingMaterial === undefined) continue;

			//SET PROGRAM
			this._setupProgram(objects[i], camera, objects[i].pickingMaterial.requiredProgram(this).programID);


			//this._setup_material_settings(objects[i].material);
			this._setup_material_side(objects[i].material.side);
			this._setup_material_depth(true, objects[i].material.depthFunc, true);


			//COMPACT
			this._drawObject(objects[i]);
		}
	}
	_setupProgram(object, camera, programID){
		///let program = this._compiledPrograms.get(objects[i].material.requiredProgram().programID);
		let program = this._compiledPrograms.get(programID);
		//console.log(this._compiledPrograms);
		program.use();

		this._setup_uniforms(program, object, camera);
		this._setup_attributes(program, object);
	}
	_drawObject(object){
		//Moved by Sebastien
		/*if (object.renderingPrimitive === this._gl.POINTS){
			if (object.geometry.indices){
				//indexed
				let buffer = this._glManager.getAttributeBuffer(object.geometry.indices);
				this._gl.bindBuffer(this._gl.ELEMENT_ARRAY_BUFFER, buffer);
				//this._gl.drawElements(object.renderingPrimitive, object.geometry.indices.count(), this._gl.UNSIGNED_INT, 0);
				this._gl.drawElements(object.renderingPrimitive, object.geometry.indexCount, this._gl.UNSIGNED_INT, 4 * object.geometry.indexStart);
			}else {
				//non indexed
				this._gl.drawArrays(object.renderingPrimitive, 0, object.geometry.vertices.count());
			}
		}
		else if (object.renderingPrimitive === this._gl.LINE_STRIP || object.renderingPrimitive === this._gl.LINES || object.renderingPrimitive === this._gl.LINE_LOOP) {
			if (object.geometry.indices){
				//indexed
				let buffer = this._glManager.getAttributeBuffer(object.geometry.indices);
				this._gl.bindBuffer(this._gl.ELEMENT_ARRAY_BUFFER, buffer);
				//this._gl.drawElements(object.renderingPrimitive, object.geometry.indices.count(), this._gl.UNSIGNED_INT, 0);
				this._gl.drawElements(object.renderingPrimitive, object.geometry.indexCount, this._gl.UNSIGNED_INT, 4 * object.geometry.indexStart);
			}else {
				//non indexed
				this._gl.drawArrays(object.renderingPrimitive, 0, object.geometry.vertices.count());
			}
		}
		else if (object.geometry.drawWireframe) {
			let buffer = this._glManager.getAttributeBuffer(object.geometry.wireframeIndices);
			this._gl.bindBuffer(this._gl.ELEMENT_ARRAY_BUFFER, buffer);
			this._gl.drawElements(this._gl.LINES, object.geometry.wireframeIndices.count(), this._gl.UNSIGNED_INT, 0);
		}
		else if (object.geometry.indices) {
			//indexed
			let buffer = this._glManager.getAttributeBuffer(object.geometry.indices);
			this._gl.bindBuffer(this._gl.ELEMENT_ARRAY_BUFFER, buffer);
			//this._gl.drawElements(object.renderingPrimitive, object.geometry.indices.count(), this._gl.UNSIGNED_INT, 0);
			this._gl.drawElements(object.renderingPrimitive, object.geometry.indexCount, this._gl.UNSIGNED_INT, 4 * object.geometry.indexStart);
		}
		else {
			//non indexed
			this._gl.drawArrays(object.renderingPrimitive, 0, object.geometry.vertices.count());
		}*/

		object.draw(this._gl, this._glManager);
	}

	/**
	 * Set attribute values.
	 *
	 * @param program The program to set attribute values for.
	 * @param object Object with attribute values.
	 * @param vertices Mesh vertices.
	 */
	//GLOBAL ATTRIBUTES
	_setup_attributes(program, object) {
		/**
		 * Modified by Sebastien
		 */
		//let vertices = objects[i].geometry.vertices;
		let attributeSetter = program.attributeSetter;
		let attributes = Object.getOwnPropertyNames(attributeSetter);

		let customAttributes;

		// If material is a type of CustomShaderMaterial it may contain its own definition of attributes
		if (object.material instanceof CustomShaderMaterial) {
			customAttributes = object.material._attributes;
		}

		let buffer;

		// Set all of the properties
		for (let i = 0; i < attributes.length; i++) {

			switch (attributes[i]) {
				case "VPos":
					/**
					 * Modified by Sebastien
					 */
					let vertices = object.geometry.vertices;
					buffer = this._glManager.getAttributeBuffer(vertices);
					//attributeSetter["VPos"].set(buffer, 3, object.instanced, vertices.divisor);
					attributeSetter["VPos"].set(buffer, vertices.itemSize, object.instanced, vertices.divisor);
					break;
				case "VNorm":
					let normals = object.geometry.normals;
					buffer = this._glManager.getAttributeBuffer(normals);
					attributeSetter["VNorm"].set(buffer, 3, object.instanced, normals.divisor);
					break;
				case "VColor":
					let vertColor = object.geometry.vertColor;
					buffer = this._glManager.getAttributeBuffer(vertColor);
					attributeSetter["VColor"].set(buffer, 4, object.instanced, vertColor.divisor);
					break;
				case "uv":
					let uv = object.geometry.uv;
					buffer = this._glManager.getAttributeBuffer(uv);
					attributeSetter["uv"].set(buffer, 2, object.instanced, uv.divisor);
					break;
				case "MMat":
					const MMat = object.geometry.MMat;
					buffer = this._glManager.getAttributeBuffer(MMat);
					attributeSetter["MMat"].set(buffer, 16, object.instanced, MMat.divisor);
					break;
				default:
					let found = false;

					// Check if the custom attributes are given
					if (customAttributes !== undefined) {
						let attr = customAttributes[attributes[i]];

						// If attribute is defined in the custom attribute object, fetch buffer and bind it to program
						if (attr !== undefined) {
							found = true;
							buffer = this._glManager.getAttributeBuffer(attr);
							/**
							 * Modified by Sebastien
							 * changed: attributeSetter[attributes[i]].set(buffer, 3);
							 */
							//attributeSetter[attributes[i]].set(buffer, 3);
							attributeSetter[attributes[i]].set(buffer, attr.itemSize, object.instanced, attr.divisor);
						}
					}

					// Notify the user if the attribute was not found
					if (!found) {
						console.error("Attribute (" + attributes[i] + ") not set!");
					}
					break;
			}
		}
	}

	/**
	 * Set uniform values.
	 *
	 * @param program The program to set uniform values for.
	 * @param object Object with uniform values.
	 * @param camera Camera observing the scene.
	 * @param globalClippingPlanes Global clipping planes.
	 */
	//GLOBAL UNIFORMS (common for all objects/mats in renderer)
	_setup_uniforms(program, object, camera, globalClippingPlanes = undefined) {
		let uniformSetter = program.uniformSetter;

		// Reset the uniform validation
		uniformSetter.__validation.reset();

		if (uniformSetter["PMat"] !== undefined) {
			uniformSetter["PMat"].set(camera.projectionMatrix.elements);
		}

		if (uniformSetter["MVMat"] !== undefined) {
			uniformSetter["MVMat"].set(object.modelViewMatrix.elements);
		}

		if (uniformSetter["NMat"] !== undefined) {
			uniformSetter["NMat"].set(object.normalMatrix.elements);
		}

		/**
		 * Added by Sebastien
		 */
		if (uniformSetter["MMat"] !== undefined) {
			uniformSetter["MMat"].set(object.matrixWorld.elements);
		}
		if (uniformSetter["VMat"] !== undefined) {
			uniformSetter["VMat"].set(camera.matrixWorldInverse.elements);
		}
		if (uniformSetter["cameraPosition"] !== undefined) {
			uniformSetter["cameraPosition"].set(camera.position.toArray());
		}
		if (globalClippingPlanes !== undefined && uniformSetter["globalClippingPlanes"] !== undefined) {
			uniformSetter["globalClippingPlanes"].set(globalClippingPlanes.elements);
		}
		if (uniformSetter["pickingColor"] !== undefined) {
			uniformSetter["pickingColor"].set(object.colorID.toArray());
		}
		if (uniformSetter["scale"] !== undefined) {
			uniformSetter["scale"].set(object.scale.toArray());
		}


		this._setup_light_uniforms(uniformSetter);

		this._setup_material_uniforms(object.material, uniformSetter);

		// Check if all of the uniforms have been set
		let notSet = uniformSetter.__validation.validate();

		if (notSet.length > 0) {
			let notSetString = notSet[0];

			// Notify the user which uniforms have not been set
			for (let i = 1; i < notSet.length; i++) {
				notSetString += ", " + notSet[i];
			}

			console.error("Uniforms (" + notSetString + ") not set!");
			//console.error(object);
			//console.error(program);
			//console.error(uniformSetter);
		}
	}

	/**
	 * Set material uniform values.
	 *
	 * @param material The material to set material uniform values for.
	 * @param uniformSetter Used to set the values.
	 */
	//"LOCAL" UNIFORMS (for specific mat)
	// TODO: Better naming of the uniforms is needed in order to avoid string usage.
	_setup_material_uniforms(material, uniformSetter) {//TODO: Move to object specific - same as draw (Sebastien)
		// Setup custom user uniforms (in case of CustomShaderMaterial)
		if (material instanceof CustomShaderMaterial) {
			let customUniforms = material._uniforms;

			// Set all of the custom uniforms if they are defined within the shader
			for (let name in customUniforms) {
				if (customUniforms.hasOwnProperty(name)) {
					if (uniformSetter[name] !== undefined) {
						uniformSetter[name].set(customUniforms[name]);
					}
				}
			}
		}
		//else {
		if (uniformSetter["material.diffuse"] !== undefined) {
			uniformSetter["material.diffuse"].set(material.color.toArray());
		}

		if (uniformSetter["material.specular"] !== undefined) {
			uniformSetter["material.specular"].set(material.specular.toArray());
		}

		if (uniformSetter["material.shininess"] !== undefined) {
			uniformSetter["material.shininess"].set(material.shininess);
		}
		//}

		// Setup texture uniforms (Are common for both predefined materials and custom shader material)
		let textures = material.maps;

		for (let i = 0; i < textures.length; i++) {
			const texture = "material.texture" + i;
			if (uniformSetter[texture] !== undefined) {
				uniformSetter[texture].set(this._glManager.getTexture(textures[i]), i);
			}else{
				console.warn("Texture unifrom: " + texture + " not used in shader");
			}
		}


		/**
		 * Added by Sebastien
		 */
		//common for all specific mats
		if (material.usePoints === true) {
			if (uniformSetter["pointSize"] !== undefined) {
				uniformSetter["pointSize"].set(material.pointSize);
			}
		}
		if (uniformSetter["lineWidth"] !== undefined) {
			uniformSetter["lineWidth"].set(material.lineWidth);
		}
		if (uniformSetter["spriteSize"] !== undefined) {
			uniformSetter["spriteSize"].set(material.spriteSize.toArray());
		}
		if (material.useClippingPlanes === true) {

			let prefix;
			for (let i = 0; i < material.clippingPlanes.length; i++) {

				/*
				if (uniformSetter["clippingPlanes.normal"] !== undefined){
					uniformSetter["clippingPlanes.normal"].set(material.clippingPlanes[i].normal.toArray());
				}
				if (uniformSetter["clippingPlanes.constant"] !== undefined){
					uniformSetter["clippingPlanes.constant"].set(material.clippingPlanes[i].constant);
				}
				*/

				prefix = "clippingPlanes[" + i + "]";
				if (uniformSetter[prefix + ".normal"] !== undefined){
					uniformSetter[prefix + ".normal"].set(material.clippingPlanes[i].normal.toArray());
				}
				if (uniformSetter[prefix + ".constant"] !== undefined){
					uniformSetter[prefix + ".constant"].set(material.clippingPlanes[i].constant);
				}
			}
		}
		if (material.transparent === true) {
			if (uniformSetter["alpha"] !== undefined) {
				uniformSetter["alpha"].set(material.opacity);
			}
		}
		if (material instanceof OutlineBasicMaterial){
			if (uniformSetter["offset"] !== undefined) {
				uniformSetter["offset"].set(material.offset);
			}
		}
	}

	/**
	 * Set material setting values.
	 *
	 * @param material The material to set material setting values for.
	 */
	_setup_material_settings(material) {
		this._setup_material_side(material.side);
		this._setup_material_depth(material.depthTest, material.depthFunc, material.depthWrite);
	}
	_setup_material_side(materialSide){
		// Determine the type of face culling
		if (materialSide === FRONT_AND_BACK_SIDE) {
			this._gl.disable(this._gl.CULL_FACE);
		}
		else if (materialSide === FRONT_SIDE) {
			this._gl.enable(this._gl.CULL_FACE);
			this._gl.cullFace(this._gl.BACK);
		}
		else if (materialSide === BACK_SIDE) {
			this._gl.enable(this._gl.CULL_FACE);
			this._gl.cullFace(this._gl.FRONT);
		}
	}
	_setup_material_depth(depthTest, depthFunc, depthWrite){
		// If depth testing is not enabled set depth function to always pass
		if (depthTest) {
			/**
			 * Added by Sebastien
			 */
			this._gl.enable(this._gl.DEPTH_TEST);


			switch (depthFunc) {
				case FUNC_LEQUAL:
					this._gl.depthFunc(this._gl.LEQUAL);
					break;
				case FUNC_LESS:
					this._gl.depthFunc(this._gl.LESS);
					break;
				case FUNC_GEQUAL:
					this._gl.depthFunc(this._gl.GEQUAL);
					break;
				case FUNC_GREATER:
					this._gl.depthFunc(this._gl.GREATER);
					break;
				case FUNC_EQUAL:
					this._gl.depthFunc(this._gl.EQUAL);
					break;
				case FUNC_NOTEQUAL:
					this._gl.depthFunc(this._gl.NOTEQUAL);
					break;
				case FUNC_NEVER:
					this._gl.depthFunc(this._gl.NEVER);
					break;
				case FUNC_ALWAYS:
					this._gl.depthFunc(this._gl.ALWAYS);
					break;
			}
		}
		else if (!depthTest) {
			/**
			 * Modified by Sebastien
			 */
			//this._gl.depthFunc(this._gl.ALWAYS);
			this._gl.disable(this._gl.DEPTH_TEST);
		}


		// Enable/Disable depth writing
		this._gl.depthMask(depthWrite);
	}

	/**
	 * Set light uniform values.
	 *
	 * @param uniformSetter Used to set the values.
	 */
	_setup_light_uniforms(uniformSetter) {

		if (uniformSetter["ambient"] !== undefined) {
			uniformSetter["ambient"].set(this._lightsCombined.ambient);
		}

		var index = 0, prefix, light;

		// DIRECTIONAL LIGHTS
		for (let i = 0; i < this._lightsCombined.directional.length; i++) {
			prefix = "lights[" + index + "]";
			light = this._lightsCombined.directional[i];

			if (uniformSetter[prefix + ".position"]) {
				uniformSetter[prefix + ".position"].set(light.direction.toArray());
			}
			if (uniformSetter[prefix + ".color"]) {
				uniformSetter[prefix + ".color"].set(light.color.toArray());
			}
			if (uniformSetter[prefix + ".directional"]) {
				uniformSetter[prefix + ".directional"].set(1);
			}

			index++;
		}

		// POINT LIGHTS
		for (let i = 0; i < this._lightsCombined.point.length; i++) {
			prefix = "lights[" + index + "]";
			light = this._lightsCombined.point[i];

			if (uniformSetter[prefix + ".position"]) {
				uniformSetter[prefix + ".position"].set(light.position.toArray());
			}
			if (uniformSetter[prefix + ".color"]) {
				uniformSetter[prefix + ".color"].set(light.color.toArray());
			}
			if (uniformSetter[prefix + ".directional"]) {
				uniformSetter[prefix + ".directional"].set(0);
			}

			index++;
		}
	}

	/**
	 * Project an object.
	 *
	 * @param object Object to be projected.
	 * @param camera Camera observing the scene.
	 */
	// TODO: Optimize required programs string. Overhead due to the string comparison is too big!
	_projectObject(object, camera) {

		// If object is not visible do not bother projecting it
		if (object.visible === false)
			return;

		// If the object is light push it to light cache array
		if (object instanceof Light) {
			this._lights.push(object);
		}
		// If the object is mesh and it's visible. Update it's attributes.
		else if (object instanceof Mesh || object instanceof Outline) {

			// Frustum culling
			if (object.frustumCulled === false || this._isObjectVisible(object) || this._screenshotInProgress) {

				/**
				 * Changed by Sebastien
				 */
				if(object.staticStateDirty === true) {
					// Adds required program to the array of required programs if it's not present in it already
					///let requiredProgram = object.material.requiredProgram();
					this._fillRequiredPrograms(object.material.requiredProgram(this));


					/*const requiredPickingProgram = object.pickingMaterial.requiredProgram(this);
					let foundPicking = false;
					for (let i = 0; i < this._requiredPrograms.length; i++) {
						if (requiredPickingProgram.compare(this._requiredPrograms[i])) {
							foundPicking = true;
							break;
						}
					}
					if(!foundPicking) this._requiredPrograms.push(requiredPickingProgram);*/
					this._fillRequiredPrograms(object.pickingMaterial.requiredProgram(this));
					//if(object.pickable)


					object.staticStateDirty = false;
				}
				//if (object.visible === true) {
				// Updates or derives attributes from the WebGL geometry
				this._glManager.updateObjectData(object);

				// Derive mv and normal matrices
				object.modelViewMatrix.multiplyMatrices(camera.matrixWorldInverse, object.matrixWorld);
				/*if(object instanceof Sprite) {
					object.modelViewMatrix.elements[0] = object.matrixWorld.elements[0];
					object.modelViewMatrix.elements[5] = object.matrixWorld.elements[5];
				}*/
				object.normalMatrix.getNormalMatrix(object.modelViewMatrix);


				// VPT object are rendered twice, as volume and as mesh. Add to VPT queue
				if (object instanceof VPTVolume) {
					this._VPTObjects.push(object);
				}

				if(object instanceof Mesh) {
					// Add object to correct render array
					if (object.material.transparent) {
						this._zVector.setFromMatrixPosition(object.matrixWorld);
						/**
						 * Changed by Sebastien
						 * this._zVector.applyProjection(this._projScreenMatrix); changed to this._zVector.applyMatrix4(this._projScreenMatrix);
						 */
						this._zVector.applyMatrix4(this._projScreenMatrix); //applyProjection deprecated to applyMatrix4
						object._z = this._zVector.z;

						if(object.useOutline) {
							this._transparentObjectsWithOutline.push(object);
						}else{
							this._transparentObjects.push(object);
						}
					} else {
						if(object.useOutline) {
							this._opaqueObjectsWithOutline.push(object);
						}else {
							this._opaqueObjects.push(object);
						}
					}
				}
				//}
			}
		}
		// Scene is only an abstract representation
		else if (!(object instanceof Scene) && !(object instanceof Group)) {
			console.log("MeshRenderer: Received unsupported object type")
		}

		// Recursively descend through children and project them
		let children = object.children;

		// Recurse through the children
		for (let i = 0, l = children.length; i < l; i++) {
			this._projectObject(children[i], camera);

		}
	}
	_fillRequiredPrograms(requiredProgram){
		// Adds required program to the array of required programs if it's not present in it already
		///let requiredProgram = object.material.requiredProgram();
		//let requiredProgram = object.material.requiredProgram(this);
		let found = false;
		//for (let i = 0; i < this._requiredPrograms; i++) {
		for (let i = 0; i < this._requiredPrograms.length; i++) {
			if (requiredProgram.compare(this._requiredPrograms[i])) {
				found = true;
				break;
			}
		}

		// If the program was not found add it to required programs array
		if (!found) {
			this._requiredPrograms.push(requiredProgram);

			//let requiredPickingProgram = object.material.requiredPickingProgram(this);
		}
		/*for (let i = 0; i < this._requiredPrograms.length; i++) {
             if (requiredProgram.compareID2(this._requiredPrograms[i])) {
                 found = true;
                 break;
             }
         }*/
		//if(this._requiredPrograms[requiredProgram.programID] === undefined) this._requiredPrograms[requiredProgram.programID] = requiredProgram;
		//this._requiredPrograms[requiredProgram.programID] = requiredProgram;
		//this._requiredPrograms.push(object.material.requiredProgram());
	}

	/**
	 * Set up all of the lights found during the object projections. The lights are summed up into a single lights
	 * structure representing all of the lights that affect the scene in the current frame.
	 *
	 * @param lights Array of lights that were found during the projection.
	 * @param camera Camera observing the scene.
	 */
	_setupLights(lights, camera) {

		// Reset combinedLights
		this._lightsCombined.ambient = [0, 0, 0];
		this._lightsCombined.directional.length = 0;
		this._lightsCombined.point.length = 0;

		// Light properties
		let light,
			color,
			intensity,
			distance;

		// Light colors
		let r = 0, g = 0, b = 0;

		for (let i = 0; i < lights.length; i++) {

			light = lights[i];

			color = light.color;
			intensity = light.intensity;

			if (light instanceof AmbientLight) {
				r += color.r * intensity;
				g += color.g * intensity;
				b += color.b * intensity;
			}
			else if (light instanceof DirectionalLight) {

				let lightProperties = {
					color: new Color(),
					direction: new Vector3()
				};

				lightProperties.color.copy(light.color).multiplyScalar(light.intensity);
				lightProperties.direction.setFromMatrixPosition(light.matrixWorld);
				lightProperties.direction.transformDirection(camera.matrixWorldInverse);

				this._lightsCombined.directional.push(lightProperties);
			}
			else if (light instanceof PointLight) {

				let lightProperties = {
					color: new Color(),
					position: new Vector3()
				};

				// Move the light to camera space
				lightProperties.position.setFromMatrixPosition(light.matrixWorld);
				lightProperties.position.applyMatrix4(camera.matrixWorldInverse);

				// Apply light intensity to color
				lightProperties.color.copy(light.color).multiplyScalar(light.intensity);

				this._lightsCombined.point.push(lightProperties);
			}
		}

		this._lightsCombined.ambient[0] = r;
		this._lightsCombined.ambient[1] = g;
		this._lightsCombined.ambient[2] = b;
	}

	/**
	 * Check if an object is visible.
	 *
	 * @param object Object to be checked.
	 * @returns True if the object is visible.
	 */
	_isObjectVisible(object) {
		let geometry = object.geometry;

		// Check if the bounding sphere is calculated
		if (geometry.boundingSphere === null) {
			geometry.computeBoundingSphere();
		}

		// Translate sphere
		this._sphere.copy(geometry.boundingSphere).applyMatrix4(object.matrixWorld);

		// Check if the frustum intersects the sphere
		return this._frustum.intersectsSphere(this._sphere)
	}


	pick(x, y, callback){
		this._pickEnabled = true;
		this._pickCoordinateX = x;
		this._pickCoordinateY = y;
		this._pickCallback = callback;
	}
}