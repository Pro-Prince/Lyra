import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// -----------------------------------------------------------------------------
// COLOR PALETTE (Warm Muted Mauve/Plum 60%, Cream 20%, Walnut 10%, Lyra Pink 10%)
// -----------------------------------------------------------------------------
const PALETTE = {
  // Architectural Mauve & Plum (60%)
  wallPlaster: '#604253',
  wallAccentPlum: '#4E3344',
  shadowPlum: '#3C2434',
  trimMauve: '#69485D',

  // Cream & Warm Off-White Surfaces (20%)
  warmCream: '#F4ECE4',
  softBeige: '#E6D7CC',
  curtainWhite: '#FAF3ED',
  porcelainWhite: '#FCF8F5',

  // Dark Walnut Wood (10%)
  darkWalnut: '#4A302D',
  walnutPlank: '#402927',
  walnutLight: '#573A37',

  // Lyra Pink & Pastel Accents (10%)
  lyraPink: '#F299C2',
  softPinkTextile: '#ECA0C4',
  dustyBlush: '#D47E9E',
  pastelLilac: '#C79CD8',

  // Natural Lighting Colors
  warmSunsetKey: '#FFD9BD',
  warmIndirectLed: '#FFE8C8',
  lampGlow: '#FFDDB6',
  naturalWindowSky: '#4A2A44',

  // Indoor Plant Greens
  leafGreen: '#4D7856',
  leafGreenLight: '#689672',
  leafGreenDark: '#35533D',
};

