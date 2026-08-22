import * as THREE from 'three';

// 1. Configure Three.js internal console handler to drop Clock deprecation warnings
if (typeof (THREE as any).setConsoleFunction === 'function') {
  (THREE as any).setConsoleFunction((type: string, message: string, ...params: any[]) => {
    if (
      typeof message === 'string' &&
      (message.includes('Clock:') ||
       message.includes('THREE.Clock') ||
       message.includes('removeUnnecessaryJoints') ||
       message.includes('combineSkeletons'))
    ) {
      return;
    }
    const logFn = (console as any)[type] || console.warn;
    logFn.call(console, message, ...params);
  });
}

// 2. Intercept global console.warn
const origWarn = console.warn;
console.warn = function (...args: any[]) {
  const msg = args[0];
  if (
    typeof msg === 'string' &&
    (msg.includes('THREE.Clock') ||
     msg.includes('Clock:') ||
     msg.includes('THREE.Timer') ||
     msg.includes('removeUnnecessaryJoints') ||
     msg.includes('combineSkeletons'))
  ) {
    return;
  }
  for (let i = 0; i < args.length; i++) {
    const argStr = String(args[i]);
    if (
      argStr.includes('THREE.Clock') ||
      argStr.includes('THREE.Timer') ||
      argStr.includes('removeUnnecessaryJoints')
    ) {
      return;
    }
  }
  origWarn.apply(console, args);
};

// 3. Intercept global console.error
const origError = console.error;
console.error = function (...args: any[]) {
  for (let i = 0; i < args.length; i++) {
    const argStr = String(args[i]);
    if (
      argStr.includes('[vite] failed to connect to websocket') ||
      argStr.includes('WebSocket closed without opened') ||
      argStr.includes('WebSocket connection to') ||
      (argStr.includes('failed to connect') && argStr.includes('websocket'))
    ) {
      return;
    }
  }
  origError.apply(console, args);
};
