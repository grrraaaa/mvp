import fs from "fs";

globalThis.self = globalThis;
import path from "path";
import { fileURLToPath } from "url";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const glbPath = path.join(__dirname, "../public/models/personage.glb");

const loader = new GLTFLoader();
const buf = fs.readFileSync(glbPath);
const arrayBuffer = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);

loader.parse(
  arrayBuffer,
  "",
  (gltf) => {
    const root = gltf.scene;
    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    console.log("model box:", { min: box.min.toArray(), max: box.max.toArray(), size: size.toArray(), center: center.toArray() });

    root.traverse((obj) => {
      const m = obj;
      if (!m.isMesh) return;
      const mb = new THREE.Box3().setFromObject(m);
      const ms = mb.getSize(new THREE.Vector3());
      const mc = mb.getCenter(new THREE.Vector3());
      const morphKeys = m.morphTargetDictionary
        ? Object.keys(m.morphTargetDictionary)
        : [];
      console.log("mesh:", m.name, "center:", mc.toArray(), "size:", ms.toArray(), "morphs:", morphKeys.length, morphKeys.slice(0, 8));
    });

    console.log("animations:", gltf.animations.map((a) => a.name));
  },
  (err) => {
    console.error(err);
    process.exit(1);
  }
);
