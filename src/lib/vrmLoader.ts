import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRM, VRMLoaderPlugin } from '@pixiv/three-vrm';
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
        resolve(vrm);
      },
      (err) => reject(err)
    );
  });
}


