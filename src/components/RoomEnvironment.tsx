import React, { useMemo } from 'react';
import * as THREE from 'three';

// -----------------------------------------------------------------------------
// COLOR PALETTE — Modern, Fresh, Aesthetic Scandinavian / Japandi Room
// Warm soft oat plaster walls, light oak wood flooring, creamy bouclé textiles,
// and soft pastel accents (blush pink, lilac, sage green, golden sunlight).
// -----------------------------------------------------------------------------
const PALETTE = {
  // Walls & Architectural plaster - Fresh, bright, warm oat/cream
  wallPlaster: '#EDE5DD',       // Fresh soft oat/cream plaster wall
  wallAccent: '#E2D5CA',        // Gentle warm architectural shadow
  wallRecessed: '#D9CAC0',      // Soft shadow for arches and alcoves
  trimWood: '#BFA895',          // Light natural oak trim
  
  // Flooring - Blonde Scandinavian Oak
  oakFloor: '#C2AC99',          // Modern light oak wood plank
  oakWoodDark: '#8A7260',       // Light walnut/oak accent for cabinet tops
  oakWoodLight: '#D4C3B2',      // Natural beech/oak

  // Textiles & Bouclé Furniture
  warmCream: '#FAF6F0',         // Soft bouclé warm cream sofa/lounge
  porcelainWhite: '#FCF8F5',
  curtainWhite: '#FAF3ED',
  
  // Modern Aesthetic Pastels
  lyraPink: '#F4A2C7',          // Soft pastel pink
  blushPink: '#E8B4C8',         // Dusty rose
  pastelLilac: '#D0B6E6',       // Lavender/lilac accent
  softTerracotta: '#DE9B87',     // Warm terracotta
  sageGreen: '#A3B899',         // Muted eucalyptus/sage green

  // Lighting
  sunlightKey: '#FFF2E3',       // Golden hour natural window sunlight
  warmLedGlow: '#FFE8D1',       // Cozy warm LED backlight
  lampGlow: '#FFE0C2',          // Warm ambient lamp glow
  coolFill: '#C4D4E8',          // Soft sky fill

  // Plants
  leafGreen: '#5B8C66',
  leafGreenLight: '#7BA385',
  leafGreenDark: '#41634A',
};

