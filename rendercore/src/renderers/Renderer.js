/**
 * Created by Ziga on 25.3.2016.
 */


/**
 * Interface for renderers, implemented by VolumeRenderer, MeshRenderer, etc.
 * @class Renderer
 */

import {ShaderLoader} from '../loaders/ShaderLoader.js';
import {GLManager} from '../core/GLManager.js';
import {GLProgramManager} from '../program_management/GLProgramManager.js';
import {Camera} from '../cameras/Camera.js';

import {_Math} from '../math/Math.js';

export class Renderer {
	// Subclasses perform WebGL initialization, texture allocation, etc.
	// Renderers can be run offline, without WebGL.
	constructor(canvas, gl_version, optionalContextAttributes) {
		// Create new gl manager with appropriate version
		this._glManager = new GLManager(canvas, gl_version, optionalContextAttributes);
		this._canvas = canvas;

		// Retrieve context from gl manager
		this._gl = this._glManager.context;

		// Throw error if the gl context could not be retrieved
		// TODO: Put this in GLManager
		if (!this._gl) {
			throw 'Something went wrong while initializing WebGL context.'
		}

		// Program management
		this._glProgramManager = new GLProgramManager(this._gl);
		this._shaderLoader = new ShaderLoader();

		/**
		 * Changed by Sebastien
		 */
		this._requiredPrograms = [];
		//this._requiredPrograms = {};
		this._compiledPrograms = new Map();
		this._loadingPrograms = new Set();

		// Render target
		this._currentRenderTarget = null;

		//region Execution values
		this._autoClear = true;
		//endregion

		this._selectedRenderer = null;


		/**
		 * Added by Sebastien
		 */
		// Unique identifier
		this._uuid = _Math.generateUUID();
		// material ID map
		this._materialIDMap = new Map();
		this._materialID = 0;


		//screenshot
		this._takeScreenshot = false;
		this._screenshotInProgress = false;
		this._segmentedScreenshot = false;
		this._screenshotSizeMultiplier = 1;
		this._renderQueue = undefined;
		this._screenshotTextureReference = undefined;
		this._screenshotData = new Uint8ClampedArray();
	}

	render(scene, camera, renderTarget) {
		// Check if correct object instance was passed as camera
		if (camera instanceof Camera === false) {
			console.error(LOGTAG + "Given camera is not an instance of Camera");
			return;
		}

		// If camera is not part of the scene.. Update its worldMatrix anyways
		if (camera.parent === null)
			camera.updateMatrixWorld();

		camera.matrixWorldInverse.getInverse(camera.matrixWorld);

		// Clear intermediate data from the previous render call
		/**
		 * Changed by Sebastien
		 */
		//this._requiredPrograms = [];
		//this._compiledPrograms.clear();

		// Check if render target was specified
		if (renderTarget !== undefined) {
			this._initRenderTarget(renderTarget);
		}

		// Clear color, depth and stencil buffer
		if (this._glManager.autoClear) {
			this._glManager.clear(true, true, true);
		}

		// Calls selected renderer function which should be overrided in the extending class
		this._selectedRenderer(scene, camera);


		// Added by Sebastien
		// Last stop: take screenshot
		if(this._takeScreenshot) {
			this._takeScreenshot = false;
			this._screenshotInProgress = true;


			console.log("Taking screenshot...");
			const imageData = (this._segmentedScreenshot) ? this._takeSegmentedScreenshot(scene, camera, renderTarget,  this._renderQueue, this._screenshotTextureReference) : this._takeFullScreenshot(this._screenshotTextureReference);
			this._glManager.openImageInNewTab(imageData);
			

			this._screenshotInProgress = false;
		}


		// If RTT cleanup viewport and frame-buffer
		if (this._currentRenderTarget) {
			this._cleanupRenderTarget();
			this._currentRenderTarget = null;
		}
	}


