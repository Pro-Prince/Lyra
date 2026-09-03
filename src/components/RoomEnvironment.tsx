import React from 'react';

export function RoomEnvironment() {
  return (
    <group>
      {/* 3D Atmospheric Background Color & Fog */}
      <color attach="background" args={['#140D16']} />
      <fog attach="fog" args={['#140D16', 7, 26]} />

      {/* ========================================================= */}
      {/* ROOM FLOOR & CARPET                                       */}
      {/* ========================================================= */}
      {/* Main room hardwood/slate floor (wide, seamless interior floor) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[28, 28]} />
        <meshStandardMaterial color="#1a111c" roughness={0.72} metalness={0.06} />
      </mesh>

      {/* Decorative woven area rug beneath Lyra */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <circleGeometry args={[2.2, 64]} />
        <meshStandardMaterial color="#261a25" roughness={0.92} metalness={0.02} />
      </mesh>

      {/* Area rug decorative edge border */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
        <ringGeometry args={[2.14, 2.2, 64]} />
        <meshBasicMaterial color="#3d2b3b" />
      </mesh>

      {/* Subtle contact shadow under Lyra's feet */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
        <circleGeometry args={[0.75, 32]} />
        <meshBasicMaterial color="#0b060d" transparent opacity={0.45} />
      </mesh>

      {/* ========================================================= */}
      {/* ROOM ARCHITECTURAL WALLS & STRUCTURE                      */}
      {/* ========================================================= */}
      {/* Main back wall */}
      <mesh position={[0, 3.8, -2.85]} receiveShadow>
        <planeGeometry args={[24, 9]} />
        <meshStandardMaterial color="#160f17" roughness={0.85} metalness={0.03} />
      </mesh>

      {/* Room baseboard trim along the wall base */}
      <mesh position={[0, 0.08, -2.82]}>
        <boxGeometry args={[24, 0.16, 0.04]} />
        <meshStandardMaterial color="#271a26" roughness={0.65} />
      </mesh>

      {/* Modern vertical acoustic wood slat wall accent (left background) */}
      {[-3.2, -2.9, -2.6, -2.3, -2.0, -1.7].map((x, i) => (
        <mesh key={i} position={[x, 3.2, -2.81]}>
          <boxGeometry args={[0.13, 6.2, 0.03]} />
          <meshStandardMaterial color="#241622" roughness={0.7} />
        </mesh>
      ))}

      {/* Ambient Interior Soft-Light Portal / Window Frame (left side) */}
      <group position={[-2.45, 2.3, -2.82]}>
        {/* Frame */}
        <mesh>
          <boxGeometry args={[1.4, 2.4, 0.05]} />
          <meshStandardMaterial color="#221623" />
        </mesh>
        {/* Glowing glass panel */}
        <mesh position={[0, 0, 0.03]}>
          <planeGeometry args={[1.26, 2.26]} />
          <meshBasicMaterial color="#2c1d2e" />
        </mesh>
        {/* Warm twilight point light */}
        <pointLight position={[0, 0, 0.3]} intensity={0.9} distance={4.0} color="#FCE4EC" />
      </group>

      {/* Minimalist Floating Shelf & Room Decor (right background) */}
      <group position={[2.0, 1.85, -2.8]}>
        {/* Shelf plank */}
        <mesh>
          <boxGeometry args={[1.6, 0.05, 0.28]} />
          <meshStandardMaterial color="#291a29" roughness={0.55} />
        </mesh>
        {/* Ceramic pot & plant */}
        <mesh position={[-0.45, 0.12, 0]}>
          <cylinderGeometry args={[0.08, 0.06, 0.18, 16]} />
          <meshStandardMaterial color="#423142" />
        </mesh>
        <mesh position={[-0.45, 0.23, 0]}>
          <sphereGeometry args={[0.09, 12, 12]} />
          <meshStandardMaterial color="#384939" roughness={0.9} />
        </mesh>
        {/* Cozy pastel books */}
        <mesh position={[0.2, 0.12, 0]} rotation={[0, 0.08, 0]}>
          <boxGeometry args={[0.09, 0.22, 0.2]} />
          <meshStandardMaterial color="#593b4f" />
        </mesh>
        <mesh position={[0.32, 0.11, 0]} rotation={[0, 0.04, 0]}>
          <boxGeometry args={[0.08, 0.19, 0.19]} />
          <meshStandardMaterial color="#3b4b5e" />
        </mesh>
      </group>

      {/* Scandinavian Studio Floor Lamp (right background) */}
      <group position={[2.25, 0, -1.7]}>
        {/* Lamp base */}
        <mesh position={[0, 0.02, 0]}>
          <cylinderGeometry args={[0.22, 0.22, 0.04, 24]} />
          <meshStandardMaterial color="#2d1e2c" metalness={0.4} roughness={0.3} />
        </mesh>
        {/* Lamp pole */}
        <mesh position={[0, 0.95, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 1.9, 16]} />
          <meshStandardMaterial color="#382637" metalness={0.4} roughness={0.3} />
        </mesh>
        {/* Warm glowing lampshade */}
        <mesh position={[0, 1.82, 0]}>
          <cylinderGeometry args={[0.18, 0.25, 0.32, 24, 1, true]} />
          <meshStandardMaterial color="#FFE6CC" emissive="#FFD9B3" emissiveIntensity={0.55} roughness={0.9} />
        </mesh>
        {/* Warm ambient pool of light */}
        <pointLight position={[0, 1.82, 0]} intensity={1.7} distance={5.5} color="#FFE0B2" />
      </group>

      {/* ========================================================= */}
      {/* BALANCED ROOM ILLUMINATION                                */}
      {/* ========================================================= */}
      {/* Ambient light for balanced, soft fill across the companion and room */}
      <ambientLight intensity={2.2} color="#FFF0F5" />
      {/* Front-right key directional light */}
      <directionalLight position={[1.8, 3.8, 2.6]} intensity={1.6} color="#FFF5EE" />
      {/* Front-left soft fill light */}
      <directionalLight position={[-2.2, 2.6, 2.2]} intensity={0.9} color="#F5E8FF" />
      {/* Back rim light highlighting hair and silhouette */}
      <directionalLight position={[-1.5, 3.2, -1.8]} intensity={1.3} color="#FFE6F0" />
    </group>
  );
}