// -----------------------------------------------------------------------------
// 1. FLOOR-TO-CEILING WINDOW & EVENING SKYLINE (LEFT WALL)
// -----------------------------------------------------------------------------
function PanoramicBalconyWindow() {
  const sunsetTexture = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Dreamy sunset sky gradient
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#4B436D');   // Soft twilight indigo top
    grad.addColorStop(0.3, '#8C658A');  // Dreamy lavender middle
    grad.addColorStop(0.55, '#DA829B'); // Blush pink horizon
    grad.addColorStop(0.8, '#FFA688');  // Golden apricot
    grad.addColorStop(1.0, '#FFD1AA');  // Warm peach sky
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    // Sun glow
    const sunGrad = ctx.createRadialGradient(180, 420, 8, 180, 420, 240);
    sunGrad.addColorStop(0, 'rgba(255, 245, 220, 0.9)');
    sunGrad.addColorStop(0.35, 'rgba(255, 185, 145, 0.45)');
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
      {/* Sky Canvas */}
      <mesh position={[-0.5, 2.3, -0.25]}>
        <planeGeometry args={[5.2, 5.0]} />
        {sunsetTexture ? (
          <meshBasicMaterial map={sunsetTexture} side={THREE.DoubleSide} />
        ) : (
          <meshBasicMaterial color="#DA829B" side={THREE.DoubleSide} />
        )}
      </mesh>

      {/* Skyline silhouettes */}
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
              <meshBasicMaterial color="#36293A" />
            </mesh>
            {[...Array(3)].map((_, wIdx) => (
              <mesh key={wIdx} position={[(wIdx % 2 === 0 ? 0.05 : -0.05), (wIdx - 1) * 0.45, 0.001]}>
                <planeGeometry args={[0.035, 0.07]} />
                <meshBasicMaterial color="#FFE4A0" opacity={0.65} transparent />
              </mesh>
            ))}
          </group>
        ))}
      </group>

      {/* Light Oak Window Frame */}
      <group position={[-0.5, 2.3, 0]}>
        <mesh position={[0, 2.35, 0.04]} receiveShadow>
          <boxGeometry args={[4.4, 0.1, 0.12]} />
          <meshStandardMaterial color={PALETTE.oakWoodDark} roughness={0.5} />
        </mesh>
        <mesh position={[0, -2.35, 0.06]} receiveShadow>
          <boxGeometry args={[4.4, 0.12, 0.18]} />
          <meshStandardMaterial color={PALETTE.oakWoodDark} roughness={0.45} />
        </mesh>
        <mesh position={[-2.2, 0, 0.04]} receiveShadow>
          <boxGeometry args={[0.1, 4.7, 0.12]} />
          <meshStandardMaterial color={PALETTE.oakWoodDark} roughness={0.5} />
        </mesh>
        <mesh position={[2.2, 0, 0.04]} receiveShadow>
          <boxGeometry args={[0.1, 4.7, 0.12]} />
          <meshStandardMaterial color={PALETTE.oakWoodDark} roughness={0.5} />
        </mesh>
        <mesh position={[0, 0, 0.04]}>
          <boxGeometry args={[0.05, 4.7, 0.08]} />
          <meshStandardMaterial color={PALETTE.oakWoodDark} roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.7, 0.04]}>
          <boxGeometry args={[4.4, 0.04, 0.06]} />
          <meshStandardMaterial color={PALETTE.oakWoodDark} roughness={0.5} />
        </mesh>

        {/* Sheer White Curtains */}
        <group position={[-1.9, 0, 0.12]}>
          <mesh receiveShadow>
            <planeGeometry args={[1.0, 4.6]} />
            <meshStandardMaterial
              color="#FAF0F5"
              roughness={0.8}
              transparent
              opacity={0.65}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh position={[0.15, 0, 0.02]}>
            <cylinderGeometry args={[0.06, 0.06, 4.6, 12]} />
            <meshStandardMaterial color="#F5E4EC" roughness={0.8} transparent opacity={0.55} />
          </mesh>
        </group>
        <group position={[1.9, 0, 0.12]}>
          <mesh receiveShadow>
            <planeGeometry args={[1.0, 4.6]} />
            <meshStandardMaterial
              color="#FAF0F5"
              roughness={0.8}
              transparent
              opacity={0.65}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh position={[-0.15, 0, 0.02]}>
            <cylinderGeometry args={[0.06, 0.06, 4.6, 12]} />
            <meshStandardMaterial color="#F5E4EC" roughness={0.8} transparent opacity={0.55} />
          </mesh>
        </group>
      </group>

      {/* Volumetric Sunbeam Light Ray */}
      <mesh position={[0.2, 1.8, 1.2]} rotation={[-Math.PI / 2 + 0.35, 0, 0.2]}>
        <planeGeometry args={[2.8, 6.5]} />
        <meshBasicMaterial
          color="#FFF0DB"
          transparent
          opacity={0.05}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

// -----------------------------------------------------------------------------
// 2. MODERN AESTHETIC WALL ART (Arch & circle canvas prints on back wall)
// -----------------------------------------------------------------------------
function RoundWallArt({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Arch / Circle Canvas 1 */}
      <group position={[-0.55, 0, 0]}>
        <mesh receiveShadow>
          <boxGeometry args={[0.65, 0.85, 0.025]} />
          <meshStandardMaterial color={PALETTE.warmCream} roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.08, 0.015]}>
          <circleGeometry args={[0.22, 32]} />
          <meshStandardMaterial color={PALETTE.lyraPink} roughness={0.4} />
        </mesh>
        <mesh position={[0, -0.18, 0.015]}>
          <planeGeometry args={[0.44, 0.22]} />
          <meshStandardMaterial color={PALETTE.softTerracotta} roughness={0.4} />
        </mesh>
      </group>

      {/* Canvas 2 */}
      <group position={[0.55, -0.06, 0]}>
        <mesh receiveShadow>
          <boxGeometry args={[0.65, 0.85, 0.025]} />
          <meshStandardMaterial color={PALETTE.warmCream} roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.05, 0.015]}>
          <circleGeometry args={[0.24, 32]} />
          <meshStandardMaterial color={PALETTE.pastelLilac} roughness={0.4} />
        </mesh>
        <mesh position={[0, -0.18, 0.015]}>
          <circleGeometry args={[0.15, 32]} />
          <meshStandardMaterial color={PALETTE.sageGreen} roughness={0.4} />
        </mesh>
      </group>
    </group>
  );
}