// -----------------------------------------------------------------------------
// 1. FLOATING DUST PARTICLES & DRIFTING PETALS
// -----------------------------------------------------------------------------
function AmbientMotes() {
  const dustCount = 35;
  const dustRef = useRef<THREE.Points>(null);

  const [dustGeo, dustSpeeds] = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(dustCount * 3);
    const speeds = new Float32Array(dustCount);

    for (let i = 0; i < dustCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 8.0;
      positions[i * 3 + 1] = Math.random() * 3.8 + 0.2;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 6.0;
      speeds[i] = 0.0015 + Math.random() * 0.0025;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return [geo, speeds];
  }, [dustCount]);

  useFrame((_, delta) => {
    if (!dustRef.current) return;
    const pos = dustRef.current.geometry.attributes.position;
    const dt = Math.min(delta, 0.1);

    for (let i = 0; i < dustCount; i++) {
      let y = pos.getY(i) + dustSpeeds[i] * dt * 60;
      if (y > 4.0) y = 0.2;
      pos.setY(i, y);
    }
    pos.needsUpdate = true;
  });

  return (
    <points ref={dustRef} geometry={dustGeo}>
      <pointsMaterial
        color="#FFF0DF"
        size={0.03}
        transparent
        opacity={0.4}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

function DriftingSakura() {
  const count = 18;
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const particles = useMemo(() => {
    return Array.from({ length: count }, () => ({
      x: (Math.random() - 0.5) * 6.5,
      y: Math.random() * 3.5 + 0.5,
      z: (Math.random() - 0.5) * 5.0,
      speedY: 0.002 + Math.random() * 0.0025,
      swaySpeed: 0.6 + Math.random() * 0.8,
      swayAmp: 0.004 + Math.random() * 0.006,
      rotX: Math.random() * Math.PI * 2,
      rotY: Math.random() * Math.PI * 2,
      rotZ: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.015,
      scale: 0.6 + Math.random() * 0.4,
      phase: Math.random() * Math.PI * 2,
    }));
  }, [count]);

  const petalGeo = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.bezierCurveTo(0.035, 0.025, 0.05, 0.08, 0.025, 0.12);
    shape.bezierCurveTo(0.01, 0.14, -0.01, 0.14, -0.025, 0.12);
    shape.bezierCurveTo(-0.05, 0.08, -0.035, 0.025, 0, 0);

    const geo = new THREE.ShapeGeometry(shape, 8);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      pos.setZ(i, Math.sin((y / 0.14) * Math.PI) * 0.02);
    }
    geo.computeVertexNormals();
    return geo;
  }, []);

  useFrame(({ clock }, delta) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();
    const dt = Math.min(delta, 0.1);

    particles.forEach((p, i) => {
      p.y -= p.speedY * dt * 60;
      p.x += (Math.sin(t * p.swaySpeed + p.phase) * p.swayAmp + 0.001) * dt * 60;
      p.z += Math.cos(t * p.swaySpeed * 0.8 + p.phase) * (p.swayAmp * 0.5) * dt * 60;
      p.rotX += p.rotSpeed;
      p.rotY += p.rotSpeed;

      if (p.y < 0.1 || p.x > 4.5 || p.x < -4.5) {
        p.y = 3.6 + Math.random() * 0.4;
        p.x = -3.5 + (Math.random() - 0.5) * 2.0;
        p.z = (Math.random() - 0.5) * 4.0;
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
    <instancedMesh ref={meshRef} args={[petalGeo, undefined, count]}>
      <meshStandardMaterial
        color="#F8BBD0"
        roughness={0.6}
        side={THREE.DoubleSide}
        transparent
        opacity={0.7}
      />
    </instancedMesh>
  );
}

// -----------------------------------------------------------------------------
// 2. FLOOR-TO-CEILING WINDOW & EVENING SKYLINE (LEFT WALL)
// -----------------------------------------------------------------------------
function PanoramicBalconyWindow() {
  const sunsetTexture = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#241427');
    grad.addColorStop(0.35, '#48243E');
    grad.addColorStop(0.65, '#8C4666');
    grad.addColorStop(0.85, '#D9798C');
    grad.addColorStop(1.0, '#FFB285');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    const sunGrad = ctx.createRadialGradient(180, 420, 8, 180, 420, 240);
    sunGrad.addColorStop(0, 'rgba(255, 240, 210, 0.85)');
    sunGrad.addColorStop(0.3, 'rgba(255, 175, 135, 0.4)');
    sunGrad.addColorStop(1, 'rgba(255, 140, 150, 0)');
    ctx.fillStyle = sunGrad;
    ctx.fillRect(0, 0, 512, 512);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  }, []);

  return (
    <group position={[-2.3, 0, -1.8]} rotation={[0, Math.PI * 0.32, 0]}>
      <mesh position={[-0.5, 2.3, -0.25]}>
        <planeGeometry args={[5.2, 5.0]} />
        {sunsetTexture ? (
          <meshBasicMaterial map={sunsetTexture} side={THREE.DoubleSide} />
        ) : (
          <meshBasicMaterial color="#8C4666" side={THREE.DoubleSide} />
        )}
      </mesh>

      <group position={[-0.5, 0.9, -0.2]}>
        {[
          { x: -1.9, w: 0.35, h: 2.1 },
          { x: -1.5, w: 0.26, h: 2.8 },
          { x: -1.15, w: 0.38, h: 1.7 },
          { x: -0.75, w: 0.3, h: 3.2 },
          { x: -0.38, w: 0.42, h: 1.9 },
          { x: 0.05, w: 0.32, h: 2.5 },
          { x: 0.42, w: 0.38, h: 3.0 },
          { x: 0.85, w: 0.28, h: 1.8 },
          { x: 1.25, w: 0.44, h: 2.6 },
          { x: 1.7, w: 0.32, h: 3.3 },
        ].map((b, i) => (
          <group key={i} position={[b.x, b.h / 2 - 1.0, 0]}>
            <mesh>
              <planeGeometry args={[b.w, b.h]} />
              <meshBasicMaterial color="#221323" />
            </mesh>
            {[...Array(3)].map((_, wIdx) => (
              <mesh key={wIdx} position={[(wIdx % 2 === 0 ? 0.05 : -0.05), (wIdx - 1) * 0.45, 0.001]}>
                <planeGeometry args={[0.035, 0.07]} />
                <meshBasicMaterial color="#FFE4A0" opacity={0.55} transparent />
              </mesh>
            ))}
          </group>
        ))}
      </group>

      <group position={[-0.5, 2.3, 0]}>
        <mesh position={[0, 2.35, 0.04]} castShadow receiveShadow>
          <boxGeometry args={[4.4, 0.1, 0.12]} />
          <meshStandardMaterial color={PALETTE.darkWalnut} roughness={0.5} />
        </mesh>
        <mesh position={[0, -2.35, 0.06]} castShadow receiveShadow>
          <boxGeometry args={[4.4, 0.12, 0.18]} />
          <meshStandardMaterial color={PALETTE.darkWalnut} roughness={0.45} />
        </mesh>
        <mesh position={[-2.2, 0, 0.04]} castShadow receiveShadow>
          <boxGeometry args={[0.1, 4.7, 0.12]} />
          <meshStandardMaterial color={PALETTE.darkWalnut} roughness={0.5} />
        </mesh>
        <mesh position={[2.2, 0, 0.04]} castShadow receiveShadow>
          <boxGeometry args={[0.1, 4.7, 0.12]} />
          <meshStandardMaterial color={PALETTE.darkWalnut} roughness={0.5} />
        </mesh>
        <mesh position={[0, 0, 0.04]} castShadow>
          <boxGeometry args={[0.05, 4.7, 0.08]} />
          <meshStandardMaterial color={PALETTE.darkWalnut} roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.7, 0.04]} castShadow>
          <boxGeometry args={[4.4, 0.04, 0.06]} />
          <meshStandardMaterial color={PALETTE.darkWalnut} roughness={0.5} />
        </mesh>

        <group position={[-1.9, 0, 0.12]}>
          <mesh castShadow receiveShadow>
            <planeGeometry args={[1.0, 4.6]} />
            <meshStandardMaterial
              color="#FDE8F1"
              roughness={0.8}
              transparent
              opacity={0.65}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh position={[0.15, 0, 0.02]}>
            <cylinderGeometry args={[0.06, 0.06, 4.6, 12]} />
            <meshStandardMaterial color="#F8DCE8" roughness={0.8} transparent opacity={0.55} />
          </mesh>
        </group>
        <group position={[1.9, 0, 0.12]}>
          <mesh castShadow receiveShadow>
            <planeGeometry args={[1.0, 4.6]} />
            <meshStandardMaterial
              color="#FDE8F1"
              roughness={0.8}
              transparent
              opacity={0.65}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh position={[-0.15, 0, 0.02]}>
            <cylinderGeometry args={[0.06, 0.06, 4.6, 12]} />
            <meshStandardMaterial color="#F8DCE8" roughness={0.8} transparent opacity={0.55} />
          </mesh>
        </group>
      </group>

      <mesh position={[0.2, 1.8, 1.2]} rotation={[-Math.PI / 2 + 0.35, 0, 0.2]}>
        <planeGeometry args={[2.8, 6.5]} />
        <meshBasicMaterial
          color="#FFE9D2"
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

