import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// -----------------------------------------------------------------------------
// PALETTE CONSTANTS
// -----------------------------------------------------------------------------
const PALETTE = {
  deepPlum: '#1B101C',
  darkPurple: '#241522',
  mutedMauve: '#4A3040',
  dustyRose: '#704455',
  lyraPink: '#F48CC2',
  neonPink: '#FF6EA7',
  warmCream: '#F5DCC8',
  warmWhite: '#FFF2E6',
  darkWalnut: '#3A2424',
  goldenLed: '#FFB870',
  leafGreen: '#5A8A68',
  leafGreenLight: '#7BAE8A',
  leafGreenDark: '#3E6649',
};

// -----------------------------------------------------------------------------
// 1. GENTLE DRIFTING SAKURA PETALS
// -----------------------------------------------------------------------------
function DriftingSakuraPetals() {
  const count = 32;
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const particles = useMemo(() => {
    return Array.from({ length: count }, () => ({
      x: (Math.random() - 0.5) * 7.5,
      y: Math.random() * 4.2 + 0.2,
      z: (Math.random() - 0.5) * 6.0,
      speedY: 0.0025 + Math.random() * 0.0035,
      swaySpeedX: 0.7 + Math.random() * 1.0,
      swayAmpX: 0.005 + Math.random() * 0.008,
      rotX: Math.random() * Math.PI * 2,
      rotY: Math.random() * Math.PI * 2,
      rotZ: Math.random() * Math.PI * 2,
      rotSpeedX: (Math.random() - 0.5) * 0.025,
      rotSpeedY: (Math.random() - 0.5) * 0.035,
      rotSpeedZ: (Math.random() - 0.5) * 0.02,
      scale: 0.65 + Math.random() * 0.55,
      phase: Math.random() * Math.PI * 2,
    }));
  }, [count]);

  const petalGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.bezierCurveTo(0.04, 0.03, 0.06, 0.09, 0.03, 0.14);
    shape.bezierCurveTo(0.015, 0.16, -0.015, 0.16, -0.03, 0.14);
    shape.bezierCurveTo(-0.06, 0.09, -0.04, 0.03, 0, 0);

    const geo = new THREE.ShapeGeometry(shape, 12);
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
      p.y -= p.speedY * safeDelta * 60;
      p.x += (Math.sin(t * p.swaySpeedX + p.phase) * p.swayAmpX + 0.0015) * safeDelta * 60;
      p.z += Math.cos(t * p.swaySpeedX * 0.7 + p.phase) * (p.swayAmpX * 0.5) * safeDelta * 60;

      p.rotX += p.rotSpeedX;
      p.rotY += p.rotSpeedY;
      p.rotZ += p.rotSpeedZ;

      if (p.y < 0.05 || p.x > 5.0 || p.x < -5.0) {
        p.y = 4.2 + Math.random() * 0.4;
        p.x = -4.2 + (Math.random() - 0.5) * 2.5;
        p.z = (Math.random() - 0.5) * 5.0;
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
        color="#F8B4D9"
        emissive="#FF94C7"
        emissiveIntensity={0.35}
        side={THREE.DoubleSide}
        transparent
        opacity={0.85}
        roughness={0.4}
      />
    </instancedMesh>
  );
}

// -----------------------------------------------------------------------------
// 2. SHIMMERING FLOATING LIGHT DUST PARTICLES
// -----------------------------------------------------------------------------
function FloatingDustParticles() {
  const count = 45;
  const pointsRef = useRef<THREE.Points>(null);

  const [geo, speeds] = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const speedArr = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 8.0;
      positions[i * 3 + 1] = Math.random() * 4.0 + 0.2;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 6.5;
      speedArr[i] = 0.002 + Math.random() * 0.004;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return [geometry, speedArr];
  }, [count]);

  useFrame((_, delta) => {
    if (!pointsRef.current) return;
    const pos = pointsRef.current.geometry.attributes.position;
    const safeDelta = Math.min(delta, 0.1);

    for (let i = 0; i < count; i++) {
      let y = pos.getY(i) + speeds[i] * safeDelta * 60;
      if (y > 4.2) y = 0.2;
      pos.setY(i, y);
    }
    pos.needsUpdate = true;
  });

  return (
    <points ref={pointsRef} geometry={geo}>
      <pointsMaterial
        color="#FFE5D1"
        size={0.035}
        transparent
        opacity={0.55}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

// -----------------------------------------------------------------------------
// 3. VOLUMETRIC WINDOW SUNBEAM / LIGHT SHAFTS
// -----------------------------------------------------------------------------
function SunbeamShafts() {
  const beamRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (beamRef.current) {
      const t = clock.getElapsedTime();
      beamRef.current.children.forEach((child, idx) => {
        const mat = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
        if (mat) {
          mat.opacity = 0.04 + Math.sin(t * 0.5 + idx * 1.8) * 0.015;
        }
      });
    }
  });

  return (
    <group ref={beamRef} position={[-5.8, 3.2, -0.8]} rotation={[0.15, 0.35, -0.28]}>
      <mesh position={[2.8, -1.4, 1.2]} rotation={[-Math.PI / 2 + 0.32, 0, 0.25]}>
        <planeGeometry args={[3.0, 9.5]} />
        <meshBasicMaterial
          color="#FFEAD6"
          transparent
          opacity={0.04}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[2.2, -1.0, 0.8]} rotation={[-Math.PI / 2 + 0.36, 0, 0.2]}>
        <planeGeometry args={[2.2, 8.2]} />
        <meshBasicMaterial
          color="#FFD6BA"
          transparent
          opacity={0.03}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