// -----------------------------------------------------------------------------
// 3. LOW WINDOWSIDE CONSOLE (under wall art)
// -----------------------------------------------------------------------------
function WindowsideConsole({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.28, 0]} receiveShadow>
        <boxGeometry args={[2.0, 0.5, 0.4]} />
        <meshStandardMaterial color={PALETTE.wallAccent} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.535, 0]} receiveShadow>
        <boxGeometry args={[2.05, 0.03, 0.43]} />
        <meshStandardMaterial color={PALETTE.oakWoodDark} roughness={0.4} />
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
      <mesh position={[0, 0.07, 0]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color={PALETTE.warmCream} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.16, 0.01]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial color={PALETTE.warmCream} roughness={0.9} />
      </mesh>
      <mesh position={[-0.025, 0.24, 0]} rotation={[0, 0, -0.15]}>
        <capsuleGeometry args={[0.018, 0.09, 6, 8]} />
        <meshStandardMaterial color={PALETTE.warmCream} roughness={0.9} />
      </mesh>
      <mesh position={[0.025, 0.24, 0]} rotation={[0, 0, 0.15]}>
        <capsuleGeometry args={[0.018, 0.09, 6, 8]} />
        <meshStandardMaterial color={PALETTE.warmCream} roughness={0.9} />
      </mesh>
      <mesh position={[-0.025, 0.26, 0.005]} rotation={[0, 0, -0.15]}>
        <capsuleGeometry args={[0.008, 0.06, 6, 8]} />
        <meshStandardMaterial color={PALETTE.lyraPink} roughness={0.8} />
      </mesh>
      <mesh position={[0.025, 0.26, 0.005]} rotation={[0, 0, 0.15]}>
        <capsuleGeometry args={[0.008, 0.06, 6, 8]} />
        <meshStandardMaterial color={PALETTE.lyraPink} roughness={0.8} />
      </mesh>
    </group>
  );
}

// -----------------------------------------------------------------------------
// 4. GLOWING ROUND ORB LAMP (shelf decor item)
// -----------------------------------------------------------------------------
function RoundGlowOrb({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[0.075, 20, 20]} />
        <meshStandardMaterial
          color="#FFF2E0"
          emissive="#FFD39B"
          emissiveIntensity={0.85}
          roughness={0.25}
        />
      </mesh>
      <pointLight color="#FFD39B" intensity={0.45} distance={1.6} decay={2} />
    </group>
  );
}

