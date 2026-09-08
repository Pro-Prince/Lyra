import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Ultra-Aesthetic Gentle Drifting Sakura (Cherry Blossom) Petals
function DriftingSakuraPetals() {
  const count = 28;
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Initialize petal data with realistic floating physics parameters
  const particles = useMemo(() => {
    return Array.from({ length: count }, () => ({
      x: (Math.random() - 0.5) * 6.5 - 0.5,
      y: Math.random() * 3.8 + 0.3,
      z: (Math.random() - 0.5) * 5.5 - 0.2,
      speedY: 0.003 + Math.random() * 0.004,
      swaySpeedX: 0.8 + Math.random() * 1.2,
      swayAmpX: 0.006 + Math.random() * 0.008,
      rotX: Math.random() * Math.PI * 2,
      rotY: Math.random() * Math.PI * 2,
      rotZ: Math.random() * Math.PI * 2,
      rotSpeedX: (Math.random() - 0.5) * 0.03,
      rotSpeedY: (Math.random() - 0.5) * 0.04,
      rotSpeedZ: (Math.random() - 0.5) * 0.02,
      scale: 0.7 + Math.random() * 0.6,
      phase: Math.random() * Math.PI * 2
    }));
  }, [count]);

  // Curved delicate petal geometry
  const petalGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    // Tear-drop petal contour
    shape.moveTo(0, 0);
    shape.bezierCurveTo(0.04, 0.03, 0.06, 0.09, 0.03, 0.14);
    shape.bezierCurveTo(0.015, 0.16, -0.015, 0.16, -0.03, 0.14);
    shape.bezierCurveTo(-0.06, 0.09, -0.04, 0.03, 0, 0);

    const geo = new THREE.ShapeGeometry(shape, 12);
    // Add subtle curvature along Z axis
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      pos.setZ(i, Math.sin((y / 0.16) * Math.PI) * 0.025);
    }
    geo.computeVertexNormals();
    return geo;
  }, []);

  useFrame(({ clock }, delta) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();
    const safeDelta = Math.min(delta, 0.1);

    particles.forEach((p, i) => {
      // Gentle downward drift
      p.y -= p.speedY * safeDelta * 60;
      // Soft organic wind sway (breeze coming from the left window)
      p.x += (Math.sin(t * p.swaySpeedX + p.phase) * p.swayAmpX + 0.002) * safeDelta * 60;
      p.z += Math.cos(t * p.swaySpeedX * 0.7 + p.phase) * (p.swayAmpX * 0.5) * safeDelta * 60;

      // Tumbling rotation
      p.rotX += p.rotSpeedX;
      p.rotY += p.rotSpeedY;
      p.rotZ += p.rotSpeedZ;

      // Seamless wrap when reaching floor or boundary
      if (p.y < 0.08 || p.x > 4.2 || p.x < -4.5) {
        p.y = 3.8 + Math.random() * 0.5;
        p.x = -3.8 + (Math.random() - 0.5) * 2; // spawn closer to window
        p.z = (Math.random() - 0.5) * 4.5;
      }

      dummy.position.set(p.x, p.y, p.z);
      dummy.rotation.set(p.rotX, p.rotY, p.rotZ);
      dummy.scale.setScalar(p.scale);
      dummy.updateMatrix();
      meshRef.current?.setMatrixAt(i, dummy.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[petalGeometry, undefined, count]}
      castShadow={false}
      receiveShadow={false}
    >
      <meshStandardMaterial
        color="#ffccd8"
        emissive="#ffaec2"
        emissiveIntensity={0.25}
        side={THREE.DoubleSide}
        transparent
        opacity={0.88}
        roughness={0.4}
      />
    </instancedMesh>
  );
}

// Dreamy Volumetric Window Sunbeam Shafts
function SunbeamShafts() {
  const beamRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (beamRef.current) {
      const t = clock.getElapsedTime();
      beamRef.current.children.forEach((child, idx) => {
        const mat = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
        if (mat) {
          mat.opacity = 0.04 + Math.sin(t * 0.6 + idx * 1.5) * 0.01;
        }
      });
    }
  });

  return (
    <group ref={beamRef} position={[-4.8, 2.4, -2.5]} rotation={[0.25, 0.45, -0.3]}>
      {/* Sunbeam Angle Plane 1 */}
      <mesh position={[1.8, -1.2, 1.4]} rotation={[-Math.PI / 2 + 0.35, 0, 0.3]}>
        <planeGeometry args={[1.6, 5.5]} />
        <meshBasicMaterial
          color="#ffeedb"
          transparent
          opacity={0.045}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      {/* Sunbeam Angle Plane 2 */}
      <mesh position={[1.4, -1.0, 1.0]} rotation={[-Math.PI / 2 + 0.38, 0, 0.25]}>
        <planeGeometry args={[1.2, 4.8]} />
        <meshBasicMaterial
          color="#ffe0c4"
          transparent
          opacity={0.035}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

// Stylized Cozy Table Lamp with soft glowing head
function CozyLamp({ position = [0, 0, 0] }: { position?: [number, number, number] }) {
  const lampLightRef = useRef<THREE.PointLight>(null);

  useFrame(({ clock }) => {
    if (lampLightRef.current) {
      const t = clock.getElapsedTime();
      lampLightRef.current.intensity = 0.55 + Math.sin(t * 1.6) * 0.05;
    }
  });

  return (
    <group position={position}>
      {/* Wooden round base */}
      <mesh position={[0, 0.02, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.08, 0.09, 0.04, 24]} />
        <meshStandardMaterial color="#c49a78" roughness={0.5} />
      </mesh>
      {/* Brass neck */}
      <mesh position={[0, 0.12, 0]} castShadow>
        <cylinderGeometry args={[0.012, 0.012, 0.16, 16]} />
        <meshStandardMaterial color="#d8af6e" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Mushroom/Dome Lampshade */}
      <mesh position={[0, 0.22, 0]} castShadow receiveShadow>
        <sphereGeometry args={[0.12, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
        <meshStandardMaterial 
          color="#fff6ed" 
          roughness={0.25} 
          emissive="#ffecd6"
          emissiveIntensity={0.55}
        />
      </mesh>
      {/* Warm PointLight */}
      <pointLight
        ref={lampLightRef}
        color="#ffcf99"
        intensity={0.55}
        distance={3.6}
        decay={2}
        castShadow
        shadow-bias={-0.0001}
      />
    </group>
  );
}

// Cute Stylized Potted Monstera / Succulent Plant
function StylizedPlant({ position = [0, 0, 0], scale = 1 }: { position?: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      {/* Ceramic Pot */}
      <mesh position={[0, 0.12, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.1, 0.075, 0.22, 20]} />
        <meshStandardMaterial color="#eedfd7" roughness={0.35} />
      </mesh>
      {/* Soil */}
      <mesh position={[0, 0.22, 0]} receiveShadow>
        <cylinderGeometry args={[0.09, 0.09, 0.02, 16]} />
        <meshStandardMaterial color="#54433a" roughness={0.9} />
      </mesh>
      {/* Stylized geometric plant leaves with anime green gradient tones */}
      {[
        { rot: [0.35, 0.2, 0.1], pos: [0.03, 0.32, 0.02], col: '#88b894', s: 1 },
        { rot: [0.4, 1.8, 0.15], pos: [-0.03, 0.34, 0.04], col: '#76a882', s: 0.9 },
        { rot: [0.3, -1.5, 0.2], pos: [0.05, 0.35, -0.03], col: '#94c29f', s: 1.05 },
        { rot: [0.25, 3.2, 0.1], pos: [-0.04, 0.36, -0.04], col: '#6b9c77', s: 0.85 },
        { rot: [0.15, 0.8, -0.05], pos: [0, 0.42, 0], col: '#a3d1ad', s: 1.15 }
      ].map((leaf, idx) => (
        <group key={idx} position={leaf.pos as [number, number, number]} rotation={leaf.rot as [number, number, number]} scale={leaf.s}>
          {/* Stem */}
          <mesh position={[0, 0, 0]} castShadow>
            <cylinderGeometry args={[0.008, 0.008, 0.15, 8]} />
            <meshStandardMaterial color="#6a9b75" roughness={0.6} />
          </mesh>
          {/* Leaf blade */}
          <mesh position={[0, 0.1, 0]} rotation={[0.4, 0, 0]} castShadow receiveShadow>
            <sphereGeometry args={[0.07, 12, 12]} />
            <meshStandardMaterial color={leaf.col} roughness={0.45} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// Decorative Pastel Books & Crystals
function BookStack({ position = [0, 0, 0], rotation = [0, 0, 0] }: { position?: [number, number, number]; rotation?: [number, number, number] }) {
  return (
    <group position={position} rotation={rotation}>
      {/* Book 1 - Rose */}
      <mesh position={[0, 0.02, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.18, 0.035, 0.26]} />
        <meshStandardMaterial color="#f0a8b9" roughness={0.4} />
      </mesh>
      {/* Book 2 - Lavender */}
      <mesh position={[0.01, 0.055, 0.01]} rotation={[0, 0.08, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.17, 0.032, 0.24]} />
        <meshStandardMaterial color="#bda3de" roughness={0.4} />
      </mesh>
      {/* Book 3 - Mint */}
      <mesh position={[-0.01, 0.085, -0.01]} rotation={[0, -0.05, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.15, 0.028, 0.22]} />
        <meshStandardMaterial color="#9cd4c0" roughness={0.4} />
      </mesh>
      {/* Small glowing star/crystal token */}
      <mesh position={[0, 0.12, 0]} castShadow>
        <octahedronGeometry args={[0.025]} />
        <meshStandardMaterial color="#ffdfba" emissive="#ffd6a5" emissiveIntensity={0.8} roughness={0.1} />
      </mesh>
    </group>
  );
}

// Ambient Wall Sconce Fixture
function WallSconce({ position = [0, 0, 0], rotation = [0, 0, 0] }: { position?: [number, number, number]; rotation?: [number, number, number] }) {
  return (
    <group position={position} rotation={rotation}>
      {/* Brass backplate */}
      <mesh position={[0, 0, 0.02]}>
        <cylinderGeometry args={[0.06, 0.06, 0.02, 16]} rotation={[Math.PI / 2, 0, 0]} />
        <meshStandardMaterial color="#d4af37" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Curved arm */}
      <mesh position={[0, 0, 0.08]}>
        <cylinderGeometry args={[0.01, 0.01, 0.12, 8]} rotation={[Math.PI / 3, 0, 0]} />
        <meshStandardMaterial color="#d4af37" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Frosted glass globe */}
      <mesh position={[0, 0.08, 0.12]}>
        <sphereGeometry args={[0.08, 20, 20]} />
        <meshStandardMaterial 
          color="#fff6ed" 
          emissive="#ffedd6" 
          emissiveIntensity={0.6} 
          roughness={0.2} 
        />
      </mesh>
      {/* Soft warm light */}
      <pointLight 
        position={[0, 0.08, 0.18]} 
        color="#ffe2c4" 
        intensity={0.35} 
        distance={2.5} 
        decay={2} 
      />
    </group>
  );
}

// Main Stylized Anime Sanctuary Room Environment - FULLY ENCLOSED ARCHITECTURE
export function RoomEnvironment() {
  return (
    <group>
      {/* Seamless Warm Pastel Clear Color & Horizon Fog (Zero Black Borders Anywhere) */}
      <color attach="background" args={['#ede2dc']} />
      <fog attach="fog" args={['#eddcd4', 10, 32]} />

      {/* ========================================================= */}
      {/* 1. BALANCED STYLIZED LIGHTING RIG                         */}
      {/* ========================================================= */}

      {/* Ambient Fill: Gentle warm cream fill prevents harsh dark shadow areas */}
      <ambientLight color="#fbf0ea" intensity={0.45} />

      {/* Main Key Sunlight (Soft window light streaming into the room) */}
      <directionalLight
        color="#fff3e6"
        intensity={0.78}
        position={[-4.5, 4.2, 1.0]}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-bias={-0.0001}
      />

      {/* Anime Character Rim & Front Fill (Warm Rose Glow) */}
      <directionalLight
        color="#ffe8ef"
        intensity={0.34}
        position={[2.0, 2.5, 3.0]}
      />

      {/* Subtle floor bounce light (Soft Peach Honey) */}
      <directionalLight
        color="#fedcb5"
        intensity={0.15}
        position={[0, -1, 1]}
      />

      {/* Gentle Floating Sakura Petals instead of noisy sparkles */}
      <DriftingSakuraPetals />

      {/* Dreamy Volumetric Sunbeam Rays from Window */}
      <SunbeamShafts />

      {/* ========================================================= */}
      {/* 2. FULL SEAMLESS STYLIZED WOODEN FLOOR (Wall-to-Wall)     */}
      {/* ========================================================= */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[14, 14]} />
        <meshStandardMaterial
          color="#c89f81"
          roughness={0.45}
          metalness={0.04}
        />
      </mesh>

      {/* Decorative Satin Parquet Inset Borders */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, -0.6]} receiveShadow>
        <planeGeometry args={[8.5, 8.5]} />
        <meshStandardMaterial
          color="#ba9173"
          roughness={0.5}
        />
      </mesh>

      {/* ========================================================= */}
      {/* 3. PLUSH COZY PASTEL RUG (Centered under Lyra)           */}
      {/* ========================================================= */}
      <group position={[0, 0.004, 0.15]}>
        {/* Outer rug circle with soft blush border */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <circleGeometry args={[1.55, 48]} />
          <meshStandardMaterial color="#f7dbe3" roughness={0.9} />
        </mesh>
        {/* Inner plush cream circle */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]} receiveShadow>
          <circleGeometry args={[1.42, 48]} />
          <meshStandardMaterial color="#fef5f7" roughness={0.95} />
        </mesh>
        {/* Soft contact shadow beneath Lyra's standing area */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, -0.15]}>
          <circleGeometry args={[0.55, 32]} />
          <meshBasicMaterial color="#50283b" transparent opacity={0.16} />
        </mesh>
      </group>

      {/* ========================================================= */}
      {/* 4. SEAMLESS CEILING (Closes the top of the room)         */}
      {/* ========================================================= */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 4.6, 0]} receiveShadow>
        <planeGeometry args={[14, 14]} />
        <meshStandardMaterial color="#faf2ee" roughness={0.9} />
      </mesh>

      {/* Ceiling Crown Molding Trim on all 4 top wall junctions */}
      {/* Back Crown */}
      <mesh position={[0, 4.54, -4.9]}>
        <boxGeometry args={[10.2, 0.12, 0.12]} />
        <meshStandardMaterial color="#e5d5cc" roughness={0.4} />
      </mesh>
      {/* Left Crown */}
      <mesh position={[-4.9, 4.54, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[10.2, 0.12, 0.12]} />
        <meshStandardMaterial color="#e5d5cc" roughness={0.4} />
      </mesh>
      {/* Right Crown */}
      <mesh position={[4.9, 4.54, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[10.2, 0.12, 0.12]} />
        <meshStandardMaterial color="#e5d5cc" roughness={0.4} />
      </mesh>

      {/* ========================================================= */}
      {/* 5. SEAMLESS BACK WALL & ARCH NICHE                       */}
      {/* ========================================================= */}
      
      {/* Main Creamy Blush Back Wall */}
      <mesh position={[0, 2.3, -4.95]} receiveShadow>
        <planeGeometry args={[10.2, 4.6]} />
        <meshStandardMaterial color="#ede2dd" roughness={0.85} />
      </mesh>

      {/* Lower Wainscoting Paneling (Warm Soft Rose-Beige) */}
      <mesh position={[0, 0.65, -4.93]} receiveShadow>
        <planeGeometry args={[10.2, 1.3]} />
        <meshStandardMaterial color="#dfd0c9" roughness={0.7} />
      </mesh>
      {/* Wainscot Top Molding Trim */}
      <mesh position={[0, 1.3, -4.91]}>
        <boxGeometry args={[10.2, 0.06, 0.05]} />
        <meshStandardMaterial color="#cfbeb6" roughness={0.5} />
      </mesh>
      {/* Baseboard Floor Trim */}
      <mesh position={[0, 0.07, -4.91]}>
        <boxGeometry args={[10.2, 0.14, 0.05]} />
        <meshStandardMaterial color="#cfbeb6" roughness={0.5} />
      </mesh>

      {/* --------------------------------------------------------- */}
      {/* ILLUMINATED ARCHITECTURAL ARCH NICHE (Right Center Wall)  */}
      {/* --------------------------------------------------------- */}
      <group position={[1.8, 2.3, -4.91]}>
        {/* Arch Frame Outer Backing */}
        <mesh position={[0, 0, -0.02]} receiveShadow>
          <boxGeometry args={[1.6, 2.4, 0.08]} />
          <meshStandardMaterial color="#fceeed" roughness={0.65} />
        </mesh>
        {/* Soft Top Curved Arch */}
        <mesh position={[0, 1.2, -0.02]} receiveShadow>
          <cylinderGeometry args={[0.8, 0.8, 0.08, 32, 1, false, 0, Math.PI]} rotation={[0, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#fceeed" roughness={0.65} />
        </mesh>

        {/* Inset LED Warm Ambient Niche Glow */}
        <pointLight
          color="#ffeedb"
          intensity={0.35}
          distance={2.8}
          decay={2}
          position={[0, 0.6, 0.2]}
        />

        {/* Shelf 1 (Top Floating Shelf) */}
        <group position={[0, 0.8, 0.08]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[1.35, 0.04, 0.22]} />
            <meshStandardMaterial color="#c29b7a" roughness={0.4} />
          </mesh>
          <StylizedPlant position={[-0.4, 0.02, 0]} scale={0.75} />
          {/* Ceramic Vase & Dried Botanicals */}
          <mesh position={[0.35, 0.12, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.04, 0.06, 0.2, 16]} />
            <meshStandardMaterial color="#ffffff" roughness={0.2} />
          </mesh>
          <mesh position={[0.35, 0.26, 0]} castShadow>
            <coneGeometry args={[0.07, 0.16, 8]} />
            <meshStandardMaterial color="#dfbfa6" roughness={0.9} />
          </mesh>
        </group>

        {/* Shelf 2 (Middle Floating Shelf) */}
        <group position={[0, 0.1, 0.08]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[1.35, 0.04, 0.22]} />
            <meshStandardMaterial color="#c29b7a" roughness={0.4} />
          </mesh>
          <BookStack position={[-0.32, 0.02, 0]} />
          {/* Tiny framed art polaroid */}
          <group position={[0.32, 0.12, 0]} rotation={[0, -0.15, 0]}>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[0.18, 0.22, 0.02]} />
              <meshStandardMaterial color="#ffffff" roughness={0.3} />
            </mesh>
            <mesh position={[0, 0.02, 0.012]}>
              <planeGeometry args={[0.14, 0.14]} />
              <meshBasicMaterial color="#f7b5c6" />
            </mesh>
          </group>
        </group>

        {/* Shelf 3 (Bottom Floating Shelf) */}
        <group position={[0, -0.6, 0.08]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[1.35, 0.04, 0.22]} />
            <meshStandardMaterial color="#c29b7a" roughness={0.4} />
          </mesh>
          {/* Aroma candle / glowing orb */}
          <mesh position={[-0.35, 0.06, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.06, 0.06, 0.09, 16]} />
            <meshStandardMaterial color="#fad7cd" roughness={0.3} />
          </mesh>
          <mesh position={[-0.35, 0.12, 0]}>
            <sphereGeometry args={[0.015, 12, 12]} />
            <meshBasicMaterial color="#ffe885" />
          </mesh>
          {/* Decorative ceramic star */}
          <mesh position={[0.25, 0.06, 0]} rotation={[0.2, 0.4, 0]} castShadow>
            <dodecahedronGeometry args={[0.06]} />
            <meshStandardMaterial color="#e0c7e8" roughness={0.25} />
          </mesh>
        </group>
      </group>

      {/* --------------------------------------------------------- */}
      {/* MINIMALIST FRAMED WALL PRINTS (Left Center Back Wall)     */}
      {/* --------------------------------------------------------- */}
      <group position={[-1.4, 2.5, -4.91]}>
        {/* Frame 1 */}
        <group position={[-0.35, 0, 0]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.48, 0.65, 0.03]} />
            <meshStandardMaterial color="#c49a78" roughness={0.4} />
          </mesh>
          <mesh position={[0, 0, 0.018]}>
            <planeGeometry args={[0.4, 0.57]} />
            <meshBasicMaterial color="#fff4f7" />
          </mesh>
          {/* Stylized geometric art circle */}
          <mesh position={[0, 0.05, 0.02]}>
            <circleGeometry args={[0.12, 32]} />
            <meshBasicMaterial color="#ffa3b8" />
          </mesh>
        </group>

        {/* Frame 2 */}
        <group position={[0.35, -0.1, 0]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.42, 0.52, 0.03]} />
            <meshStandardMaterial color="#c49a78" roughness={0.4} />
          </mesh>
          <mesh position={[0, 0, 0.018]}>
            <planeGeometry args={[0.34, 0.44]} />
            <meshBasicMaterial color="#f7f2fa" />
          </mesh>
          {/* Stylized crescent / lavender art shape */}
          <mesh position={[0, 0.02, 0.02]}>
            <circleGeometry args={[0.09, 32]} />
            <meshBasicMaterial color="#c7b0e8" />
          </mesh>
        </group>
      </group>

      {/* ========================================================= */}
      {/* 6. FULL LEFT WALL WITH INTEGRATED AESTHETIC WINDOW        */}
      {/* ========================================================= */}
      <group position={[-4.95, 2.3, 0]} rotation={[0, Math.PI / 2, 0]}>
        {/* Main Cream Left Wall */}
        <mesh receiveShadow>
          <planeGeometry args={[10.2, 4.6]} />
          <meshStandardMaterial color="#ebe0db" roughness={0.85} />
        </mesh>
        {/* Lower Wainscoting Paneling */}
        <mesh position={[0, -1.65, 0.02]} receiveShadow>
          <planeGeometry args={[10.2, 1.3]} />
          <meshStandardMaterial color="#ded0c9" roughness={0.7} />
        </mesh>
        {/* Wainscot Top Trim */}
        <mesh position={[0, -1.0, 0.04]}>
          <boxGeometry args={[10.2, 0.06, 0.05]} />
          <meshStandardMaterial color="#cfbeb6" roughness={0.5} />
        </mesh>
        {/* Baseboard Trim */}
        <mesh position={[0, -2.23, 0.04]}>
          <boxGeometry args={[10.2, 0.14, 0.05]} />
          <meshStandardMaterial color="#cfbeb6" roughness={0.5} />
        </mesh>

        {/* Integrated Window Rig at Left Wall Center-Back */}
        <group position={[-1.2, 0.1, 0.05]}>
          {/* Warm Sunlight Sky Plane Outside Window */}
          <mesh position={[0, 0, -0.1]}>
            <planeGeometry args={[2.0, 2.8]} />
            <meshBasicMaterial color="#ffe8d1" />
          </mesh>
          
          {/* Gentle Sunset Soft Sky Gradient Clouds */}
          <mesh position={[0.2, 0.4, -0.08]}>
            <circleGeometry args={[0.55, 32]} />
            <meshBasicMaterial color="#ffd4aa" transparent opacity={0.8} />
          </mesh>
          <mesh position={[0, -0.4, -0.08]}>
            <planeGeometry args={[1.9, 0.9]} />
            <meshBasicMaterial color="#ffc4b2" transparent opacity={0.6} />
          </mesh>

          {/* Wooden Window Frame Outer */}
          <mesh castShadow receiveShadow position={[-0.85, 0, 0.04]}>
            <boxGeometry args={[0.07, 2.8, 0.08]} />
            <meshStandardMaterial color="#d1b197" roughness={0.5} />
          </mesh>
          <mesh castShadow receiveShadow position={[0.85, 0, 0.04]}>
            <boxGeometry args={[0.07, 2.8, 0.08]} />
            <meshStandardMaterial color="#d1b197" roughness={0.5} />
          </mesh>
          <mesh castShadow receiveShadow position={[0, 1.4, 0.04]}>
            <boxGeometry args={[1.77, 0.07, 0.08]} />
            <meshStandardMaterial color="#d1b197" roughness={0.5} />
          </mesh>
          <mesh castShadow receiveShadow position={[0, -1.4, 0.04]}>
            <boxGeometry args={[1.77, 0.07, 0.08]} />
            <meshStandardMaterial color="#d1b197" roughness={0.5} />
          </mesh>
          {/* Inner Mullions */}
          <mesh position={[0, 0, 0.04]}>
            <boxGeometry args={[0.03, 2.8, 0.04]} />
            <meshStandardMaterial color="#d1b197" roughness={0.5} />
          </mesh>
          <mesh position={[0, 0, 0.04]}>
            <boxGeometry args={[1.77, 0.03, 0.04]} />
            <meshStandardMaterial color="#d1b197" roughness={0.5} />
          </mesh>

          {/* Translucent Soft Flowing Linen Curtain Left & Right */}
          <mesh position={[-0.82, 0, 0.08]} receiveShadow>
            <planeGeometry args={[0.48, 2.9]} />
            <meshStandardMaterial color="#fffbfa" transparent opacity={0.75} roughness={0.8} />
          </mesh>
          <mesh position={[0.82, 0, 0.08]} receiveShadow>
            <planeGeometry args={[0.48, 2.9]} />
            <meshStandardMaterial color="#fffbfa" transparent opacity={0.75} roughness={0.8} />
          </mesh>
          {/* Curtain Rod in Brass */}
          <mesh position={[0, 1.5, 0.1]}>
            <cylinderGeometry args={[0.015, 0.015, 2.1, 16]} rotation={[0, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#e5c185" metalness={0.8} roughness={0.25} />
          </mesh>
        </group>
      </group>

      {/* ========================================================= */}
      {/* 7. FULL RIGHT WALL WITH SCONCES & WALL DETAILS            */}
      {/* ========================================================= */}
      <group position={[4.95, 2.3, 0]} rotation={[0, -Math.PI / 2, 0]}>
        {/* Main Cream Right Wall */}
        <mesh receiveShadow>
          <planeGeometry args={[10.2, 4.6]} />
          <meshStandardMaterial color="#ebe0db" roughness={0.85} />
        </mesh>
        {/* Lower Wainscoting Paneling */}
        <mesh position={[0, -1.65, 0.02]} receiveShadow>
          <planeGeometry args={[10.2, 1.3]} />
          <meshStandardMaterial color="#ded0c9" roughness={0.7} />
        </mesh>
        {/* Wainscot Top Trim */}
        <mesh position={[0, -1.0, 0.04]}>
          <boxGeometry args={[10.2, 0.06, 0.05]} />
          <meshStandardMaterial color="#cfbeb6" roughness={0.5} />
        </mesh>
        {/* Baseboard Trim */}
        <mesh position={[0, -2.23, 0.04]}>
          <boxGeometry args={[10.2, 0.14, 0.05]} />
          <meshStandardMaterial color="#cfbeb6" roughness={0.5} />
        </mesh>

        {/* Two Ambient Wall Sconces on Right Wall */}
        <WallSconce position={[-1.8, 0.4, 0.02]} />
        <WallSconce position={[1.8, 0.4, 0.02]} />

        {/* Tapestry / Large Framed Canvas on Right Wall */}
        <group position={[0, 0.35, 0.03]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[1.4, 1.1, 0.04]} />
            <meshStandardMaterial color="#c29b7a" roughness={0.4} />
          </mesh>
          <mesh position={[0, 0, 0.025]}>
            <planeGeometry args={[1.28, 0.98]} />
            <meshStandardMaterial color="#faf4ef" roughness={0.9} />
          </mesh>
          {/* Minimalist pastel wave graphic */}
          <mesh position={[0, -0.1, 0.03]}>
            <circleGeometry args={[0.3, 32]} />
            <meshBasicMaterial color="#f7b7c8" />
          </mesh>
        </group>
      </group>

      {/* ========================================================= */}
      {/* 8. LOW AESTHETIC SCANDI CREDENZA / DESK (Right Corner)    */}
      {/* ========================================================= */}
      <group position={[2.9, 0.42, -4.1]}>
        {/* Credenza Main Cabinet */}
        <mesh castShadow receiveShadow>
          <boxGeometry args={[1.6, 0.55, 0.55]} />
          <meshStandardMaterial color="#fbf3f0" roughness={0.4} />
        </mesh>
        {/* Warm Oak Top Slab */}
        <mesh position={[0, 0.29, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.66, 0.04, 0.59]} />
          <meshStandardMaterial color="#c29b7a" roughness={0.35} />
        </mesh>
        {/* Fluted Drawer Relief lines */}
        {[-0.5, 0, 0.5].map((x, i) => (
          <mesh key={i} position={[x, 0, 0.28]} castShadow>
            <cylinderGeometry args={[0.012, 0.012, 0.03, 16]} rotation={[Math.PI / 2, 0, 0]} />
            <meshStandardMaterial color="#d4b06f" metalness={0.8} roughness={0.2} />
          </mesh>
        ))}
        {/* Stylized Tapered Wooden Legs */}
        {[
          [-0.68, -0.38, 0.2],
          [0.68, -0.38, 0.2],
          [-0.68, -0.38, -0.2],
          [0.68, -0.38, -0.2]
        ].map((pos, i) => (
          <mesh key={i} position={pos as [number, number, number]} castShadow>
            <cylinderGeometry args={[0.02, 0.03, 0.24, 12]} />
            <meshStandardMaterial color="#a57a58" roughness={0.5} />
          </mesh>
        ))}

        {/* Lamp on top of the credenza */}
        <CozyLamp position={[-0.45, 0.31, 0]} />

        {/* Ceramic Mug on Credenza */}
        <group position={[0.1, 0.35, 0.08]}>
          <mesh castShadow receiveShadow>
            <cylinderGeometry args={[0.04, 0.035, 0.08, 16]} />
            <meshStandardMaterial color="#e0a6b8" roughness={0.3} />
          </mesh>
          <mesh position={[0.04, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <torusGeometry args={[0.025, 0.007, 8, 16, Math.PI]} />
            <meshStandardMaterial color="#e0a6b8" roughness={0.3} />
          </mesh>
        </group>

        {/* Potted Succulent / Fern on Credenza */}
        <StylizedPlant position={[0.48, 0.31, 0]} scale={0.85} />
      </group>

      {/* Decorative Hanging Fairy Light String (Top Right Back Wall) */}
      <group position={[1.8, 3.8, -4.85]}>
        {[-0.8, -0.4, 0, 0.4, 0.8].map((x, idx) => (
          <group key={idx} position={[x, -Math.sin(((x + 0.8) / 1.6) * Math.PI) * 0.15, 0.02]}>
            <mesh>
              <sphereGeometry args={[0.025, 12, 12]} />
              <meshBasicMaterial color="#ffeacc" />
            </mesh>
            <pointLight color="#ffe3b8" intensity={0.15} distance={0.6} decay={2} />
          </group>
        ))}
      </group>
    </group>
  );
}

export default RoomEnvironment;
