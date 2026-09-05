import React, { useEffect, useMemo } from 'react';
import { useThree, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

export function RoomEnvironment() {
  const { scene, gl } = useThree();

  useEffect(() => {
    const pmremGenerator = new THREE.PMREMGenerator(gl);
    pmremGenerator.compileEquirectangularShader();

    new RGBELoader().load('/env/room_day.hdr', (texture) => {
      const envMap = pmremGenerator.fromEquirectangular(texture).texture;
      scene.environment = envMap; // drives all PBR reflections across every surface automatically
      scene.background = null; // keep background as the solid bg-base color
      texture.dispose();
      pmremGenerator.dispose();
    });

    return () => {
      scene.environment = null;
    };
  }, [scene, gl]);

  const [
    floorDiffuse, floorNormal, floorRoughness,
    wallDiffuse, wallNormal, wallRoughness
  ] = useLoader(THREE.TextureLoader, [
    '/textures/floor_diffuse.jpg',
    '/textures/floor_normal.jpg',
    '/textures/floor_roughness.jpg',
    '/textures/wall_diffuse.jpg',
    '/textures/wall_normal.jpg',
    '/textures/wall_roughness.jpg'
  ]);

  useMemo(() => {
    floorDiffuse.colorSpace = THREE.SRGBColorSpace;
    floorDiffuse.wrapS = THREE.RepeatWrapping;
    floorDiffuse.wrapT = THREE.RepeatWrapping;
    floorDiffuse.repeat.set(4, 4);

    floorNormal.wrapS = THREE.RepeatWrapping;
    floorNormal.wrapT = THREE.RepeatWrapping;
    floorNormal.repeat.set(4, 4);

    floorRoughness.wrapS = THREE.RepeatWrapping;
    floorRoughness.wrapT = THREE.RepeatWrapping;
    floorRoughness.repeat.set(4, 4);

    wallDiffuse.colorSpace = THREE.SRGBColorSpace;
    wallDiffuse.wrapS = THREE.RepeatWrapping;
    wallDiffuse.wrapT = THREE.RepeatWrapping;
    wallDiffuse.repeat.set(6, 2);

    wallNormal.wrapS = THREE.RepeatWrapping;
    wallNormal.wrapT = THREE.RepeatWrapping;
    wallNormal.repeat.set(6, 2);

    wallRoughness.wrapS = THREE.RepeatWrapping;
    wallRoughness.wrapT = THREE.RepeatWrapping;
    wallRoughness.repeat.set(6, 2);
  }, [floorDiffuse, floorNormal, floorRoughness, wallDiffuse, wallNormal, wallRoughness]);

  return (
    <group>
      {/* 3D Atmospheric Background Color & Fog */}
      <color attach="background" args={['#e8e6e1']} />
      <fog attach="fog" args={['#e8e6e1', 7, 32]} />

      {/* ========================================================= */}
      {/* ROOM FLOOR                                                */}
      {/* ========================================================= */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[35, 35]} />
        <meshStandardMaterial 
          map={floorDiffuse}
          normalMap={floorNormal}
          roughnessMap={floorRoughness}
          roughness={0.7}
          metalness={0.02}
          color="#ffffff"
        />
      </mesh>

      {/* Subtle contact shadow under Lyra's feet */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
        <circleGeometry args={[0.9, 32]} />
        <meshBasicMaterial color="#0b060d" transparent opacity={0.15} />
      </mesh>

      {/* ========================================================= */}
      {/* ROOM ARCHITECTURAL WALLS                                  */}
      {/* ========================================================= */}
      <mesh position={[0, 3.8, -4.85]} receiveShadow>
        <planeGeometry args={[34, 12]} />
        <meshStandardMaterial 
          map={wallDiffuse}
          normalMap={wallNormal}
          roughnessMap={wallRoughness}
          roughness={0.9}
          metalness={0}
          color="#f5f5f5"
        />
      </mesh>

      {/* Room baseboard trim along the wall base */}
      <mesh position={[0, 0.08, -4.82]}>
        <boxGeometry args={[34, 0.16, 0.04]} />
        <meshStandardMaterial color="#e0e0e0" roughness={0.65} />
      </mesh>

      {/* Modern vertical acoustic wood slat wall accent (left background) */}
      {[-3.8, -3.5, -3.2, -2.9, -2.6, -2.3].map((x, i) => (
        <mesh key={i} position={[x, 3.2, -4.81]} castShadow receiveShadow>
          <boxGeometry args={[0.13, 6.2, 0.03]} />
          <meshStandardMaterial color="#d4c3b3" roughness={0.7} />
        </mesh>
      ))}

      {/* Minimalist Floating Shelf & Room Decor (right background) */}
      <group position={[2.4, 1.85, -4.8]}>
        {/* Shelf plank */}
        <mesh receiveShadow castShadow>
          <boxGeometry args={[1.8, 0.05, 0.32]} />
          <meshStandardMaterial color="#e0e0e0" roughness={0.55} />
        </mesh>
        {/* Ceramic pot & plant */}
        <mesh position={[-0.55, 0.12, 0]} receiveShadow castShadow>
          <cylinderGeometry args={[0.09, 0.07, 0.2, 16]} />
          <meshStandardMaterial color="#ffffff" roughness={0.4} />
        </mesh>
        <mesh position={[-0.55, 0.25, 0]} receiveShadow castShadow>
          <sphereGeometry args={[0.11, 12, 12]} />
          <meshStandardMaterial color="#88a088" roughness={0.9} />
        </mesh>
        {/* Cozy pastel books */}
        <mesh position={[0.25, 0.12, 0]} rotation={[0, 0.08, 0]} receiveShadow castShadow>
          <boxGeometry args={[0.1, 0.24, 0.22]} />
          <meshStandardMaterial color="#b39bc8" />
        </mesh>
        <mesh position={[0.38, 0.11, 0]} rotation={[0, 0.04, 0]} receiveShadow castShadow>
          <boxGeometry args={[0.09, 0.21, 0.21]} />
          <meshStandardMaterial color="#8fadc9" />
        </mesh>
      </group>

      {/* ========================================================= */}
      {/* WINDOW WITH DAYLIGHT GLOW                                 */}
      {/* ========================================================= */}
      {/* Window opening cutout area (a simple frame with bright surrounds) */}
      <mesh position={[-2.4, 1.8, -3.9]}>
        <planeGeometry args={[1.2, 1.6]} />
        <meshStandardMaterial 
          emissive={new THREE.Color(0xffffff)}
          emissiveIntensity={1.5}
          transparent={true}
          opacity={0.8}
        />
      </mesh>

      {/* ========================================================= */}
      {/* PRACTICAL LIGHT SOURCES                                   */}
      {/* ========================================================= */}
      
      {/* The warm desk lamp (primary, key light) */}
      <group position={[1.2, 1.6, -1.2]}>
        {/* the glowing bulb itself, purely visual */}
        <mesh>
          <sphereGeometry args={[0.04, 16, 8]} />
          <meshStandardMaterial 
            emissive={new THREE.Color(0xFFE8CD)}
            emissiveIntensity={4}
          />
        </mesh>
        {/* the actual PointLight positioned at the exact same location as the bulb mesh */}
        <pointLight 
          color={0xFFE8CD} 
          intensity={1.2} 
          distance={5} 
          decay={2}
          castShadow 
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-near={0.1}
          shadow-camera-far={6}
          shadow-bias={-0.0001}
        />
      </group>

      {/* Sunlight from window (secondary, warm rim) */}
      <directionalLight 
        color={0xFFF2E6}
        intensity={1.2}
        position={[-3, 4, -2]}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-bias={-0.0001}
      />

      {/* Ambient (balanced daylight fill) */}
      <ambientLight color={0xffffff} intensity={0.6} />
    </group>
  );
}