// -----------------------------------------------------------------------------
// 5. BOTTOM-LEFT: COZY BOUCLÉ LOUNGE CHAIR, FLOWER CUSHION & SIDE TABLE
// -----------------------------------------------------------------------------
function BottomLeftLoungeCorner() {
  return (
    <group position={[-2.4, 0, 0.65]} rotation={[0, 0.32, 0]}>
      {/* Warm rim light grazing the sofa edge */}
      <pointLight color={PALETTE.sunlightKey} intensity={0.45} distance={2.4} position={[-0.6, 0.9, 0.8]} decay={2} />

      <group position={[0, 0.32, 0]}>
        {/* Main Bouclé Chair Cushion */}
        <mesh receiveShadow scale={[1.25, 0.72, 1.25]}>
          <sphereGeometry args={[0.8, 28, 20]} />
          <meshStandardMaterial color={PALETTE.warmCream} roughness={0.88} />
        </mesh>

        {/* Backrest */}
        <mesh receiveShadow position={[-0.22, 0.3, -0.22]} scale={[1.05, 0.78, 1.05]}>
          <sphereGeometry args={[0.62, 22, 18]} />
          <meshStandardMaterial color="#FAF3EB" roughness={0.88} />
        </mesh>

        {/* Throw Blanket */}
        <group position={[0.38, 0.18, 0.2]} rotation={[0.18, 0.25, -0.38]}>
          <mesh receiveShadow>
            <boxGeometry args={[0.5, 0.04, 0.8]} />
            <meshStandardMaterial color={PALETTE.blushPink} roughness={0.85} />
          </mesh>
          <mesh position={[0.24, -0.12, 0]} rotation={[0, 0, 0.55]}>
            <boxGeometry args={[0.035, 0.3, 0.78]} />
            <meshStandardMaterial color={PALETTE.lyraPink} roughness={0.85} />
          </mesh>
        </group>

        {/* Plush Flower Pillow */}
        <group position={[0.02, 0.44, 0.3]} rotation={[0.42, 0.12, 0.08]}>
          <mesh position={[0, 0, 0.05]}>
            <cylinderGeometry args={[0.1, 0.1, 0.04, 20]} rotation={[Math.PI / 2, 0, 0]} />
            <meshStandardMaterial color={PALETTE.lyraPink} roughness={0.8} />
          </mesh>
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const angle = (i * Math.PI) / 3;
            return (
              <mesh
                key={i}
                position={[Math.cos(angle) * 0.2, Math.sin(angle) * 0.2, 0]}
              >
                <sphereGeometry args={[0.12, 14, 14]} scale={[1, 1, 0.42]} />
                <meshStandardMaterial color={PALETTE.porcelainWhite} roughness={0.85} />
              </mesh>
            );
          })}
        </group>
      </group>

      {/* Light Oak Round Side Table */}
      <group position={[-0.95, 0, 0.25]}>
        <mesh position={[0, 0.42, 0]} receiveShadow>
          <cylinderGeometry args={[0.26, 0.26, 0.03, 24]} />
          <meshStandardMaterial color={PALETTE.oakWoodDark} roughness={0.4} />
        </mesh>
        {[0, 1, 2].map((i) => {
          const a = (i * Math.PI * 2) / 3;
          return (
            <mesh
              key={i}
              position={[Math.sin(a) * 0.15, 0.2, Math.cos(a) * 0.15]}
              rotation={[0.08 * Math.cos(a), 0, -0.08 * Math.sin(a)]}
            >
              <cylinderGeometry args={[0.013, 0.01, 0.42, 10]} />
              <meshStandardMaterial color={PALETTE.oakWoodLight} roughness={0.4} />
            </mesh>
          );
        })}
        {/* Book + Mug */}
        <mesh position={[0.04, 0.445, -0.02]}>
          <boxGeometry args={[0.14, 0.02, 0.18]} />
          <meshStandardMaterial color={PALETTE.pastelLilac} roughness={0.5} />
        </mesh>
        <mesh position={[-0.06, 0.47, 0.04]}>
          <cylinderGeometry args={[0.035, 0.03, 0.07, 16]} />
          <meshStandardMaterial color={PALETTE.warmCream} roughness={0.3} />
        </mesh>
      </group>

      <PottedFloorPlant position={[-1.35, 0, -0.55]} scale={1.1} />
    </group>
  );
}

// -----------------------------------------------------------------------------
// 6. CENTER CIRCULAR AESTHETIC RUG (UNDERNEATH LYRA)
// -----------------------------------------------------------------------------
function CenterPlushRug() {
  return (
    <group position={[0, 0, 0.08]}>
      {/* Base warm ivory rug */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0]} receiveShadow>
        <circleGeometry args={[1.82, 48]} />
        <meshStandardMaterial
          color="#FAF5EF"
          roughness={0.9}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Inner subtle weave ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.007, 0]} receiveShadow>
        <ringGeometry args={[1.58, 1.64, 48]} />
        <meshStandardMaterial color="#EAE0D7" roughness={0.92} side={THREE.DoubleSide} />
      </mesh>
      {/* Accent blush pink outer trim */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.008, 0]}>
        <ringGeometry args={[1.78, 1.82, 48]} />
        <meshStandardMaterial
          color={PALETTE.lyraPink}
          emissive={PALETTE.lyraPink}
          emissiveIntensity={0.35}
          roughness={0.6}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

