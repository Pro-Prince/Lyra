import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// -----------------------------------------------------------------------------
// COLOR PALETTE (Warm Muted Mauve/Plum 60%, Cream 20%, Walnut 10%, Lyra Pink 10%)
// -----------------------------------------------------------------------------
const PALETTE = {
  // Architectural Mauve & Plum (60%)
  wallPlaster: '#462E3F',
  wallAccentPlum: '#382233',
  shadowPlum: '#2A1826',
  trimMauve: '#52374A',
  
  // Cream & Warm Off-White Surfaces (20%)
  warmCream: '#F4ECE4',
  softBeige: '#E6D7CC',
  curtainWhite: '#FAF3ED',
  porcelainWhite: '#FCF8F5',
  
  // Dark Walnut Wood (10%)
  darkWalnut: '#3B2321',
  walnutPlank: '#321D1C',
  walnutLight: '#4A2E2C',
  
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

    // Rich anime evening sky gradient: deep twilight plum -> rosy mauve -> warm amber horizon
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#241427');
    grad.addColorStop(0.35, '#48243E');
    grad.addColorStop(0.65, '#8C4666');
    grad.addColorStop(0.85, '#D9798C');
    grad.addColorStop(1.0, '#FFB285');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    // Warm setting sun glow
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
    <group position={[-4.6, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
      {/* Sky Backdrop Plane */}
      <mesh position={[-0.5, 2.3, -0.25]}>
        <planeGeometry args={[5.2, 5.0]} />
        {sunsetTexture ? (
          <meshBasicMaterial map={sunsetTexture} side={THREE.DoubleSide} />
        ) : (
          <meshBasicMaterial color="#8C4666" side={THREE.DoubleSide} />
        )}
      </mesh>

      {/* Distant City Skyline Silhouettes with Soft Window Lights */}
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
            {/* Subtle warm lit windows */}
            {[...Array(3)].map((_, wIdx) => (
              <mesh key={wIdx} position={[(wIdx % 2 === 0 ? 0.05 : -0.05), (wIdx - 1) * 0.45, 0.001]}>
                <planeGeometry args={[0.035, 0.07]} />
                <meshBasicMaterial color="#FFE4A0" opacity={0.55} transparent />
              </mesh>
            ))}
          </group>
        ))}
      </group>

      {/* Dark Walnut Window Frame Structure */}
      <group position={[-0.5, 2.3, 0]}>
        {/* Frame Outer Top */}
        <mesh position={[0, 2.35, 0.04]} castShadow receiveShadow>
          <boxGeometry args={[4.4, 0.1, 0.12]} />
          <meshStandardMaterial color={PALETTE.darkWalnut} roughness={0.5} />
        </mesh>
        {/* Frame Outer Bottom Sill */}
        <mesh position={[0, -2.35, 0.06]} castShadow receiveShadow>
          <boxGeometry args={[4.4, 0.12, 0.18]} />
          <meshStandardMaterial color={PALETTE.darkWalnut} roughness={0.45} />
        </mesh>
        {/* Outer Left Post */}
        <mesh position={[-2.2, 0, 0.04]} castShadow receiveShadow>
          <boxGeometry args={[0.1, 4.7, 0.12]} />
          <meshStandardMaterial color={PALETTE.darkWalnut} roughness={0.5} />
        </mesh>
        {/* Outer Right Post */}
        <mesh position={[2.2, 0, 0.04]} castShadow receiveShadow>
          <boxGeometry args={[0.1, 4.7, 0.12]} />
          <meshStandardMaterial color={PALETTE.darkWalnut} roughness={0.5} />
        </mesh>
        {/* Center Vertical Mullion */}
        <mesh position={[0, 0, 0.04]} castShadow>
          <boxGeometry args={[0.05, 4.7, 0.08]} />
          <meshStandardMaterial color={PALETTE.darkWalnut} roughness={0.5} />
        </mesh>
        {/* Transom Horizontal Mullion */}
        <mesh position={[0, 0.7, 0.04]} castShadow>
          <boxGeometry args={[4.4, 0.04, 0.06]} />
          <meshStandardMaterial color={PALETTE.darkWalnut} roughness={0.5} />
        </mesh>

        {/* Sheer White/Soft Pink Curtains with Gentle Folds */}
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

      {/* Subtle Volumetric Sunbeam Shaft from the window */}
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
// 3. BOTTOM-LEFT: COZY ROUNDED LOUNGE CHAIR, FLOWER CUSHION & SIDE TABLE
// -----------------------------------------------------------------------------
function BottomLeftLoungeCorner() {
  return (
    <group position={[-2.4, 0, 0.65]} rotation={[0, 0.32, 0]}>
      {/* Curved Soft Cream Lounge Sofa / Armchair */}
      <group position={[0, 0.32, 0]}>
        {/* Rounded base cushion */}
        <mesh castShadow receiveShadow scale={[1.25, 0.72, 1.25]}>
          <sphereGeometry args={[0.8, 28, 20]} />
          <meshStandardMaterial color={PALETTE.warmCream} roughness={0.9} />
        </mesh>
        {/* Soft rounded backrest */}
        <mesh castShadow receiveShadow position={[-0.22, 0.3, -0.22]} scale={[1.05, 0.78, 1.05]}>
          <sphereGeometry args={[0.62, 22, 18]} />
          <meshStandardMaterial color="#EFE2D6" roughness={0.9} />
        </mesh>

        {/* Soft Pastel Pink Throw Blanket draped naturally */}
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

        {/* Cute Daisy Flower Cushion (White Petals + Soft Pink Center) */}
        <group position={[0.02, 0.44, 0.3]} rotation={[0.42, 0.12, 0.08]}>
          {/* Center Button */}
          <mesh castShadow position={[0, 0, 0.05]}>
            <cylinderGeometry args={[0.1, 0.1, 0.04, 20]} rotation={[Math.PI / 2, 0, 0]} />
            <meshStandardMaterial color={PALETTE.lyraPink} roughness={0.8} />
          </mesh>
          {/* 6 Rounded White Petals */}
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

      {/* Small Minimalist Dark Walnut Side Table */}
      <group position={[-0.95, 0, 0.25]}>
        {/* Table Top */}
        <mesh position={[0, 0.42, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.26, 0.26, 0.03, 24]} />
          <meshStandardMaterial color={PALETTE.darkWalnut} roughness={0.45} />
        </mesh>
        {/* Tripod Legs */}
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
        {/* Ceramic Coffee Mug & Small Book */}
        <mesh position={[0.04, 0.445, -0.02]} castShadow>
          <boxGeometry args={[0.14, 0.02, 0.18]} />
          <meshStandardMaterial color={PALETTE.softPinkTextile} roughness={0.5} />
        </mesh>
        <mesh position={[-0.06, 0.47, 0.04]} castShadow>
          <cylinderGeometry args={[0.035, 0.03, 0.07, 16]} />
          <meshStandardMaterial color={PALETTE.warmCream} roughness={0.3} />
        </mesh>
      </group>

      {/* Potted Floor Monstera Plant next to chair */}
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
      {/* Soft circular cream plush rug */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0]} receiveShadow>
        <circleGeometry args={[1.75, 48]} />
        <meshStandardMaterial
          color="#DECFC6"
          roughness={0.92}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Tonal inner border ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.007, 0]} receiveShadow>
        <ringGeometry args={[1.52, 1.58, 48]} />
        <meshStandardMaterial color="#CEBCB1" roughness={0.95} side={THREE.DoubleSide} />
      </mesh>
      {/* Very subtle soft pink rim reflection (no harsh neon) */}
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
// 5. BACKGROUND: BUILT-IN RECESSED SHELVING UNIT WITH REAL DEPTH
// -----------------------------------------------------------------------------
function BuiltInRecessedShelving() {
  return (
    <group position={[1.4, 1.65, -3.8]}>
      {/* Recessed Niche Backwall with Mauve Tone */}
      <mesh position={[0, 0.1, -0.15]} receiveShadow>
        <planeGeometry args={[2.2, 3.2]} />
        <meshStandardMaterial color={PALETTE.wallAccentPlum} roughness={0.8} />
      </mesh>

      {/* Recessed Niche Side Walls providing real architectural depth */}
      <mesh position={[-1.1, 0.1, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[0.3, 3.2]} />
        <meshStandardMaterial color={PALETTE.wallAccentPlum} roughness={0.8} />
      </mesh>
      <mesh position={[1.1, 0.1, 0]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[0.3, 3.2]} />
        <meshStandardMaterial color={PALETTE.wallAccentPlum} roughness={0.8} />
      </mesh>
      {/* Recessed Top Header */}
      <mesh position={[0, 1.7, 0]} rotation={[Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[2.2, 0.3]} />
        <meshStandardMaterial color={PALETTE.wallAccentPlum} roughness={0.8} />
      </mesh>

      {/* 4 Dark Walnut Wooden Shelves with Soft Warm Under-lighting */}
      {[-0.8, -0.05, 0.7, 1.45].map((y, i) => (
        <group position={[0, y, 0]} key={i}>
          {/* Wooden Shelf Board */}
          <mesh castShadow receiveShadow>
            <boxGeometry args={[2.18, 0.05, 0.28]} />
            <meshStandardMaterial color={PALETTE.darkWalnut} roughness={0.45} />
          </mesh>
          {/* Subtle Warm Indirect Point Light (Soft glow, no emissive neon borders) */}
          <pointLight
            color={PALETTE.warmIndirectLed}
            intensity={0.25}
            distance={1.6}
            decay={2}
            position={[0, -0.08, 0.08]}
          />
        </group>
      ))}

      {/* --- Tasteful & Sparse Shelf Decor --- */}
      {/* Top Shelf (y = 1.45) */}
      <HangingShelfPothos position={[-0.65, 1.47, 0.02]} />
      <PorcelainBunny position={[0.45, 1.47, 0.02]} rotation={[0, -0.25, 0]} scale={0.7} />
      <PorcelainBunny position={[0.72, 1.47, 0.01]} rotation={[0, 0.2, 0]} scale={0.55} />

      {/* 2nd Shelf (y = 0.7) */}
      <PastelBookRow position={[-0.55, 0.72, 0.02]} rotation={[0, 0.08, 0]} />
      <ScentedCandle position={[0.3, 0.72, 0.02]} />
      <PorcelainBunny position={[0.68, 0.72, 0.02]} rotation={[0, -0.15, 0]} scale={0.85} />

      {/* 3rd Shelf (y = -0.05) */}
      <SmallFramedPhoto position={[0.32, 0.12, 0.02]} rotation={[0, -0.12, 0]} />
      <SmallPottedSucculent position={[-0.68, -0.02, 0.02]} scale={0.8} />
      <PastelBookRow position={[0.62, -0.02, 0.02]} rotation={[0, -0.05, 0]} />

      {/* Bottom Shelf (y = -0.8) */}
      <StorageBox position={[0.35, -0.68, 0.02]} />
      <PastelBookRow position={[-0.52, -0.77, 0.02]} rotation={[0, 0.05, 0]} />
    </group>
  );
}

// -----------------------------------------------------------------------------
// 6. RIGHT SIDE: LOW-PROFILE CABINET, MUSHROOM LAMP & TASTEFUL NEON ACCENT
// -----------------------------------------------------------------------------
function RightCabinetAndDecor() {
  return (
    <group position={[3.2, 0, -3.5]}>
      {/* Low-Profile Cream/Mauve Wooden Credenza */}
      <group position={[0, 0.42, 0]}>
        {/* Cabinet Base Box */}
        <mesh castShadow receiveShadow>
          <boxGeometry args={[1.55, 0.52, 0.48]} />
          <meshStandardMaterial color={PALETTE.trimMauve} roughness={0.6} />
        </mesh>
        {/* Dark Walnut Top Board */}
        <mesh position={[0, 0.27, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.6, 0.035, 0.52]} />
          <meshStandardMaterial color={PALETTE.darkWalnut} roughness={0.42} />
        </mesh>
        {/* 4 Tapered Wooden Legs */}
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

        {/* On-Cabinet Items: Warm Mushroom Lamp, Potted Plant, Pastel Books */}
        <CozyMushroomLamp position={[-0.42, 0.29, 0.02]} />
        <SmallPottedSucculent position={[0.42, 0.29, 0.02]} scale={0.9} />
        <PastelBookRow position={[0.02, 0.29, 0.04]} rotation={[0, 0.12, 0]} />
      </group>

      {/* VERY SMALL, Subtle Pink Bunny Neon Bedroom Decor Accent on Right Wall */}
      {/* Tasteful bedroom wall art (NOT a glowing nightclub sign) */}
      <SubtleBedroomNeonBunny position={[0.15, 1.85, -0.18]} />

      {/* Pinned Aesthetic Polaroid Memories on wall */}
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

// Warm Mushroom Table Lamp (Warm practical light)
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
      {/* Ceramic Stem Base */}
      <mesh position={[0, 0.07, 0]} castShadow>
        <cylinderGeometry args={[0.055, 0.075, 0.14, 20]} />
        <meshStandardMaterial color={PALETTE.warmCream} roughness={0.35} />
      </mesh>
      {/* Mushroom Dome Shade */}
      <mesh position={[0, 0.17, 0]} castShadow receiveShadow>
        <sphereGeometry args={[0.14, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
        <meshStandardMaterial
          color={PALETTE.porcelainWhite}
          emissive="#FFE2C6"
          emissiveIntensity={0.65}
          roughness={0.25}
        />
      </mesh>
      {/* Soft Warm Point Light */}
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

// Tasteful, Delicate Bedroom Neon Bunny (Small scale, soft blush pink glow)
function SubtleBedroomNeonBunny({ position }: { position: [number, number, number] }) {
  return (
    <group position={position} scale={0.85}>
      {/* Head Ring */}
      <mesh position={[0, 0, 0]}>
        <torusGeometry args={[0.18, 0.012, 12, 28]} />
        <meshStandardMaterial
          color={PALETTE.lyraPink}
          emissive={PALETTE.lyraPink}
          emissiveIntensity={1.4}
        />
      </mesh>
      {/* Left Ear */}
      <mesh position={[-0.08, 0.25, 0]} rotation={[0, 0, -0.12]}>
        <capsuleGeometry args={[0.012, 0.18, 6, 12]} />
        <meshStandardMaterial
          color={PALETTE.lyraPink}
          emissive={PALETTE.lyraPink}
          emissiveIntensity={1.4}
        />
      </mesh>
      {/* Right Ear */}
      <mesh position={[0.08, 0.25, 0]} rotation={[0, 0, 0.12]}>
        <capsuleGeometry args={[0.012, 0.18, 6, 12]} />
        <meshStandardMaterial
          color={PALETTE.lyraPink}
          emissive={PALETTE.lyraPink}
          emissiveIntensity={1.4}
        />
      </mesh>
      {/* Soft subtle pink fill light */}
      <pointLight color={PALETTE.lyraPink} intensity={0.2} distance={1.8} position={[0, 0.08, 0.12]} />
    </group>
  );
}

// White Porcelain Bunny Figurine
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

// Scented Glass Candle with soft warm flicker
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

// Stack / Row of Pastel Books
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

// Small Framed Photo
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

// Decorative Storage Box
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

// Hanging Shelf Pothos Plant
function HangingShelfPothos({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.06, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.055, 0.12, 16]} />
        <meshStandardMaterial color={PALETTE.porcelainWhite} roughness={0.35} />
      </mesh>
      {/* Cascading Ivy Vines */}
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

// Small Potted Succulent for shelves & cabinets
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

// Floor Potted Plant
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
      {/* ========================================================================= */}
      {/* 1. PRACTICAL CINEMATIC LIGHTING RIG */}
      {/* ========================================================================= */}

      {/* Warm Muted Plum Ambient Fill (Ensures room is soft and cozy, NOT pitch black) */}
      <ambientLight color="#523647" intensity={0.95} />

      {/* Warm Natural Evening Key Light streaming in from Window (Left) */}
      <directionalLight
        color={PALETTE.warmSunsetKey}
        intensity={1.25}
        position={[-6.0, 3.8, 1.5]}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0001}
      />

      {/* DEDICATED AVATAR LIGHTING (Lyra is the brightest & clearest subject) */}
      {/* Soft warm key light on Lyra's face and body */}
      <directionalLight
        color="#FFF6F0"
        intensity={1.15}
        position={[-1.2, 2.2, 3.0]}
      />

      {/* Subtle soft pink fill light from right */}
      <directionalLight
        color="#F8C6DB"
        intensity={0.45}
        position={[2.8, 1.8, 2.5]}
      />

      {/* Soft rim light on Lyra's hair and silhouette */}
      <directionalLight
        color="#FFE5F2"
        intensity={0.65}
        position={[0.2, 3.4, -2.4]}
      />

      {/* Room Center Warm Overhead Fill */}
      <pointLight
        color="#FFEBD6"
        intensity={0.35}
        position={[0, 4.0, -0.5]}
        distance={12}
      />

      {/* ========================================================================= */}
      {/* 2. ATMOSPHERIC PARTICLES & DUST */}
      {/* ========================================================================= */}
      <AmbientMotes />
      <DriftingSakura />

      {/* ========================================================================= */}
      {/* 3. ARCHITECTURAL SHELL (Walls, Flooring, Ceiling) */}
      {/* ========================================================================= */}

      {/* Warm Medium-Dark Walnut Wood Plank Flooring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial
          color={PALETTE.walnutPlank}
          roughness={0.4}
          metalness={0.06}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Back Wall (Warm Muted Plaster in Mauve/Plum) */}
      <mesh position={[0, 5.0, -3.95]} receiveShadow>
        <planeGeometry args={[50, 12]} />
        <meshStandardMaterial
          color={PALETTE.wallPlaster}
          roughness={0.9}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 5.0, 0]} receiveShadow>
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial color="#362231" roughness={0.95} side={THREE.DoubleSide} />
      </mesh>

      {/* Dark Walnut Architectural Baseboard */}
      <mesh position={[0, 0.08, -3.92]} receiveShadow>
        <boxGeometry args={[50, 0.16, 0.05]} />
        <meshStandardMaterial color={PALETTE.darkWalnut} roughness={0.5} />
      </mesh>

      {/* Upper Wall Wooden Picture Rail Trim */}
      <mesh position={[0, 3.8, -3.92]} receiveShadow>
        <boxGeometry args={[50, 0.06, 0.05]} />
        <meshStandardMaterial color={PALETTE.darkWalnut} roughness={0.5} />
      </mesh>

      {/* ========================================================================= */}
      {/* 4. ROOM ZONES & FURNITURE */}
      {/* ========================================================================= */}

      {/* LEFT: Floor-to-ceiling panoramic window with sunset twilight skyline */}
      <PanoramicBalconyWindow />

      {/* BOTTOM LEFT: Cozy rounded cream lounge chair, pink throw & flower cushion */}
      <BottomLeftLoungeCorner />

      {/* CENTER: Clean circular plush cream rug directly beneath Lyra */}
      <CenterPlushRug />

      {/* BACKGROUND RIGHT-CENTER: Built-in recessed shelving with real depth */}
      <BuiltInRecessedShelving />

      {/* RIGHT: Low-profile credenza, cozy mushroom lamp & subtle bedroom neon bunny */}
      <RightCabinetAndDecor />
    </group>
  );
}

export default RoomEnvironment;
