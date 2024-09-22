type Vector3 = { x: number, y: number, z: number };

interface Grid {
  enable: boolean;
  size: number;
  divisions: number;
  color1: string;
  color2: string;
}

interface Edges {
  enable: boolean;
  color: string;
  linewidth: number;
}

interface Camera {
  fov: number;
  position: Vector3;
}

interface Rendering {
  backgroundColor: string | null;
  ambientColor: string;
  ambientIntensity: number;
  environmentPath: string;
  shadowMap: boolean;
}

interface DirectionalLight {
  color: string;
  intensity: number;
  position: Vector3;
  castShadow: boolean;
  shadowIntensity: number;
}

interface Controls {
  enable: boolean;
  enableZoom: boolean;
  orbitTarget: Vector3;
  rotateSpeed: number;
  autoRotate: boolean;
  autoRotateSpeed: number;
}

export interface GltfRendererConfig {
  camera?: Partial<Camera>;
  rendering?: Partial<Rendering>;
  lighting?: Partial<DirectionalLight>;
  controls?: Partial<Controls>;
  grid?: Partial<Grid>;
  edges?: Partial<Edges>;
}

export interface GltfRendererUpdate {
  orbitTarget?: Vector3;
  cameraPosition?: Vector3;
}

export interface GltfRendererLoad extends GltfRendererUpdate {
  triangleCount?: number;
}