const fs = require('fs');
let content = fs.readFileSync('src/components/CompanionStage.tsx', 'utf8');

// Add imports
if (!content.includes('EffectComposer')) {
  content = content.replace(
    "import * as THREE from 'three';",
    `import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { FilmPass } from 'three/examples/jsm/postprocessing/FilmPass.js';`
  );
}

// Add CustomPostProcessing component
if (!content.includes('function CustomPostProcessing')) {
  content = content.replace(
    "function CompanionStageComponent",
    `function CustomPostProcessing() {
  const { gl, scene, camera, size } = useThree();
  
  const composer = useMemo(() => {
    const comp = new EffectComposer(gl);
    comp.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(
      new THREE.Vector2(size.width, size.height),
      0.4,
      0.6,
      0.85
    );
    comp.addPass(bloom);
    const film = new FilmPass(0.15, false);
    comp.addPass(film);
    return comp;
  }, [gl, scene, camera]);

  useEffect(() => {
    composer.setSize(size.width, size.height);
  }, [composer, size]);

  useFrame(() => {
    composer.render();
  }, 1);

  return null;
}

function CompanionStageComponent`
  );
}

// Add MToon hack inside onLoaded
content = content.replace(
  'vrmInstance.scene.add(lookTarget.current);',
  `vrmInstance.scene.add(lookTarget.current);
        vrmInstance.scene.traverse((obj) => {
          if (obj.isMesh) {
            obj.castShadow = true;
            obj.receiveShadow = true;
            if (obj.material?.isMToonMaterial) {
              obj.material.envMapIntensity = 0;
            }
          }
        });`
);

// Update Canvas settings
content = content.replace(
  '<Canvas',
  '<Canvas shadows'
);

content = content.replace(
  'gl.outputColorSpace = THREE.SRGBColorSpace;',
  `gl.shadowMap.enabled = true;
            gl.shadowMap.type = THREE.PCFSoftShadowMap;
            gl.outputColorSpace = THREE.SRGBColorSpace;`
);

content = content.replace(
  'camera={{ position: [0.4, 1.75, 3.2], fov: 32 }}',
  'camera={{ position: [0.3, 1.6, 3.0], fov: 35 }}'
);

// Add CustomPostProcessing inside Canvas
content = content.replace(
  '<RoomEnvironment />',
  `<RoomEnvironment />
          <CustomPostProcessing />`
);

fs.writeFileSync('src/components/CompanionStage.tsx', content);
