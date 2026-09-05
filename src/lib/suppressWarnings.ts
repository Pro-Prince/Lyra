import * as THREE from 'three';

/**
 * Safely converts an argument into a primitive value (string, number, boolean)
 * so that iframe console wrappers attempting JSON.stringify never encounter circular references.
 */
function toSafeConsoleArg(arg: any): any {
  if (arg === null || arg === undefined) return arg;
  const type = typeof arg;
  if (type === 'string' || type === 'number' || type === 'boolean') return arg;
  if (arg instanceof Error) return `[Error: ${arg.message}]`;
  if (arg.isObject3D) return `[Object3D: ${arg.type || 'Object3D'} (${arg.name || 'unnamed'})]`;
  if (arg.isMaterial) return `[Material: ${arg.type || 'Material'}]`;
  if (arg.isTexture) return `[Texture: ${arg.name || 'Texture'}]`;
  if (arg.scene && arg.humanoid) return `[VRM: ${arg.meta?.name || 'VRM Model'}]`;
  if (arg.scene && arg.parser) return `[GLTF Object]`;
  if (typeof arg === 'function') return `[Function: ${arg.name || 'anonymous'}]`;
  
  // Try safe simple stringification for plain objects, otherwise fallback to constructor name
  try {
    const seen = new WeakSet();
    return JSON.stringify(arg, (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) return '[Circular]';
        seen.add(value);
        if (value.isObject3D || (value.scene && value.humanoid) || value.isMaterial) {
          return `[${value.constructor?.name || 'Object'}]`;
        }
      }
      return value;
    });
  } catch {
    return `[${arg?.constructor?.name || 'Object'}]`;
  }
}

function sanitizeArgs(args: any[]): any[] {
  return args.map(toSafeConsoleArg);
}

// 1. Configure Three.js internal console handler
if (typeof (THREE as any).setConsoleFunction === 'function') {
  (THREE as any).setConsoleFunction((type: string, message: string, ...params: any[]) => {
    if (
      typeof message === 'string' &&
      (message.includes('Clock:') ||
       message.includes('THREE.Clock') ||
       message.includes('removeUnnecessaryJoints') ||
       message.includes('combineSkeletons') ||
       message.includes("Couldn't load texture") ||
       message.includes('Failed to load texture'))
    ) {
      return;
    }
    const logFn = (console as any)[type] || console.warn;
    const safeParams = sanitizeArgs(params);
    logFn.call(console, message, ...safeParams);
  });
}

// 2. Intercept global console.log
const origLog = console.log;
console.log = function (...args: any[]) {
  origLog.apply(console, sanitizeArgs(args));
};

// 3. Intercept global console.info
const origInfo = console.info;
console.info = function (...args: any[]) {
  origInfo.apply(console, sanitizeArgs(args));
};

// 4. Intercept global console.warn
const origWarn = console.warn;
console.warn = function (...args: any[]) {
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const argStr = typeof arg === 'string' ? arg : (arg?.message || String(arg));
    if (
      argStr.includes('THREE.Clock') ||
      argStr.includes('Clock:') ||
      argStr.includes('THREE.Timer') ||
      argStr.includes('removeUnnecessaryJoints') ||
      argStr.includes('combineSkeletons') ||
      argStr.includes("Couldn't load texture") ||
      argStr.includes('Failed to load texture')
    ) {
      return;
    }
  }
  origWarn.apply(console, sanitizeArgs(args));
};

// 5. Intercept global console.error
const origError = console.error;
console.error = function (...args: any[]) {
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const argStr = typeof arg === 'string' ? arg : (arg?.message || String(arg));
    if (
      argStr.includes('[vite] failed to connect to websocket') ||
      argStr.includes('WebSocket closed without opened') ||
      argStr.includes('WebSocket connection to') ||
      (argStr.includes('failed to connect') && argStr.includes('websocket')) ||
      argStr.includes("Couldn't load texture") ||
      argStr.includes('Failed to load texture')
    ) {
      return;
    }
  }
  origError.apply(console, sanitizeArgs(args));
};
