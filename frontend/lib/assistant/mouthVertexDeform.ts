import * as THREE from "three";
import type { HeadAnalysis } from "./analyzeModel";

export interface MouthVertexRig {
  entries: MouthVertexEntry[];
  active: boolean;
  /** Масштаб смещения под размер головы */
  deformScale: number;
}

interface MouthVertexEntry {
  mesh: THREE.Mesh;
  indices: number[];
  base: Float32Array;
  weights: number[];
  roles: ("upper" | "lower")[];
}

function collectMeshes(root: THREE.Object3D): THREE.Mesh[] {
  const list: THREE.Mesh[] = [];
  root.traverse((obj) => {
    const m = obj as THREE.Mesh;
    if (m.isMesh && m.geometry?.attributes?.position) list.push(m);
  });
  return list;
}

export function buildMouthVertexRig(
  root: THREE.Object3D,
  head: HeadAnalysis
): MouthVertexRig {
  root.updateMatrixWorld(true);

  const mouth = head.mouthAnchorLocal.clone();
  const headSize = Math.max(head.headSizeY, 0.12);
  const radiusXZ = headSize * 0.4;
  const yMin = mouth.y - headSize * 0.2;
  const yMax = mouth.y + headSize * 0.1;
  const splitY = mouth.y - headSize * 0.035;

  const rootInv = root.matrixWorld.clone().invert();
  const entries: MouthVertexEntry[] = [];
  const tmp = new THREE.Vector3();

  for (const mesh of collectMeshes(root)) {
    mesh.updateMatrixWorld(true);
    const posAttr = mesh.geometry.attributes.position as THREE.BufferAttribute;
    if (!posAttr) continue;

    const indices: number[] = [];
    const weights: number[] = [];
    const roles: ("upper" | "lower")[] = [];

    for (let i = 0; i < posAttr.count; i++) {
      tmp.fromBufferAttribute(posAttr, i);
      tmp.applyMatrix4(mesh.matrixWorld);
      tmp.applyMatrix4(rootInv);

      if (tmp.y < yMin || tmp.y > yMax) continue;
      const dx = tmp.x - mouth.x;
      const dz = tmp.z - mouth.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist > radiusXZ) continue;

      indices.push(i);
      weights.push((1 - dist / radiusXZ) ** 2);
      roles.push(tmp.y >= splitY ? "upper" : "lower");
    }

    if (indices.length < 12) continue;

    entries.push({
      mesh,
      indices,
      base: new Float32Array(posAttr.array),
      weights,
      roles,
    });
  }

  return {
    entries,
    active: entries.length > 0,
    deformScale: headSize * 0.55,
  };
}

export function applyMouthVertexDeform(rig: MouthVertexRig, openness: number): void {
  if (!rig.active) return;

  const open = THREE.MathUtils.clamp(openness, 0, 1);
  const jaw = rig.deformScale * open * 0.14;
  const lip = rig.deformScale * open * 0.06;

  for (const entry of rig.entries) {
    const pos = entry.mesh.geometry.attributes.position as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;

    for (let k = 0; k < entry.indices.length; k++) {
      const i = entry.indices[k];
      const w = entry.weights[k];
      const bi = i * 3;
      const ox = entry.base[bi];
      const oy = entry.base[bi + 1];
      const oz = entry.base[bi + 2];

      if (entry.roles[k] === "lower") {
        arr[bi + 1] = oy - jaw * w;
        arr[bi + 2] = oz + lip * w * 0.35;
      } else {
        arr[bi + 1] = oy + lip * w * 0.45;
        arr[bi + 2] = oz + lip * w * 0.15;
      }
    }

    pos.needsUpdate = true;
    entry.mesh.geometry.computeVertexNormals();
  }
}

export function resetMouthVertexDeform(rig: MouthVertexRig): void {
  if (!rig.active) return;

  for (const entry of rig.entries) {
    const pos = entry.mesh.geometry.attributes.position as THREE.BufferAttribute;
    (pos.array as Float32Array).set(entry.base);
    pos.needsUpdate = true;
    entry.mesh.geometry.computeVertexNormals();
  }
}
