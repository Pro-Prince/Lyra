import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useLoader } from '@react-three/fiber';

// -----------------------------------------------------------------------------
// PALETTE & LIGHTING CONSTANTS
// Tuned precisely to the warm sunset, amber LED cove, and neon pink accents.
// -----------------------------------------------------------------------------
const PALETTE = {
  sunsetGold: '#FFC096',
  amberCove: '#FFE2B8',
  lampGlow: '#FFE9C8',
  neonPink: '#FF6EB4',
  neonPinkBright: '#FF8FC0',
  coolFill: '#99809A',
  roomAmbient: '#634758',
  woodFloor: '#3B2421',
};

// -----------------------------------------------------------------------------
// 1. HIGH RESOLUTION CURVED 3D ROOM BACKDROP
// Projects the exact aesthetic room onto a gently curved cylindrical backdrop
// with realistic depth and camera parallax.
// -----------------------------------------------------------------------------
function RoomBackdropPlane() {
  const texture = useLoader(THREE.TextureLoader, '/room_backdrop.jpg');
  
  useMemo(() => {
    if (texture) {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.generateMipmaps = true;
      texture.needsUpdate = true;
    }
  }, [texture]);

  return (
    <group position={[0, 1.85, -4.2]}>
      {/* Slightly curved cylindrical mesh for natural perspective parallax */}
      <mesh receiveShadow={false}>
        <cylinderGeometry args={[7.2, 7.2, 5.2, 48, 1, true, -Math.PI * 0.42, Math.PI * 0.84]} />
        <meshBasicMaterial
          map={texture}
          side={THREE.BackSide}
          toneMapped={false}
          fog={false}
        />
      </mesh>
    </group>
  );
}

// -----------------------------------------------------------------------------
// 2. REAL 3D GROUND RECEIVER WITH DYNAMIC SHADOWS & GLOWING NEON CIRCLE
// -----------------------------------------------------------------------------
function RoomFloorAndGlowRing() {
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (ringRef.current) {
      // Gentle breathing pulse on the pink floor neon ring
      const t = clock.getElapsedTime();
      const material = ringRef.current.material as THREE.MeshStandardMaterial;
      if (material) {
        material.emissiveIntensity = 2.0 + Math.sin(t * 1.8) * 0.4;
      }
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* 3D Floor plane that catches shadows from the VRM avatar */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[18, 18]} />
        <meshStandardMaterial
          color={PALETTE.woodFloor}
          roughness={0.45}
          metalness={0.08}
          transparent
          opacity={0.35} // Allows background floor tone to blend naturally while capturing real shadows
        />
      </mesh>

      {/* Center Glowing Pink Neon Ring on floor (under Lyra) matching reference */}
      <group position={[0, 0.005, 0.05]}>
        {/* Soft neon floor glow halo */}
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.5, 1.85, 64]} />
          <meshBasicMaterial
            color={PALETTE.neonPink}
            transparent
            opacity={0.22}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>

        {/* Crisp neon core ring */}
        <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.64, 1.72, 64]} />
          <meshStandardMaterial
            color={PALETTE.neonPinkBright}
            emissive={PALETTE.neonPinkBright}
            emissiveIntensity={2.2}
            roughness={0.2}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>
    </group>
  );
}

// -----------------------------------------------------------------------------
// 3. FOREGROUND SILHOUETTE FOR PARALLAX DEPTH
// Subtle leaves on the bottom-left matching the plant in the reference image
// -----------------------------------------------------------------------------
function ForegroundParallaxLeaves() {
  return (
    <group position={[-2.4, 0.15, 1.4]} rotation={[0.1, 0.3, -0.15]}>
      <mesh position={[0, 0, 0]} rotation={[0.4, -0.2, 0.1]}>
        <sphereGeometry args={[0.22, 10, 10]} scale={[1, 1.6, 0.15]} />
        <meshStandardMaterial color="#223326" roughness={0.7} />
      </mesh>
      <mesh position={[0.16, 0.12, -0.1]} rotation={[0.6, 0.3, -0.2]}>
        <sphereGeometry args={[0.18, 10, 10]} scale={[1, 1.5, 0.15]} />
        <meshStandardMaterial color="#2E4434" roughness={0.7} />
      </mesh>
      <mesh position={[-0.14, 0.08, -0.05]} rotation={[0.3, -0.5, 0.25]}>
        <sphereGeometry args={[0.16, 10, 10]} scale={[1, 1.4, 0.15]} />
        <meshStandardMaterial color="#1E2B21" roughness={0.7} />
      </mesh>
    </group>
  );
}