// -----------------------------------------------------------------------------
// 4. FLOOR-TO-CEILING WINDOW & TWILIGHT SKYLINE (LEFT SIDE)
// -----------------------------------------------------------------------------
function CitySkylineWindow() {
  // Generate procedural sunset texture for the window backdrop
  const skyTexture = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Evening sunset twilight gradient: deep purple -> dusty magenta -> warm peach/amber horizon
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#1B101C');
    grad.addColorStop(0.3, '#351833');
    grad.addColorStop(0.65, '#733B58');
    grad.addColorStop(0.85, '#D46A80');
    grad.addColorStop(1.0, '#FFB27A');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    // Warm setting sun glow
    const sunGrad = ctx.createRadialGradient(160, 430, 10, 160, 430, 260);
    sunGrad.addColorStop(0, 'rgba(255, 240, 200, 0.9)');
    sunGrad.addColorStop(0.4, 'rgba(255, 170, 120, 0.5)');
    sunGrad.addColorStop(1, 'rgba(255, 140, 150, 0)');
    ctx.fillStyle = sunGrad;
    ctx.fillRect(0, 0, 512, 512);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  }, []);

  return (
    <group position={[-5.85, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
      {/* Wall cutout backdrop */}
      <mesh position={[0, 7.5, -0.3]} receiveShadow>
        <planeGeometry args={[50, 15]} />
        <meshStandardMaterial color={PALETTE.deepPlum} roughness={0.9} />
      </mesh>

      {/* Sky Backdrop with Texture */}
      <mesh position={[-0.8, 3.2, -0.15]}>
        <planeGeometry args={[5.2, 6.8]} />
        {skyTexture ? (
          <meshBasicMaterial map={skyTexture} side={THREE.DoubleSide} />
        ) : (
          <meshBasicMaterial color="#733B58" side={THREE.DoubleSide} />
        )}
      </mesh>

      {/* Distant City Skyline Silhouettes */}
      <group position={[-0.8, 1.2, -0.12]}>
        {[
          { x: -2.1, w: 0.38, h: 2.4 },
          { x: -1.7, w: 0.28, h: 3.1 },
          { x: -1.35, w: 0.42, h: 1.9 },
          { x: -0.9, w: 0.32, h: 3.6 },
          { x: -0.5, w: 0.45, h: 2.2 },
          { x: -0.05, w: 0.35, h: 2.8 },
          { x: 0.35, w: 0.4, h: 3.4 },
          { x: 0.8, w: 0.3, h: 2.1 },
          { x: 1.2, w: 0.46, h: 2.9 },
          { x: 1.7, w: 0.34, h: 3.7 },
          { x: 2.1, w: 0.4, h: 2.3 },
        ].map((b, i) => (
          <group key={i} position={[b.x, b.h / 2 - 1.2, 0]}>
            {/* Building Body */}
            <mesh>
              <planeGeometry args={[b.w, b.h]} />
              <meshBasicMaterial color="#1E1121" />
            </mesh>
            {/* Illuminated Windows */}
            {[...Array(4)].map((_, wIdx) => (
              <mesh key={wIdx} position={[(wIdx % 2 === 0 ? 0.06 : -0.06), (wIdx - 1.5) * 0.4, 0.001]}>
                <planeGeometry args={[0.04, 0.08]} />
                <meshBasicMaterial color="#FFE6A8" opacity={0.65} transparent />
              </mesh>
            ))}
          </group>
        ))}
      </group>

      {/* Modern Window Frame */}
      <group position={[-0.8, 3.2, 0]}>
        {/* Outer Frame Top */}
        <mesh position={[0, 3.1, 0.04]} castShadow receiveShadow>
          <boxGeometry args={[4.8, 0.12, 0.14]} />
          <meshStandardMaterial color={PALETTE.darkWalnut} roughness={0.45} />
        </mesh>
        {/* Outer Frame Bottom */}
        <mesh position={[0, -3.1, 0.04]} castShadow receiveShadow>
          <boxGeometry args={[4.8, 0.16, 0.2]} />
          <meshStandardMaterial color={PALETTE.darkWalnut} roughness={0.45} />
        </mesh>
        {/* Outer Frame Left */}
        <mesh position={[-2.4, 0, 0.04]} castShadow receiveShadow>
          <boxGeometry args={[0.12, 6.2, 0.14]} />
          <meshStandardMaterial color={PALETTE.darkWalnut} roughness={0.45} />
        </mesh>
        {/* Outer Frame Right */}
        <mesh position={[2.4, 0, 0.04]} castShadow receiveShadow>
          <boxGeometry args={[0.12, 6.2, 0.14]} />
          <meshStandardMaterial color={PALETTE.darkWalnut} roughness={0.45} />
        </mesh>

        {/* Center Vertical Mullion */}
        <mesh position={[0, 0, 0.04]} castShadow>
          <boxGeometry args={[0.06, 6.2, 0.1]} />
          <meshStandardMaterial color={PALETTE.darkWalnut} roughness={0.45} />
        </mesh>
        {/* Horizontal Mullion */}
        <mesh position={[0, 0.8, 0.04]} castShadow>
          <boxGeometry args={[4.8, 0.05, 0.08]} />
          <meshStandardMaterial color={PALETTE.darkWalnut} roughness={0.45} />
        </mesh>

        {/* Sheer Pink/Mauve Curtains on Left and Right with subtle soft folds */}
        <group position={[-2.2, 0, 0.15]}>
          <mesh castShadow receiveShadow>
            <planeGeometry args={[1.2, 6.2]} />
            <meshStandardMaterial
              color="#F0A6C6"
              roughness={0.7}
              transparent
              opacity={0.75}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh position={[0.2, 0, 0.02]}>
            <cylinderGeometry args={[0.08, 0.08, 6.2, 16]} />
            <meshStandardMaterial color="#E896B9" roughness={0.7} transparent opacity={0.65} />
          </mesh>
        </group>
        <group position={[2.2, 0, 0.15]}>
          <mesh castShadow receiveShadow>
            <planeGeometry args={[1.2, 6.2]} />
            <meshStandardMaterial
              color="#F0A6C6"
              roughness={0.7}
              transparent
              opacity={0.75}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh position={[-0.2, 0, 0.02]}>
            <cylinderGeometry args={[0.08, 0.08, 6.2, 16]} />
            <meshStandardMaterial color="#E896B9" roughness={0.7} transparent opacity={0.65} />
          </mesh>
        </group>
      </group>

      {/* Trailing Vines over Upper Left Window */}
      <HangingIvyPlant position={[-3.2, 6.0, 0.25]} />
    </group>
  );
}

// -----------------------------------------------------------------------------
// 5. FOREGROUND LEFT: PLUSH ROUNDED LOUNGE CHAIR & FLOWER CUSHION
// -----------------------------------------------------------------------------
function ForegroundLoungeCorner() {
  return (
    <group position={[-2.85, 0, 0.75]} rotation={[0, 0.35, 0]}>
      {/* Plush Rounded Cream Beanbag / Lounge Sofa */}
      <group position={[0, 0.35, 0]}>
        {/* Main curved base cushion */}
        <mesh castShadow receiveShadow scale={[1.35, 0.75, 1.35]}>
          <sphereGeometry args={[0.85, 32, 24]} />
          <meshStandardMaterial color="#E7D5C9" roughness={0.88} />
        </mesh>
        {/* Backrest slope */}
        <mesh castShadow receiveShadow position={[-0.25, 0.32, -0.25]} scale={[1.1, 0.8, 1.1]}>
          <sphereGeometry args={[0.65, 24, 20]} />
          <meshStandardMaterial color="#DFCABE" roughness={0.88} />
        </mesh>

        {/* Soft Pink Velvet Throw Blanket draped over side */}
        <group position={[0.45, 0.22, 0.25]} rotation={[0.2, 0.3, -0.4]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.55, 0.05, 0.9]} />
            <meshStandardMaterial color="#F48CC2" roughness={0.85} />
          </mesh>
          {/* Folded fringe */}
          <mesh position={[0.28, -0.15, 0]} rotation={[0, 0, 0.6]} castShadow>
            <boxGeometry args={[0.04, 0.35, 0.88]} />
            <meshStandardMaterial color="#EB7FB6" roughness={0.85} />
          </mesh>
        </group>

        {/* Daisy Flower Cushion: White Petals + Pink Center */}
        <group position={[0.05, 0.48, 0.35]} rotation={[0.45, 0.15, 0.1]}>
          {/* Center Button */}
          <mesh castShadow position={[0, 0, 0.06]}>
            <cylinderGeometry args={[0.11, 0.11, 0.05, 20]} rotation={[Math.PI / 2, 0, 0]} />
            <meshStandardMaterial color="#FF9EC9" roughness={0.8} />
          </mesh>
          {/* 6 Rounded White Petals */}
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const angle = (i * Math.PI) / 3;
            return (
              <mesh
                key={i}
                castShadow
                position={[Math.cos(angle) * 0.22, Math.sin(angle) * 0.22, 0]}
              >
                <sphereGeometry args={[0.13, 16, 16]} scale={[1, 1, 0.45]} />
                <meshStandardMaterial color="#FFF9F5" roughness={0.85} />
              </mesh>
            );
          })}
        </group>
      </group>

      {/* Small Round Side Table next to sofa */}
      <group position={[-1.1, 0, 0.3]}>
        {/* Table Top */}
        <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.3, 0.3, 0.035, 24]} />
          <meshStandardMaterial color={PALETTE.darkWalnut} roughness={0.4} />
        </mesh>
        {/* Table Legs */}
        {[0, 1, 2].map((i) => {
          const a = (i * Math.PI * 2) / 3;
          return (
            <mesh
              key={i}
              position={[Math.sin(a) * 0.18, 0.22, Math.cos(a) * 0.18]}
              rotation={[0.1 * Math.cos(a), 0, -0.1 * Math.sin(a)]}
              castShadow
            >
              <cylinderGeometry args={[0.015, 0.012, 0.45, 12]} />
              <meshStandardMaterial color="#2B1A1A" roughness={0.3} metalness={0.4} />
            </mesh>
          );
        })}
        {/* Pastel Book Stack on Table */}
        <BookStack position={[0, 0.47, 0]} rotation={[0, 0.2, 0]} />
      </group>

      {/* Large Floor Plant beside lounge chair */}
      <IndoorFloorPlant position={[-1.6, 0, -0.6]} scale={1.25} />
    </group>
  );
}

