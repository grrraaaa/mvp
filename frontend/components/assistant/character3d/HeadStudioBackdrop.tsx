"use client";

import { sberTheme } from "@/lib/sber/theme";
import { ConsultantFurniture } from "./ConsultantFurniture";

/** Фон «видеозвонок / студия» — акцент на лице, без отвлекающей комнаты. */
export function HeadStudioBackdrop() {
  return (
    <group>
      <mesh position={[0, 1.35, -1.2]} receiveShadow>
        <planeGeometry args={[6.5, 4.8]} />
        <meshStandardMaterial color={sberTheme.bgPanel} roughness={1} />
      </mesh>
      <mesh position={[0, 1.35, -1.18]}>
        <planeGeometry args={[3.8, 3.2]} />
        <meshStandardMaterial
          color={sberTheme.green}
          transparent
          opacity={0.06}
          roughness={1}
        />
      </mesh>
      <ConsultantFurniture variant="portrait" />
      <pointLight position={[0.4, 1.7, 0.6]} intensity={0.35} color="#ffffff" distance={3} />
      <pointLight position={[-0.5, 1.5, 0.4]} intensity={0.15} color={sberTheme.greenLight} distance={3} />
    </group>
  );
}