// -----------------------------------------------------------------------------
// NEW: ROUND MINIMALIST WALL ART (pink + purple circle canvases on the back wall)
// -----------------------------------------------------------------------------
function RoundWallArt({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <group position={[-0.55, 0, 0]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.62, 0.62, 0.03]} />
          <meshStandardMaterial color={PALETTE.warmCream} roughness={0.6} />
        </mesh>
        <mesh position={[0, 0, 0.018]}>
          <circleGeometry args={[0.2, 32]} />
          <meshStandardMaterial color={PALETTE.lyraPink} roughness={0.5} />
        </mesh>
      </group>

      <group position={[0.55, -0.06, 0]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.62, 0.62, 0.03]} />
          <meshStandardMaterial color={PALETTE.warmCream} roughness={0.6} />
        </mesh>
        <mesh position={[0, 0, 0.018]}>
          <circleGeometry args={[0.2, 32]} />
          <meshStandardMaterial color={PALETTE.pastelLilac} roughness={0.5} />
        </mesh>
      </group>
    </group>
  );
}

// -----------------------------------------------------------------------------
// NEW: LOW WINDOWSIDE CONSOLE (under the wall art, books + plush bunny + plant)
// -----------------------------------------------------------------------------
function WindowsideConsole({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.28, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.0, 0.5, 0.4]} />
        <meshStandardMaterial color={PALETTE.trimMauve} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.535, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.05, 0.03, 0.43]} />
        <meshStandardMaterial color={PALETTE.darkWalnut} roughness={0.42} />
      </mesh>

      <PastelBookRow position={[-0.6, 0.55, 0.02]} rotation={[0, 0.06, 0]} />
      <PlushBunnyToy position={[0.1, 0.55, 0]} scale={0.8} />
      <SmallPottedSucculent position={[0.75, 0.55, 0]} scale={0.85} />
    </group>
  );
}

function PlushBunnyToy({
  position,
  scale = 1,
}: {
  position: [number, number, number];
  scale?: number;
}) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.07, 0]} castShadow>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color={PALETTE.warmCream} roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.16, 0.01]} castShadow>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial color={PALETTE.warmCream} roughness={0.95} />
      </mesh>
      <mesh position={[-0.025, 0.24, 0]} rotation={[0, 0, -0.15]} castShadow>
        <capsuleGeometry args={[0.018, 0.09, 6, 8]} />
        <meshStandardMaterial color={PALETTE.warmCream} roughness={0.95} />
      </mesh>
      <mesh position={[0.025, 0.24, 0]} rotation={[0, 0, 0.15]} castShadow>
        <capsuleGeometry args={[0.018, 0.09, 6, 8]} />
        <meshStandardMaterial color={PALETTE.warmCream} roughness={0.95} />
      </mesh>
      <mesh position={[-0.025, 0.26, 0.005]} rotation={[0, 0, -0.15]}>
        <capsuleGeometry args={[0.008, 0.06, 6, 8]} />
        <meshStandardMaterial color={PALETTE.softPinkTextile} roughness={0.9} />
      </mesh>
      <mesh position={[0.025, 0.26, 0.005]} rotation={[0, 0, 0.15]}>
        <capsuleGeometry args={[0.008, 0.06, 6, 8]} />
        <meshStandardMaterial color={PALETTE.softPinkTextile} roughness={0.9} />
      </mesh>
    </group>
  );
}

// -----------------------------------------------------------------------------
// NEW: GLOWING ROUND ORB LAMP (shelf decor item)
// -----------------------------------------------------------------------------
function RoundGlowOrb({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[0.075, 20, 20]} />
        <meshStandardMaterial
          color="#FFEAD0"
          emissive="#FFC98A"
          emissiveIntensity={1.1}
          roughness={0.3}
        />
      </mesh>
      <pointLight color="#FFC98A" intensity={0.4} distance={1.4} decay={2} />
    </group>
  );
}

