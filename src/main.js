import * as RC from "/rendercore/src/RenderCore.js";

class App {
	constructor(canvas) {
		// Canvas
		this.canvas = canvas;
		// Animation timer
		this.timer = { curr: 0, prev: 0, delta: 0 };
		// FPS
		this.fpsCount = 0;
		this.fpsTime = 0;
		
		this.renderer = new RC.MeshRenderer(this.canvas, RC.WEBGL2);
		this.renderer.clearColor = "#000000FF";
		this.renderer.addShaderLoaderUrls("/rendercore/src/shaders");
		this.renderer.addShaderLoaderUrls("/src/shaders");
		
		this.keyboardInput = RC.KeyboardInput.instance;
		this.mouseInput = RC.MouseInput.instance;
		this.mouseInput.setSourceObject(window);

		this.initScene();
		this.initRenderQueue();
		this.resize();

		window.addEventListener("resize", () => { this.resize(); }, false);

		this.loadResources(
			() => { window.requestAnimationFrame(() => { this.update(); }); }
		);
		//window.requestAnimationFrame(() => { this.update(); });
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
		
		this.cameraManager = new RC.CameraManager();
		this.cameraManager.addFullOrbitCamera(this.camera, new RC.Vector3(0, 0, 0));
		this.cameraManager.activeCamera = this.camera;

		// Liquid color
		this.liquidColor = new RC.Color(0.0, 0.18, 0.4); // (0, 0.3, 0.7);
		this.liquidAtten = new RC.Vector3(0.07, 0.06, 0.05);

		// Lights
		this.dLight = new RC.DirectionalLight(new RC.Color("#FFFFFF"), 1.0);
		this.dLight.position = new RC.Vector3(1.0, 0.5, 0.8);
		this.pLight = new RC.PointLight(new RC.Color("#FFFFFF"), 1.0);
		this.pLight.position = new RC.Vector3(-4.0, 10.0, -20.0);
		this.pLight2 = new RC.PointLight(new RC.Color("#FFFFFF"), 1.0);
		this.pLight2.position = new RC.Vector3(10.0, 10.0, 10.0);
		this.aLight = new RC.AmbientLight(new RC.Color("#FFFFFF"), 0.05);

		this.pLight.add(new RC.Cube(1.0, this.pLight.color));
		this.pLight2.add(new RC.Cube(1.0, this.pLight.color));

		this.lights = [this.pLight, this.pLight2, this.aLight]; // , this.dLight];
		for (let l of this.lights)
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

		plane.material.addMap(texture);
		this.scene.add(plane);

		let plane2 = new RC.Quad({x: -64, y: 64}, {x: 64, y: -64}, this.createPhongMat());
		plane2.material.side = RC.FRONT_AND_BACK_SIDE;
		plane2.material.addMap(texture);
		plane2.translateZ(-60);
		this.scene.add(plane2);

		// Texture based particles
		let n_comp = 2;
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
		mat.pointSize = 8.0;
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
		q1.material.addMap(this.particleTex2);
		this.scene.add(q1);

		let q2 = new RC.Quad({x: -1, y: -.5}, {x: 1, y: .5}, new RC.MeshBasicMaterial());
		q2.position = new RC.Vector3(3,0,-2);
		q2.material.side = RC.Material.FRONT_AND_BACK_SIDE;
		q2.material.color = new RC.Color("#FFFFFF");
		q2.material.addMap(this.particleTex2);
		this.scene.add(q2);

		this.q1 = q1;
		this.q2 = q2;
	}

