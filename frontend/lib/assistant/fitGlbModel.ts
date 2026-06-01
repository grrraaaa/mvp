import * as THREE from "three";
import { GLB_TARGET_HEIGHT, GLB_SCALE_MULTIPLIER } from "./glbCharacter";

export interface GlbFitResult {
  scale: number;
  position: THREE.Vector3;
  height: number;
}

/** Масштаб и смещение: ~1.7 м, ноги на y=0, центр по XZ. */
export function fitObjectToFloor(object: THREE.Object3D): GlbFitResult {
  object.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  const height = size.y || 1;
  const scale =
    (GLB_TARGET_HEIGHT / height) *
    GLB_SCALE_MULTIPLIER;

  const position = new THREE.Vector3(
    -center.x * scale,
    -box.min.y * scale,
    -center.z * scale
  );

  return { scale, position, height: height * scale };
}