// -----------------------------------------------------------------------------
// 3. BOTTOM-LEFT: COZY ROUNDED LOUNGE CHAIR, FLOWER CUSHION & SIDE TABLE
// -----------------------------------------------------------------------------
function BottomLeftLoungeCorner() {
  return (
    <group position={[-2.4, 0, 0.65]} rotation={[0, 0.32, 0]}>
      <group position={[0, 0.32, 0]}>
        <mesh castShadow receiveShadow scale={[1.25, 0.72, 1.25]}>
          <sphereGeometry args={[0.8, 28, 20]} />
          <meshStandardMaterial color={PALETTE.warmCream} roughness={0.9} />
        </mesh>
        <mesh castShadow receiveShadow position={[-0.22, 0.3, -0.22]} scale={[1.05, 0.78, 1.05]}>
          <sphereGeometry args={[0.62, 22, 18]} />
          <meshStandardMaterial color="#EFE2D6" roughness={0.9} />
        </mesh>

        <group position={[0.38, 0.18, 0.2]} rotation={[0.18, 0.25, -0.38]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.5, 0.04, 0.8]} />
            <meshStandardMaterial color={PALETTE.softPinkTextile} roughness={0.85} />
          </mesh>
          <mesh position={[0.24, -0.12, 0]} rotation={[0, 0, 0.55]} castShadow>
            <boxGeometry args={[0.035, 0.3, 0.78]} />
            <meshStandardMaterial color="#E48EBA" roughness={0.85} />
          </mesh>
        </group>

        <group position={[0.02, 0.44, 0.3]} rotation={[0.42, 0.12, 0.08]}>
          <mesh castShadow position={[0, 0, 0.05]}>
            <cylinderGeometry args={[0.1, 0.1, 0.04, 20]} rotation={[Math.PI / 2, 0, 0]} />
            <meshStandardMaterial color={PALETTE.lyraPink} roughness={0.8} />
          </mesh>
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const angle = (i * Math.PI) / 3;
            return (
              <mesh
                key={i}
                castShadow
                position={[Math.cos(angle) * 0.2, Math.sin(angle) * 0.2, 0]}
              >
                <sphereGeometry args={[0.12, 14, 14]} scale={[1, 1, 0.42]} />
                <meshStandardMaterial color={PALETTE.porcelainWhite} roughness={0.85} />
              </mesh>
            );
          })}
        </group>
      </group>

      <group position={[-0.95, 0, 0.25]}>
        <mesh position={[0, 0.42, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.26, 0.26, 0.03, 24]} />
          <meshStandardMaterial color={PALETTE.darkWalnut} roughness={0.45} />
        </mesh>
        {[0, 1, 2].map((i) => {
          const a = (i * Math.PI * 2) / 3;
          return (
            <mesh
              key={i}
              position={[Math.sin(a) * 0.15, 0.2, Math.cos(a) * 0.15]}
              rotation={[0.08 * Math.cos(a), 0, -0.08 * Math.sin(a)]}
              castShadow
            >
              <cylinderGeometry args={[0.013, 0.01, 0.42, 10]} />
              <meshStandardMaterial color={PALETTE.walnutPlank} roughness={0.4} />
            </mesh>
          );
        })}
        <mesh position={[0.04, 0.445, -0.02]} castShadow>
          <boxGeometry args={[0.14, 0.02, 0.18]} />
          <meshStandardMaterial color={PALETTE.softPinkTextile} roughness={0.5} />
        </mesh>
        <mesh position={[-0.06, 0.47, 0.04]} castShadow>
          <cylinderGeometry args={[0.035, 0.03, 0.07, 16]} />
          <meshStandardMaterial color={PALETTE.warmCream} roughness={0.3} />
        </mesh>
      </group>

      <PottedFloorPlant position={[-1.35, 0, -0.55]} scale={1.1} />
    </group>
  );
}

// -----------------------------------------------------------------------------
// 4. CENTER CIRCULAR RUG (UNDERNEATH LYRA)
// -----------------------------------------------------------------------------
function CenterPlushRug() {
  return (
    <group position={[0, 0, 0.08]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0]} receiveShadow>
        <circleGeometry args={[1.75, 48]} />
        <meshStandardMaterial
          color="#DECFC6"
          roughness={0.92}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.007, 0]} receiveShadow>
        <ringGeometry args={[1.52, 1.58, 48]} />
        <meshStandardMaterial color="#CEBCB1" roughness={0.95} side={THREE.DoubleSide} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.008, 0]}>
        <ringGeometry args={[1.73, 1.76, 48]} />
        <meshStandardMaterial
          color={PALETTE.lyraPink}
          emissive={PALETTE.lyraPink}
          emissiveIntensity={0.6}
          roughness={0.6}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

