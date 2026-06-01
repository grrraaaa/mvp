import * as THREE from "three";

export interface HeadAnalysis {
  headMesh: THREE.Mesh | null;
  /** Точка рта в локальных координатах корня GLB (clone root) */
  mouthAnchorLocal: THREE.Vector3;
  /** Центр головы в локальных координатах корня GLB */
  headCenterLocal: THREE.Vector3;
  /** Примерный размер головы по Y — для масштаба ProceduralMouth */
  headSizeY: number;
  hasMorphTargets: boolean;
  hasAnimations: boolean;
  meshCount: number;
}

function meshBounds(mesh: THREE.Mesh): { box: THREE.Box3; center: THREE.Vector3 } {
  if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();

  const box = mesh.geometry.boundingBox!.clone();
  box.applyMatrix4(mesh.matrixWorld);
  return { box, center: box.getCenter(new THREE.Vector3()) };
}

function unionMeshBounds(meshes: THREE.Mesh[]): THREE.Box3 {
  const union = new THREE.Box3();
  for (const mesh of meshes) {
    union.union(meshBounds(mesh).box);
  }
  return union;
}

/** Определяет «голову» и точку рта для статичных Sketchfab/сканов. */
export function analyzeHead(root: THREE.Object3D): HeadAnalysis {
  root.updateMatrixWorld(true);

  const meshes: THREE.Mesh[] = [];
  let hasMorphTargets = false;

  root.traverse((obj) => {
    const m = obj as THREE.Mesh;
    if (m.isMesh) {
      meshes.push(m);
      if (
        m.morphTargetDictionary &&
        Object.keys(m.morphTargetDictionary).length > 0
      ) {
        hasMorphTargets = true;
      }
    }
  });

  const fallback: HeadAnalysis = {
    headMesh: null,
    mouthAnchorLocal: new THREE.Vector3(0, 1.45, 0.12),
    headCenterLocal: new THREE.Vector3(0, 1.5, 0),
    headSizeY: 0.22,
    hasMorphTargets,
    hasAnimations: false,
    meshCount: meshes.length,
  };

  if (meshes.length === 0) return fallback;

  let headMesh = meshes[0];
  let topY = -Infinity;

  for (const mesh of meshes) {
    const { center } = meshBounds(mesh);
    if (center.y > topY) {
      topY = center.y;
      headMesh = mesh;
    }
  }

  const modelBox = unionMeshBounds(meshes);
  const modelSize = modelBox.getSize(new THREE.Vector3());
  const modelCenter = modelBox.getCenter(new THREE.Vector3());

  // personage.glb: несколько full-body мешей; доля от низа bbox давала пояс/бедро
  const isFullBodyScan = modelSize.y > 1.0;

  let headCenterWorld: THREE.Vector3;
  let mouthWorld: THREE.Vector3;
  let headSizeY: number;

  if (isFullBodyScan) {
    const h = modelSize.y;
    headSizeY = h * 0.14;
    headCenterWorld = new THREE.Vector3(
      modelCenter.x,
      modelBox.max.y - h * 0.08,
      modelCenter.z
    );
    mouthWorld = new THREE.Vector3(
      modelCenter.x,
      modelBox.max.y - h * 0.135,
      modelBox.max.z + Math.max(0.02, modelSize.z * 0.035)
    );
  } else {
    const headBox = meshBounds(headMesh).box;
    const headSize = headBox.getSize(new THREE.Vector3());
    headSizeY = headSize.y;
    headCenterWorld = headBox.getCenter(new THREE.Vector3());
    mouthWorld = new THREE.Vector3(
      headCenterWorld.x,
      headBox.min.y + headSize.y * 0.32,
      headBox.max.z + Math.max(0.015, headSize.z * 0.04)
    );
  }

  const headCenterLocal = root.worldToLocal(headCenterWorld.clone());
  const mouthAnchorLocal = root.worldToLocal(mouthWorld.clone());

  return {
    headMesh,
    mouthAnchorLocal,
    headCenterLocal,
    headSizeY,
    hasMorphTargets,
    hasAnimations: false,
    meshCount: meshes.length,
  };
}
