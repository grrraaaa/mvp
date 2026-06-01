"use client";

import { Grid } from "@react-three/drei";
import { sberTheme } from "@/lib/sber/theme";
import { ConsultantFurniture } from "./ConsultantFurniture";

export function Room() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[4.2, 3.2]} />
        <meshStandardMaterial color={sberTheme.bgElevated} roughness={0.9} metalness={0.1} />
      </mesh>

      <Grid
        position={[0, 0.01, 0]}
        args={[4.5, 3.5]}
        cellSize={0.35}
        cellThickness={0.5}
        sectionSize={1.05}
        sectionThickness={1}
        fadeDistance={6}
        cellColor={sberTheme.greenDeep}
        sectionColor={sberTheme.greenDark}
        infiniteGrid={false}
      />

      {/* Back wall */}
      <mesh position={[0, 1.1, -1.55]} receiveShadow>
        <planeGeometry args={[5.5, 2.8]} />
        <meshStandardMaterial color={sberTheme.bgPanel} roughness={1} />
      </mesh>
      {/* Side walls */}
      <mesh position={[-2.05, 1.1, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[3.2, 2.2]} />
        <meshStandardMaterial color={sberTheme.bgPanel} transparent opacity={0.6} />
      </mesh>
      <mesh position={[2.05, 1.1, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[3.2, 2.2]} />
        <meshStandardMaterial color={sberTheme.bgPanel} transparent opacity={0.6} />
      </mesh>

      <ConsultantFurniture variant="room" />
    </group>
  );
}
