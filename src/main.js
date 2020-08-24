import * as RC from "/rendercore/src/RenderCore.js";

class App {
	constructor(canvas) {
		window.app = this;
		// Canvas
		this.canvas = canvas;
		// Renderer
		this.renderer = new RC.MeshRenderer(this.canvas, RC.WEBGL2);
		this.renderer.clearColor = "#000000FF";
		this.renderer.addShaderLoaderUrls("/rendercore/src/shaders");
		this.renderer.addShaderLoaderUrls("/src/shaders");
		
		this.gl = this.renderer._gl;

		this.keyboardInput = RC.KeyboardInput.instance;
		this.mouseInput = RC.MouseInput.instance;
		this.mouseInput.setSourceObject(window);

		this.initSettings();
		this.initMeshes();
		this.initScene();
		this.initRenderQueue();
		this.resize();

		window.addEventListener("resize", () => { this.resize(); }, false);

		this.loadResources(
			() => { window.requestAnimationFrame(() => { this.update(); }); }
		);
		//window.requestAnimationFrame(() => { this.update(); });
	}

	initSettings() {
		// Animation timer
		this.timer = { curr: 0, prev: 0, delta: 0 };
		// FPS
		this.fpsCount = 0;
		this.fpsTime = 0;
		// DOF
		this.dof = {
			f: 8.0, // Focal length
			a: 1.0, // Aperture radius
			v0: 4.0, // Distance in focus
			v0_target: 4.0,
			numPasses: 1,
			lastUpdate: 0.0,
			focus: {x: 640, y: 360},
			mousedown: {x: -1, y: -1}
		}		
		document.addEventListener("mousedown", (event) => {
			this.dof.mousedown.x = event.clientX;
			this.dof.mousedown.y = event.clientY;
		});
		document.addEventListener("mouseup", (event) => {
			let x = event.clientX, y = event.clientY;
			if (x === this.dof.mousedown.x && y === this.dof.mousedown.y &&
				x >= 0 && x < this.canvas.width && y >= 0 && y < this.canvas.height) {
				this.dof.focus.x = x;
				this.dof.focus.y = this.canvas.height - 1 - y;
			}
		});
		// Lights
		this.lights = {
			shadowRes: 512,
			lookupRes: 256,
			frustum: [],
			point: []
		};
	}

	initMeshes() {
		// Frustum geometry
		let sz = this.lights.shadowRes;
		let vbo = new Float32Array((sz * sz + 1) * 3);
		for (let y = 0; y < sz; ++y) {
			for (let x = 0; x < sz; ++x) {
				let i = x + sz * y;
				vbo[3 * i + 0] = (x + 0.5) / sz;
				vbo[3 * i + 1] = 1.0 - (y + 0.5) / sz;
				vbo[3 * i + 2] = 0.0;
			}
		}
		vbo[sz * sz * 3 + 0] = 0.0;
		vbo[sz * sz * 3 + 1] = 0.0;
		vbo[sz * sz * 3 + 2] = 1.0;

		let ibo = new Uint32Array(((sz-1) * (sz-1) * 2 + 4 * (sz-1)) * 3);
		for (let y = 0; y < sz-1; ++y) {
			for (let x = 0; x < sz-1; ++x) {
				let i = x + (sz-1) * y;
				let j0 = x + sz * y;
				let j1 = x + sz * (y+1);

				ibo[6 * i + 0] = j0;
				ibo[6 * i + 1] = j0+1;
				ibo[6 * i + 2] = j1;

				ibo[6 * i + 3] = j1;
				ibo[6 * i + 4] = j0+1;
				ibo[6 * i + 5] = j1+1;
			}
		}
		let iLast = sz * sz;
		let ioff = 6 * (sz-1) * (sz-1);

		let offset = [0, sz * sz - 1, sz - 1, sz * (sz-1)]; // top left, bot right, top right, bot left
		let increment = [1, -1, sz, -sz];
		for (let j = 0; j < sz-1; ++j) {
			for (let k = 0; k < 4; ++k) {
				ibo[ioff++] = iLast;
				ibo[ioff++] = offset[k] + increment[k];
				ibo[ioff++] = offset[k];
				offset[k] += increment[k];
			}
		}
		if (ioff !== ((sz-1) * (sz-1) * 2 + 4 * (sz-1)) * 3)
			throw "Incorrect number of indices!";

		this.lights.frustumGeo = new RC.Geometry();
		this.lights.frustumGeo.vertices = new RC.BufferAttribute(vbo, 3);
		this.lights.frustumGeo.indices  = new RC.BufferAttribute(ibo, 1);
		//this.lights.frustumGeo.drawWireframe = true;
	}

	addFrustumLight(position, target, color) {
		if (position === undefined) position = new RC.Vector3(0, 0, 0);
		if (target === undefined) target = new RC.Vector3(0, 0, -1).add(position);
		if (color === undefined) color = new RC.Color(1, 1, 1);

		let l = {
			intensity: 1.0,
			beta: 0.01,
			volumeIntensity: 5000.0,
			color: color,
			camera: new RC.PerspectiveCamera(90, 1.0, 0.1, 500.0),
			texture: new RC.Texture(
				null, RC.Texture.RepeatWrapping, RC.Texture.RepeatWrapping,	RC.Texture.NearestFilter, RC.Texture.NearestFilter,
				RC.Texture.DEPTH_COMPONENT24, RC.Texture.DEPTH_COMPONENT, RC.Texture.UNSIGNED_INT, this.lights.shadowRes, this.lights.shadowRes),
			scene: new RC.Scene()
		};
		l.camera.position = position;
		l.camera.lookAt(target, new RC.Vector3(0.0, 1.0, 0.0));
		l.camera.updateMatrixWorld();
		l.camera.matrixWorldInverse.getInverse(l.camera.matrixWorld);
		//l.lightSpaceMat.multiplyMatrices(l.camera.projectionMatrix, l.camera.matrixWorldInverse);
		
		l.PMatInv = new RC.Matrix4().getInverse(l.camera.projectionMatrix);

		let mat = new RC.CustomShaderMaterial("light_volume", {});
		mat.color = color;
		mat.depthWrite = true;
		mat.depthTest = false;
		mat.lights = false;
		mat.transparent = true;
		mat.side = RC.FRONT_AND_BACK_SIDE;
		mat.addMap(l.texture);
		
		l.mesh = new RC.Mesh(this.lights.frustumGeo, mat);
		l.mesh.frustumCulled = false;

		l.scene.add(l.mesh);
		this.lights.frustum.push(l);
		return l;
	}