// -----------------------------------------------------------------------------
// 4. FLOATING AMBIENT DUST PARTICLES
// -----------------------------------------------------------------------------
function CozyAmbientParticles() {
  const pointsRef = useRef<THREE.Points>(null);
  const particleCount = 24;

  const [positions, initialPositions] = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const init = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const x = (Math.random() - 0.5) * 5.0;
      const y = 0.5 + Math.random() * 2.5;
      const z = -2.5 + Math.random() * 3.5;
      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;
      init[i * 3] = x;
      init[i * 3 + 1] = y;
      init[i * 3 + 2] = z;
    }
    return [pos, init];
  }, []);

  useFrame(({ clock }) => {
    if (pointsRef.current) {
      const geo = pointsRef.current.geometry;
      const posAttr = geo.attributes.position;
      const t = clock.getElapsedTime() * 0.3;

      for (let i = 0; i < particleCount; i++) {
        const idx = i * 3;
        const iy = initialPositions[idx + 1];
        // Gentle vertical floating and horizontal drift
        posAttr.array[idx + 1] = iy + Math.sin(t + i) * 0.2;
        posAttr.array[idx] = initialPositions[idx] + Math.cos(t * 0.7 + i) * 0.15;
      }
      posAttr.needsUpdate = true;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#FFE5CC"
        size={0.035}
        transparent
        opacity={0.45}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

// -----------------------------------------------------------------------------
// 5. LIGHTING GRAPH (MATCHED EXACTLY TO THE REFERENCE ROOM IMAGE)
// -----------------------------------------------------------------------------
export function RoomEnvironment() {
  return (
    <group>
      {/* Broad, warm ambient & hemisphere lighting matching the room */}
      <hemisphereLight
        color={PALETTE.sunsetGold}
        groundColor={PALETTE.roomAmbient}
        intensity={1.05}
      />
      <ambientLight color={PALETTE.roomAmbient} intensity={0.95} />

      {/* KEY: Warm sunset directional light from the left window */}
      <directionalLight
        color={PALETTE.sunsetGold}
        intensity={1.9}
        position={[-4.5, 2.8, 1.2]}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-bias={-0.00015}
      />

      {/* FILL: Soft subtle mauve fill from the opposite upper side */}
      <directionalLight
        color={PALETTE.coolFill}
        intensity={0.55}
        position={[3.5, 2.4, -1.0]}
      />

      {/* TOP COVE: Warm amber ceiling strip glow */}
      <pointLight
        color={PALETTE.amberCove}
        intensity={1.1}
        distance={6.5}
        decay={2}
        position={[0, 3.6, -1.8]}
      />

      {/* SHELVING & RIGHT LAMP: Warm amber point lights */}
      <pointLight
        color={PALETTE.lampGlow}
        intensity={1.3}
        distance={4.5}
        decay={2}
        position={[2.6, 1.1, -1.8]}
      />

      {/* NEON BUNNY SIGN: Vivid pink accent light on right wall */}
      <pointLight
        color={PALETTE.neonPink}
        intensity={0.9}
        distance={3.8}
        decay={2}
        position={[2.8, 2.1, -2.4]}
      />

      {/* FLOOR RING: Soft upward pink floor bounce on avatar */}
      <pointLight
        color={PALETTE.neonPinkBright}
        intensity={0.65}
        distance={2.2}
        decay={2}
        position={[0, 0.25, 0]}
      />

      {/* 3D Scene Components */}
      <React.Suspense fallback={null}>
        <RoomBackdropPlane />
      </React.Suspense>

      <RoomFloorAndGlowRing />
      <ForegroundParallaxLeaves />
      <CozyAmbientParticles />
    </group>
  );
}

export default RoomEnvironment;