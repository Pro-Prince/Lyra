import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRM, VRMLoaderPlugin } from '@pixiv/three-vrm';
import * as THREE from 'three';
import { fetchAndCacheVRMModel } from './vrmCache';

export async function loadVRM(url: string): Promise<VRM> {
  const arrayBuffer = await fetchAndCacheVRMModel(url);
  const loader = new GLTFLoader();
  loader.register((parser) => new VRMLoaderPlugin(parser));
  const resourcePath = url.includes('/') ? url.substring(0, url.lastIndexOf('/') + 1) : '/models/';

  return new Promise<VRM>((resolve, reject) => {
    loader.parse(
      arrayBuffer.slice(0),
      resourcePath,
      (gltf) => {
        const vrm = gltf.userData.vrm as VRM;
        if (!vrm) {
          reject(new Error(`No VRM found in model at ${url}`));
          return;
        }

        // Diagnostic traversal logging
        console.log(`[Diagnostic loadVRM] Loaded model: ${url}`);
        vrm.scene.traverse((obj) => {
          if ((obj as THREE.Mesh).isMesh) {
            const mesh = obj as THREE.Mesh;
            const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            mats.forEach((mat) => {
              const hasMapImage = !!(mat as any)?.map?.image;
              console.log(
                'mesh:',
                mesh.name,
                'visible:',
                mesh.visible,
                'material:',
                mat?.name,
                'map loaded:',
                hasMapImage
              );
            });
          }
        });

        resolve(vrm);
      },
      (err) => reject(err)
    );
  });
}



