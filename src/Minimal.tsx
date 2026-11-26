import React from "react";
import { AbsoluteFill } from "remotion";
import { ThreeCanvas } from "@remotion/three";

const Box: React.FC = () => (
  <mesh position={[0, 0, 0]}>
    <boxGeometry args={[3, 3, 3]} />
    <meshBasicMaterial color="#ff0000" />
  </mesh>
);

export const Minimal: React.FC = () => (
  <AbsoluteFill style={{ background: "#00ff00" }}>
    <ThreeCanvas width={1080} height={1920} camera={{ fov: 40, position: [0, 0, 8] }}>
      <ambientLight />
      <Box />
    </ThreeCanvas>
  </AbsoluteFill>
);