	createPhongMat(color, specular, shininess) {
		if (color === undefined) color = new RC.Color(1, 1, 1);
		if (specular === undefined) specular = new RC.Color(1, 1, 1);
		if (shininess === undefined) shininess = 1.0;

		let mat = new RC.CustomShaderMaterial("phong_liquid", {
			"uLiquidColor": this.liquidColor.toArray(),
			"uLiquidAtten": this.liquidAtten.toArray()
		});
		mat.color = color;
		mat.specular = specular;
		mat.shininess = shininess;
		return mat;
	}

	initScene() {
		/// Main scene
		this.scene = new RC.Scene();
		this.particleScene = new RC.Scene();

		this.camera = new RC.PerspectiveCamera(60, this.canvas.width / this.canvas.height, 0.1, 1000);
		this.camera.position = new RC.Vector3(0, 0.75, 4);
		this.camera.lookAt(new RC.Vector3(0, 0, 0), new RC.Vector3(0, 1, 0));
		this.PMatInv = new RC.Matrix4().getInverse(this.camera.projectionMatrix);
		
		this.cameraManager = new RC.CameraManager();
		this.cameraManager.addOrbitCamera(this.camera, new RC.Vector3(0, 0, 0));
		this.cameraManager.activeCamera = this.camera;

		// Liquid color
		this.liquidColor = new RC.Color(0.0, 0.18, 0.4); // (0, 0.3, 0.7);
		this.liquidColor.multiplyScalar(0.5);
		this.liquidAtten = new RC.Vector3(0.07, 0.06, 0.05);
		this.liquidAtten.multiplyScalar(1.8);

		// Volumetric lights
		this.addFrustumLight(new RC.Vector3(-4, 10, -20), new RC.Vector3(0, 0, 0), new RC.Color(0.8, 0.8, 0.2)).intensity = 0.7;
		this.addFrustumLight(new RC.Vector3(10, 10, 10),  new RC.Vector3(0, 0, 0), new RC.Color(1.0, 0.2, 0.5)).intensity = 0.9;
		this.addFrustumLight(new RC.Vector3(20, 40, -8),  new RC.Vector3(0, 0, 0), new RC.Color(0.9, 0.1, 1.0)).intensity = 2.0;
		this.lights.frustum[2].volumeIntensity = 8000.0

		// RenderCore Lights
		// this.dLight = new RC.DirectionalLight(new RC.Color("#FFFFFF"), 1.0);
		// this.dLight.position = new RC.Vector3(1.0, 0.5, 0.8);
		// this.pLight = new RC.PointLight(new RC.Color("#FFFFFF"), 1.0);
		// this.pLight.position = new RC.Vector3(-4.0, 10.0, -20.0);
		this.pLight2 = new RC.PointLight(new RC.Color("#FFFFFF"), 1.0);
		this.pLight2.position = new RC.Vector3(10.0, 10.0, 10.0);
		this.aLight = new RC.AmbientLight(new RC.Color("#FFFFFF"), 0.03);

		//this.pLight.add(new RC.Cube(1.0, this.pLight.color));
		//this.pLight2.add(new RC.Cube(1.0, this.pLight.color));

		this.lightsRC = [/*this.pLight, this.pLight2,*/ this.aLight]; // , this.dLight];
		for (let l of this.lightsRC)
			this.scene.add(l);
		// for (let l of this.lights)
		// 	this.particleScene.add(l);

		// Plane
		let plane = new RC.Quad({x: -64, y: 64}, {x: 64, y: -64}, this.createPhongMat());
		plane.material.side = RC.FRONT_AND_BACK_SIDE;


		let pixelData = new Uint8Array([
			230, 230, 230, 255
		]);
		let texture = new RC.Texture(pixelData, RC.Texture.ClampToEdgeWrapping, RC.Texture.ClampToEdgeWrapping,
			RC.Texture.NearestFilter, RC.Texture.NearestFilter,
			RC.Texture.RGBA, RC.Texture.RGBA, RC.Texture.UNSIGNED_BYTE, 1, 1);

		plane.translateY(-4);
		plane.rotateX(Math.PI * 0.5);

		//plane.material.addMap(texture);
		this.scene.add(plane);

		let plane2 = new RC.Quad({x: -64, y: 64}, {x: 64, y: -64}, this.createPhongMat());
		plane2.material.side = RC.FRONT_AND_BACK_SIDE;
		//plane2.material.addMap(texture);
		plane2.translateZ(-35);
		
		this.scene.add(plane2);

		// Texture based particles
		let n_comp = 3;
		this.n_comp = n_comp;
		let sz = 1024;
		let particleData = new Float32Array(sz * sz * n_comp * 4);

		for (let y = 0; y < sz; ++y) {
			for (let x = 0; x < sz; ++x) {
				let i = y * sz + x;
				// Life
				particleData[n_comp * 4 * i + 3] = 0.0;
				// Random
				particleData[n_comp * 4 * i + 7] = Math.random();
			}
		}

		this.particleTex = new RC.Texture(particleData,
			RC.Texture.ClampToEdgeWrapping, RC.Texture.ClampToEdgeWrapping,
			RC.Texture.NearestFilter, RC.Texture.NearestFilter,
			RC.Texture.RGBA32F, RC.Texture.RGBA, RC.Texture.FLOAT,
			sz * n_comp, sz
		);

		this.particleTex2 = new RC.Texture(null,
			RC.Texture.ClampToEdgeWrapping, RC.Texture.ClampToEdgeWrapping,
			RC.Texture.NearestFilter, RC.Texture.NearestFilter,
			RC.Texture.RGBA32F, RC.Texture.RGBA, RC.Texture.FLOAT,
			sz * n_comp, sz
		);

		// Points
		let vertices = new Float32Array(sz * sz * 3);
		for (let y = 0; y < sz; ++y) {
			for (let x = 0; x < sz; ++x) {
				let i = x + sz * y;
				vertices[3 * i + 0] = (x + 0.5 / n_comp) / sz;
				vertices[3 * i + 1] = (y + 0.5) / sz;
				vertices[3 * i + 2] = 0.0;
			}
		}

		let geo = new RC.Geometry();
		geo.vertices = new RC.BufferAttribute(vertices, 3);

		let mat = new RC.CustomShaderMaterial("particles_draw", { "uvOff": 1.0 / (sz * n_comp) });
		mat.color = new RC.Color(1, 1, 1);
		mat.transparent = true;
		mat.opacity = 1.0;
		mat.depthWrite = true;
		mat.depthTest = false;
		mat.usePoints = true;
		mat.pointSize = 12.0;
		mat.lights = true;
		mat.addMap(this.particleTex2);

		this.particleMesh = new RC.Mesh(geo, mat);
		this.particleMesh.renderingPrimitive = RC.POINTS;
		this.particleMesh.frustumCulled = false;

		//this.scene.add(this.particleMesh);
		this.particleScene.add(this.particleMesh);

		// Display particle textures
		let q1 = new RC.Quad({x: -1, y: -.5}, {x: 1, y: .5}, new RC.MeshBasicMaterial());
		q1.position = new RC.Vector3(-3,0,-2);
		q1.material.side = RC.Material.FRONT_AND_BACK_SIDE;
		q1.material.color = new RC.Color("#FFFFFF");
		q1.material.addMap(this.particleTex);
		//this.scene.add(q1);

		let q2 = new RC.Quad({x: -1, y: -.5}, {x: 1, y: .5}, new RC.MeshBasicMaterial());
		q2.position = new RC.Vector3(3,0,-2);
		q2.material.side = RC.Material.FRONT_AND_BACK_SIDE;
		q2.material.color = new RC.Color("#FFFFFF");
		q2.material.addMap(this.particleTex2);
		//this.scene.add(q2);

		this.q1 = q1;
		this.q2 = q2;




		// Shadow map
		this.shadowMap = {
			size: 1024,
			lookupSize: 256,
			camera: new RC.PerspectiveCamera(90, 1.0, 0.1, 500.0),
			//lightSpaceMat: new RC.Matrix4(),
			scene: new RC.Scene(),
			// texture: new RC.Texture(),
		};
		this.shadowMap.texture = new RC.Texture(
			null, RC.Texture.RepeatWrapping, RC.Texture.RepeatWrapping,	RC.Texture.NearestFilter, RC.Texture.NearestFilter,
			RC.Texture.DEPTH_COMPONENT24, RC.Texture.DEPTH_COMPONENT, RC.Texture.UNSIGNED_INT, this.shadowMap.size, this.shadowMap.size
		);
		this.shadowMap.camera.position = new RC.Vector3(-4.0, 10.0, -20.0);
		this.shadowMap.camera.lookAt(new RC.Vector3(0.0, 0.0, 0.0), new RC.Vector3(0.0, 1.0, 0.0));
		this.shadowMap.camera.updateMatrixWorld();
		this.shadowMap.camera.matrixWorldInverse.getInverse(this.shadowMap.camera.matrixWorld);
		//this.shadowMap.lightSpaceMat.multiplyMatrices(this.shadowMap.camera.projectionMatrix, this.shadowMap.camera.matrixWorldInverse);
		
		this.shadowMap.PMatInv = new RC.Matrix4().getInverse(this.shadowMap.camera.projectionMatrix);

		mat = new RC.CustomShaderMaterial("light_volume", {});
		mat.color = new RC.Color(1, 1, 1);
		mat.depthWrite = true;
		mat.depthTest = false;
		mat.lights = false;
		mat.transparent = true;
		mat.side = RC.FRONT_AND_BACK_SIDE;
		mat.addMap(this.shadowMap.texture);
		

		this.shadowMap.mesh = new RC.Mesh(this.lights.frustumGeo, mat);
		this.shadowMap.mesh.frustumCulled = false;
		this.shadowMap.scene.add(this.shadowMap.mesh);
	}

