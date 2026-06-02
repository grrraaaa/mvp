"use client";

import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import {
  PORTRAIT_CAMERA_FOV,
  PORTRAIT_CAMERA_Y_OFFSET,
  PORTRAIT_CAMERA_Z,
  PORTRAIT_CAMERA_Z_COMPACT,
  PORTRAIT_HEAD_WORLD_Y,
  PORTRAIT_TARGET_Y_OFFSET,
} from "@/lib/assistant/glbCharacter";

interface Props {
  active: boolean;
  compact?: boolean;
}

/** Камера крупным планом: выше и ближе к лицу. */
export function PortraitCamera({ active, compact }: Props) {
  const { camera, controls } = useThree();

  useEffect(() => {
    if (!active || !(camera instanceof THREE.PerspectiveCamera)) return;

    const headY = PORTRAIT_HEAD_WORLD_Y;
    camera.position.set(0, headY + 0.04, compact ? PORTRAIT_CAMERA_Z_COMPACT : PORTRAIT_CAMERA_Z);
    camera.fov = PORTRAIT_CAMERA_FOV;
    camera.near = 0.08;
    camera.far = 40;
    camera.updateProjectionMatrix();

    const orbit = controls as { target?: THREE.Vector3; update?: () => void } | null;
    if (orbit?.target) {
      orbit.target.set(0, lookY, 0);
      orbit.update?.();
    }
  }, [active, compact, camera, controls]);

  return null;
}