// -----------------------------------------------------------------------------
// 6. CENTER CIRCULAR RUG WITH SUBTLE PINK AMBIENT GLOW
// -----------------------------------------------------------------------------
function CircularCozyRug() {
  return (
    <group position={[0, 0, 0.1]}>
      {/* Subtle Pink Ambient Glow Ring around outer rim */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
        <torusGeometry args={[2.02, 0.022, 16, 64]} />
        <meshStandardMaterial
          color={PALETTE.lyraPink}
          emissive={PALETTE.lyraPink}
          emissiveIntensity={2.4}
          toneMapped={false}
        />
      </mesh>

      {/* Soft Plush Cream / Mauve Circular Rug */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0]} receiveShadow>
        <circleGeometry args={[2.0, 48]} />
        <meshStandardMaterial
          color="#D4C0B6"
          roughness={0.92}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Inner subtle tonal border ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.007, 0]} receiveShadow>
        <ringGeometry args={[1.75, 1.82, 48]} />
        <meshStandardMaterial color="#C5AEA3" roughness={0.95} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

// -----------------------------------------------------------------------------
// 7. CENTER-LEFT BACK WALL: ART, SCONCE & FLOATING SHELF
// -----------------------------------------------------------------------------
function CenterWallArtAndDecor() {
  return (
    <group position={[-1.4, 0, -4.85]}>
      {/* 2 Framed Minimalist Art Pieces (matching reference image) */}
      <group position={[0, 2.3, 0]}>
        {/* Left Frame: Dark Frame, Warm White Canvas, Pink Sun Graphic */}
        <group position={[-0.55, 0, 0]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.62, 0.82, 0.03]} />
            <meshStandardMaterial color={PALETTE.darkWalnut} roughness={0.4} />
          </mesh>
          <mesh position={[0, 0, 0.018]}>
            <planeGeometry args={[0.52, 0.72]} />
            <meshBasicMaterial color="#FFF5F7" />
          </mesh>
          <mesh position={[0, 0.04, 0.02]}>
            <circleGeometry args={[0.18, 32]} />
            <meshBasicMaterial color="#F48CC2" />
          </mesh>
        </group>

        {/* Right Frame: Dark Frame, Warm White Canvas, Purple Sun Graphic */}
        <group position={[0.55, 0, 0]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.62, 0.82, 0.03]} />
            <meshStandardMaterial color={PALETTE.darkWalnut} roughness={0.4} />
          </mesh>
          <mesh position={[0, 0, 0.018]}>
            <planeGeometry args={[0.52, 0.72]} />
            <meshBasicMaterial color="#F9F5FF" />
          </mesh>
          <mesh position={[0, 0.04, 0.02]}>
            <circleGeometry args={[0.18, 32]} />
            <meshBasicMaterial color="#A470DB" />
          </mesh>
        </group>
      </group>

      {/* Modern Wall Sconce Light Fixture above the paintings */}
      <group position={[0, 3.25, 0]}>
        {/* Brass bar fixture */}
        <mesh position={[0, 0, 0.08]} castShadow>
          <boxGeometry args={[0.42, 0.03, 0.06]} />
          <meshStandardMaterial color="#D4AF37" metalness={0.7} roughness={0.3} />
        </mesh>
        {/* Downlight cove */}
        <mesh position={[0, -0.015, 0.08]}>
          <boxGeometry args={[0.38, 0.01, 0.04]} />
          <meshStandardMaterial
            color="#FFE6C7"
            emissive="#FFE6C7"
            emissiveIntensity={2.0}
            toneMapped={false}
          />
        </mesh>
        <pointLight color="#FFE2C4" intensity={0.4} distance={2.8} position={[0, -0.1, 0.15]} />
      </group>

      {/* Floating Horizontal Wall Ledge / Shelf below the art */}
      <group position={[0, 1.45, 0.1]}>
        {/* Wooden Shelf Body */}
        <mesh castShadow receiveShadow>
          <boxGeometry args={[2.1, 0.05, 0.28]} />
          <meshStandardMaterial color={PALETTE.darkWalnut} roughness={0.4} />
        </mesh>
        {/* Warm Under-Shelf LED Strip */}
        <mesh position={[0, -0.026, 0.1]}>
          <boxGeometry args={[2.05, 0.015, 0.02]} />
          <meshStandardMaterial
            color={PALETTE.goldenLed}
            emissive={PALETTE.goldenLed}
            emissiveIntensity={2.0}
            toneMapped={false}
          />
        </mesh>
        <pointLight color={PALETTE.goldenLed} intensity={0.35} distance={2.0} position={[0, -0.08, 0.15]} />

        {/* Shelf Decor: Potted Plant, White Bunny Figurine, Book Stack */}
        <StylizedShelfPlant position={[-0.7, 0.025, 0]} scale={0.8} />
        <BunnyFigure position={[0, 0.025, 0]} rotation={[0, 0.2, 0]} scale={0.9} />
        <BookStack position={[0.65, 0.025, 0]} rotation={[0, -0.15, 0]} />
      </group>
    </group>
  );
}

