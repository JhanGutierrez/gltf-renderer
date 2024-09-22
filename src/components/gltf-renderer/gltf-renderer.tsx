import { Component, h, Element, Prop, Event, EventEmitter, Watch } from '@stencil/core';
import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  DirectionalLight,
  AmbientLight,
  Color,
  GridHelper,
  LineBasicMaterial,
  LoadingManager,
  Object3D,
  Group,
  PCFSoftShadowMap,
  ACESFilmicToneMapping,
  PMREMGenerator,
  EquirectangularReflectionMapping,
  Mesh,
  Box3,
  Vector3,
  WireframeGeometry,
  LineSegments,
} from 'three';

import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import merge from 'deepmerge';
import gltfDispose from './gltf-dispose';
import { defaultConfig } from './default-config';

import {  GltfRendererConfig, GltfRendererLoad, GltfRendererUpdate } from './gltf-renderer-config';

@Component({
  tag: 'gltf-renderer',
  shadow: true,
})
export class GltfRenderer {
  @Element() element: HTMLElement;
  @Prop() modelPath: string;
  @Prop() config: GltfRendererConfig = {};
  @Event() rendererLoad: EventEmitter<GltfRendererLoad>;
  @Event() rendererUpdate: EventEmitter<GltfRendererUpdate>;
  @Event() loadProgress : EventEmitter<number>;

  private _initConfig: GltfRendererConfig = defaultConfig;
  private _rendererLoad: GltfRendererLoad = {};
  private _rendererUpdate: GltfRendererUpdate = {};
  
  private _scene: Scene = new Scene();
  private _camera: PerspectiveCamera;
  private _orbitControls: OrbitControls;
  private _renderer: WebGLRenderer = new WebGLRenderer({ alpha: true, antialias: true });
  private _directionalLight: DirectionalLight = new DirectionalLight();
  private _ambientLight = new AmbientLight();
  private _gridHelper = new GridHelper();
  private _edgesMaterial: LineBasicMaterial = new LineBasicMaterial();
  private _loadingManager: LoadingManager = new LoadingManager();
  private _model: Object3D | null;
  private _sceneThree: Group = new Group();
  private _modelHolder: Group = new Group();

  componentDidLoad() {
    this._initConfig = merge(defaultConfig, this.config);
    this.initializeScene();
    this.setupEventListeners();
  }

  private initializeScene() {
    this.setupCamera();
    this.setupControls();
    this.setupRendering();
    this.setupLighting();
    this.setupGrid();
    this.handleResize();
    
    if (this.modelPath) 
      this.loadModel(this.modelPath);
    this._scene.add(this._sceneThree);
    
    this.startRenderLoop();
    this.setupLoadingManager();
  }

  private setupEventListeners() {
    window.addEventListener('resize', this.handleResize);
  }

  @Watch('modelPath')
  modelChanged(newValue: string, oldValue: string) {
    if (newValue !== oldValue) this.loadModel(newValue);
  }

  @Watch('config')
  updateConfig(newConfig: GltfRendererConfig) {
    const config = merge(this._initConfig, newConfig);
    this.updateGridVisibility(config.grid);
    this.updateEdgesVisibility(config.edges);
    this.updateAutoRotate(config.controls);
  }

  private updateGridVisibility(gridConfig) {
    if (gridConfig) this._gridHelper.material.opacity = gridConfig.enable ? 1 : 0;
  }

  private updateEdgesVisibility(edgesConfig) {
    if (edgesConfig) edgesConfig.enable ? this._camera.layers.enable(1) : this._camera.layers.disable(1);
  }

  private updateAutoRotate(controlsConfig) {
    if (controlsConfig) this._orbitControls.autoRotate = controlsConfig.autoRotate;
  }

  private setupLoadingManager() {
    this._loadingManager.onProgress = (_, itemsLoaded, itemsTotal) => {
      this.loadProgress.emit(Math.round((itemsLoaded / itemsTotal) * 100));
    };

    this._loadingManager.onError = url => {
      console.error(`Failed to load the resource`, url);
    };
  }

  private handleResize() {
    const container = this.element.shadowRoot.querySelector('#container');
    if (this._camera && container) {
      this._camera.aspect = container.clientWidth / container.clientHeight;
      this._camera.updateProjectionMatrix();
      this._renderer.setSize(container.clientWidth, container.clientHeight);
    }
  }

  private setupCamera() {
    const { camera } = this._initConfig;
    const container = this.element.shadowRoot.querySelector('#container');
    const aspect = container.clientWidth / container.clientHeight;
    this._camera = new PerspectiveCamera(camera.fov, aspect, 0.1, 1000);
    this._camera.position.set(camera.position.x, camera.position.y, camera.position.z);
    this._camera.updateProjectionMatrix();
    container.appendChild(this._renderer.domElement);
  }

  private setupControls() {
    const { controls } = this._initConfig;
    this._orbitControls = new OrbitControls(this._camera, this._renderer.domElement);
    Object.assign(this._orbitControls, {
      enableRotate: controls.enable,
      enableDamping: true,
      dampingFactor: 0.25,
      enableZoom: controls.enableZoom,
      autoRotate: controls.autoRotate,
      rotateSpeed: controls.rotateSpeed,
      autoRotateSpeed: controls.autoRotateSpeed,
    });

    this._orbitControls.target.set(controls.orbitTarget.x, controls.orbitTarget.y, controls.orbitTarget.z);
    this._orbitControls.addEventListener('end', this.updateRenderer);
  }

