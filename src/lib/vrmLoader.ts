import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRM, VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { fetchAndCacheVRMModel } from './vrmCache';

export async function loadVRM(url: string): Promise<VRM> {
  console.log('generating thumbnail for', url);
  const arrayBuffer = await fetchAndCacheVRMModel(url);
  const loader = new GLTFLoader();
  loader.register((parser) => new VRMLoaderPlugin(parser));
  const resourcePath = url.includes('/') ? url.substring(0, url.lastIndexOf('/') + 1) : '/models/';

  return new Promise<VRM>((resolve, reject) => {
    loader.parse(
      arrayBuffer,
      resourcePath,
      (gltf) => {
        const vrm = gltf.userData.vrm as VRM;
        if (!vrm) {
          reject(new Error(`No VRM found in model at ${url}`));
          return;
        }
        VRMUtils.removeUnnecessaryVertices(gltf.scene);
        VRMUtils.combineSkeletons(gltf.scene);
        resolve(vrm);
      },
      (err) => reject(err)
    );
  });
}
