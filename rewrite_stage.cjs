const fs = require('fs');
let code = fs.readFileSync('src/components/CompanionStage.tsx', 'utf-8');

// 1. Add expressions
code = code.replace(
/calm: \{ happy: 0\.2, relaxed: 0\.75, surprised: 0\.0, neutral: 0\.3, sad: 0\.0 \}/,
`calm: { happy: 0.2, relaxed: 0.75, surprised: 0.0, neutral: 0.3, sad: 0.0 },
  affectionate: { happy: 0.8, relaxed: 0.2, surprised: 0.0, neutral: 0.0, sad: 0.0 },
  shy: { happy: 0.2, relaxed: 0.0, surprised: 0.1, neutral: 0.4, sad: 0.0 }`
);

// 2. Add isProcessing prop to CompanionStage
code = code.replace(
/isPortraitMode = false,\n\s*onModelLoaded/,
`isPortraitMode = false,
  isProcessing = false,
  onModelLoaded`
);
code = code.replace(
/isPortraitMode\?: boolean;\n\s*onModelLoaded\?: \(\) => void;/,
`isPortraitMode?: boolean;
  isProcessing?: boolean;
  onModelLoaded?: () => void;`
);

// 3. Add isProcessing to VRMModel
code = code.replace(
/emotion\?: string;\n\s*onProgress\?:/,
`emotion?: string;
  isProcessing?: boolean;
  onProgress?:`
);
code = code.replace(
/function VRMModel\(\{ url, emotion = 'warm', onProgress, onLoaded, onError, retryKey = 0 \}: VRMModelProps\) \{/,
`function VRMModel({ url, emotion = 'warm', isProcessing = false, onProgress, onLoaded, onError, retryKey = 0 }: VRMModelProps) {`
);

code = code.replace(
/emotion=\{emotion\}\n\s*onLoaded=\{/,
`emotion={emotion}
              isProcessing={isProcessing}
              onLoaded={`
);

// 4. Update useFrame for blush and processing
const gazeOld = /\/\/ 3\. Gaze tracking damping\n\s*lookTarget\.current\.position\.lerp\(targetLookAt\.current, 0\.08\);/;
const gazeNew = `      // 3. Gaze tracking damping
      let targetGaze = targetLookAt.current.clone();
      if (isProcessing) {
         // Attentive tilt/saccade toward center/input
         targetGaze.set(0, 1.15, 2.8);
      }
      lookTarget.current.position.lerp(targetGaze, 0.08);`;
code = code.replace(gazeOld, gazeNew);

const emotionOld = /vrm\.expressionManager\.setValue\('surprised', THREE\.MathUtils\.lerp\(surprisedVal, targetExpr\.surprised, safeDelta \* 3\)\);/;
const emotionNew = `vrm.expressionManager.setValue('surprised', THREE.MathUtils.lerp(surprisedVal, targetExpr.surprised, safeDelta * 3));

        const isBlush = emotion === 'affectionate' || emotion === 'shy';
        const currentBlush = vrm.expressionManager.getValue('blush') || 0;
        const targetBlush = isBlush ? 1.0 : 0.0;
        if (Math.abs(currentBlush - targetBlush) > 0.01) {
            vrm.expressionManager.setValue('blush', THREE.MathUtils.lerp(currentBlush, targetBlush, safeDelta * 3));
        }`;
code = code.replace(emotionOld, emotionNew);

const idleOld = /head\.rotation\.x = THREE\.MathUtils\.lerp\(head\.rotation\.x, 0\.05, 0\.1\);\n\s*\}\n\s*vrm\.update\(safeDelta\);/;
const idleNew = `head.rotation.x = THREE.MathUtils.lerp(head.rotation.x, 0.05, 0.1);
        }
        
        if (isProcessing) {
           head.rotation.x = THREE.MathUtils.lerp(head.rotation.x, 0.06, 0.1); // subtle downward attentive tilt
        }
      }
      vrm.update(safeDelta);`;
code = code.replace(
  /head\.rotation\.x = THREE\.MathUtils\.lerp\(head\.rotation\.x, Math\.sin\(time \* 1\.2\) \* -0\.02, 0\.1\);\n\s*\}\n\s*\}\n\s*vrm\.update\(safeDelta\);/,
  `head.rotation.x = THREE.MathUtils.lerp(head.rotation.x, Math.sin(time * 1.2) * -0.02, 0.1);
        }
        if (isProcessing) {
           head.rotation.x = THREE.MathUtils.lerp(head.rotation.x, 0.08, 0.1); // subtle downward attentive tilt
           head.rotation.z = THREE.MathUtils.lerp(head.rotation.z, 0.02, 0.1); // slight inquisitive head tilt
        }
      }

      vrm.update(safeDelta);`
);

// 5. Add pulsing ring in CompanionStage
const pulsingRingOld = /<div className="absolute inset-0 transition-colors duration-1000 bg-\[var\(--bg-base\)\]" \/>/;
const pulsingRingNew = `<div className="absolute inset-0 transition-colors duration-1000 bg-[var(--bg-base)]" />
      
      <AnimatePresence>
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="absolute bottom-32 w-16 h-16 rounded-full border-[3px] border-[var(--accent-primary)] z-20 pointer-events-none"
            style={{ 
              boxShadow: '0 0 20px var(--accent-primary), inset 0 0 20px var(--accent-primary)'
            }}
          >
            <motion.div 
              animate={{ scale: [1, 1.5], opacity: [0.6, 0] }} 
              transition={{ repeat: Infinity, duration: 1.5, ease: "easeOut" }}
              className="absolute inset-0 rounded-full border-[2px] border-[var(--accent-primary)]"
            />
          </motion.div>
        )}
      </AnimatePresence>`;
code = code.replace(pulsingRingOld, pulsingRingNew);

fs.writeFileSync('src/components/CompanionStage.tsx', code);
