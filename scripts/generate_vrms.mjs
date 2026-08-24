import fs from 'fs';
import path from 'path';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMLoaderPlugin } from '@pixiv/three-vrm';

function createOutfitModel(type = 'default') {
  // Define bones hierarchy
  const boneDefs = [
    { name: "Hips", bone: "hips", translation: [0, 0.82, 0], children: [1, 11, 14] }, // 0
    { name: "Spine", bone: "spine", translation: [0, 0.14, 0], children: [2] }, // 1
    { name: "Chest", bone: "chest", translation: [0, 0.16, 0], children: [3, 5, 8] }, // 2
    { name: "Neck", bone: "neck", translation: [0, 0.14, 0], children: [4] }, // 3
    { name: "Head", bone: "head", translation: [0, 0.16, 0] }, // 4
    { name: "LeftUpperArm", bone: "leftUpperArm", translation: [0.18, 0.08, 0], children: [6] }, // 5
    { name: "LeftLowerArm", bone: "leftLowerArm", translation: [0.22, -0.02, 0], children: [7] }, // 6
    { name: "LeftHand", bone: "leftHand", translation: [0.20, 0, 0] }, // 7
    { name: "RightUpperArm", bone: "rightUpperArm", translation: [-0.18, 0.08, 0], children: [9] }, // 8
    { name: "RightLowerArm", bone: "rightLowerArm", translation: [-0.22, -0.02, 0], children: [10] }, // 9
    { name: "RightHand", bone: "rightHand", translation: [-0.20, 0, 0] }, // 10
    { name: "LeftUpperLeg", bone: "leftUpperLeg", translation: [0.11, -0.06, 0], children: [12] }, // 11
    { name: "LeftLowerLeg", bone: "leftLowerLeg", translation: [0, -0.38, 0], children: [13] }, // 12
    { name: "LeftFoot", bone: "leftFoot", translation: [0, -0.38, 0.05] }, // 13
    { name: "RightUpperLeg", bone: "rightUpperLeg", translation: [-0.11, -0.06, 0], children: [15] }, // 14
    { name: "RightLowerLeg", bone: "rightLowerLeg", translation: [0, -0.38, 0], children: [16] }, // 15
    { name: "RightFoot", bone: "rightFoot", translation: [0, -0.38, 0.05] }, // 16
  ];

  // Geometries for parts
  function createBoxGeometry(w, h, d, offsetX = 0, offsetY = 0, offsetZ = 0) {
    const geom = new THREE.BoxGeometry(w, h, d, 2, 2, 2);
    geom.translate(offsetX, offsetY, offsetZ);
    return geom;
  }

  function createSphereGeometry(radius, offsetX = 0, offsetY = 0, offsetZ = 0) {
    const geom = new THREE.SphereGeometry(radius, 12, 12);
    geom.translate(offsetX, offsetY, offsetZ);
    return geom;
  }

  function createCylinderGeometry(radiusTop, radiusBottom, height, offsetX = 0, offsetY = 0, offsetZ = 0) {
    const geom = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, 10);
    geom.translate(offsetX, offsetY, offsetZ);
    return geom;
  }

  // Outfit color accents
  let topColor = [0.98, 0.56, 0.75, 1.0]; // Pink/Rose
  let bottomColor = [0.15, 0.12, 0.18, 1.0]; // Dark skirt
  let hairColor = [0.95, 0.72, 0.85, 1.0]; // Pastel lilac/pink hair
  let skinColor = [1.0, 0.90, 0.85, 1.0];
  let eyeColor = [0.85, 0.45, 0.70, 1.0];
  let shoeColor = [0.15, 0.12, 0.18, 1.0];

  if (type === 'casual') {
    topColor = [0.45, 0.55, 0.75, 1.0]; // Casual blue hoodie
    bottomColor = [0.9, 0.9, 0.92, 1.0]; // Light denim/white
    hairColor = [0.85, 0.75, 0.95, 1.0];
  } else if (type === 'dress') {
    topColor = [0.20, 0.15, 0.28, 1.0]; // Elegant evening dress
    bottomColor = [0.20, 0.15, 0.28, 1.0];
    hairColor = [0.98, 0.82, 0.90, 1.0];
  }

  // Combine meshes per node
  // Head parts (Head bone - Node 4)
  const headGeom = createSphereGeometry(0.13, 0, 0.08, 0);
  const hairGeom = createSphereGeometry(0.142, 0, 0.10, -0.02);
  const hairLeft = createCylinderGeometry(0.04, 0.02, 0.35, 0.14, -0.05, -0.02);
  const hairRight = createCylinderGeometry(0.04, 0.02, 0.35, -0.14, -0.05, -0.02);

  // Chest / Torso (Chest bone - Node 2)
  const chestGeom = createBoxGeometry(0.24, 0.20, 0.14, 0, 0.06, 0);
  
  // Hips / Skirt (Hips bone - Node 0)
  const hipsGeom = createBoxGeometry(0.22, 0.14, 0.14, 0, 0, 0);
  const skirtGeom = createCylinderGeometry(0.14, 0.22, 0.18, 0, -0.08, 0);

  // Arms
  const leftArmGeom = createCylinderGeometry(0.045, 0.04, 0.22, 0.10, 0, 0);
  const leftForearmGeom = createCylinderGeometry(0.04, 0.035, 0.20, 0.10, 0, 0);
  const leftHandGeom = createSphereGeometry(0.04, 0.04, 0, 0);

  const rightArmGeom = createCylinderGeometry(0.045, 0.04, 0.22, -0.10, 0, 0);
  const rightForearmGeom = createCylinderGeometry(0.04, 0.035, 0.20, -0.10, 0, 0);
  const rightHandGeom = createSphereGeometry(0.04, -0.04, 0, 0);

  // Legs
  const leftThighGeom = createCylinderGeometry(0.055, 0.045, 0.36, 0, -0.18, 0);
  const leftShinGeom = createCylinderGeometry(0.045, 0.04, 0.36, 0, -0.18, 0);
  const leftFootGeom = createBoxGeometry(0.07, 0.05, 0.14, 0, -0.02, 0.04);

  const rightThighGeom = createCylinderGeometry(0.055, 0.045, 0.36, 0, -0.18, 0);
  const rightShinGeom = createCylinderGeometry(0.045, 0.04, 0.36, 0, -0.18, 0);
  const rightFootGeom = createBoxGeometry(0.07, 0.05, 0.14, 0, -0.02, 0.04);

  // Pack all buffers
  const bufferParts = [];
  let currentByteOffset = 0;

  const accessors = [];
  const bufferViews = [];
  const meshes = [];
  const materials = [
    { name: "M_Skin", pbrMetallicRoughness: { baseColorFactor: skinColor, roughnessFactor: 0.6 } },
    { name: "M_Hair", pbrMetallicRoughness: { baseColorFactor: hairColor, roughnessFactor: 0.5 } },
    { name: "M_Top", pbrMetallicRoughness: { baseColorFactor: topColor, roughnessFactor: 0.7 } },
    { name: "M_Bottom", pbrMetallicRoughness: { baseColorFactor: bottomColor, roughnessFactor: 0.8 } },
    { name: "M_Shoe", pbrMetallicRoughness: { baseColorFactor: shoeColor, roughnessFactor: 0.5 } }
  ];

  function addGeometryData(geometry, materialIndex) {
    const pos = geometry.attributes.position.array;
    const norm = geometry.attributes.normal.array;
    const indices = geometry.index ? geometry.index.array : null;

    let indexArray = indices;
    if (!indexArray) {
      const count = pos.length / 3;
      indexArray = new Uint16Array(count);
      for (let i = 0; i < count; i++) indexArray[i] = i;
    } else if (!(indexArray instanceof Uint16Array)) {
      indexArray = new Uint16Array(indexArray);
    }

    // Positions buffer
    const posBuf = Buffer.from(pos.buffer, pos.byteOffset, pos.byteLength);
    const posOffset = currentByteOffset;
    bufferParts.push(posBuf);
    currentByteOffset += posBuf.length;

    // Normals buffer
    const normBuf = Buffer.from(norm.buffer, norm.byteOffset, norm.byteLength);
    const normOffset = currentByteOffset;
    bufferParts.push(normBuf);
    currentByteOffset += normBuf.length;

    // Indices buffer (align to 4 bytes)
    const idxBuf = Buffer.from(indexArray.buffer, indexArray.byteOffset, indexArray.byteLength);
    const idxOffset = currentByteOffset;
    bufferParts.push(idxBuf);
    currentByteOffset += idxBuf.length;
    
    // Padding
    const padLen = (4 - (currentByteOffset % 4)) % 4;
    if (padLen > 0) {
      bufferParts.push(Buffer.alloc(padLen));
      currentByteOffset += padLen;
    }

    const posViewIdx = bufferViews.length;
    bufferViews.push({
      buffer: 0,
      byteOffset: posOffset,
      byteLength: posBuf.length,
      target: 34962
    });

    const normViewIdx = bufferViews.length;
    bufferViews.push({
      buffer: 0,
      byteOffset: normOffset,
      byteLength: normBuf.length,
      target: 34962
    });

    const idxViewIdx = bufferViews.length;
    bufferViews.push({
      buffer: 0,
      byteOffset: idxOffset,
      byteLength: idxBuf.length,
      target: 34963
    });

    // Min / max for position
    let min = [Infinity, Infinity, Infinity];
    let max = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < pos.length; i += 3) {
      min[0] = Math.min(min[0], pos[i]);
      min[1] = Math.min(min[1], pos[i+1]);
      min[2] = Math.min(min[2], pos[i+2]);
      max[0] = Math.max(max[0], pos[i]);
      max[1] = Math.max(max[1], pos[i+1]);
      max[2] = Math.max(max[2], pos[i+2]);
    }

    const posAccIdx = accessors.length;
    accessors.push({
      bufferView: posViewIdx,
      byteOffset: 0,
      componentType: 5126, // FLOAT
      count: pos.length / 3,
      type: "VEC3",
      min,
      max
    });

    const normAccIdx = accessors.length;
    accessors.push({
      bufferView: normViewIdx,
      byteOffset: 0,
      componentType: 5126,
      count: norm.length / 3,
      type: "VEC3"
    });

    const idxAccIdx = accessors.length;
    accessors.push({
      bufferView: idxViewIdx,
      byteOffset: 0,
      componentType: 5123, // UNSIGNED_SHORT
      count: indexArray.length,
      type: "SCALAR",
      min: [0],
      max: [pos.length / 3 - 1]
    });

    return {
      attributes: {
        POSITION: posAccIdx,
        NORMAL: normAccIdx
      },
      indices: idxAccIdx,
      material: materialIndex,
      mode: 4
    };
  }

  // Create nodes
  const nodes = [];
  const humanBones = [];

  boneDefs.forEach((b, idx) => {
    const node = {
      name: b.name,
      translation: b.translation,
    };
    if (b.children) node.children = b.children;
    nodes.push(node);
    humanBones.push({
      bone: b.bone,
      node: idx
    });
  });

  // Mesh 0: Head (Node 4)
  const headPrim = addGeometryData(headGeom, 0); // skin
  const hairPrim = addGeometryData(hairGeom, 1); // hair
  const hairLPrim = addGeometryData(hairLeft, 1);
  const hairRPrim = addGeometryData(hairRight, 1);
  meshes.push({
    name: "HeadMesh",
    primitives: [headPrim, hairPrim, hairLPrim, hairRPrim]
  });
  nodes[4].mesh = meshes.length - 1;

  // Mesh 1: Chest (Node 2)
  const chestPrim = addGeometryData(chestGeom, 2); // top
  meshes.push({
    name: "ChestMesh",
    primitives: [chestPrim]
  });
  nodes[2].mesh = meshes.length - 1;

  // Mesh 2: Hips / Skirt (Node 0)
  const hipsPrim = addGeometryData(hipsGeom, 0);
  const skirtPrim = addGeometryData(skirtGeom, 3); // bottom
  meshes.push({
    name: "HipsMesh",
    primitives: [hipsPrim, skirtPrim]
  });
  nodes[0].mesh = meshes.length - 1;

  // Mesh 3: Left Arm (Node 5)
  const leftArmPrim = addGeometryData(leftArmGeom, 2);
  meshes.push({ name: "LeftArmMesh", primitives: [leftArmPrim] });
  nodes[5].mesh = meshes.length - 1;

  // Mesh 4: Left Forearm (Node 6)
  const leftForearmPrim = addGeometryData(leftForearmGeom, 0);
  meshes.push({ name: "LeftForearmMesh", primitives: [leftForearmPrim] });
  nodes[6].mesh = meshes.length - 1;

  // Mesh 5: Left Hand (Node 7)
  const leftHandPrim = addGeometryData(leftHandGeom, 0);
  meshes.push({ name: "LeftHandMesh", primitives: [leftHandPrim] });
  nodes[7].mesh = meshes.length - 1;

  // Mesh 6: Right Arm (Node 8)
  const rightArmPrim = addGeometryData(rightArmGeom, 2);
  meshes.push({ name: "RightArmMesh", primitives: [rightArmPrim] });
  nodes[8].mesh = meshes.length - 1;

  // Mesh 7: Right Forearm (Node 9)
  const rightForearmPrim = addGeometryData(rightForearmGeom, 0);
  meshes.push({ name: "RightForearmMesh", primitives: [rightForearmPrim] });
  nodes[9].mesh = meshes.length - 1;

  // Mesh 8: Right Hand (Node 10)
  const rightHandPrim = addGeometryData(rightHandGeom, 0);
  meshes.push({ name: "RightHandMesh", primitives: [rightHandPrim] });
  nodes[10].mesh = meshes.length - 1;

  // Mesh 9: Left Thigh (Node 11)
  const leftThighPrim = addGeometryData(leftThighGeom, 0);
  meshes.push({ name: "LeftThighMesh", primitives: [leftThighPrim] });
  nodes[11].mesh = meshes.length - 1;

  // Mesh 10: Left Shin (Node 12)
  const leftShinPrim = addGeometryData(leftShinGeom, 0);
  meshes.push({ name: "LeftShinMesh", primitives: [leftShinPrim] });
  nodes[12].mesh = meshes.length - 1;

  // Mesh 11: Left Foot (Node 13)
  const leftFootPrim = addGeometryData(leftFootGeom, 4); // shoe
  meshes.push({ name: "LeftFootMesh", primitives: [leftFootPrim] });
  nodes[13].mesh = meshes.length - 1;

  // Mesh 12: Right Thigh (Node 14)
  const rightThighPrim = addGeometryData(rightThighGeom, 0);
  meshes.push({ name: "RightThighMesh", primitives: [rightThighPrim] });
  nodes[14].mesh = meshes.length - 1;

  // Mesh 13: Right Shin (Node 15)
  const rightShinPrim = addGeometryData(rightShinGeom, 0);
  meshes.push({ name: "RightShinMesh", primitives: [rightShinPrim] });
  nodes[15].mesh = meshes.length - 1;

  // Mesh 14: Right Foot (Node 16)
  const rightFootPrim = addGeometryData(rightFootGeom, 4);
  meshes.push({ name: "RightFootMesh", primitives: [rightFootPrim] });
  nodes[16].mesh = meshes.length - 1;

  const binBuffer = Buffer.concat(bufferParts);

  const gltf = {
    asset: { version: "2.0", generator: "LyraVRMBuilder" },
    extensionsUsed: ["VRM"],
    extensions: {
      VRM: {
        exporterVersion: "1.0",
        specVersion: "0.0",
        meta: {
          title: `Lyra (${type})`,
          version: "1.0",
          author: "Lyra AI Companion",
          allowedUserName: "Everyone"
        },
        humanoid: {
          humanBones: humanBones
        },
        blendShapeMaster: {
          blendShapeGroups: [
            { name: "Neutral", presetName: "neutral", binds: [] },
            { name: "Joy", presetName: "joy", binds: [] },
            { name: "Angry", presetName: "angry", binds: [] },
            { name: "Sorrow", presetName: "sorrow", binds: [] },
            { name: "Fun", presetName: "fun", binds: [] },
            { name: "Blink", presetName: "blink", binds: [] },
            { name: "LookUp", presetName: "lookup", binds: [] },
            { name: "LookDown", presetName: "lookdown", binds: [] },
            { name: "LookLeft", presetName: "lookleft", binds: [] },
            { name: "LookRight", presetName: "lookright", binds: [] },
            { name: "Blink_L", presetName: "blink_l", binds: [] },
            { name: "Blink_R", presetName: "blink_r", binds: [] }
          ]
        },
        firstPerson: {
          firstPersonBone: 4,
          firstPersonBoneOffset: { x: 0, y: 0.06, z: 0 },
          lookAtTypeName: "Bone"
        }
      }
    },
    nodes: nodes,
    scenes: [{ nodes: [0] }],
    scene: 0,
    meshes: meshes,
    materials: materials,
    accessors: accessors,
    bufferViews: bufferViews,
    buffers: [{ byteLength: binBuffer.length }]
  };

  const jsonString = JSON.stringify(gltf);
  const jsonBuffer = Buffer.from(jsonString, "utf8");
  const jsonPaddedLength = Math.ceil(jsonBuffer.length / 4) * 4;
  const paddedJson = Buffer.alloc(jsonPaddedLength, 0x20);
  jsonBuffer.copy(paddedJson);

  const binPaddedLength = Math.ceil(binBuffer.length / 4) * 4;
  const paddedBin = Buffer.alloc(binPaddedLength, 0x00);
  binBuffer.copy(paddedBin);

  const totalLength = 12 + 8 + jsonPaddedLength + 8 + binPaddedLength;

  const header = Buffer.alloc(12);
  header.write("glTF", 0, 4, "ascii");
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(totalLength, 8);

  const chunk0Header = Buffer.alloc(8);
  chunk0Header.writeUInt32LE(jsonPaddedLength, 0);
  chunk0Header.write("JSON", 4, 4, "ascii");

  const chunk1Header = Buffer.alloc(8);
  chunk1Header.writeUInt32LE(binPaddedLength, 0);
  chunk1Header.write("BIN\x00", 4, 4, "ascii");

  return Buffer.concat([header, chunk0Header, paddedJson, chunk1Header, paddedBin]);
}

// Generate for default, casual, and dress
const outDir = path.join(process.cwd(), 'public', 'models');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const distDir = path.join(process.cwd(), 'dist', 'models');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

['default', 'casual', 'dress'].forEach((type) => {
  const buf = createOutfitModel(type);
  const filename = type === 'default' ? 'lyra.vrm' : `lyra_${type}.vrm`;
  const target = path.join(outDir, filename);
  fs.writeFileSync(target, buf);
  fs.writeFileSync(path.join(distDir, filename), buf);
  console.log(`Wrote ${target} (${buf.length} bytes)`);
});

// Test parsing with GLTFLoader
const testBuf = fs.readFileSync(path.join(outDir, 'lyra.vrm'));
const ab = testBuf.buffer.slice(testBuf.byteOffset, testBuf.byteOffset + testBuf.byteLength);

const loader = new GLTFLoader();
loader.register((parser) => new VRMLoaderPlugin(parser));

loader.parse(ab, '/', (gltf) => {
  console.log('✅ Validation SUCCESS! VRM loaded perfectly:', !!gltf.userData.vrm);
}, (err) => {
  console.error('❌ Validation ERROR:', err);
});
