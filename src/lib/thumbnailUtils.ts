import * as THREE from 'three';
import { VRM } from '@pixiv/three-vrm';
import { frameFullBody, framePortrait } from './poseUtils';

export function createThumbnailRenderer(width: number = 256, height: number = 256): THREE.WebGLRenderer {
  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    preserveDrawingBuffer: true,
    antialias: true,
  });
  renderer.setSize(width, height);
  renderer.setClearColor(0x000000, 0);
  return renderer;
}

export function canvasToBlobUrl(canvas: HTMLCanvasElement): Promise<string> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        resolve(canvas.toDataURL('image/png'));
        return;
      }
      resolve(URL.createObjectURL(blob));
    }, 'image/png');
  });
}

export async function generateOutfitThumbnail(vrm: VRM, renderer: THREE.WebGLRenderer): Promise<string> {
  const scene = new THREE.Scene();
  
  // High clarity neutral lighting for the thumbnail preview
  const ambient = new THREE.AmbientLight(0xffffff, 1.1);
  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(1, 2, 2);
  const fill = new THREE.DirectionalLight(0xffffff, 0.6);
  fill.position.set(-1, 1, -1);
  
  scene.add(ambient, key, fill, vrm.scene);

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 10);
  camera.aspect = 1;
  camera.updateProjectionMatrix();

  // Frame the model using full-body framing
  frameFullBody(vrm.scene, camera, 256, 0, 0);

  // CRITICAL: Manually trigger world matrix update before rendering
  vrm.scene.updateMatrixWorld(true);

  // Render to offscreen WebGL buffer
  renderer.render(scene, camera);

  // Extract efficient Blob URL
  const blobUrl = await canvasToBlobUrl(renderer.domElement);

  // Detach model from temporary thumbnail scene without disposing geometry
  scene.remove(vrm.scene);

  return blobUrl;
}

export async function generateHeroPortrait(vrm: VRM, renderer?: THREE.WebGLRenderer): Promise<string> {
  const shouldDispose = !renderer;
  const r = renderer || createThumbnailRenderer(800, 1000);
  r.setSize(800, 1000);

  const scene = new THREE.Scene();
  const ambient = new THREE.AmbientLight(0xffffff, 1.2);
  const key = new THREE.DirectionalLight(0xffd9b3, 1.5);
  key.position.set(1.5, 2.5, 2.5);
  const fill = new THREE.DirectionalLight(0xc9a6ff, 0.8);
  fill.position.set(-1.5, 1.5, -1);

  scene.add(ambient, key, fill, vrm.scene);

  const camera = new THREE.PerspectiveCamera(28, 0.8, 0.1, 10);
  camera.aspect = 800 / 1000;
  camera.updateProjectionMatrix();

  framePortrait(vrm.scene, camera, 1000);

  vrm.scene.updateMatrixWorld(true);
  r.render(scene, camera);
  const blobUrl = await canvasToBlobUrl(r.domElement);
  scene.remove(vrm.scene);

  if (shouldDispose) {
    try { r.dispose(); } catch {}
  }

  return blobUrl;
}