	initRenderQueue() {
		// NOISE
		this.perlinNoisePass = new RC.RenderPass(
			RC.RenderPass.POSTPROCESS,
			(textureMap, additionalData) => {},
			(textureMap, additionalData) => {
				let mat = new RC.CustomShaderMaterial("perlin_noise", {
					"uRes": [this.canvas.width, this.canvas.height],
					"uDT": this.timer.delta,
					"uSeed": Math.random()
				});
				mat.ligths = false;
				return { material: mat, textures: [] };
			},
			RC.RenderPass.TEXTURE,
			{ width: this.canvas.width, height: this.canvas.height },
			"dummy0",
			[{
				id: "perlinNoise",
				textureConfig: {
					wrapS: RC.Texture.ClampToEdgeWrapping,
					wrapT: RC.Texture.ClampToEdgeWrapping,
					minFilter: RC.Texture.LinearFilter,
					magFilter: RC.Texture.LinearFilter,
					internalFormat: RC.Texture.RGBA,
					format: RC.Texture.RGBA,
					type: RC.Texture.UNSIGNED_BYTE
				}
			}]
		);
		// PARTICLES UPDATE
		this.particleUpdatePass = new RC.RenderPass(
			RC.RenderPass.POSTPROCESS,
			(textureMap, additionalData) => {},
			(textureMap, additionalData) => {
				let mat = new RC.CustomShaderMaterial("particles_update", {
					"uRes": [this.particleTex.width, this.particleTex.height],
					"uDT": this.timer.delta,
					"uSeed": Math.random(),
					"uCameraPos": this.camera.position.toArray()
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
				this.particleMesh.material.addMap(textureMap.mainDepth);
			},
			(textureMap, additionalData) => {
				this.particleMesh.material.setUniform("uRes", [this.canvas.width, this.canvas.height]);
				this.particleMesh.material.setUniform("uCameraRange", [this.camera.near, this.camera.far]);
				this.particleMesh.material.setUniform("uLiquidColor", this.liquidColor.toArray());
				this.particleMesh.material.setUniform("uLiquidAtten", this.liquidAtten.toArray());

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
		// MAIN
		this.mainRenderPass = new RC.RenderPass(
			RC.RenderPass.BASIC,
			(textureMap, additionalData) => {},
			(textureMap, additionalData) => {
				// for (let l of this.lights)
				// 	this.scene.add(l);

				return { scene: this.scene, camera: this.camera };
			},
			RC.RenderPass.TEXTURE,
			{ width: this.canvas.width, height: this.canvas.height },
			"mainDepth",
			[
				{ id: "mainColor", textureConfig: RC.RenderPass.DEFAULT_RGBA_TEXTURE_CONFIG }
			]
		);
		// POST
		this.postRenderPass = new RC.RenderPass(
			RC.RenderPass.POSTPROCESS,
			(textureMap, additionalData) => {},
			(textureMap, additionalData) => {
				let mat = new RC.CustomShaderMaterial("water", {
					"uRes": [this.canvas.width, this.canvas.height],
					"uCameraRange": [this.camera.near, this.camera.far],
					"uLiquidColor": this.liquidColor.toArray(),
					"uLiquidAtten": this.liquidAtten.toArray(),
				});
				mat.ligths = false;
				return { 
					material: mat,
					textures: [textureMap.mainColor, textureMap.mainDepth, textureMap.particleColor, textureMap.particleDepth]
				};
			},
			RC.RenderPass.SCREEN,
    		{ width: this.canvas.width, height: this.canvas.height }
		);

		this.renderQueue = new RC.RenderQueue(this.renderer);

		this.renderQueue.addTexture("particlesRead", this.particleTex);
		this.renderQueue.addTexture("particlesWrite", this.particleTex2);

		this.renderQueue.pushRenderPass(this.perlinNoisePass);
		this.renderQueue.pushRenderPass(this.mainRenderPass);
		this.renderQueue.pushRenderPass(this.particleUpdatePass);
		this.renderQueue.pushRenderPass(this.particleDrawPass);
		this.renderQueue.pushRenderPass(this.postRenderPass);

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

		if (this.once++ > 200) {
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
	}

	resize() {
		// Resize canvas
		this.canvas.width  = window.innerWidth;
		this.canvas.height = window.innerHeight;
	
		// Update aspect ratio and viewport
		this.camera.aspect = this.canvas.width / this.canvas.height;
		this.renderer.updateViewport(this.canvas.width, this.canvas.height);

		// Update render passes
		this.mainRenderPass.viewport = { width: this.canvas.width, height: this.canvas.height };
		this.postRenderPass.viewport = { width: this.canvas.width, height: this.canvas.height };
		this.particleDrawPass.viewport = { width: this.canvas.width, height: this.canvas.height };
	}
}

document.addEventListener("DOMContentLoaded", () => {
	const canvas = document.getElementById("canvas");
	const app = new App(canvas);
});