// -----------------------------------------------------------------------------
// 7. BACKGROUND: BUILT-IN RECESSED ARCH SHELVING UNIT
// -----------------------------------------------------------------------------
function BuiltInRecessedShelving() {
  return (
    <group position={[1.4, 1.65, -3.8]}>
      {/* Recessed Backing Panel */}
      <mesh position={[0, 0.1, -0.15]} receiveShadow>
        <planeGeometry args={[2.2, 3.2]} />
        <meshStandardMaterial color={PALETTE.wallRecessed} roughness={0.8} />
      </mesh>

      {/* Recessed Sides */}
      <mesh position={[-1.1, 0.1, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[0.3, 3.2]} />
        <meshStandardMaterial color={PALETTE.wallRecessed} roughness={0.8} />
      </mesh>
      <mesh position={[1.1, 0.1, 0]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[0.3, 3.2]} />
        <meshStandardMaterial color={PALETTE.wallRecessed} roughness={0.8} />
      </mesh>
      <mesh position={[0, 1.7, 0]} rotation={[Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[2.2, 0.3]} />
        <meshStandardMaterial color={PALETTE.wallRecessed} roughness={0.8} />
      </mesh>

      {/* Arch Crown */}
      <mesh position={[0, 1.85, -0.15]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <cylinderGeometry args={[1.1, 1.1, 2.2, 24, 1, false, 0, Math.PI]} />
        <meshStandardMaterial color={PALETTE.wallRecessed} roughness={0.8} side={THREE.DoubleSide} />
      </mesh>

      {/* Light Oak Shelves + LED Strip Lighting */}
      {[-0.8, -0.05, 0.7, 1.45].map((y, i) => (
        <group position={[0, y, 0]} key={i}>
          <mesh receiveShadow>
            <boxGeometry args={[2.18, 0.05, 0.28]} />
            <meshStandardMaterial color={PALETTE.oakWoodDark} roughness={0.4} />
          </mesh>
          <pointLight
            color={PALETTE.warmLedGlow}
            intensity={0.4}
            distance={2.0}
            decay={2}
            position={[0, -0.08, 0.08]}
          />
          <mesh position={[0, -0.03, 0.135]}>
            <boxGeometry args={[2.1, 0.012, 0.012]} />
            <meshStandardMaterial
              color={PALETTE.warmLedGlow}
              emissive={PALETTE.warmLedGlow}
              emissiveIntensity={1.0}
            />
          </mesh>
        </group>
      ))}

      {/* Shelf Items */}
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
// 8. RIGHT SIDE: LOW-PROFILE CABINET, MUSHROOM LAMP & NEON BUNNY SIGN
// -----------------------------------------------------------------------------
function RightCabinetAndDecor() {
  return (
    <group position={[3.2, 0, -3.5]}>
      <group position={[0, 0.42, 0]}>
        {/* Cabinet Body */}
        <mesh receiveShadow>
          <boxGeometry args={[1.55, 0.52, 0.48]} />
          <meshStandardMaterial color={PALETTE.wallAccent} roughness={0.6} />
        </mesh>
        {/* Top Surface */}
        <mesh position={[0, 0.27, 0]} receiveShadow>
          <boxGeometry args={[1.6, 0.035, 0.52]} />
          <meshStandardMaterial color={PALETTE.oakWoodDark} roughness={0.4} />
        </mesh>
        {/* Legs */}
        {[
          [-0.65, -0.34, 0.16],
          [0.65, -0.34, 0.16],
          [-0.65, -0.34, -0.16],
          [0.65, -0.34, -0.16],
        ].map(([lx, ly, lz], i) => (
          <mesh key={i} position={[lx, ly, lz]}>
            <cylinderGeometry args={[0.016, 0.01, 0.18, 10]} />
            <meshStandardMaterial color={PALETTE.oakWoodLight} roughness={0.4} />
          </mesh>
        ))}

        <CozyMushroomLamp position={[-0.42, 0.29, 0.02]} />
        <SmallPottedSucculent position={[0.42, 0.29, 0.02]} scale={0.9} />
        <PastelBookRow position={[0.02, 0.29, 0.04]} rotation={[0, 0.12, 0]} />
      </group>

      <NeonBunnySign position={[0.15, 1.95, -0.18]} />

      {/* Wall Framed Polaroid Prints */}
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
  return (
    <group position={position}>
      <mesh position={[0, 0.07, 0]}>
        <cylinderGeometry args={[0.055, 0.075, 0.14, 20]} />
        <meshStandardMaterial color={PALETTE.warmCream} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.17, 0]} receiveShadow>
        <sphereGeometry args={[0.14, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
        <meshStandardMaterial
          color={PALETTE.porcelainWhite}
          emissive="#FFE2C6"
          emissiveIntensity={0.65}
          roughness={0.25}
        />
      </mesh>
      <pointLight
        color={PALETTE.lampGlow}
        intensity={0.65}
        distance={2.8}
        decay={2}
      />
    </group>
  );
}

function NeonBunnySign({ position }: { position: [number, number, number] }) {
  return (
    <group position={position} scale={1.5}>
      <mesh position={[0, 0, 0]}>
        <torusGeometry args={[0.18, 0.013, 12, 28]} />
        <meshStandardMaterial color={PALETTE.lyraPink} emissive={PALETTE.lyraPink} emissiveIntensity={1.2} />
      </mesh>
      <mesh position={[-0.08, 0.25, 0]} rotation={[0, 0, -0.12]}>
        <capsuleGeometry args={[0.013, 0.18, 6, 12]} />
        <meshStandardMaterial color={PALETTE.lyraPink} emissive={PALETTE.lyraPink} emissiveIntensity={1.2} />
      </mesh>
      <mesh position={[0.08, 0.25, 0]} rotation={[0, 0, 0.12]}>
        <capsuleGeometry args={[0.013, 0.18, 6, 12]} />
        <meshStandardMaterial color={PALETTE.lyraPink} emissive={PALETTE.lyraPink} emissiveIntensity={1.2} />
      </mesh>
      <mesh position={[-0.06, 0.01, 0.01]}>
        <circleGeometry args={[0.016, 16]} />
        <meshStandardMaterial color={PALETTE.lyraPink} emissive={PALETTE.lyraPink} emissiveIntensity={1.2} />
      </mesh>
      <mesh position={[0.06, 0.01, 0.01]}>
        <circleGeometry args={[0.016, 16]} />
        <meshStandardMaterial color={PALETTE.lyraPink} emissive={PALETTE.lyraPink} emissiveIntensity={1.2} />
      </mesh>
      <mesh position={[0, -0.05, 0.01]}>
        <circleGeometry args={[0.02, 3]} />
        <meshStandardMaterial color={PALETTE.lyraPink} emissive={PALETTE.lyraPink} emissiveIntensity={1.2} />
      </mesh>
      <pointLight color={PALETTE.lyraPink} intensity={0.55} distance={2.5} position={[0, 0.08, 0.15]} />
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
      <mesh position={[0, 0.08, 0]}>
        <sphereGeometry args={[0.085, 14, 14]} />
        <meshStandardMaterial color={PALETTE.porcelainWhite} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.18, 0.01]}>
        <sphereGeometry args={[0.065, 14, 14]} />
        <meshStandardMaterial color={PALETTE.porcelainWhite} roughness={0.35} />
      </mesh>
      <mesh position={[-0.025, 0.26, 0]} rotation={[0, 0, -0.1]}>
        <capsuleGeometry args={[0.015, 0.08, 6, 8]} />
        <meshStandardMaterial color={PALETTE.porcelainWhite} roughness={0.35} />
      </mesh>
      <mesh position={[0.025, 0.26, 0]} rotation={[0, 0, 0.1]}>
        <capsuleGeometry args={[0.015, 0.08, 6, 8]} />
        <meshStandardMaterial color={PALETTE.porcelainWhite} roughness={0.35} />
      </mesh>
    </group>
  );
}

function ScentedCandle({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.04, 0]}>
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
      <mesh position={[0, 0.015, 0]} receiveShadow>
        <boxGeometry args={[0.16, 0.03, 0.22]} />
        <meshStandardMaterial color={PALETTE.blushPink} roughness={0.5} />
      </mesh>
      <mesh position={[0.01, 0.045, 0.01]} rotation={[0, 0.06, 0]} receiveShadow>
        <boxGeometry args={[0.15, 0.028, 0.2]} />
        <meshStandardMaterial color={PALETTE.pastelLilac} roughness={0.5} />
      </mesh>
      <mesh position={[-0.01, 0.07, -0.01]} rotation={[0, -0.05, 0]} receiveShadow>
        <boxGeometry args={[0.14, 0.024, 0.18]} />
        <meshStandardMaterial color={PALETTE.warmCream} roughness={0.5} />
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
      <mesh>
        <boxGeometry args={[0.16, 0.2, 0.018]} />
        <meshStandardMaterial color={PALETTE.oakWoodDark} roughness={0.4} />
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
      <mesh receiveShadow>
        <boxGeometry args={[0.2, 0.09, 0.14]} />
        <meshStandardMaterial color={PALETTE.wallAccent} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.05, 0]}>
        <boxGeometry args={[0.21, 0.015, 0.15]} />
        <meshStandardMaterial color={PALETTE.oakWoodDark} roughness={0.4} />
      </mesh>
    </group>
  );
}

