"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useCharacterBehaviorStore } from "@/store/characterBehaviorStore";

const HOME = new THREE.Vector3(0, 0, 0.08);
const DESK = new THREE.Vector3(0.52, 0, -0.28);
const CAMERA_LOOK = new THREE.Vector3(0, 1.55, 3.6);
const WALK_SPEED = 0.42;
const ARRIVE_EPS = 0.05;

interface Options {
  enabled?: boolean;
}

export function useCharacterLocomotion(
  rootRef: React.RefObject<THREE.Group | null>,
  options: Options = {}
) {
  const { enabled = true } = options;
  const positionRef = useRef(HOME.clone());
  const walkArrivedRef = useRef(false);
  const { action, walkPhase: walkMode, onWalkComplete } = useCharacterBehaviorStore();

  useFrame((_, delta) => {
    const root = rootRef.current;
    if (!root) return;

    const faceAngle = Math.atan2(
      CAMERA_LOOK.x - (enabled ? positionRef.current.x : root.position.x),
      CAMERA_LOOK.z - (enabled ? positionRef.current.z : root.position.z)
    );
    root.rotation.y = THREE.MathUtils.lerp(
      root.rotation.y,
      faceAngle,
      action === "talk" ? 0.12 : 0.06
    );

    if (!enabled) return;

    if (action === "walk") {
      const target = walkMode === "to_home" ? HOME : DESK;
      const pos = positionRef.current;
      const to = target.clone().sub(pos);
      const dist = to.length();

      if (dist < ARRIVE_EPS) {
        if (!walkArrivedRef.current) {
          walkArrivedRef.current = true;
          onWalkComplete();
        }
      } else {
        walkArrivedRef.current = false;
        to.normalize().multiplyScalar(WALK_SPEED * delta);
        pos.add(to);
      }
    }

    root.position.copy(positionRef.current);
  });
}
