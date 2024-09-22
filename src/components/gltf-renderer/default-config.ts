import { GltfRendererConfig } from "./gltf-renderer-config";
export const defaultConfig: GltfRendererConfig = {
  camera: {
    fov: 75,
    position: { x: -6, y: 7, z: 4 },
  },
  controls: {
    enableZoom: true,
    orbitTarget: { x: 0, y: 0, z: 0 },
    enable: true,
    rotateSpeed: 0.5,
    autoRotate: false,
    autoRotateSpeed: 1
  },
  rendering: {
    shadowMap: false,
    backgroundColor: '#000000',
    ambientColor: '#fdfbd3',
    ambientIntensity: 0.5,
  },
  lighting: {
    position: { x: 5, y: 10, z: 7.5 },
    intensity: 1,
    color: '#fdfbd3',
    shadowIntensity: 1,
    castShadow: false,
  },
  grid: {
    size: 10,
    divisions: 5,
    color1: '#ffffff',
    color2: '#ffffff',
    enable: false,
  },
  edges: {
    color: '#ffffff',
    enable: false,
    linewidth: 1,
  }
};