// -----------------------------------------------------------------------------
// 8. RIGHT BACKGROUND: RECESSED ARCH SHELVING UNIT
// -----------------------------------------------------------------------------
function RecessedArchShelving() {
  return (
    <group position={[1.85, 1.8, -4.85]}>
      {/* Recessed Niche Backing with Arched Top Right Corner */}
      <mesh position={[0, 0.25, -0.08]} receiveShadow>
        <boxGeometry args={[2.1, 3.4, 0.12]} />
        <meshStandardMaterial color="#382432" roughness={0.7} />
      </mesh>
      {/* Top Arch Extension */}
      <mesh position={[0, 1.95, -0.08]} receiveShadow>
        <cylinderGeometry
          args={[1.05, 1.05, 0.12, 32, 1, false, 0, Math.PI]}
          rotation={[0, 0, Math.PI / 2]}
        />
        <meshStandardMaterial color="#382432" roughness={0.7} />
      </mesh>

      {/* Recessed Cove Neon LED Outline along the Arch Edge */}
      <group position={[0, 0, 0.02]}>
        {/* Left vertical LED */}
        <mesh position={[-1.02, 0.25, 0]}>
          <boxGeometry args={[0.025, 3.4, 0.025]} />
          <meshStandardMaterial
            color={PALETTE.goldenLed}
            emissive={PALETTE.goldenLed}
            emissiveIntensity={2.2}
            toneMapped={false}
          />
        </mesh>
        {/* Right vertical LED */}
        <mesh position={[1.02, 0.25, 0]}>
          <boxGeometry args={[0.025, 3.4, 0.025]} />
          <meshStandardMaterial
            color={PALETTE.goldenLed}
            emissive={PALETTE.goldenLed}
            emissiveIntensity={2.2}
            toneMapped={false}
          />
        </mesh>
        {/* Arch curved LED */}
        <mesh position={[0, 1.95, 0]} rotation={[0, 0, 0]}>
          <torusGeometry args={[1.02, 0.015, 8, 32, Math.PI]} />
          <meshStandardMaterial
            color={PALETTE.goldenLed}
            emissive={PALETTE.goldenLed}
            emissiveIntensity={2.2}
            toneMapped={false}
          />
        </mesh>
      </group>

      {/* 4 Wooden Shelves with Warm Indirect LED Strips */}
      {[-0.85, -0.05, 0.75, 1.55].map((y, i) => (
        <group position={[0, y, 0.06]} key={i}>
          {/* Walnut Wooden Shelf */}
          <mesh castShadow receiveShadow>
            <boxGeometry args={[2.05, 0.06, 0.32]} />
            <meshStandardMaterial color={PALETTE.darkWalnut} roughness={0.4} />
          </mesh>
          {/* Warm LED Strip underneath */}
          <mesh position={[0, -0.032, 0.14]}>
            <boxGeometry args={[1.98, 0.018, 0.02]} />
            <meshStandardMaterial
              color={PALETTE.goldenLed}
              emissive={PALETTE.goldenLed}
              emissiveIntensity={2.4}
              toneMapped={false}
            />
          </mesh>
          <pointLight
            color={PALETTE.goldenLed}
            intensity={0.45}
            distance={2.2}
            position={[0, -0.12, 0.15]}
          />
        </group>
      ))}

      {/* --- Shelf Decor Items (as seen in reference image) --- */}
      {/* Top Shelf (y = 1.55) */}
      <HangingIvyPlant position={[-0.55, 2.55, 0.1]} />
      <BunnyFigure position={[0.45, 1.58, 0.1]} rotation={[0, -0.35, 0]} scale={0.75} />
      <BunnyFigure position={[0.72, 1.58, 0.08]} rotation={[0, 0.25, 0]} scale={0.6} />

      {/* 2nd Shelf (y = 0.75) */}
      <GlowingMoodOrb position={[0.35, 0.78, 0.1]} />
      <BunnyFigure position={[0.75, 0.78, 0.08]} rotation={[0, -0.2, 0]} scale={0.9} />
      <BookStack position={[-0.55, 0.78, 0.1]} rotation={[0, 0.1, 0]} />

      {/* 3rd Shelf (y = -0.05) */}
      <FramedPhoto position={[0.35, 0.15, 0.08]} rotation={[0, -0.15, 0]} />
      <ReedDiffuser position={[0.65, 0.05, 0.08]} />
      <StylizedShelfPlant position={[-0.65, -0.02, 0.1]} scale={0.75} />

      {/* 4th / Bottom Shelf & Base Cabinet (y = -0.85) */}
      <DecorativeBox position={[0.35, -0.72, 0.1]} />
      <BookStack position={[-0.55, -0.82, 0.1]} rotation={[0, -0.05, 0]} />
    </group>
  );
}