	// Added by Sebastien
	_takeFullScreenshot(reference = undefined){
		//const width = this.getViewport().width;
		//const height = this.getViewport().height;
		const width = (reference)? reference.width : this.getViewport().width;
		const height = (reference)? reference.height : this.getViewport().height;

		//const data = new Uint8Array(width * height * 4);
		///const data = new Uint8ClampedArray(width * height * 4);
		if(this._screenshotData.length !== width * height * 4) this._screenshotData = new Uint8ClampedArray(width * height * 4);


		//PREP
		if(reference){
			const fb = this._gl.createFramebuffer();
			this._gl.bindFramebuffer(this._gl.FRAMEBUFFER, fb);
			const texture = this._glManager._textureManager.getTexture(reference);
			this._gl.framebufferTexture2D(this._gl.FRAMEBUFFER, this._gl.COLOR_ATTACHMENT0, this._gl.TEXTURE_2D, texture, 0);
		}

		//READ
		this._gl.readPixels(0, 0, width, height, this._gl.RGBA, this._gl.UNSIGNED_BYTE, this._screenshotData);

		//CLEAN
		if(reference){
			this._gl.bindFramebuffer(this._gl.FRAMEBUFFER, null);
		}


		this._glManager.flipImage(this._screenshotData, width, height);
		//const imageData = new ImageData(new Uint8ClampedArray(data.buffer), width, height);
		const imageData = new ImageData(this._screenshotData, width, height);


		return imageData;
	}
	_takeSegmentedScreenshot(scene, camera, renderTarget, renderQueue = undefined, reference = undefined){
		//const width = this.getViewport().width;
		//const height = this.getViewport().height;
		const width = (reference)? reference.width : this.getViewport().width;
		const height = (reference)? reference.height : this.getViewport().height;

		const originalLeft = camera.left;
		const originalRight = camera.right;
		const originalTop = camera.top;
		const originalBottom = camera.bottom;
		//console.log(originalLeft + "::" + originalRight + "::" + originalTop + "::" + originalBottom);


		const n_piecesX = this._screenshotSizeMultiplier;
		const n_piecesY = this._screenshotSizeMultiplier;
		const stepX = (-originalLeft + originalRight) / n_piecesX;
		const stepY = (originalTop - originalBottom) / n_piecesY;
		//console.log(stepX + "::" + stepY);
		let arr = new Uint8ClampedArray(width*n_piecesX*4 * height*n_piecesY);


		//for
		let blockY = 0;
		for(let y = originalTop; y > originalBottom; y-=stepY){
			camera.top = y;
			camera.bottom = y - stepY;


			//const blockX = [];
			let blockX = 0;
			for(let x = originalLeft; x < originalRight; x+=stepX){
				camera.left = x;
				camera.right = x + stepX;
				
		
				//update projection matrix + render
				(renderQueue)? renderQueue.render() : this.render(scene, camera, renderTarget);
				console.log("Taking screenshot block...");
				const imageDataBlock = this._takeFullScreenshot(reference);


				//combine final image by blocks, inline
				for(let h = 0; h < height; h++){
					for(let w = 0; w < width*4; w++){
						arr[blockY*width*n_piecesX*height*4 + h*width*n_piecesX*4 + blockX*width*4 + w] = imageDataBlock.data[h*width*4 + w];
					}
				}

				//blockX.push(imageDataBlock.data);
				blockX++;
			}
			
			//combine final image by blocks
			/*for(let i = 0; i < n_piecesX; i++){
				for(let h = 0; h < height; h++){
					for(let w = 0; w < width*4; w++){
						arr[blockY*width*n_piecesX*height*4 + h*width*n_piecesX*4 + i*width*4 + w] = blockX[i][h*width*4 + w];
					}
				}
			}*/

			//combine final image by individual rows
			/*for(let h = 0; h < height; h++){
				for(let i = 0; i < n_piecesX; i++){
					for(let w = 0; w < width*4; w++){
						arr[blockY*width*n_piecesX*height*4 + h*width*n_piecesX*4 + i*width*4 + w] = blockX[i][h*width*4 + w];
					}
				}
			}*/
			blockY++;
		}

		
		//reset camera
		camera.left = originalLeft;
		camera.right = originalRight;
		camera.top = originalTop;
		camera.bottom = originalBottom;
		(renderQueue)? renderQueue.render() : this.render(scene, camera, renderTarget);


		//const imageData = this._takeFullScreenshot();
		const imageData = new ImageData(arr, width*n_piecesX, height*n_piecesY);
		return imageData;
	}

