import React from 'react';

export function RoomEnvironment() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <circleGeometry args={[3.0, 64]} />
        <meshStandardMaterial color="#1c1420" roughness={0.7} metalness={0.05} />
      </mesh>
      {/* Balanced, clean ambient light to eliminate dark shadow artifacts */}
      <ambientLight intensity={1.1} color="#FFF0F5" />
      {/* Front-right key light */}
      <directionalLight position={[1.5, 3.5, 2.5]} intensity={1.0} color="#FFF6EE" />
      {/* Soft fill light from front-left */}
      <directionalLight position={[-2.0, 2.5, 2.0]} intensity={0.6} color="#F5E8FF" />
      <fog attach="fog" args={['#160F17', 6, 22]} />
    </group>
  );
}


