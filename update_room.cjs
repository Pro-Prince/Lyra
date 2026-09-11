const fs = require('fs');

const fileContent = fs.readFileSync('src/components/RoomEnvironment.tsx', 'utf8');

const splitToken = "// Main Stylized Anime Sanctuary Room Environment - FULLY ENCLOSED EXPANSIVE ARCHITECTURE";
const parts = fileContent.split(splitToken);

if (parts.length < 2) {
    console.error("Could not find split token");
    process.exit(1);
}

const beforeCode = parts[0];

const newCode = `
// Main Stylized Anime Sanctuary Room Environment - FULLY ENCLOSED EXPANSIVE ARCHITECTURE
function BeanbagChair({ position = [-2.8, 0.4, 0] }: { position?: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Main beanbag */}
      <mesh castShadow receiveShadow position={[0, 0, 0]} scale={[1.4, 0.7, 1.4]}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial color="#e5939e" roughness={0.9} />
      </mesh>
      {/* Flower cushion */}
      <group position={[0.8, 0.6, 0.5]} rotation={[0.4, 0.4, 0.2]}>
         <mesh castShadow position={[0, 0, 0.08]}>
           <cylinderGeometry args={[0.15, 0.15, 0.05, 16]} rotation={[Math.PI/2, 0, 0]} />
           <meshStandardMaterial color="#fceabb" roughness={0.9} />
         </mesh>
         {[0,1,2,3,4,5].map(i => (
           <mesh key={i} castShadow position={[Math.cos(i * Math.PI/3)*0.28, Math.sin(i * Math.PI/3)*0.28, 0]}>
             <sphereGeometry args={[0.2, 16, 16]} scale={[1, 1, 0.4]} />
             <meshStandardMaterial color="#ffffff" roughness={0.9} />
           </mesh>
         ))}
      </group>
    </group>
  );
}

function NeonFloorRing() {
  return (
    <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0.015, 0.15]}>
      <torusGeometry args={[2.0, 0.02, 16, 64]} />
      <meshStandardMaterial color="#ff70b3" emissive="#ff70b3" emissiveIntensity={2.5} toneMapped={false} />
    </mesh>
  );
}

function NeonBunnySign({ position, rotation }: any) {
  return (
    <group position={position} rotation={rotation} scale={1.2}>
      <mesh position={[0,0,0]}>
         <torusGeometry args={[0.25, 0.015, 16, 32]} />
         <meshStandardMaterial color="#ff54a3" emissive="#ff54a3" emissiveIntensity={3.0} toneMapped={false} />
      </mesh>
      <mesh position={[-0.12, 0.35, 0]} rotation={[0, 0, -0.15]}>
         <capsuleGeometry args={[0.015, 0.25, 8, 16]} />
         <meshStandardMaterial color="#ff54a3" emissive="#ff54a3" emissiveIntensity={3.0} toneMapped={false} />
      </mesh>
      <mesh position={[0.12, 0.35, 0]} rotation={[0, 0, 0.15]}>
         <capsuleGeometry args={[0.015, 0.25, 8, 16]} />
         <meshStandardMaterial color="#ff54a3" emissive="#ff54a3" emissiveIntensity={3.0} toneMapped={false} />
      </mesh>
      {/* Eyes */}
      <mesh position={[-0.08, 0.05, 0.02]} rotation={[Math.PI/2, 0, 0]}>
         <capsuleGeometry args={[0.015, 0.06, 8, 8]} />
         <meshStandardMaterial color="#ff54a3" emissive="#ff54a3" emissiveIntensity={3.0} toneMapped={false} />
      </mesh>
      <mesh position={[0.08, 0.05, 0.02]} rotation={[Math.PI/2, 0, 0]}>
         <capsuleGeometry args={[0.015, 0.06, 8, 8]} />
         <meshStandardMaterial color="#ff54a3" emissive="#ff54a3" emissiveIntensity={3.0} toneMapped={false} />
      </mesh>
      {/* Mouth */}
      <mesh position={[0, -0.05, 0.02]}>
         <torusGeometry args={[0.05, 0.015, 8, 16, Math.PI]} rotation={[0, 0, Math.PI]} />
         <meshStandardMaterial color="#ff54a3" emissive="#ff54a3" emissiveIntensity={3.0} toneMapped={false} />
      </mesh>
    </group>
  );
}

function GlowingOrb({ position }: any) {
  return (
    <group position={position}>
      <mesh position={[0, 0.12, 0]} castShadow>
        <sphereGeometry args={[0.12, 32, 32]} />
        <meshStandardMaterial color="#ff9fc8" emissive="#ff9fc8" emissiveIntensity={1.5} toneMapped={false} roughness={0.1} />
      </mesh>
      <pointLight color="#ff9fc8" intensity={0.5} distance={1.5} position={[0, 0.12, 0]} />
      {/* Base */}
      <mesh position={[0, 0.01, 0]}>
        <cylinderGeometry args={[0.06, 0.08, 0.02, 16]} />
        <meshStandardMaterial color="#ffffff" roughness={0.4} />
      </mesh>
    </group>
  );
}

function BunnyFigure({ position, rotation, scale = 1 }: any) {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh position={[0, 0.1, 0]} castShadow>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial color="#ffffff" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.22, 0]} castShadow>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color="#ffffff" roughness={0.8} />
      </mesh>
      <mesh position={[-0.03, 0.32, 0]} rotation={[0, 0, -0.1]} castShadow>
        <capsuleGeometry args={[0.02, 0.1, 8, 8]} />
        <meshStandardMaterial color="#ffffff" roughness={0.8} />
      </mesh>
      <mesh position={[0.03, 0.32, 0]} rotation={[0, 0, 0.1]} castShadow>
        <capsuleGeometry args={[0.02, 0.1, 8, 8]} />
        <meshStandardMaterial color="#ffffff" roughness={0.8} />
      </mesh>
    </group>
  );
}

function HangingPlant({ position }: any) {
  return (
    <group position={position}>
      <mesh position={[0, -0.1, 0]}>
        <cylinderGeometry args={[0.08, 0.05, 0.15, 16]} />
        <meshStandardMaterial color="#dedede" />
      </mesh>
      <mesh position={[0, -0.05, 0]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial color="#76a882" roughness={0.8} />
      </mesh>
      {/* vines */}
      {[0,1,2].map((v) => (
        <mesh key={v} position={[Math.cos(v*2)*0.08, -0.25 - Math.random()*0.2, Math.sin(v*2)*0.08]}>
           <cylinderGeometry args={[0.015, 0.015, 0.4 + Math.random()*0.3, 8]} />
           <meshStandardMaterial color="#76a882" />
        </mesh>
      ))}
    </group>
  );
}

export function RoomEnvironment() {
  return (
    <group>
      {/* 1. LIGHTING RIG */}
      <ambientLight color="#605555" intensity={0.4} />

      <directionalLight
        color="#ffad66"
        intensity={1.2}
        position={[-8.5, 4.5, 1.0]}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-bias={-0.0001}
      />

      <directionalLight
        color="#ff7eb8"
        intensity={0.6}
        position={[4.0, 3.5, 3.5]}
      />

      <pointLight color="#ffcfa3" intensity={0.5} position={[0, 5, 0]} distance={15} />

      <DriftingSakuraPetals />

      {/* 2. WOODEN FLOOR */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color="#4a3630" roughness={0.3} metalness={0.1} side={THREE.DoubleSide} />
      </mesh>

      {/* 3. NEON RING RUG */}
      <NeonFloorRing />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0.15]} receiveShadow>
        <circleGeometry args={[2.0, 48]} />
        <meshStandardMaterial color="#362529" roughness={0.9} side={THREE.DoubleSide} />
      </mesh>

      {/* 4. CEILING & WALLS */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 7.5, 0]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color="#57494a" roughness={0.9} side={THREE.DoubleSide} />
      </mesh>

      {/* BACK WALL */}
      <mesh position={[0, 7.5, -4.95]} receiveShadow>
        <planeGeometry args={[60, 15]} />
        <meshStandardMaterial color="#7a6967" roughness={0.85} side={THREE.DoubleSide} />
      </mesh>

      <mesh position={[0, 0.08, -4.91]}>
        <boxGeometry args={[60, 0.16, 0.05]} />
        <meshStandardMaterial color="#4f3f3d" roughness={0.5} side={THREE.DoubleSide} />
      </mesh>

      {/* 5. BUILT-IN SHELF (Right Back Wall) */}
      <group position={[1.8, 1.8, -4.9]}>
        {/* Arch Recess */}
        <mesh position={[0, 0.2, -0.05]} receiveShadow>
          <boxGeometry args={[2.0, 3.2, 0.1]} />
          <meshStandardMaterial color="#5e4f4d" roughness={0.65} />
        </mesh>
        <mesh position={[0, 1.8, -0.05]} receiveShadow>
          <cylinderGeometry args={[1.0, 1.0, 0.1, 32, 1, false, 0, Math.PI]} rotation={[0, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#5e4f4d" roughness={0.65} />
        </mesh>
        
        {/* Shelf LED Strips & Planks */}
        {[-0.8, 0, 0.8, 1.6].map((y, i) => (
          <group position={[0, y, 0.1]} key={i}>
             <mesh castShadow receiveShadow>
               <boxGeometry args={[1.9, 0.06, 0.3]} />
               <meshStandardMaterial color="#473a38" roughness={0.4} />
             </mesh>
             {/* Neon Strip */}
             <mesh position={[0, -0.03, 0.14]}>
               <boxGeometry args={[1.85, 0.02, 0.02]} />
               <meshStandardMaterial color="#ff974d" emissive="#ff974d" emissiveIntensity={2.0} toneMapped={false} />
             </mesh>
             <pointLight color="#ff974d" intensity={0.4} distance={2.0} position={[0, -0.1, 0.1]} />
          </group>
        ))}

        {/* Shelf Items */}
        <HangingPlant position={[-0.5, 2.5, 0.1]} />
        <BunnyFigure position={[0.5, 1.63, 0.1]} rotation={[0, -0.4, 0]} scale={0.7} />
        <GlowingOrb position={[0.4, 0.83, 0.1]} />
        <BunnyFigure position={[-0.4, 0.03, 0.1]} rotation={[0, 0.3, 0]} scale={0.9} />
        <BookStack position={[-0.6, 0.83, 0.1]} />
        <BookStack position={[0.6, -0.77, 0.1]} />
      </group>

      {/* 6. CREDENZA (Far Right) */}
      <group position={[3.8, 0.45, -4.6]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[1.6, 0.6, 0.55]} />
          <meshStandardMaterial color="#3b3130" roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.32, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.66, 0.04, 0.59]} />
          <meshStandardMaterial color="#665351" roughness={0.35} />
        </mesh>
        <CozyLamp position={[-0.4, 0.34, 0]} />
        <StylizedPlant position={[0.4, 0.34, 0]} scale={1.0} />
      </group>

      {/* 7. NEON BUNNY & WALL ART (Far Right Wall) */}
      <NeonBunnySign position={[4.0, 2.2, -4.85]} rotation={[0, 0, 0]} />
      
      {/* Wall polaroids */}
      <group position={[4.0, 1.2, -4.88]}>
        <mesh position={[-0.2, 0, 0]}><boxGeometry args={[0.2, 0.25, 0.02]}/><meshStandardMaterial color="#ffffff"/></mesh>
        <mesh position={[0.2, -0.1, 0]}><boxGeometry args={[0.2, 0.25, 0.02]}/><meshStandardMaterial color="#ffffff"/></mesh>
      </group>

      {/* 8. CIRCULAR WALL ART (Center Left Wall) */}
      <group position={[-1.2, 2.3, -4.9]}>
        <group position={[-0.6, 0, 0]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.6, 0.8, 0.03]} />
            <meshStandardMaterial color="#362a29" roughness={0.4} />
          </mesh>
          <mesh position={[0, 0, 0.018]}>
            <planeGeometry args={[0.5, 0.7]} />
            <meshBasicMaterial color="#fff4f7" />
          </mesh>
          <mesh position={[0, 0.05, 0.02]}>
            <circleGeometry args={[0.18, 32]} />
            <meshBasicMaterial color="#ff5ca0" />
          </mesh>
        </group>
        <group position={[0.6, 0, 0]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.6, 0.8, 0.03]} />
            <meshStandardMaterial color="#362a29" roughness={0.4} />
          </mesh>
          <mesh position={[0, 0, 0.018]}>
            <planeGeometry args={[0.5, 0.7]} />
            <meshBasicMaterial color="#f7f2fa" />
          </mesh>
          <mesh position={[0, 0.05, 0.02]}>
            <circleGeometry args={[0.18, 32]} />
            <meshBasicMaterial color="#975cff" />
          </mesh>
        </group>
      </group>
      <WallSconce position={[-0.6, 3.2, -4.88]} />

      {/* 9. BEANBAG CHAIR */}
      <BeanbagChair />

      {/* 10. LARGE WINDOW (Left Wall) */}
      <group position={[-6.0, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <mesh receiveShadow position={[0, 7.5, 0]}>
          <planeGeometry args={[60, 15]} />
          <meshStandardMaterial color="#7a6967" roughness={0.85} side={THREE.DoubleSide} />
        </mesh>
        
        {/* Cityscape Window Backdrop */}
        <group position={[-1.5, 3.0, -0.05]}>
          {/* Sunset Sky */}
          <mesh position={[0, 0, -0.5]}>
            <planeGeometry args={[5, 6]} />
            <meshBasicMaterial color="#ffb17a" side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, -1.0, -0.48]}>
            <planeGeometry args={[5, 2]} />
            <meshBasicMaterial color="#ff7a97" transparent opacity={0.6} />
          </mesh>
          <mesh position={[-1, 1, -0.49]}>
            <circleGeometry args={[0.6, 32]} />
            <meshBasicMaterial color="#ffe1aa" />
          </mesh>
          
          {/* Distant City Buildings */}
          {[...Array(12)].map((_, i) => (
             <mesh key={i} position={[-2.2 + i*0.4, -2.5 + Math.random()*1, -0.4]}>
               <planeGeometry args={[0.3, 2 + Math.random()*2]} />
               <meshBasicMaterial color="#4a3036" />
             </mesh>
          ))}
          
          {/* Window Frame */}
          <mesh castShadow receiveShadow position={[-2.5, 0, 0]}>
            <boxGeometry args={[0.1, 6, 0.1]} />
            <meshStandardMaterial color="#362a29" />
          </mesh>
          <mesh castShadow receiveShadow position={[2.5, 0, 0]}>
            <boxGeometry args={[0.1, 6, 0.1]} />
            <meshStandardMaterial color="#362a29" />
          </mesh>
          <mesh castShadow receiveShadow position={[0, 3, 0]}>
            <boxGeometry args={[5, 0.1, 0.1]} />
            <meshStandardMaterial color="#362a29" />
          </mesh>
          <mesh castShadow receiveShadow position={[0, -3, 0]}>
            <boxGeometry args={[5, 0.1, 0.1]} />
            <meshStandardMaterial color="#362a29" />
          </mesh>
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[0.05, 6, 0.05]} />
            <meshStandardMaterial color="#362a29" />
          </mesh>
          
          {/* Curtains */}
          <mesh position={[-2.2, 0, 0.1]} receiveShadow>
            <planeGeometry args={[1.5, 6]} />
            <meshStandardMaterial color="#fca7c6" transparent opacity={0.8} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[2.2, 0, 0.1]} receiveShadow>
            <planeGeometry args={[1.5, 6]} />
            <meshStandardMaterial color="#fca7c6" transparent opacity={0.8} side={THREE.DoubleSide} />
          </mesh>
        </group>
        
        {/* Hanging vines over window */}
        <HangingPlant position={[-3.5, 5.0, 0.2]} />
        <HangingPlant position={[-1.5, 5.5, 0.2]} />
      </group>
    </group>
  );
}

export default RoomEnvironment;
`;

fs.writeFileSync('src/components/RoomEnvironment.tsx', beforeCode + splitToken + "\n" + newCode);