	// region PROGRAM MANAGEMENT
	_downloadProgram(programName, index) {
		let scope = this;

		// Called when the program template is loaded.. Initiates shader compilation
		let onLoad = function (programTemplateSrc) {
			console.log("(Down)loaded: " + programName + '.');
			scope._glProgramManager.addTemplate(programTemplateSrc);
			scope._loadingPrograms.delete(programName);


			/*
			// TODO: Put this somewhere else? here?
			console.log("Initiate compile for: " + programName + '.');
			// Build program for specific number of lights (is disregarded if the shader is not using lights)
			let numLights = 0;
			if (scope._lightsCombined) {
				numLights = scope._lightsCombined.directional.length + scope._lightsCombined.point.length;
			}

			let program = scope._glProgramManager.fetchProgram(scope._requiredPrograms[index], numLights);

			// Bind required program and compiled program
			scope._compiledPrograms.set(scope._requiredPrograms[index].programID, program);

			console.log("Compiled: " + programName + '.');
			scope._requiredPrograms.splice(index, 1);
			*/
		};

		// Something went wrong while fetching the program templates
		let onError = function (event) {
			console.error("Failed to load program: " + programName + '.');
			scope._loadingPrograms.delete(programName);
		};

		// Check if the program is already loading
		if (!this._loadingPrograms.has(programName)) {
			console.log("(Down)loading: " + programName + '.');
			this._loadingPrograms.add(programName);

			// Initiate loading
			this._shaderLoader.loadProgramSources(programName, onLoad, undefined, onError);
		}
	}

	//Added by Sebastien
	/*openTextureInNewTab(reference) {//DEPRECATED
		return this._glManager.openTextureInNewTab(reference);
	}*/

	downloadTexture(reference, name) {
		return this._glManager.downloadTexture(reference, name);
	}

	_loadRequiredPrograms() {
		let everythingLoaded = true;

		// Fetch the required programs
		/**
		 * Changed by Sebastien
		 */
		for (let i = 0; i < this._requiredPrograms.length; i++) {

			// Fetch program name
			let programName = this._requiredPrograms[i].name;

			// Check is the required program template is already downloaded
			if (!this._glProgramManager.isTemplateDownloaded(programName)) {
				everythingLoaded = false;

				this._downloadProgram(programName, i);
			}
			else {
				//console.log("Initiate compile for: " + programName + '.');
				// TODO: Put this somewhere else?
				// Build program for specific number of lights (is disregarded if the shader is not using lights)
				let numLights = 0;
				if (this._lightsCombined) {
					numLights = this._lightsCombined.directional.length + this._lightsCombined.point.length;
				}

				let program = this._glProgramManager.fetchProgram(this._requiredPrograms[i], numLights);

				// Bind required program and compiled program
				this._compiledPrograms.set(this._requiredPrograms[i].programID, program);

				///console.log("Compiled: " + programName + '.');
				this._requiredPrograms.splice(i, 1);
				i--;
			}
		}
		/*for (let requiredProgram in this._requiredPrograms){
			//if (this._requiredPrograms.hasOwnProperty(requiredProgram)) {
				// Fetch program name
				let programName = this._requiredPrograms[requiredProgram].name;

				// Check is the required program template is already downloaded
				if (!this._glProgramManager.isTemplateDownloaded(programName)) {
					everythingLoaded = false;

					this._downloadProgram(programName);
				}
				else {
					// TODO: Put this somewhere else?
					// Build program for specific number of lights (is disregarded if the shader is not using lights)
					let numLights = 0;
					if (this._lightsCombined) {
						numLights = this._lightsCombined.directional.length + this._lightsCombined.point.length;
					}

					let program = this._glProgramManager.fetchProgram(this._requiredPrograms[requiredProgram], numLights);

					// Bind required program and compiled program
					this._compiledPrograms.set(this._requiredPrograms[requiredProgram].programID, program);
				}
			//}
		}*/

		return everythingLoaded;
	}