	initRenderQueue() {

		let RGBA16F_LINEAR = {
			wrapS: RC.Texture.ClampToEdgeWrapping,
			wrapT: RC.Texture.ClampToEdgeWrapping,
			minFilter: RC.Texture.LinearFilter,
			magFilter: RC.Texture.LinearFilter,
			internalFormat: RC.Texture.RGBA16F, // WASTE OF MEMORY!!!
			format: RC.Texture.RGBA,
			type: RC.Texture.FLOAT
		};

		// NOISE
		this.perlinNoisePass = new RC.RenderPass(
			RC.RenderPass.POSTPROCESS,
			(textureMap, additionalData) => {},
			(textureMap, additionalData) => {
				let mat = new RC.CustomShaderMaterial("perlin_noise", {
					"uRes": [this.canvas.width, this.canvas.height],
					"uTime": this.timer.curr,
					"uScale": this.canvas.height / 2.0,
					"uContrast": 1.0,
					"uSpeed": 0.5,
					"uOctaves": 2,
					"uPersistence": 0.5,
					"uLacunarity": 2.0
				});
				mat.ligths = false;
				return { material: mat, textures: [] };
			},
			RC.RenderPass.TEXTURE,
			{ width: this.canvas.width, height: this.canvas.height },
			"dummy",
			[
				{ id: "perlinNoise", textureConfig: RGBA16F_LINEAR},
				{ id: "perlinNoise2", textureConfig: RGBA16F_LINEAR},
			]
		);
		// PARTICLES UPDATE
		this.particleUpdatePass = new RC.RenderPass(
			RC.RenderPass.POSTPROCESS,
			(textureMap, additionalData) => {},
			(textureMap, additionalData) => {
				let mat = new RC.CustomShaderMaterial("particles_update", {
					"uRes": [this.particleTex.width, this.particleTex.height],
					"uDT": this.timer.delta,
					"uTime": this.timer.curr,
					"uSeed": Math.random(),
					"uCameraPos": this.camera.position.toArray(),
					"uNumComp": this.n_comp
				});
				mat.ligths = false;
				return { material: mat, textures: [textureMap.particlesRead] };
			},
			RC.RenderPass.TEXTURE,
			{ width: this.particleTex.width, height: this.particleTex.height },
			"dummy1",
			[{
				id: "particlesWrite",
				textureConfig: {
					wrapS: this.particleTex.wrapS,
					wrapT: this.particleTex.wrapT,
					minFilter: this.particleTex.minFilter,
					magFilter: this.particleTex.magFilter,
					internalFormat: this.particleTex.internalFormat,
					format: this.particleTex.format,
					type: this.particleTex.type
				}
			}]
		);
		// PARTICLES DRAW
		this.particleDrawPass = new RC.RenderPass(
			RC.RenderPass.BASIC,
			(textureMap, additionalData) => {
				this.particleMesh.material.addMap(textureMap.mainDepthDist);
				this.particleMesh.material.addMap(textureMap.perlinNoise);
				this.particleMesh.material.addMap(textureMap.perlinNoise2);
			},
			(textureMap, additionalData) => {
				this.particleMesh.material.setUniform("uRes", [this.canvas.width, this.canvas.height]);
				this.particleMesh.material.setUniform("uCameraRange", [this.camera.near, this.camera.far]);
				this.particleMesh.material.setUniform("uLiquidColor", this.liquidColor.toArray());
				this.particleMesh.material.setUniform("uLiquidAtten", this.liquidAtten.toArray());
				
				this.particleMesh.material.setUniform("f", this.dof.f);
				this.particleMesh.material.setUniform("a", this.dof.a);
				this.particleMesh.material.setUniform("v0", this.dof.v0);

				// for (let l of this.lights)
				// 	this.particleScene.add(l);

				return { scene: this.particleScene, camera: this.camera };
			},
			RC.RenderPass.TEXTURE,
			{ width: this.canvas.width, height: this.canvas.height },
			"particleDepth",
			[{
				id: "particleColor",
				textureConfig: RC.RenderPass.DEFAULT_RGBA_TEXTURE_CONFIG
			}]
		);
		// SHADOW MAP
		this.shadowMapPasses = [];
		for (let i = 0; i < this.lights.frustum.length; ++i) {
			this.shadowMapPasses.push(new RC.RenderPass(
				RC.RenderPass.BASIC,
				(textureMap, additionalData) => {},
				(textureMap, additionalData) => {
					for (let object of this.sceneObjects) {
						object.material = object.material_temp;
						object.material.setUniform("uLightPos", this.lights.frustum[i].camera.position.toArray());
						object.material.setUniform("uFarPlane", this.lights.frustum[i].camera.far);
					}
					return { scene: this.scene, camera: this.lights.frustum[i].camera };
				},
				RC.RenderPass.TEXTURE,
				{ width: this.lights.shadowRes, height: this.lights.shadowRes },
				"shadowMap" + i,
				[
					//{ id: "shadowColor" + i, textureConfig: RC.RenderPass.DEFAULT_RGBA_TEXTURE_CONFIG }
				]
			));
		}
		this.shadowPass = new RC.RenderPass(
			RC.RenderPass.BASIC,
			(textureMap, additionalData) => {},
			(textureMap, additionalData) => {
				// this.scene.traverse((object) => {
				// 	if (object instanceof RC.Mesh && object.material instanceof RC.CustomShaderMaterial) {
				// 	}
				// });
				for (let object of this.sceneObjects) {
					object.material = object.material_temp;
					object.material.setUniform("uLightPos", this.shadowMap.camera.position.toArray());
					object.material.setUniform("uFarPlane", this.shadowMap.camera.far);
				}
				
				return { scene: this.scene, camera: this.shadowMap.camera };
			},
			RC.RenderPass.TEXTURE,
			{ width: this.shadowMap.size, height: this.shadowMap.size },
			"shadowDepthBuf",
			[
				//{ id: "shadowColor", textureConfig: RC.RenderPass.DEFAULT_RGBA_TEXTURE_CONFIG }
			]
		);
		// MAIN
		this.mainRenderPass = new RC.RenderPass(
			RC.RenderPass.BASIC,
			(textureMap, additionalData) => {
				// this.scene.traverse((object) => {
				// 	if (object instanceof RC.Mesh && object.material instanceof RC.CustomShaderMaterial) {
				// 		object.material.addMap(textureMap.shadowDepthBuf);
				// 	}
				// });
				// for (let object of this.sceneObjects) {
				// 	object.material_main.addMap(textureMap.shadowDepthBuf);
				// }
			},
			(textureMap, additionalData) => {
				for (let object of this.sceneObjects) {
					object.material = object.material_main;
					
					if (object.material.programName === "custom_phong_liquid") {                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       
						object.material.setUniform("uMMat", object.matrix.toArray());


						// //object.material.setUniform("uLSMat", this.shadowMap.lightSpaceMat.toArray());
						// object.material.setUniform("uLPMat", this.shadowMap.camera.projectionMatrix.toArray());
						// object.material.setUniform("uLVMat", this.shadowMap.camera.matrixWorldInverse.toArray());
						// object.material.setUniform("uFarPlane", this.shadowMap.camera.far);

						// For some reason I have to manually do this?????
						this.camera.updateMatrixWorld();
						this.camera.matrixWorldInverse.getInverse(this.camera.matrixWorld);

						for (let i = 0; i < this.lights.frustum.length; ++i) {
							let prefix = "uFrustumLights[" + i + "].";
							let light = this.lights.frustum[i];

							let lightMatrix = new RC.Matrix4().multiplyMatrices(light.camera.projectionMatrix, light.camera.matrixWorldInverse);
							// // Apply light intensity
							// let lightColor = new RC.Vector3().copy(light.color).multiplyScalar(light.intensity);
							// Light position in view space
							let lightPos = new RC.Vector3().copy(light.camera.position).applyMatrix4(this.camera.matrixWorldInverse);
							let lightColor = new RC.Color().copy(light.color).multiplyScalar(light.intensity);

							object.material.setUniform(prefix + "matrix", lightMatrix.toArray());
							object.material.setUniform(prefix + "farPlane", light.camera.far);
							object.material.setUniform(prefix + "color", lightColor.toArray());
							object.material.setUniform(prefix + "position", lightPos.toArray());
						}
					}
				}

				// for (let l of this.lights)
				// 	this.scene.add(l);

				return { scene: this.scene, camera: this.camera };
			},
			RC.RenderPass.TEXTURE,
			{ width: this.canvas.width, height: this.canvas.height },
			"mainDepthBuf",
			[
				{ id: "mainColor", textureConfig: RC.RenderPass.DEFAULT_RGBA_TEXTURE_CONFIG }
			]
		);
		// AIRLIGHT LOOKUP
		this.airlightLookupPass = new RC.RenderPass(
			RC.RenderPass.POSTPROCESS,
			(textureMap, additionalData) => {},
			(textureMap, additionalData) => {
				let mat = new RC.CustomShaderMaterial("airlight_lookup", {
					"uLookupSize": this.lights.lookupRes
				});
				mat.ligths = false;
				return { material: mat, textures: []};
			},
			RC.RenderPass.TEXTURE,
			{ width: this.lights.lookupRes, height: this.lights.lookupRes },
			"dummy123",
			[
				{ id: "airlightLookup", textureConfig: RGBA16F_LINEAR }
			]
		);
		// LIGHT VOLUME
		this.lightVolumePasses = [];
		for (let i = 0; i < this.lights.frustum.length; ++i) {
			let light = this.lights.frustum[i];
			this.lightVolumePasses.push(new RC.RenderPass(
				RC.RenderPass.BASIC,
				(textureMap, additionalData) => {
					//light.mesh.material.addMap(textureMap.mainDepthBuf);
					light.mesh.material.addMap(textureMap.mainDepthDist);
					light.mesh.material.addMap(textureMap.airlightLookup);
				},
				(textureMap, additionalData) => {
					let lightDir = new RC.Vector3().subVectors(this.camera.position, light.camera.position);
					let lightDist = lightDir.length();
					if (lightDist > 0.0)
						lightDir.divideScalar(lightDist);
					let lightColor = new RC.Color().copy(light.color).multiplyScalar(light.intensity);

					let VPMatInv = new RC.Matrix4().multiplyMatrices(light.camera.matrixWorld, light.PMatInv);
					light.mesh.material.setUniform("uVPMatInv", VPMatInv.toArray());
					light.mesh.material.setUniform("uLightPos", light.camera.position.toArray());
					light.mesh.material.setUniform("uCameraPos", this.camera.position.toArray());
					light.mesh.material.setUniform("uLightDir", lightDir.toArray());
					light.mesh.material.setUniform("uLightDist", lightDist);
					light.mesh.material.setUniform("uLightColor", lightColor.toArray());
					light.mesh.material.setUniform("uLookupSize", this.lights.lookupSize);
					light.mesh.material.setUniform("uFarPlane", light.camera.far);
					light.mesh.material.setUniform("uResInv", [1.0 / this.canvas.width, 1.0 / this.canvas.height]);
					light.mesh.material.setUniform("uSeed", Math.random());
					light.mesh.material.setUniform("uBeta", light.beta);
					light.mesh.material.setUniform("uIntensity", light.volumeIntensity);
					
					return { scene: light.scene, camera: this.camera };
				},
				RC.RenderPass.TEXTURE,
				{ width: this.canvas.width, height: this.canvas.width },
				"dummy",
				[
					{ id: "lightVolume" + i, textureConfig: RGBA16F_LINEAR }
				]
			));
		}
		this.lightVolumePass = new RC.RenderPass(
			RC.RenderPass.POSTPROCESS,
			(textureMap, additionalData) => {},
			(textureMap, additionalData) => {
				let mat = new RC.CustomShaderMaterial("light_volume_blend", {});
				mat.ligths = false;
				let tex = [];
				for (let i = 0; i < this.lights.frustum.length; ++i)
					tex.push(textureMap["lightVolume" + i]);
				return { 
					material: mat,
					textures: tex
				};
			},
			RC.RenderPass.TEXTURE,
			{ width: this.canvas.width, height: this.canvas.width },
			"dummy",
			[
				{ id: "lightVolume", textureConfig: RGBA16F_LINEAR }
			]
		);
		// this.lightVolumePass = new RC.RenderPass(
		// 	RC.RenderPass.BASIC,
		// 	(textureMap, additionalData) => {
		// 		//this.shadowMap.mesh.material.addMap(textureMap.mainDepthBuf);
		// 		this.shadowMap.mesh.material.addMap(textureMap.mainDepthDist);
		// 		this.shadowMap.mesh.material.addMap(textureMap.airlightLookup);
		// 	},
		// 	(textureMap, additionalData) => {
		// 		let lightDir = new RC.Vector3().subVectors(this.camera.position, this.shadowMap.camera.position);
		// 		let lightDist = lightDir.length();
		// 		if (lightDist > 0.0)
		// 			lightDir.divideScalar(lightDist);


		// 		let VPMatInv = new RC.Matrix4().multiplyMatrices(this.shadowMap.camera.matrixWorld, this.shadowMap.PMatInv);
		// 		this.shadowMap.mesh.material.setUniform("uVPMatInv", VPMatInv.toArray());
		// 		this.shadowMap.mesh.material.setUniform("uLightPos", this.shadowMap.camera.position.toArray());
		// 		this.shadowMap.mesh.material.setUniform("uCameraPos", this.camera.position.toArray());
		// 		this.shadowMap.mesh.material.setUniform("uLightDir", lightDir.toArray());
		// 		this.shadowMap.mesh.material.setUniform("uLightDist", lightDist);
		// 		this.shadowMap.mesh.material.setUniform("uLookupSize", this.shadowMap.lookupSize);
		// 		this.shadowMap.mesh.material.setUniform("uFarPlane", this.shadowMap.camera.far);
		// 		this.shadowMap.mesh.material.setUniform("uResInv", [1.0 / this.canvas.width, 1.0 / this.canvas.height]);
		// 		this.shadowMap.mesh.material.setUniform("uSeed", Math.random());
				
				
		// 		return { scene: this.shadowMap.scene, camera: this.camera };
		// 	},
		// 	RC.RenderPass.TEXTURE,
		// 	{ width: this.canvas.width, height: this.canvas.width },
		// 	"dummy",
		// 	[
		// 		{ id: "lightVolume", textureConfig: RGBA16F_LINEAR }
		// 	]
		// );
		
		// DEPTH
		this.depthPass = new RC.RenderPass(
			RC.RenderPass.POSTPROCESS,
			(textureMap, additionalData) => {},
			(textureMap, additionalData) => {
				let VPMatInv = new RC.Matrix4().multiplyMatrices(this.camera.matrixWorld, this.PMatInv);

				let mat = new RC.CustomShaderMaterial("depth_distance", {
					"uVPMatInv": VPMatInv.toArray(),
					"uCameraPos": this.camera.position.toArray(),
					"uCameraDir": new RC.Vector3(0,0,-1).applyEuler(this.camera.rotation).toArray(),
					"uCameraRange": [this.camera.near, this.camera.far]
				});
				mat.ligths = false;
				return { 
					material: mat,
					textures: [textureMap.mainDepthBuf]
				};
			},
			RC.RenderPass.TEXTURE,
			{ width: this.canvas.width, height: this.canvas.height },
			"dummy",
			[
				{ id: "mainDepthDist", textureConfig: RGBA16F_LINEAR }
			]
		);
		// DOF
		this.dofDownsamplePass = new RC.RenderPass(
			RC.RenderPass.POSTPROCESS,
			(textureMap, additionalData) => {},
			(textureMap, additionalData) => {
				let mat = new RC.CustomShaderMaterial("dof_downsample_near", {
					"uSrcResInv": [1.0 / this.canvas.width, 1.0 / this.canvas.height],
					"f": this.dof.f,
					"a": this.dof.a,
					"v0": this.dof.v0
				});
				mat.ligths = false;
				return { 
					material: mat,
					textures: [textureMap.water, textureMap.mainDepthDist, textureMap.perlinNoise2]
				};
			},
			RC.RenderPass.TEXTURE,
			{ width: this.canvas.width * 0.25, height: this.canvas.height * 0.25 },
			"dummy4x4",
			[
				{ id: "downsampled", textureConfig: RGBA16F_LINEAR }
			]
		);
		this.cocPass = new RC.RenderPass(
			RC.RenderPass.POSTPROCESS,
			(textureMap, additionalData) => {},
			(textureMap, additionalData) => {
				let mat = new RC.CustomShaderMaterial("dof_coc_near", {});
				mat.ligths = false;
				return { 
					material: mat,
					textures: [textureMap.downsampled, textureMap.blurred]
				};
			},
			RC.RenderPass.TEXTURE,
			{ width: this.canvas.width * 0.25, height: this.canvas.height * 0.25 },
			"dummy4x4",
			[
				{ id: "coc_near", textureConfig: RGBA16F_LINEAR }
			]
		);
		this.dofSmallBlurPass = new RC.RenderPass(
			RC.RenderPass.POSTPROCESS,
			(textureMap, additionalData) => {},
			(textureMap, additionalData) => {
				let mat = new RC.CustomShaderMaterial("dof_small_blur", {
					"uResInv": [4.0 / this.canvas.width, 4.0 / this.canvas.height]
				});
				mat.ligths = false;
				return { 
					material: mat,
					textures: [textureMap.coc_near]
				};
			},
			RC.RenderPass.TEXTURE,
			{ width: this.canvas.width * 0.25, height: this.canvas.height * 0.25 },
			"dummy4x4",
			[
				{ id: "small_blur", textureConfig: RGBA16F_LINEAR }
			]
		);
		this.dofPass = new RC.RenderPass(
			RC.RenderPass.POSTPROCESS,
			(textureMap, additionalData) => {},
			(textureMap, additionalData) => {
				let mat = new RC.CustomShaderMaterial("dof", {	
					"uResInv": [1.0 / this.canvas.width, 1.0 / this.canvas.height],
					"f": this.dof.f,
					"a": this.dof.a,
					"v0": this.dof.v0
				});
				mat.ligths = false;
				return { 
					material: mat,
					textures: [textureMap.water, textureMap.mainDepthDist, textureMap.perlinNoise2, textureMap.blurred, textureMap.small_blur]
				};
			},
			RC.RenderPass.TEXTURE,
			{ width: this.canvas.width, height: this.canvas.height },
			"dummy",
			[
				{ id: "dof", textureConfig: RGBA16F_LINEAR }
			]
		);
		// GAUSS
		this.gaussPassVert = [];
		this.gaussPassHor  = [];
		for (let iPass = 0; iPass < this.dof.numPasses; ++iPass) {
			this.gaussPassHor.push(new RC.RenderPass(
				RC.RenderPass.POSTPROCESS,
				(textureMap, additionalData) => {},
				(textureMap, additionalData) => {
					let mat = new RC.CustomShaderMaterial("gaussian_blur", { "horizontal": true });
					mat.ligths = false;
					return { 
						material: mat,
						textures: [iPass == 0 ? textureMap.downsampled : textureMap.blurred]
					};
				},
				RC.RenderPass.TEXTURE,
				{ width: this.canvas.width * 0.25, height: this.canvas.height * 0.25 },
				"dummy4x4",
				[
					{ id: "blurred_hor", textureConfig: RGBA16F_LINEAR }
				]
			));
			this.gaussPassVert.push(new RC.RenderPass(
				RC.RenderPass.POSTPROCESS,
				(textureMap, additionalData) => {},
				(textureMap, additionalData) => {
					let mat = new RC.CustomShaderMaterial("gaussian_blur", { "horizontal": false });
					mat.ligths = false;
					return { 
						material: mat,
						textures: [textureMap.blurred_hor]
					};
				},
				RC.RenderPass.TEXTURE,
				{ width: this.canvas.width * 0.25, height: this.canvas.height * 0.25 },
				"dummy4x4",
				[
					{ id: "blurred", textureConfig: RGBA16F_LINEAR }
				]
			));
		}
		// WATER
		this.waterRenderPass = new RC.RenderPass(
			RC.RenderPass.POSTPROCESS,
			(textureMap, additionalData) => {},
			(textureMap, additionalData) => {
				let mat = new RC.CustomShaderMaterial("water", {
					"uLiquidColor": this.liquidColor.toArray(),
					"uLiquidAtten": this.liquidAtten.toArray(),
				});
				mat.ligths = false;
				return { 
					material: mat,
					textures: [
						textureMap.mainColor,
						textureMap.mainDepthDist,
						textureMap.particleColor,
						textureMap.perlinNoise,
						textureMap.lightVolume
					]
				};
			},
			RC.RenderPass.TEXTURE,
			{ width: this.canvas.width, height: this.canvas.height },
			"dummy",
			[
				{ id: "water", textureConfig: RC.RenderPass.DEFAULT_RGBA_TEXTURE_CONFIG }
			]
		);

		// POST
		this.postPass = new RC.RenderPass(
			RC.RenderPass.POSTPROCESS,
			(textureMap, additionalData) => {},
			(textureMap, additionalData) => {
				let mat = new RC.CustomShaderMaterial("post", {});
				mat.ligths = false;
				return { 
					material: mat,
					textures: [textureMap.dof, textureMap.particleColor]
				};
			},
			RC.RenderPass.SCREEN,
    		{ width: this.canvas.width, height: this.canvas.height }
		);

		this.renderQueue = new RC.RenderQueue(this.renderer);

		this.renderQueue.addTexture("particlesRead", this.particleTex);
		this.renderQueue.addTexture("particlesWrite", this.particleTex2);
		for (let i = 0; i < this.lights.frustum.length; ++i)
			this.renderQueue.addTexture("shadowMap" + i, this.lights.frustum[i].texture);
		this.renderQueue.addTexture("shadowDepthBuf", this.shadowMap.texture);

		this.renderQueue.pushRenderPass(this.perlinNoisePass);

		for (let pass of this.shadowMapPasses)
			this.renderQueue.pushRenderPass(pass);
		this.renderQueue.pushRenderPass(this.shadowPass);

		this.renderQueue.pushRenderPass(this.mainRenderPass);
		this.renderQueue.pushRenderPass(this.depthPass);

		this.renderQueue.pushRenderPass(this.airlightLookupPass);
		for (let pass of this.lightVolumePasses)
			this.renderQueue.pushRenderPass(pass);
		this.renderQueue.pushRenderPass(this.lightVolumePass);

		this.renderQueue.pushRenderPass(this.particleUpdatePass);
		this.renderQueue.pushRenderPass(this.particleDrawPass);

		this.renderQueue.pushRenderPass(this.waterRenderPass);

		this.renderQueue.pushRenderPass(this.dofDownsamplePass);
		for (let i = 0; i < this.dof.numPasses; ++i) {
			this.renderQueue.pushRenderPass(this.gaussPassHor[i]);
			this.renderQueue.pushRenderPass(this.gaussPassVert[i]);
		}
		this.renderQueue.pushRenderPass(this.cocPass);
		this.renderQueue.pushRenderPass(this.dofSmallBlurPass);
		this.renderQueue.pushRenderPass(this.dofPass);

		this.renderQueue.pushRenderPass(this.postPass);

		this.once = 0;
	}