// -----------------------------------------------------------------------------
// 9. RIGHT SIDE: MODERN CREDENZA, MUSHROOM LAMP, NEON BUNNY SIGN
// -----------------------------------------------------------------------------
function RightCredenzaAndNeon() {
  return (
    <group position={[3.85, 0, -4.6]}>
      {/* Modern Low-Profile Cabinet / Credenza */}
      <group position={[0, 0.45, 0]}>
        {/* Cabinet Body */}
        <mesh castShadow receiveShadow>
          <boxGeometry args={[1.7, 0.55, 0.52]} />
          <meshStandardMaterial color={PALETTE.mutedMauve} roughness={0.5} />
        </mesh>
        {/* Dark Walnut Top Plank */}
        <mesh position={[0, 0.29, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.76, 0.04, 0.56]} />
          <meshStandardMaterial color={PALETTE.darkWalnut} roughness={0.38} />
        </mesh>
        {/* Warm Underglow */}
        <mesh position={[0, -0.28, 0]}>
          <boxGeometry args={[1.6, 0.015, 0.4]} />
          <meshStandardMaterial
            color={PALETTE.goldenLed}
            emissive={PALETTE.goldenLed}
            emissiveIntensity={1.8}
            toneMapped={false}
          />
        </mesh>
        {/* 4 Slim Angled Tapered Legs */}
        {[
          [-0.7, -0.38, 0.18],
          [0.7, -0.38, 0.18],
          [-0.7, -0.38, -0.18],
          [0.7, -0.38, -0.18],
        ].map(([lx, ly, lz], i) => (
          <mesh key={i} position={[lx, ly, lz]} castShadow>
            <cylinderGeometry args={[0.018, 0.012, 0.22, 12]} />
            <meshStandardMaterial color="#221414" roughness={0.3} />
          </mesh>
        ))}

        {/* On-Cabinet Decor */}
        {/* Warm Mushroom Lamp */}
        <MushroomLamp position={[-0.45, 0.31, 0.02]} />
        {/* Potted Indoor Plant */}
        <IndoorFloorPlant position={[0.42, 0.31, 0.02]} scale={0.7} />
        {/* Perfume / Glass Bottles */}
        <group position={[0.05, 0.31, 0.05]}>
          <mesh position={[-0.08, 0.06, 0]} castShadow>
            <cylinderGeometry args={[0.025, 0.025, 0.12, 16]} />
            <meshStandardMaterial color="#F4C6D7" roughness={0.1} transparent opacity={0.85} />
          </mesh>
          <mesh position={[0.04, 0.05, 0]} castShadow>
            <boxGeometry args={[0.05, 0.1, 0.05]} />
            <meshStandardMaterial color="#E8A9C1" roughness={0.15} transparent opacity={0.8} />
          </mesh>
        </group>
      </group>

      {/* Minimal Glowing Bunny Outline Neon Sign on Right Wall */}
      <NeonBunnySign position={[0.15, 2.25, -0.22]} />

      {/* Wall Polaroids / Memories pinned on dark plum wall */}
      <group position={[-0.45, 1.25, -0.24]}>
        <mesh position={[0, 0, 0]} rotation={[0, 0, 0.08]}>
          <boxGeometry args={[0.22, 0.28, 0.015]} />
          <meshStandardMaterial color="#FFF8F2" roughness={0.4} />
        </mesh>
        <mesh position={[0.4, -0.1, 0]} rotation={[0, 0, -0.06]}>
          <boxGeometry args={[0.22, 0.28, 0.015]} />
          <meshStandardMaterial color="#FFF8F2" roughness={0.4} />
        </mesh>
        <mesh position={[-0.05, -0.32, 0]} rotation={[0, 0, 0.04]}>
          <boxGeometry args={[0.22, 0.28, 0.015]} />
          <meshStandardMaterial color="#FFF8F2" roughness={0.4} />
        </mesh>
      </group>
    </group>
  );
}

