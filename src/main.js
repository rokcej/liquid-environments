import * as RC from '/rendercore/src/RenderCore.js'

/** 
 * TODO:
 * -Fullscreen canvas
 * -FPS counter
 * -Canvas resize
 */

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
	}


	initScene() {
		/// Main scene
		this.scene = new RC.Scene();

		this.camera = new RC.PerspectiveCamera(60, this.canvas.width / this.canvas.height, 0.1, 1000);
		this.camera.position = new RC.Vector3(0, 0.75, 4);
		this.camera.lookAt(new RC.Vector3(0, 0, 0), new RC.Vector3(0, 1, 0));
		
		this.cameraManager = new RC.CameraManager();
		this.cameraManager.addFullOrbitCamera(this.camera, new RC.Vector3(0, 0, 0));
		this.cameraManager.activeCamera = this.camera;

		// Lights
		this.dLight = new RC.DirectionalLight(new RC.Color("#FFFFFF"), 1.0);
		this.dLight.position = new RC.Vector3(1.0, 0.5, 0.8);
		this.pLight = new RC.PointLight(new RC.Color("#FFFFFF"), 1.0);
		this.pLight.position = new RC.Vector3(-4.0, 10.0, -20.0);
		this.aLight = new RC.AmbientLight(new RC.Color("#FFFFFF"), 0.05);

        this.pLight.add(new RC.Cube(1.0, this.pLight.color));

		this.scene.add(this.dLight);
		this.scene.add(this.pLight);
		this.scene.add(this.aLight);

		// Plane
		let plane = new RC.Quad({x: -32, y: 32}, {x: 32, y: -32}, new RC.MeshPhongMaterial());
		plane.material.color = new RC.Color("#FFFFFF");
		plane.material.color = new RC.Color("#FFFFFF");
		plane.material.specular = new RC.Color("#FFFFFF");
		plane.material.shininess = 1;
		plane.material.side = RC.FRONT_AND_BACK_SIDE;
		plane.translateY(-4);
		plane.rotateX(Math.PI * 0.5);
		this.scene.add(plane);

		/// Post production scene
		let waterShaderMaterial = new RC.CustomShaderMaterial("water");
		waterShaderMaterial.color = new RC.Color(1.0, 1.0, 1.0);

		this.postScene = new RC.Scene();
		this.postQuad = new RC.Quad(new RC.Vector2(-1.0, -1.0), new RC.Vector2(1.0, 1.0), waterShaderMaterial, undefined, true);
		this.postScene.add(this.postQuad);

		this.postCamera = new RC.OrthographicCamera(-1, 1, 1, -1, 0.1, 2);
		this.postCamera.position = new RC.Vector3(0, 0, 1);
	}

	initRenderQueue() {
		this.mainRenderPass = new RC.RenderPass(
			// Type
			RC.RenderPass.BASIC,
			// Init function
			(textureMap, additionalData) => {},
			// Preprocess function
			(textureMap, additionalData) => { return { scene: this.scene, camera: this.camera }; },
			// Target
			RC.RenderPass.TEXTURE,
			// Viewport
			{ width: this.canvas.width, height: this.canvas.height },
			// Bind depth texture to this ID
			"MainRenderDepth",
			[{
			  id: "MainRenderColor",
			  textureConfig: RC.RenderPass.DEFAULT_RGBA_TEXTURE_CONFIG
			}]
		);

		this.waterRenderPass = new RC.RenderPass(
			// Type
			RC.RenderPass.BASIC,
			// Init function
			(textureMap, additionalData) => {
				this.postQuad.material.addMap(textureMap.MainRenderColor);
				this.postQuad.material.addMap(textureMap.MainRenderDepth);
			},
			// Preprocess function
			(textureMap, additionalData) => {
				return { scene: this.postScene, camera: this.postCamera };
			},
			// Target
			RC.RenderPass.SCREEN,
			// Viewport
			{ width: this.canvas.width, height: this.canvas.height },
		);

		this.renderQueue = new RC.RenderQueue(this.renderer);
		this.renderQueue.pushRenderPass(this.mainRenderPass);
		this.renderQueue.pushRenderPass(this.waterRenderPass);
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
				obj[i].material = new RC.MeshPhongMaterial();
				obj[i].material.color = new RC.Color("#FFFFFF");
				obj[i].material.specular = new RC.Color("#FFFFFF");
				obj[i].material.shininess = 16;

				obj[i].geometry.drawWireframe = false;
				this.scene.add(obj[i]);

				// Clone bunnies
				const count = 5;
				const space = 4;
				const colors = Object.values(RC.Color.NAMES);

				for (let x = -(count-1) * space / 2; x <= (count-1) * space / 2; x += space) {
					for (let z = 0; z >= -(count-1) * space; z -= space) {
						let clone = new RC.Mesh(obj[i].geometry, new RC.MeshPhongMaterial());
						clone.position = new RC.Vector3(x, Math.random() * 8 - 4, z - 2);

						const colorCode = colors[Math.floor(Math.random() * colors.length)];
						clone.material.color = new RC.Color(colorCode);
						console.log(colorCode);
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
		this.timer.curr = performance.now();
		this.timer.delta = this.timer.curr - this.timer.prev;

		// FPS
		++this.fpsCount;
		if (this.timer.curr - this.fpsTime >= 1000) {
			const fps = this.fpsCount * 1000 / (this.timer.curr - this.fpsTime);
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
		this.cameraManager.update(input, this.timer.delta);

		// Render
		this.render();
		window.requestAnimationFrame(() => { this.update(); });
	}

	render() {
		//this.renderer.render(this.scene, this.camera);
		this.renderQueue.render();
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
		this.waterRenderPass.viewport = { width: this.canvas.width, height: this.canvas.height };
	}
}

document.addEventListener("DOMContentLoaded", () => {
	const canvas = document.getElementById("canvas");
	const app = new App(canvas);
});