function HangingShelfPothos({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.06, 0]}>
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
      <mesh position={[0, 0.06, 0]} receiveShadow>
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
          <mesh position={[0, 0.06, 0]} rotation={[0.35, 0, 0]}>
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
      <mesh position={[0, 0.18, 0]} receiveShadow>
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
          <mesh position={[0, 0.1, 0]}>
            <cylinderGeometry args={[0.012, 0.012, 0.22, 6]} />
            <meshStandardMaterial color={PALETTE.leafGreenDark} roughness={0.6} />
          </mesh>
          <mesh position={[0, 0.22, 0]} rotation={[0.4, 0, 0]} receiveShadow>
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
// 9. MAIN ROOM ENVIRONMENT SCENE GRAPH
// -----------------------------------------------------------------------------
export function RoomEnvironment() {
  return (
    <group>
      {/* Broad, gentle ambient hemisphere fill light */}
      <hemisphereLight color="#FFF0E6" groundColor="#C2B2A3" intensity={1.2} />

      <ambientLight color="#FAF0E6" intensity={1.1} />

      {/* Main Golden Window Sunlight Key Light */}
      <directionalLight
        color={PALETTE.sunlightKey}
        intensity={2.1}
        position={[-6.0, 4.0, 2.0]}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-bias={-0.0001}
      />

      {/* Soft Sky Fill Light */}
      <directionalLight
        color={PALETTE.coolFill}
        intensity={0.5}
        position={[3.5, 3.0, -1.0]}
      />

      {/* Warm Ambient Backlight / Rim Light */}
      <directionalLight
        color="#FFE5F2"
        intensity={0.7}
        position={[0.0, 3.8, -2.5]}
      />

      <pointLight color="#FFEBD6" intensity={0.45} position={[0, 4.0, -0.5]} distance={12} />

      {/* Blonde Oak Plank Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial
          color={PALETTE.oakFloor}
          roughness={0.45}
          metalness={0.02}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Fresh Warm Plaster Back Wall */}
      <mesh position={[0, 5.0, -3.95]} receiveShadow>
        <planeGeometry args={[50, 12]} />
        <meshStandardMaterial color={PALETTE.wallPlaster} roughness={0.85} side={THREE.DoubleSide} />
      </mesh>

      {/* Warm Ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 5.0, 0]} receiveShadow>
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial color="#E6DDD5" roughness={0.9} side={THREE.DoubleSide} />
      </mesh>

      {/* Light Wood Baseboard */}
      <mesh position={[0, 0.08, -3.92]} receiveShadow>
        <boxGeometry args={[50, 0.16, 0.05]} />
        <meshStandardMaterial color={PALETTE.oakWoodDark} roughness={0.5} />
      </mesh>

      {/* Light Wood Crown Molding */}
      <mesh position={[0, 3.8, -3.92]} receiveShadow>
        <boxGeometry args={[50, 0.06, 0.05]} />
        <meshStandardMaterial color={PALETTE.oakWoodDark} roughness={0.5} />
      </mesh>

      <PanoramicBalconyWindow />

      <BottomLeftLoungeCorner />

      <CenterPlushRug />

      <BuiltInRecessedShelving />

      <RightCabinetAndDecor />

      <RoundWallArt position={[-1.1, 2.55, -3.9]} />
      <WindowsideConsole position={[-1.1, 0, -3.75]} />
    </group>
  );
}

export default RoomEnvironment;
