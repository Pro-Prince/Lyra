const fs = require('fs');
let code = fs.readFileSync('src/components/CompanionStage.tsx', 'utf8');

if (!code.includes('graphicsTier?: \'low\' | \'medium\' | \'high\';')) {
  // Wait, I already added it to CompanionStage. Let's add it to VRMModelProps
  code = code.replace(
    /interface VRMModelProps \{/,
    `interface VRMModelProps {\n  graphicsTier?: 'low' | 'medium' | 'high';`
  );

  code = code.replace(
    /function VRMModel\(\{ url, emotion = 'warm', onProgress, onLoaded, onError, retryKey = 0 \}: VRMModelProps\) \{/,
    `function VRMModel({ url, emotion = 'warm', graphicsTier = 'high', onProgress, onLoaded, onError, retryKey = 0 }: VRMModelProps) {`
  );

  code = code.replace(
    /if \(obj instanceof THREE\.Mesh\) \{/,
    `if (obj instanceof THREE.Mesh) {
                if (graphicsTier === 'low' && obj.material && obj.material.map) {
                  // Reduced texture quality for low tier
                  obj.material.map.minFilter = THREE.LinearFilter;
                  obj.material.map.magFilter = THREE.LinearFilter;
                  obj.material.map.anisotropy = 1;
                  obj.material.map.generateMipmaps = false;
                }`
  );

  code = code.replace(
    /<VRMModel\s+url=\{outfitUrl\}/,
    `<VRMModel \n              graphicsTier={graphicsTier}\n              url={outfitUrl}`
  );

  fs.writeFileSync('src/components/CompanionStage.tsx', code);
}