// -----------------------------------------------------------------------------
// HELPER COMPONENTS & PROPS
// -----------------------------------------------------------------------------

// Glowing Mushroom Table Lamp
function MushroomLamp({ position }: { position: [number, number, number] }) {
  const lampLightRef = useRef<THREE.PointLight>(null);

  useFrame(({ clock }) => {
    if (lampLightRef.current) {
      const t = clock.getElapsedTime();
      lampLightRef.current.intensity = 0.65 + Math.sin(t * 1.5) * 0.05;
    }
  });

  return (
    <group position={position}>
      {/* Ceramic Base */}
      <mesh position={[0, 0.08, 0]} castShadow>
        <cylinderGeometry args={[0.065, 0.085, 0.16, 24]} />
        <meshStandardMaterial color="#FFF4EB" roughness={0.3} />
      </mesh>
      {/* Mushroom Dome Shade */}
      <mesh position={[0, 0.19, 0]} castShadow receiveShadow>
        <sphereGeometry args={[0.16, 28, 20, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
        <meshStandardMaterial
          color="#FFF6EE"
          emissive="#FFD8B3"
          emissiveIntensity={1.2}
          toneMapped={false}
          roughness={0.2}
        />
      </mesh>
      {/* Warm Point Light */}
      <pointLight
        ref={lampLightRef}
        color="#FFD1A4"
        intensity={0.65}
        distance={3.2}
        decay={2}
        castShadow
        shadow-bias={-0.0001}
      />
    </group>
  );
}

// Glowing Bunny-Outline Neon Sign
function NeonBunnySign({ position }: { position: [number, number, number] }) {
  return (
    <group position={position} scale={1.25}>
      {/* Head Ring */}
      <mesh position={[0, 0, 0]}>
        <torusGeometry args={[0.24, 0.018, 16, 32]} />
        <meshStandardMaterial
          color={PALETTE.lyraPink}
          emissive={PALETTE.neonPink}
          emissiveIntensity={3.2}
          toneMapped={false}
        />
      </mesh>
      {/* Left Ear */}
      <mesh position={[-0.11, 0.34, 0]} rotation={[0, 0, -0.15]}>
        <capsuleGeometry args={[0.018, 0.24, 8, 16]} />
        <meshStandardMaterial
          color={PALETTE.lyraPink}
          emissive={PALETTE.neonPink}
          emissiveIntensity={3.2}
          toneMapped={false}
        />
      </mesh>
      {/* Right Ear */}
      <mesh position={[0.11, 0.34, 0]} rotation={[0, 0, 0.15]}>
        <capsuleGeometry args={[0.018, 0.24, 8, 16]} />
        <meshStandardMaterial
          color={PALETTE.lyraPink}
          emissive={PALETTE.neonPink}
          emissiveIntensity={3.2}
          toneMapped={false}
        />
      </mesh>
      {/* Left Eye */}
      <mesh position={[-0.07, 0.04, 0.015]} rotation={[Math.PI / 2, 0, 0]}>
        <capsuleGeometry args={[0.014, 0.05, 8, 8]} />
        <meshStandardMaterial
          color={PALETTE.lyraPink}
          emissive={PALETTE.neonPink}
          emissiveIntensity={3.2}
          toneMapped={false}
        />
      </mesh>
      {/* Right Eye */}
      <mesh position={[0.07, 0.04, 0.015]} rotation={[Math.PI / 2, 0, 0]}>
        <capsuleGeometry args={[0.014, 0.05, 8, 8]} />
        <meshStandardMaterial
          color={PALETTE.lyraPink}
          emissive={PALETTE.neonPink}
          emissiveIntensity={3.2}
          toneMapped={false}
        />
      </mesh>
      {/* Mouth */}
      <mesh position={[0, -0.05, 0.015]}>
        <torusGeometry args={[0.045, 0.014, 8, 16, Math.PI]} rotation={[0, 0, Math.PI]} />
        <meshStandardMaterial
          color={PALETTE.lyraPink}
          emissive={PALETTE.neonPink}
          emissiveIntensity={3.2}
          toneMapped={false}
        />
      </mesh>
      {/* Soft Pink Accent Point Light */}
      <pointLight color={PALETTE.lyraPink} intensity={0.45} distance={2.5} position={[0, 0.1, 0.2]} />
    </group>
  );
}

// Glowing Pink Mood Orb on Shelf
function GlowingMoodOrb({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Translucent Sphere */}
      <mesh position={[0, 0.12, 0]} castShadow>
        <sphereGeometry args={[0.12, 32, 32]} />
        <meshStandardMaterial
          color="#FFAECF"
          emissive="#FF8ABF"
          emissiveIntensity={2.0}
          toneMapped={false}
          roughness={0.1}
        />
      </mesh>
      {/* Ceramic Base */}
      <mesh position={[0, 0.015, 0]}>
        <cylinderGeometry args={[0.055, 0.075, 0.03, 16]} />
        <meshStandardMaterial color="#FFF9F5" roughness={0.4} />
      </mesh>
      <pointLight color="#FF9FC8" intensity={0.5} distance={1.8} position={[0, 0.14, 0.1]} />
    </group>
  );
}

// White Porcelain Bunny Figurine
function BunnyFigure({ position, rotation = [0, 0, 0], scale = 1 }: { position: [number, number, number]; rotation?: [number, number, number]; scale?: number }) {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* Body */}
      <mesh position={[0, 0.09, 0]} castShadow>
        <sphereGeometry args={[0.095, 16, 16]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.65} />
      </mesh>
      {/* Head */}
      <mesh position={[0, 0.2, 0.01]} castShadow>
        <sphereGeometry args={[0.075, 16, 16]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.65} />
      </mesh>
      {/* Left Ear */}
      <mesh position={[-0.03, 0.29, 0]} rotation={[0, 0, -0.1]} castShadow>
        <capsuleGeometry args={[0.018, 0.09, 8, 8]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.65} />
      </mesh>
      {/* Right Ear */}
      <mesh position={[0.03, 0.29, 0]} rotation={[0, 0, 0.1]} castShadow>
        <capsuleGeometry args={[0.018, 0.09, 8, 8]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.65} />
      </mesh>
    </group>
  );
}

