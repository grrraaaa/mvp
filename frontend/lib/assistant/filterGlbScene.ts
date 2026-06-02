import * as THREE from "three";

/** Имена мешей окружения / мебели в составных GLB (Sketchfab и т.п.). */
const ENV_MESH_NAME_RE =
  /chair|table|desk|sofa|couch|bed|floor|ground|wall|ceiling|room|plant|lamp|window|door|shelf|cabinet|furniture|environment|background|sketchfab|scatter|prop/i;

/**
 * Удаляет из сцены GLB меши мебели и окружения, оставляя персонажа.
 * Для personage.glb (3 body-меша) обычно ничего не удаляет.
 */
export function stripEnvironmentFromGlb(root: THREE.Object3D): void {
  root.updateMatrixWorld(true);
  const modelBox = new THREE.Box3().setFromObject(root);
  const modelSize = modelBox.getSize(new THREE.Vector3());
  const modelH = modelSize.y || 1;

  const toRemove = new Set<THREE.Object3D>();

  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;

    const name = (mesh.name || "").toLowerCase();
    if (ENV_MESH_NAME_RE.test(name)) {
      toRemove.add(mesh);
      return;
    }

    const box = new THREE.Box3().setFromObject(mesh);
    const size = box.getSize(new THREE.Vector3());

    // Плоские «полы» / платформы
    if (size.y < modelH * 0.07 && Math.max(size.x, size.z) > modelH * 0.25) {
      toRemove.add(mesh);
      return;
    }

    // Низкие объекты у ног (отдельная геометрия пола)
    if (box.max.y < modelBox.min.y + modelH * 0.06 && size.y < modelH * 0.15) {
      toRemove.add(mesh);
    }
  });

  for (const obj of toRemove) {
    obj.parent?.remove(obj);
    obj.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.geometry?.dispose();
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach((m) => m?.dispose());
      }
    });
  }
}
