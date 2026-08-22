import React from 'react';
import * as THREE from 'three';

export function RoomEnvironment() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[2.5, 64]} />
        <meshStandardMaterial color="#1c1420" roughness={0.6} metalness={0.1} />
      </mesh>
      <ambientLight intensity={0.5} color="#C9A6FF" />
      <directionalLight position={[2, 4, 2]} intensity={0.8} color="#FFD9B3" />
      <fog attach="fog" args={['#160F17', 4, 10]} />
    </group>
  );
}