// -----------------------------------------------------------------------------
// 5. BACKGROUND: BUILT-IN RECESSED SHELVING UNIT, NOW WITH AN ARCHED TOP
// AND VISIBLE GLOWING LED STRIPS UNDER EACH SHELF
// -----------------------------------------------------------------------------
function BuiltInRecessedShelving() {
  return (
    <group position={[1.4, 1.65, -3.8]}>
      <mesh position={[0, 0.1, -0.15]} receiveShadow>
        <planeGeometry args={[2.2, 3.2]} />
        <meshStandardMaterial color={PALETTE.wallAccentPlum} roughness={0.8} />
      </mesh>

      <mesh position={[-1.1, 0.1, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[0.3, 3.2]} />
        <meshStandardMaterial color={PALETTE.wallAccentPlum} roughness={0.8} />
      </mesh>
      <mesh position={[1.1, 0.1, 0]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[0.3, 3.2]} />
        <meshStandardMaterial color={PALETTE.wallAccentPlum} roughness={0.8} />
      </mesh>
      <mesh position={[0, 1.7, 0]} rotation={[Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[2.2, 0.3]} />
        <meshStandardMaterial color={PALETTE.wallAccentPlum} roughness={0.8} />
      </mesh>

      {/* NEW: Arched top cap, half-cylinder, closes the gap with the reference's rounded niche top */}
      <mesh position={[0, 1.85, -0.15]} rotation={[0, Math.PI / 2, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[1.1, 1.1, 2.2, 24, 1, false, 0, Math.PI]} />
        <meshStandardMaterial color={PALETTE.wallAccentPlum} roughness={0.8} side={THREE.DoubleSide} />
      </mesh>

      {[-0.8, -0.05, 0.7, 1.45].map((y, i) => (
        <group position={[0, y, 0]} key={i}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[2.18, 0.05, 0.28]} />
            <meshStandardMaterial color={PALETTE.darkWalnut} roughness={0.45} />
          </mesh>
          <pointLight
            color={PALETTE.warmIndirectLed}
            intensity={0.25}
            distance={1.6}
            decay={2}
            position={[0, -0.08, 0.08]}
          />
          {/* NEW: visible glowing LED strip along the front edge of the shelf */}
          <mesh position={[0, -0.03, 0.135]}>
            <boxGeometry args={[2.1, 0.012, 0.012]} />
            <meshStandardMaterial
              color={PALETTE.warmIndirectLed}
              emissive={PALETTE.warmIndirectLed}
              emissiveIntensity={2.2}
            />
          </mesh>
        </group>
      ))}

      <HangingShelfPothos position={[-0.65, 1.47, 0.02]} />
      <PorcelainBunny position={[0.45, 1.47, 0.02]} rotation={[0, -0.25, 0]} scale={0.7} />
      <PorcelainBunny position={[0.72, 1.47, 0.01]} rotation={[0, 0.2, 0]} scale={0.55} />

      <PastelBookRow position={[-0.55, 0.72, 0.02]} rotation={[0, 0.08, 0]} />
      <RoundGlowOrb position={[0.1, 0.775, 0.02]} />
      <ScentedCandle position={[0.3, 0.72, 0.02]} />
      <PorcelainBunny position={[0.68, 0.72, 0.02]} rotation={[0, -0.15, 0]} scale={0.85} />

      <SmallFramedPhoto position={[0.32, 0.12, 0.02]} rotation={[0, -0.12, 0]} />
      <SmallPottedSucculent position={[-0.68, -0.02, 0.02]} scale={0.8} />
      <PastelBookRow position={[0.62, -0.02, 0.02]} rotation={[0, -0.05, 0]} />

      <StorageBox position={[0.35, -0.68, 0.02]} />
      <PastelBookRow position={[-0.52, -0.77, 0.02]} rotation={[0, 0.05, 0]} />
    </group>
  );
}

// -----------------------------------------------------------------------------
// 6. RIGHT SIDE: LOW-PROFILE CABINET, MUSHROOM LAMP & PROMINENT NEON BUNNY SIGN
// -----------------------------------------------------------------------------
function RightCabinetAndDecor() {
  return (
    <group position={[3.2, 0, -3.5]}>
      <group position={[0, 0.42, 0]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[1.55, 0.52, 0.48]} />
          <meshStandardMaterial color={PALETTE.trimMauve} roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.27, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.6, 0.035, 0.52]} />
          <meshStandardMaterial color={PALETTE.darkWalnut} roughness={0.42} />
        </mesh>
        {[
          [-0.65, -0.34, 0.16],
          [0.65, -0.34, 0.16],
          [-0.65, -0.34, -0.16],
          [0.65, -0.34, -0.16],
        ].map(([lx, ly, lz], i) => (
          <mesh key={i} position={[lx, ly, lz]} castShadow>
            <cylinderGeometry args={[0.016, 0.01, 0.18, 10]} />
            <meshStandardMaterial color={PALETTE.walnutPlank} roughness={0.4} />
          </mesh>
        ))}

        <CozyMushroomLamp position={[-0.42, 0.29, 0.02]} />
        <SmallPottedSucculent position={[0.42, 0.29, 0.02]} scale={0.9} />
        <PastelBookRow position={[0.02, 0.29, 0.04]} rotation={[0, 0.12, 0]} />
      </group>

      {/* Neon bunny sign, now a real focal-point feature: larger, brighter, with a face */}
      <NeonBunnySign position={[0.15, 1.95, -0.18]} />

      <group position={[-0.45, 1.15, -0.2]}>
        <mesh position={[0, 0, 0]} rotation={[0, 0, 0.06]}>
          <boxGeometry args={[0.18, 0.22, 0.01]} />
          <meshStandardMaterial color={PALETTE.warmCream} roughness={0.4} />
        </mesh>
        <mesh position={[0.32, -0.06, 0]} rotation={[0, 0, -0.05]}>
          <boxGeometry args={[0.18, 0.22, 0.01]} />
          <meshStandardMaterial color={PALETTE.warmCream} roughness={0.4} />
        </mesh>
      </group>
    </group>
  );
}