  private updateRenderer = () => {
    this._rendererUpdate = {
      cameraPosition: this._camera.position,
      orbitTarget: this._orbitControls.target,
    };
    this.rendererUpdate.emit(this._rendererUpdate);
  };

  private setupRendering() {
    const { rendering } = this._initConfig;
    Object.assign(this._renderer, {
      shadowMap: {
        enabled: rendering.shadowMap,
        type: PCFSoftShadowMap,
      },
      toneMapping: ACESFilmicToneMapping,
    });

    this._scene.background = rendering.backgroundColor ? new Color(rendering.backgroundColor) : null;
    this.setupEnvironment();
  }

  private setupEnvironment() {
    const { rendering } = this._initConfig;
    if (!rendering.environmentPath) {
      const pmremGenerator = new PMREMGenerator(this._renderer);
      this._scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
      return;
    } else {
      new RGBELoader(this._loadingManager).load(
        rendering.environmentPath,
        texture => {
          texture.mapping = EquirectangularReflectionMapping;
          this._scene.environment = texture;
        },
        undefined,
        error => {
          console.error(`Failed to load the environment texture from: ${rendering.environmentPath}`, error);
        },
      );
    }
  }

  private setupLighting() {
    const { lighting, rendering } = this._initConfig;

    this._directionalLight.position.set(
      lighting.position.x, 
      lighting.position.y, 
      lighting.position.z
    );

    Object.assign(this._directionalLight, {
      color: new Color(lighting.color),
      intensity: lighting.intensity,
      castShadow: lighting.castShadow,
    });

    this._directionalLight.shadow.mapSize.set(1024, 1024);
    this._directionalLight.shadow.intensity = lighting.shadowIntensity;

    this._ambientLight.color.set(rendering.ambientColor);
    this._ambientLight.intensity = rendering.ambientIntensity;

    this._scene.add(this._ambientLight, this._directionalLight);
  }

  private loadModel(modelPath: string) {
    if (!modelPath) return;

    this.clearPreviousModel();

    new GLTFLoader(this._loadingManager).load(
      modelPath,
      gltf => this.processLoadedModel(gltf.scene),
      undefined,
      error => console.error('Failed to load _model:', error),
    );
  }

  private clearPreviousModel() {
    if (this._model) {
      this._edgesMaterial.dispose();
      gltfDispose(this._model);
      this._modelHolder.clear();
      this._model = null;
    }
  }

  private processLoadedModel(model: Object3D) {
    model.traverse(child => {
      if (child instanceof Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    this.adjustModel(model);
    this.addEdges(model);

    this._model = model;
    this._modelHolder.add(this._model);

    if (!this._sceneThree.children.includes(this._modelHolder))
      this._sceneThree.add(this._modelHolder);

    this.updateRendererLoaded(model);
  }

  private adjustModel(model: Object3D) {
    const box = new Box3().setFromObject(model);
    const size = box.getSize(new Vector3()).length();
    const scaleFactor = 5 / size;
    model.scale.set(scaleFactor, scaleFactor, scaleFactor);

    const boxAdjusted = new Box3().setFromObject(model);
    const center = new Vector3();
    boxAdjusted.getCenter(center);
    model.position.set(-center.x, -boxAdjusted.min.y, -center.z);
  }

  private addEdges(model: Object3D) {
    const { edges } = this._initConfig;
    this._edgesMaterial.color.set(edges.color);
    model.traverse(child => {
      if (child instanceof Mesh) {
        const wireframe = new WireframeGeometry(child.geometry);
        const line = new LineSegments(wireframe, this._edgesMaterial);
        line.layers.set(1);
        child.add(line);
      }
    });

    edges.enable ? this._camera.layers.enable(1) : this._camera.layers.disable(1);
  }

  private setupGrid() {
    const { grid } = this._initConfig;
    this._gridHelper = new GridHelper(grid.size, grid.divisions, grid.color1, grid.color2);
    this._gridHelper.material.transparent = true;
    this._gridHelper.material.opacity = grid.enable ? 1 : 0;
    this._sceneThree.add(this._gridHelper);
  }

  private updateRendererLoaded(_model: Object3D) {
    const triangles = this.countTriangles(_model);
    this._rendererLoad = {
      cameraPosition: this._camera.position,
      orbitTarget: this._orbitControls.target,
      triangleCount: triangles,
    };
    this.rendererLoad.emit(this._rendererLoad);
  }

  private countTriangles(model: Object3D) {
    let triangles = 0;
    model.traverse(child => {
      if (child instanceof Mesh && child.geometry) {
        const geometry = child.geometry;
        geometry.computeVertexNormals();
        triangles += geometry.index ? geometry.index.count / 3 : geometry.attributes.position.count / 3;
      }
    });
    return triangles;
  }

  private startRenderLoop = () => {
    requestAnimationFrame(this.startRenderLoop);
    this._orbitControls.update();
    this._renderer.render(this._scene, this._camera);
  };

  render() {
    return <div id="container" style={{ width: '100%', height: '100%' }}></div>;
  }

  disconnectedCallback() {
    window.removeEventListener('resize', this.handleResize);
  }
}