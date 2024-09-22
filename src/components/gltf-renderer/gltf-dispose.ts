import {
  Object3D,
  Mesh,
  Material,
  MeshStandardMaterial,
  MeshPhysicalMaterial,
  MeshBasicMaterial,
  MeshLambertMaterial,
  MeshPhongMaterial,
  LineBasicMaterial,
  BufferGeometry,
  LineSegments,
  Texture,
} from 'three';

/**
 * Disposes of the materials, geometries, edges, and textures associated with a 3D model.
 * This method helps prevent memory leaks by properly releasing resources.
 *
 * @param model - The THREE.Object3D to be disposed of
 */
const gltfDispose = (model: Object3D) => {
  model.traverse(child => {
    if (child instanceof Mesh) 
      disposeMeshResources(child);
  });
};

const disposeMeshResources = (mesh: Mesh) => {
  disposeMaterial(mesh.material);
  disposeGeometry(mesh.geometry);
  disposeEdges(mesh);
};

const disposeMaterial = (material: Material | Material[]) => {
  if (Array.isArray(material)) {
    material.forEach(mat => disposeSingleMaterial(mat));
  } else {
    disposeSingleMaterial(material);
  }
};

const disposeSingleMaterial = (material: Material) => {
  if (!material) return;

  const materialDisposers = {
    [MeshStandardMaterial.name]: disposeMeshStandardMaterial,
    [MeshPhysicalMaterial.name]: disposeMeshPhysicalMaterial,
    [MeshBasicMaterial.name]: disposeMeshBasicMaterial,
    [MeshLambertMaterial.name]: disposeMeshLambertMaterial,
    [MeshPhongMaterial.name]: disposeMeshPhongMaterial,
    [LineBasicMaterial.name]: disposeLineBasicMaterial,
  };

  const disposer = materialDisposers[material.constructor.name];
  if (disposer) {
    disposer(material as any);
  } else {
    console.warn('Invalid material type:', material);
    if (typeof material.dispose === 'function') 
      material.dispose();
  }
};

const disposeGeometry = (geometry: BufferGeometry | null) => {
  if (geometry) 
    geometry.dispose();
};

const disposeEdges = (mesh: Mesh) => {
  mesh.children.forEach(child => {
    if (child instanceof LineSegments) {
      disposeGeometry(child.geometry);
      disposeMaterial(child.material);
      mesh.remove(child);
    }
  });
};

const disposeMeshStandardMaterial = (material: MeshStandardMaterial) => {
  disposeTexture(material.map);
  disposeTexture(material.envMap);
  disposeTexture(material.roughnessMap);
  disposeTexture(material.metalnessMap);
  material.dispose();
};

const disposeMeshPhysicalMaterial = (material: MeshPhysicalMaterial) => {
  disposeMeshStandardMaterial(material);
  disposeTexture(material.clearcoatMap);
  disposeTexture(material.clearcoatRoughnessMap);
};

const disposeMeshBasicMaterial = (material: MeshBasicMaterial) => {
  disposeTexture(material.map);
  disposeTexture(material.envMap);
  material.dispose();
};

const disposeMeshLambertMaterial = (material: MeshLambertMaterial) => {
  disposeTexture(material.map);
  disposeTexture(material.envMap);
  material.dispose();
};

const disposeMeshPhongMaterial = (material: MeshPhongMaterial) => {
  disposeTexture(material.map);
  disposeTexture(material.specularMap);
  disposeTexture(material.bumpMap);
  disposeTexture(material.normalMap);
  material.dispose();
};

const disposeLineBasicMaterial = (material: LineBasicMaterial) => {
  disposeTexture(material.map); // `LineBasicMaterial` might not have textures, but it's safe to include
  material.dispose();
};

const disposeTexture = (texture: Texture | null) => {
  if (texture) 
    texture.dispose();
};

export default gltfDispose;