// -----------------------------------------------------------------------------
// HELPER PROPS & DECOR COMPONENTS
// -----------------------------------------------------------------------------

function CozyMushroomLamp({ position }: { position: [number, number, number] }) {
  const lampLightRef = useRef<THREE.PointLight>(null);

  useFrame(({ clock }) => {
    if (lampLightRef.current) {
      const t = clock.getElapsedTime();
      lampLightRef.current.intensity = 0.55 + Math.sin(t * 1.2) * 0.03;
    }
  });

  return (
    <group position={position}>
      <mesh position={[0, 0.07, 0]} castShadow>
        <cylinderGeometry args={[0.055, 0.075, 0.14, 20]} />
        <meshStandardMaterial color={PALETTE.warmCream} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.17, 0]} castShadow receiveShadow>
        <sphereGeometry args={[0.14, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
        <meshStandardMaterial
          color={PALETTE.porcelainWhite}
          emissive="#FFE2C6"
          emissiveIntensity={0.65}
          roughness={0.25}
        />
      </mesh>
      <pointLight
        ref={lampLightRef}
        color={PALETTE.lampGlow}
        intensity={0.55}
        distance={2.8}
        decay={2}
        castShadow
        shadow-bias={-0.0001}
      />
    </group>
  );
}

// UPDATED: Prominent Neon Bunny Sign with a real face, matching the reference
function NeonBunnySign({ position }: { position: [number, number, number] }) {
  return (
    <group position={position} scale={1.5}>
      <mesh position={[0, 0, 0]}>
        <torusGeometry args={[0.18, 0.013, 12, 28]} />
        <meshStandardMaterial
          color={PALETTE.lyraPink}
          emissive={PALETTE.lyraPink}
          emissiveIntensity={1.8}
        />
      </mesh>
      <mesh position={[-0.08, 0.25, 0]} rotation={[0, 0, -0.12]}>
        <capsuleGeometry args={[0.013, 0.18, 6, 12]} />
        <meshStandardMaterial
          color={PALETTE.lyraPink}
          emissive={PALETTE.lyraPink}
          emissiveIntensity={1.8}
        />
      </mesh>
      <mesh position={[0.08, 0.25, 0]} rotation={[0, 0, 0.12]}>
        <capsuleGeometry args={[0.013, 0.18, 6, 12]} />
        <meshStandardMaterial
          color={PALETTE.lyraPink}
          emissive={PALETTE.lyraPink}
          emissiveIntensity={1.8}
        />
      </mesh>
      {/* NEW: eyes */}
      <mesh position={[-0.06, 0.01, 0.01]}>
        <circleGeometry args={[0.016, 16]} />
        <meshStandardMaterial
          color={PALETTE.lyraPink}
          emissive={PALETTE.lyraPink}
          emissiveIntensity={1.8}
        />
      </mesh>
      <mesh position={[0.06, 0.01, 0.01]}>
        <circleGeometry args={[0.016, 16]} />
        <meshStandardMaterial
          color={PALETTE.lyraPink}
          emissive={PALETTE.lyraPink}
          emissiveIntensity={1.8}
        />
      </mesh>
      {/* NEW: nose */}
      <mesh position={[0, -0.05, 0.01]}>
        <circleGeometry args={[0.02, 3]} />
        <meshStandardMaterial
          color={PALETTE.lyraPink}
          emissive={PALETTE.lyraPink}
          emissiveIntensity={1.8}
        />
      </mesh>
      <pointLight color={PALETTE.lyraPink} intensity={0.6} distance={2.4} position={[0, 0.08, 0.15]} />
    </group>
  );
}