	loadResources(callback) {
		this.manager = new RC.LoadingManager();
		this.objLoader = new RC.ObjLoader(this.manager);
		//this.imageLoader = new RC.ImageLoader(this.manager);

		this.objLoader.load("/data/models/bunny.obj", (obj) => {
			this.objects = obj;
			for (let i = 0; i < obj.length; i++) {
				//obj[i].position.z = 0;

				// Main bunny
				obj[i].position = new RC.Vector3(0, 0, 0);
				obj[i].material = this.createPhongMat();
				obj[i].material.shininess = 16;

				obj[i].geometry.drawWireframe = false;
				this.scene.add(obj[i]);

				// Clone bunnies
				const countX = 6;
				const countZ = 8;
				const space = 4;
				const colors = Object.values(RC.Color.NAMES);

				for (let x = -(countX-1) * space / 2; x <= (countX-1) * space / 2; x += space) {
					for (let z = 0; z >= -(countZ-1) * space; z -= space) {
						let clone = new RC.Mesh(obj[i].geometry, this.createPhongMat());
						clone.position = new RC.Vector3(x, Math.random() * 8 - 4, z - 2);

						const colorCode = colors[Math.floor(Math.random() * colors.length)];
						clone.material.color = new RC.Color(colorCode);
						clone.material.specular = new RC.Color("#444444");
						clone.material.shininess = 8;
						this.scene.add(clone);
					}
				}
			}

			// TODO
			this.sceneObjects = []
			this.scene.traverse((object) => {
				if (object instanceof RC.Mesh) {
					if (object.material.programName === "custom_phong_liquid") {
						//object.material.addMap(this.shadowMap.texture);
						for (let l of this.lights.frustum)
							object.material.addMap(l.texture);
						
						object.material.addSBValue("NUM_FRUSTUM_LIGHTS", this.lights.frustum.length);
					}
					//let mat = new RC.MeshBasicMaterial();
					let mat = new RC.CustomShaderMaterial("shadow_map");
					//mat.lights = false;
					mat.side = object.material.side;
					// // To prevent Peter Panning
					// switch (object.material.side) {
					// 	case RC.FRONT_SIDE: mat.side = RC.BACK_SIDE; break;
					// 	case RC.BACK_SIDE: mat.side = RC.FRONT_SIDE; break;
					// 	default: mat.side = object.material.side; break;
					// }
					object.material_temp = mat;
					object.material_main = object.material;
					this.sceneObjects.push(object);
				}
			});

			callback();
		});
	}