// Decorative Pastel Book Stack
function BookStack({ position, rotation = [0, 0, 0] }: { position: [number, number, number]; rotation?: [number, number, number] }) {
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 0.02, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.18, 0.035, 0.26]} />
        <meshStandardMaterial color="#E8A0B8" roughness={0.4} />
      </mesh>
      <mesh position={[0.01, 0.055, 0.01]} rotation={[0, 0.08, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.17, 0.032, 0.24]} />
        <meshStandardMaterial color="#B08FD8" roughness={0.4} />
      </mesh>
      <mesh position={[-0.01, 0.085, -0.01]} rotation={[0, -0.06, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.15, 0.028, 0.22]} />
        <meshStandardMaterial color="#94C5B3" roughness={0.4} />
      </mesh>
    </group>
  );
}

// Framed Photo on Shelf
function FramedPhoto({ position, rotation = [0, 0, 0] }: { position: [number, number, number]; rotation?: [number, number, number] }) {
  return (
    <group position={position} rotation={rotation}>
      <mesh castShadow>
        <boxGeometry args={[0.18, 0.24, 0.02]} />
        <meshStandardMaterial color={PALETTE.darkWalnut} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0, 0.012]}>
        <planeGeometry args={[0.14, 0.2]} />
        <meshBasicMaterial color="#FFE8EE" />
      </mesh>
    </group>
  );
}

// Reed Aroma Diffuser on Shelf
function ReedDiffuser({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Glass Jar */}
      <mesh position={[0, 0.05, 0]} castShadow>
        <cylinderGeometry args={[0.035, 0.035, 0.1, 16]} />
        <meshStandardMaterial color="#E8D1D9" roughness={0.1} transparent opacity={0.85} />
      </mesh>
      {/* Reeds */}
      {[0.1, -0.15, 0.05].map((rotZ, idx) => (
        <mesh key={idx} position={[rotZ * 0.1, 0.15, 0]} rotation={[0, 0, rotZ]} castShadow>
          <cylinderGeometry args={[0.003, 0.003, 0.16, 6]} />
          <meshStandardMaterial color="#8A6B53" roughness={0.7} />
        </mesh>
      ))}
    </group>
  );
}

// Decorative Pastel Jewelry Box
function DecorativeBox({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.22, 0.1, 0.15]} />
        <meshStandardMaterial color="#EFAAC6" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.055, 0]} castShadow>
        <boxGeometry args={[0.23, 0.02, 0.16]} />
        <meshStandardMaterial color="#E69AB8" roughness={0.4} />
      </mesh>
    </group>
  );
}