function PorcelainBunny({
  position,
  rotation = [0, 0, 0],
  scale = 1,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
}) {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh position={[0, 0.08, 0]} castShadow>
        <sphereGeometry args={[0.085, 14, 14]} />
        <meshStandardMaterial color={PALETTE.porcelainWhite} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.18, 0.01]} castShadow>
        <sphereGeometry args={[0.065, 14, 14]} />
        <meshStandardMaterial color={PALETTE.porcelainWhite} roughness={0.4} />
      </mesh>
      <mesh position={[-0.025, 0.26, 0]} rotation={[0, 0, -0.1]} castShadow>
        <capsuleGeometry args={[0.015, 0.08, 6, 8]} />
        <meshStandardMaterial color={PALETTE.porcelainWhite} roughness={0.4} />
      </mesh>
      <mesh position={[0.025, 0.26, 0]} rotation={[0, 0, 0.1]} castShadow>
        <capsuleGeometry args={[0.015, 0.08, 6, 8]} />
        <meshStandardMaterial color={PALETTE.porcelainWhite} roughness={0.4} />
      </mesh>
    </group>
  );
}

function ScentedCandle({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.04, 0]} castShadow>
        <cylinderGeometry args={[0.035, 0.035, 0.08, 16]} />
        <meshStandardMaterial color={PALETTE.warmCream} roughness={0.2} transparent opacity={0.85} />
      </mesh>
      <mesh position={[0, 0.085, 0]}>
        <sphereGeometry args={[0.008, 8, 8]} />
        <meshBasicMaterial color="#FFDAA8" />
      </mesh>
    </group>
  );
}

function PastelBookRow({
  position,
  rotation = [0, 0, 0],
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
}) {
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 0.015, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.16, 0.03, 0.22]} />
        <meshStandardMaterial color="#D892AE" roughness={0.5} />
      </mesh>
      <mesh position={[0.01, 0.045, 0.01]} rotation={[0, 0.06, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.15, 0.028, 0.2]} />
        <meshStandardMaterial color="#B08DB8" roughness={0.5} />
      </mesh>
      <mesh position={[-0.01, 0.07, -0.01]} rotation={[0, -0.05, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.14, 0.024, 0.18]} />
        <meshStandardMaterial color="#E8D2C6" roughness={0.5} />
      </mesh>
    </group>
  );
}

function SmallFramedPhoto({
  position,
  rotation = [0, 0, 0],
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
}) {
  return (
    <group position={position} rotation={rotation}>
      <mesh castShadow>
        <boxGeometry args={[0.16, 0.2, 0.018]} />
        <meshStandardMaterial color={PALETTE.darkWalnut} roughness={0.45} />
      </mesh>
      <mesh position={[0, 0, 0.01]}>
        <planeGeometry args={[0.12, 0.16]} />
        <meshBasicMaterial color="#FDF4F8" />
      </mesh>
    </group>
  );
}

function StorageBox({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.2, 0.09, 0.14]} />
        <meshStandardMaterial color={PALETTE.softBeige} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.05, 0]} castShadow>
        <boxGeometry args={[0.21, 0.015, 0.15]} />
        <meshStandardMaterial color={PALETTE.darkWalnut} roughness={0.4} />
      </mesh>
    </group>
  );
}