	update() {
		// Timer
		this.timer.prev = this.timer.curr;
		this.timer.curr = performance.now() * 0.001;
		this.timer.delta = this.timer.curr - this.timer.prev;

		// FPS
		++this.fpsCount;
		if (this.timer.curr - this.fpsTime >= 1.0) {
			const fps = this.fpsCount / (this.timer.curr - this.fpsTime);
			document.getElementById("fps").innerHTML = Math.round(fps).toString();

			this.fpsCount = 0;
			this.fpsTime = this.timer.curr;
		}

		// DOF
		if (this.timer.curr - this.dof.lastUpdate >= 0.5) {
			if (this.renderQueue._textureMap.mainDepthDist !== undefined) {
				// Get the depth camera is looking at
				if (this.fboDepth === undefined) {
					this.fboDepth = this.gl.createFramebuffer();
					this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.fboDepth);
					
					let texture = this.renderer._glManager._textureManager._cached_textures.get(this.renderQueue._textureMap.mainDepthDist);
					this.gl.framebufferTexture2D(
						this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0,
						this.gl.TEXTURE_2D, texture, 0
					);
					// Check if you can read from this type of texture.
					let canRead = (this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER) == this.gl.FRAMEBUFFER_COMPLETE);
					if (!canRead)
						throw "Unable to read depth framebuffer!";
				} else {
					this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.fboDepth);
				}