// Hanging Trailing Ivy / Pothos Plant
function HangingIvyPlant({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* White Ceramic Hanging Pot */}
      <mesh position={[0, 0, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.08, 0.16, 20]} />
        <meshStandardMaterial color="#FFF6EE" roughness={0.35} />
      </mesh>
      {/* Soil */}
      <mesh position={[0, 0.07, 0]}>
        <cylinderGeometry args={[0.11, 0.11, 0.02, 16]} />
        <meshStandardMaterial color="#3D2924" roughness={0.9} />
      </mesh>
      {/* Cascading Vine Leaves */}
      {[
        { x: 0.06, y: -0.22, z: 0.08, l: 0.45 },
        { x: -0.07, y: -0.32, z: 0.05, l: 0.65 },
        { x: 0.04, y: -0.42, z: -0.06, l: 0.8 },
        { x: -0.05, y: -0.25, z: -0.08, l: 0.5 },
      ].map((v, i) => (
        <group key={i} position={[v.x, 0, v.z]}>
          <mesh position={[0, -v.l / 2, 0]}>
            <cylinderGeometry args={[0.008, 0.008, v.l, 6]} />
            <meshStandardMaterial color={PALETTE.leafGreenDark} />
          </mesh>
          {[0.2, 0.4, 0.6, 0.8].map((prog, lIdx) => (
            <mesh
              key={lIdx}
              position={[Math.sin(lIdx * 2) * 0.03, -v.l * prog, 0]}
              rotation={[0.3, 0.2 * lIdx, 0]}
              castShadow
            >
              <sphereGeometry args={[0.04, 8, 8]} scale={[1, 1.4, 0.3]} />
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

// Small Shelf Potted Plant
function StylizedShelfPlant({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.08, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.08, 0.06, 0.15, 16]} />
        <meshStandardMaterial color="#FFF9F5" roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.15, 0]}>
        <cylinderGeometry args={[0.075, 0.075, 0.02, 16]} />
        <meshStandardMaterial color="#423028" roughness={0.9} />
      </mesh>
      {[
        { rot: [0.35, 0.2, 0.1], pos: [0.02, 0.22, 0.02] },
        { rot: [0.4, 1.8, 0.15], pos: [-0.02, 0.24, 0.03] },
        { rot: [0.3, -1.5, 0.2], pos: [0.04, 0.25, -0.02] },
      ].map((leaf, idx) => (
        <group key={idx} position={leaf.pos as [number, number, number]} rotation={leaf.rot as [number, number, number]}>
          <mesh position={[0, 0.08, 0]} rotation={[0.4, 0, 0]} castShadow>
            <sphereGeometry args={[0.055, 10, 10]} scale={[1, 1.3, 0.3]} />
            <meshStandardMaterial color={PALETTE.leafGreen} roughness={0.45} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// Large Floor Potted Plant
function IndoorFloorPlant({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      {/* Ribbed Ceramic Pot */}
      <mesh position={[0, 0.22, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.22, 0.17, 0.44, 24]} />
        <meshStandardMaterial color="#FFF5ED" roughness={0.3} />
      </mesh>
      {/* Soil */}
      <mesh position={[0, 0.43, 0]}>
        <cylinderGeometry args={[0.21, 0.21, 0.02, 20]} />
        <meshStandardMaterial color="#382520" roughness={0.9} />
      </mesh>
      {/* Tall Anime Monstera Leaves */}
      {[
        { rot: [0.3, 0.4, 0.1], pos: [0.04, 0.55, 0.03], s: 1.2 },
        { rot: [0.38, 1.9, 0.18], pos: [-0.05, 0.62, 0.06], s: 1.1 },
        { rot: [0.28, -1.3, 0.2], pos: [0.07, 0.68, -0.05], s: 1.3 },
        { rot: [0.22, 3.1, 0.12], pos: [-0.06, 0.58, -0.06], s: 1.0 },
        { rot: [0.15, 0.8, -0.05], pos: [0, 0.78, 0], s: 1.4 },
      ].map((l, idx) => (
        <group key={idx} position={l.pos as [number, number, number]} rotation={l.rot as [number, number, number]} scale={l.s}>
          {/* Stem */}
          <mesh position={[0, 0.12, 0]} castShadow>
            <cylinderGeometry args={[0.014, 0.014, 0.28, 8]} />
            <meshStandardMaterial color={PALETTE.leafGreenDark} roughness={0.6} />
          </mesh>
          {/* Leaf Blade */}
          <mesh position={[0, 0.28, 0]} rotation={[0.45, 0, 0]} castShadow receiveShadow>
            <sphereGeometry args={[0.14, 14, 14]} scale={[1, 1.6, 0.22]} />
            <meshStandardMaterial
              color={idx % 2 === 0 ? PALETTE.leafGreen : PALETTE.leafGreenLight}
              roughness={0.45}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// -----------------------------------------------------------------------------
// 10. MAIN ROOM ENVIRONMENT SCENE GRAPH
// -----------------------------------------------------------------------------
export function RoomEnvironment() {
  return (
    <group>
      {/* --- 1. LIGHTING RIG --- */}
      {/* Soft Purple Ambient Base */}
      <ambientLight color={PALETTE.darkPurple} intensity={0.65} />

      {/* Warm Evening Sunset Directional Key Light from the Window (Left) */}
      <directionalLight
        color="#FFD6B8"
        intensity={1.35}
        position={[-7.5, 4.8, 1.2]}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0001}
      />

      {/* Dedicated Avatar Front-Left Warm Key Light (Ensures Lyra is bright and readable) */}
      <directionalLight
        color="#FFF4EB"
        intensity={1.2}
        position={[-1.6, 2.6, 3.2]}
      />

      {/* Dedicated Avatar Right-Side Soft Pink Fill Light */}
      <directionalLight
        color="#FCAED3"
        intensity={0.55}
        position={[3.2, 2.4, 2.8]}
      />

      {/* Dedicated Avatar Top/Back Rim Light for Hair & Bunny Ears */}
      <directionalLight
        color="#FFCFEA"
        intensity={0.7}
        position={[0.5, 4.2, -2.5]}
      />

      {/* Room Center Fill Point Light */}
      <pointLight
        color="#FFE5CC"
        intensity={0.45}
        position={[0, 4.8, -0.5]}
        distance={14}
      />

      {/* --- 2. ATMOSPHERIC PARTICLES & LIGHT BEAMS --- */}
      <DriftingSakuraPetals />
      <FloatingDustParticles />
      <SunbeamShafts />

      {/* --- 3. FLOORING (POLISHED DARK WALNUT WOOD) --- */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial
          color="#2C1B20"
          roughness={0.32}
          metalness={0.08}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* --- 4. COZY CIRCULAR RUG (CENTER) --- */}
      <CircularCozyRug />

      {/* --- 5. CEILING & WALL ARCHITECTURE --- */}
      {/* Ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 7.5, 0]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color="#2B1A26" roughness={0.9} side={THREE.DoubleSide} />
      </mesh>

      {/* Center & Right Back Wall (Muted Mauve Textured Plaster) */}
      <mesh position={[0, 7.5, -4.95]} receiveShadow>
        <planeGeometry args={[60, 15]} />
        <meshStandardMaterial
          color={PALETTE.mutedMauve}
          roughness={0.88}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Dark Walnut Architectural Baseboard */}
      <mesh position={[0, 0.09, -4.91]} receiveShadow>
        <boxGeometry args={[60, 0.18, 0.06]} />
        <meshStandardMaterial color={PALETTE.darkWalnut} roughness={0.45} />
      </mesh>

      {/* Upper Wall Architectural Cove with Horizontal Warm LED Strip */}
      <group position={[0, 4.35, -4.9]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[60, 0.08, 0.12]} />
          <meshStandardMaterial color={PALETTE.darkWalnut} roughness={0.45} />
        </mesh>
        <mesh position={[0, -0.042, 0.05]}>
          <boxGeometry args={[60, 0.02, 0.02]} />
          <meshStandardMaterial
            color={PALETTE.goldenLed}
            emissive={PALETTE.goldenLed}
            emissiveIntensity={2.4}
            toneMapped={false}
          />
        </mesh>
      </group>

      {/* --- 6. LEFT WALL: PANORAMIC WINDOW & SKYLINE --- */}
      <CitySkylineWindow />

      {/* --- 7. FOREGROUND LEFT: LOUNGE CORNER --- */}
      <ForegroundLoungeCorner />

      {/* --- 8. CENTER-LEFT: WALL ART, SCONCE & FLOATING LED SHELF --- */}
      <CenterWallArtAndDecor />

      {/* --- 9. RIGHT-CENTER: RECESSED ARCH SHELVING UNIT --- */}
      <RecessedArchShelving />

      {/* --- 10. FAR RIGHT: MODERN CREDENZA & NEON BUNNY SIGN --- */}
      <RightCredenzaAndNeon />
    </group>
  );
}

export default RoomEnvironment;