	preDownloadPrograms(programList) {

		for (let i = 0; i < programList.length; i++) {
			if (!this._glProgramManager.isTemplateDownloaded(programList[i])) {
				this._downloadProgram(programList[i]);
			}
		}
	}
	// endregion

	// region RENDER TARGET
	_initRenderTarget(renderTarget) {
		// Check if the render target is specified
		this._currentRenderTarget = renderTarget;
		let rttViewport = renderTarget._viewport;

		// Setup viewport
		this._gl.viewport(rttViewport.x, rttViewport.y, rttViewport.z, rttViewport.w);

		this._glManager.initRenderTarget(renderTarget);
	}

	_cleanupRenderTarget() {
		this._currentRenderTarget = null;
		this._gl.viewport(0, 0, this._canvas.width, this._canvas.height);

		this._glManager.cleanupRenderTarget();
	}
	// endregion

	/**
	 * Clears cached attributes such as position arrays, indices and uv coordinates as well as cached textures.
	 */
	clearCachedAttributes() {
		this._glManager.clearAttributeBuffers();
	}

	/**
	 * Sets the url to shader server & directory from which the shaders source is loaded.
	 * @param url Full url to the shader server directory
	 */
	addShaderLoaderUrls (...urls) { this._shaderLoader.addUrls(urls); }

	// region SETTERS / GETTERS
	/**
	 * SETTERS / GETTERS
	 */
	set autoClear(clear) {
		this._autoClear = clear;
	}

	get autoClear() {
		return this._autoClear;
	}

	set clearColor(hexColor) {
		let components = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hexColor);
		if (components) {
			this._glManager.setClearColor(parseInt(components[1], 16) / 255, parseInt(components[2], 16) / 255, parseInt(components[3], 16) / 255, parseInt(components[4], 16) / 255);
		}
	}

	/**
	 * Modified by Sebastien
	 */
	/*updateViewport(width, height) {
		this._gl.viewport(0, 0, width, height);
	}*/
	updateViewport(width, height, xOffset = 0, yOffset = 0) {
		this._gl.viewport(xOffset, yOffset, width, height);
	}

	getViewport() {
		/**
		 * Modified by Sebastien
		 */
		const viewport = this._gl.getParameter(this._gl.VIEWPORT);

		//return {width: this._canvas.width, height: this._canvas.height};
		return {x: viewport[0], y: viewport[1], width: viewport[2], height: viewport[3]};
	}
	// endregion

	/**
	 * Added by Sebastien
	 */
	get glManager(){
		return this._glManager;
	}
	get gl(){
		return this._glManager.gl;
	}
	get glContextAttributes(){
		return this._glManager.contextAttributes;
	}
	generateMaterialID(programName = undefined){
		if(programName !== undefined){
			if(this._materialIDMap.has(programName)){
				return this._materialIDMap.get(programName);
			}else{
				let newMaterialID = this._materialID;
				this._materialIDMap.set(programName, newMaterialID);
				this._materialID++;

				return newMaterialID;
			}
		}else {
			return this._materialID++;
		}
	}

	takeScreenshot(segmented = false, sizeMultiplier = 1, renderQueue = undefined, reference = undefined){
		this._takeScreenshot = true;

		this._segmentedScreenshot = segmented;
		this._screenshotSizeMultiplier = sizeMultiplier;

		this._renderQueue = renderQueue;
		this._screenshotTextureReference = reference;
	}
};