function HangingShelfPothos({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.06, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.055, 0.12, 16]} />
        <meshStandardMaterial color={PALETTE.porcelainWhite} roughness={0.35} />
      </mesh>
      {[
        { x: 0.04, y: -0.15, z: 0.05, l: 0.35 },
        { x: -0.04, y: -0.22, z: 0.04, l: 0.5 },
        { x: 0.02, y: -0.18, z: -0.04, l: 0.4 },
      ].map((v, i) => (
        <group key={i} position={[v.x, 0, v.z]}>
          <mesh position={[0, -v.l / 2, 0]}>
            <cylinderGeometry args={[0.006, 0.006, v.l, 6]} />
            <meshStandardMaterial color={PALETTE.leafGreenDark} />
          </mesh>
          {[0.25, 0.5, 0.75, 1.0].map((prog, lIdx) => (
            <mesh
              key={lIdx}
              position={[Math.sin(lIdx * 2) * 0.02, -v.l * prog, 0]}
              rotation={[0.3, 0.2 * lIdx, 0]}
              castShadow
            >
              <sphereGeometry args={[0.03, 6, 6]} scale={[1, 1.3, 0.25]} />
              <meshStandardMaterial
                color={lIdx % 2 === 0 ? PALETTE.leafGreen : PALETTE.leafGreenLight}
                roughness={0.5}
              />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

function SmallPottedSucculent({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.06, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.065, 0.05, 0.12, 16]} />
        <meshStandardMaterial color={PALETTE.porcelainWhite} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.115, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 0.015, 16]} />
        <meshStandardMaterial color="#36241D" roughness={0.9} />
      </mesh>
      {[
        { rot: [0.3, 0.2, 0.1], pos: [0.01, 0.16, 0.01] },
        { rot: [0.35, 1.8, 0.12], pos: [-0.01, 0.18, 0.02] },
        { rot: [0.25, -1.5, 0.18], pos: [0.03, 0.19, -0.01] },
      ].map((leaf, idx) => (
        <group key={idx} position={leaf.pos as [number, number, number]} rotation={leaf.rot as [number, number, number]}>
          <mesh position={[0, 0.06, 0]} rotation={[0.35, 0, 0]} castShadow>
            <sphereGeometry args={[0.045, 8, 8]} scale={[1, 1.25, 0.28]} />
            <meshStandardMaterial color={PALETTE.leafGreen} roughness={0.5} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function PottedFloorPlant({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.18, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.18, 0.14, 0.36, 20]} />
        <meshStandardMaterial color={PALETTE.warmCream} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.35, 0]}>
        <cylinderGeometry args={[0.17, 0.17, 0.02, 16]} />
        <meshStandardMaterial color="#2E1C18" roughness={0.9} />
      </mesh>
      {[
        { rot: [0.28, 0.4, 0.1], pos: [0.03, 0.45, 0.02], s: 1.1 },
        { rot: [0.35, 1.9, 0.15], pos: [-0.04, 0.52, 0.05], s: 1.0 },
        { rot: [0.25, -1.3, 0.18], pos: [0.05, 0.58, -0.04], s: 1.2 },
        { rot: [0.15, 0.8, -0.04], pos: [0, 0.65, 0], s: 1.3 },
      ].map((l, idx) => (
        <group key={idx} position={l.pos as [number, number, number]} rotation={l.rot as [number, number, number]} scale={l.s}>
          <mesh position={[0, 0.1, 0]} castShadow>
            <cylinderGeometry args={[0.012, 0.012, 0.22, 6]} />
            <meshStandardMaterial color={PALETTE.leafGreenDark} roughness={0.6} />
          </mesh>
          <mesh position={[0, 0.22, 0]} rotation={[0.4, 0, 0]} castShadow receiveShadow>
            <sphereGeometry args={[0.12, 12, 12]} scale={[1, 1.5, 0.2]} />
            <meshStandardMaterial
              color={idx % 2 === 0 ? PALETTE.leafGreen : PALETTE.leafGreenLight}
              roughness={0.5}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// -----------------------------------------------------------------------------
// 7. MAIN ROOM ENVIRONMENT SCENE GRAPH
// -----------------------------------------------------------------------------
export function RoomEnvironment() {
  return (
    <group>
      <ambientLight color="#6E4C62" intensity={1.15} />

      <directionalLight
        color={PALETTE.warmSunsetKey}
        intensity={1.35}
        position={[-5.0, 3.8, 2.0]}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0001}
      />

      <directionalLight
        color="#FFF6F0"
        intensity={1.2}
        position={[-1.2, 2.2, 3.0]}
      />

      <directionalLight
        color="#F8C6DB"
        intensity={0.5}
        position={[2.8, 1.8, 2.5]}
      />

      <directionalLight
        color="#FFE5F2"
        intensity={0.7}
        position={[0.2, 3.4, -2.4]}
      />

      <pointLight
        color="#FFEBD6"
        intensity={0.45}
        position={[0, 4.0, -0.5]}
        distance={12}
      />

      <AmbientMotes />
      <DriftingSakura />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial
          color={PALETTE.walnutPlank}
          roughness={0.4}
          metalness={0.06}
          side={THREE.DoubleSide}
        />
      </mesh>

      <mesh position={[0, 5.0, -3.95]} receiveShadow>
        <planeGeometry args={[50, 12]} />
        <meshStandardMaterial
          color={PALETTE.wallPlaster}
          roughness={0.9}
          side={THREE.DoubleSide}
        />
      </mesh>

      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 5.0, 0]} receiveShadow>
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial color="#362231" roughness={0.95} side={THREE.DoubleSide} />
      </mesh>

      <mesh position={[0, 0.08, -3.92]} receiveShadow>
        <boxGeometry args={[50, 0.16, 0.05]} />
        <meshStandardMaterial color={PALETTE.darkWalnut} roughness={0.5} />
      </mesh>

      <mesh position={[0, 3.8, -3.92]} receiveShadow>
        <boxGeometry args={[50, 0.06, 0.05]} />
        <meshStandardMaterial color={PALETTE.darkWalnut} roughness={0.5} />
      </mesh>

      <PanoramicBalconyWindow />

      <BottomLeftLoungeCorner />

      <CenterPlushRug />

      <BuiltInRecessedShelving />

      <RightCabinetAndDecor />

      {/* NEW: round wall art + low console, filling the wall between the window
          and the shelving unit, matching the reference's back-left wall grouping */}
      <RoundWallArt position={[-1.1, 2.55, -3.9]} />
      <WindowsideConsole position={[-1.1, 0, -3.75]} />
    </group>
  );
}

export default RoomEnvironment;