				let pixel = new Float32Array(4);
				this.gl.readPixels(this.dof.focus.x, this.dof.focus.y, 1, 1, this.gl.RGBA, this.gl.FLOAT, pixel);
				// Unbind the framebuffer
				this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);

				this.dof.v0_target = pixel[0];
				this.dof.lastUpdate = this.timer.curr;
			}
		}
		let diff = this.dof.v0 - this.dof.v0_target;
		if (Math.abs(diff) > 0.00001);
			this.dof.v0 -= diff * this.timer.delta * 2.0;


		// Camera
		const input = {
			keyboard: this.keyboardInput.update(),
			navigators: {
				rotation: {x: 0, y: 0, z: 0},
				translation: {x: 0, y: 0, z: 0}
			},
			mouse: this.mouseInput.update(),
			gamepads: undefined,
			multiplier: 1
		};
		this.cameraManager.update(input, this.timer.delta * 1000);

		// Render
		this.render();
		window.requestAnimationFrame(() => { this.update(); });
	}

	render() {
		//this.renderer.render(this.scene, this.camera);
		this.renderQueue.render();

		if (this.once == 200) {
			this.renderQueue.removeRenderPass(this.airlightLookupPass);
		}
		if (this.once > 200) {
			// Swap WebGL textures
			let glmap = this.renderer._glManager._textureManager._cached_textures;
			let tex1 = glmap.get(this.particleTex);
			let tex2 = glmap.get(this.particleTex2);
			glmap.set(this.particleTex, tex2);
			glmap.set(this.particleTex2, tex1);

			// // Swap RenderCore textures
			// let map = this.renderQueue._textureMap;
			// let temp = map.particlesRead;
			// map.particlesRead = map.particlesWrite;
			// map.particlesWrite = temp;
		}
		++this.once;	
	}

	resize() {
		// Resize canvas
		this.canvas.width  = window.innerWidth;
		this.canvas.height = window.innerHeight;
	
		// Update aspect ratio and viewport
		this.camera.aspect = this.canvas.width / this.canvas.height;
		this.PMatInv.getInverse(this.camera.projectionMatrix);
		this.renderer.updateViewport(this.canvas.width, this.canvas.height);

		// Update render passes
		this.perlinNoisePass.viewport = { width: this.canvas.width, height: this.canvas.height };
		this.mainRenderPass.viewport = { width: this.canvas.width, height: this.canvas.height };
		this.depthPass.viewport = { width: this.canvas.width, height: this.canvas.height };

		for (let pass of this.lightVolumePasses)
			pass.viewport = { width: this.canvas.width, height: this.canvas.height };
		this.lightVolumePass.viewport = { width: this.canvas.width, height: this.canvas.height };

		this.dofDownsamplePass.viewport = { width: this.canvas.width * 0.25, height: this.canvas.height * 0.25 };
		for (let i = 0; i < this.dof.numPasses; ++i) {
			this.gaussPassHor[i].viewport = { width: this.canvas.width * 0.25, height: this.canvas.height * 0.25 };
			this.gaussPassVert[i].viewport = { width: this.canvas.width * 0.25, height: this.canvas.height * 0.25 };
		}
		this.cocPass.viewport = { width: this.canvas.width * 0.25, height: this.canvas.height * 0.25 };
		this.dofSmallBlurPass.viewport = { width: this.canvas.width * 0.25, height: this.canvas.height * 0.25 };
		this.dofPass.viewport = { width: this.canvas.width, height: this.canvas.height };

		this.waterRenderPass.viewport = { width: this.canvas.width, height: this.canvas.height };
		this.particleDrawPass.viewport = { width: this.canvas.width, height: this.canvas.height };

		this.postPass.viewport = { width: this.canvas.width, height: this.canvas.height };
		
		// DOF focus
		this.dof.focus.x = Math.trunc(this.canvas.width / 2.0);
		this.dof.focus.y = Math.trunc(this.canvas.height / 2.0);
	}
}


document.addEventListener("DOMContentLoaded", () => {
	const canvas = document.getElementById("canvas");
	const app = new App(canvas);
});
