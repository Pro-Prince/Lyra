import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { VRM } from '@pixiv/three-vrm';
import { loadVRM } from '../lib/vrmLoader';
import { applyRestPose, applyRelaxedHandPose } from '../lib/poseUtils';

interface VRMPreviewCanvasProps {
  url: string;
  className?: string;
  interactive?: boolean;
  autoRotate?: boolean;
}

export function VRMPreviewCanvas({
  url,
  className = 'w-full h-full',
  interactive = true,
  autoRotate = true,
}: VRMPreviewCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    let isCancelled = false;
    let animFrameId: number;
    let renderer: THREE.WebGLRenderer | null = null;
    let vrmInstance: VRM | null = null;
    let modelGroup: THREE.Group | null = null;
    let isDragging = false;
    let previousMouseX = 0;
    let targetRotationY = 0;
    let currentRotationY = 0;

    const init = async () => {
      const container = containerRef.current;
      if (!container) return;

      try {
        setLoading(true);
        setError(null);

        const width = container.clientWidth || 300;
        const height = container.clientHeight || 340;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(28, width / height, 0.1, 20);

        // High-fidelity studio lighting setup
        const ambient = new THREE.AmbientLight(0xfff5f8, 2.6);
        const keyLight = new THREE.DirectionalLight(0xfffaf0, 1.8);
        keyLight.position.set(1.8, 3.5, 2.8);

        const fillLight = new THREE.DirectionalLight(0xf5e8ff, 1.1);
        fillLight.position.set(-2.0, 2.2, 2.2);

        const rimLight = new THREE.DirectionalLight(0xff99cc, 1.0);
        rimLight.position.set(0, 3.2, -2.6);

        const frontSoftLight = new THREE.DirectionalLight(0xffffff, 0.6);
        frontSoftLight.position.set(0, 1.2, 3.0);

        scene.add(ambient, keyLight, fillLight, rimLight, frontSoftLight);

        // Pedestal floor disk shadow
        const shadowGeo = new THREE.RingGeometry(0.01, 0.45, 48);
        const shadowMat = new THREE.MeshBasicMaterial({
          color: 0x1f142b,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.4,
        });
        const shadowDisk = new THREE.Mesh(shadowGeo, shadowMat);
        shadowDisk.rotation.x = Math.PI / 2;
        shadowDisk.position.set(0, 0.005, 0);
        scene.add(shadowDisk);

        renderer = new THREE.WebGLRenderer({
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(width, height);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.1;

        // Clear existing canvas children
        while (container.firstChild) {
          container.removeChild(container.firstChild);
        }
        container.appendChild(renderer.domElement);

        // Load actual VRM model file
        const vrm = await loadVRM(url, renderer);
        if (isCancelled) {
          vrm.scene.traverse((o) => {
            if ((o as THREE.Mesh).geometry) (o as THREE.Mesh).geometry.dispose();
          });
          return;
        }
        vrmInstance = vrm;

        // Apply natural upright relaxed pose
        applyRestPose(vrm);
        applyRelaxedHandPose(vrm, 'left');
        applyRelaxedHandPose(vrm, 'right');
        vrm.humanoid?.update();

        // Ensure proper skinning and no premature culling
        vrm.scene.traverse((child) => {
          if (!child.parent) child.parent = null;
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.frustumCulled = false;
            mesh.castShadow = false;
            mesh.receiveShadow = false;
          }
        });
        vrm.scene.updateMatrixWorld(true);

        // Calculate bounding box and center/ground the model precisely
        const box = new THREE.Box3().setFromObject(vrm.scene);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        vrm.scene.position.x -= center.x;
        vrm.scene.position.z -= center.z;
        vrm.scene.position.y -= box.min.y; // Ground feet at Y = 0
        vrm.scene.updateMatrixWorld(true);

        // Mount model inside an interactive turntable rotation group
        modelGroup = new THREE.Group();
        modelGroup.add(vrm.scene);
        scene.add(modelGroup);

        // Auto-frame camera to capture the full 3D outfit and presence
        const totalHeight = Math.max(1.3, size.y);
        const fovRad = camera.fov * (Math.PI / 180);
        const frameHeight = totalHeight * 0.96;
        const targetDistance = (frameHeight / 2) / Math.tan(fovRad / 2);
        const targetCenterY = totalHeight * 0.52;

        camera.position.set(0, targetCenterY, Math.max(1.8, targetDistance));
        camera.lookAt(0, targetCenterY, 0);

        // Immediate first render
        vrm.update(0);
        renderer.render(scene, camera);

        if (!isCancelled) {
          setLoading(false);
        }

        // Mouse / Touch Drag interaction
        const onMouseDown = (e: MouseEvent) => {
          if (!interactive) return;
          isDragging = true;
          previousMouseX = e.clientX;
        };

        const onMouseMove = (e: MouseEvent) => {
          if (!isDragging || !interactive) return;
          const deltaX = e.clientX - previousMouseX;
          targetRotationY += deltaX * 0.012;
          previousMouseX = e.clientX;
        };

        const onMouseUp = () => {
          isDragging = false;
        };

        const onTouchStart = (e: TouchEvent) => {
          if (!interactive || e.touches.length === 0) return;
          isDragging = true;
          previousMouseX = e.touches[0].clientX;
        };

        const onTouchMove = (e: TouchEvent) => {
          if (!isDragging || !interactive || e.touches.length === 0) return;
          const deltaX = e.touches[0].clientX - previousMouseX;
          targetRotationY += deltaX * 0.012;
          previousMouseX = e.touches[0].clientX;
        };

        const domElem = renderer.domElement;
        domElem.style.cursor = interactive ? 'grab' : 'default';
        domElem.addEventListener('mousedown', onMouseDown);
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        domElem.addEventListener('touchstart', onTouchStart, { passive: true });
        window.addEventListener('touchmove', onTouchMove, { passive: true });
        window.addEventListener('touchend', onMouseUp);

        const clock = new THREE.Clock();

        const animate = () => {
          if (isCancelled) return;
          animFrameId = requestAnimationFrame(animate);

          const delta = Math.min(clock.getDelta(), 0.035);
          const elapsed = clock.getElapsedTime();

          if (vrmInstance && modelGroup) {
            // Smooth idle turntable auto-rotate when not actively dragging
            if (autoRotate && !isDragging) {
              targetRotationY += delta * 0.42;
            }

            // Smooth interpolation (lerp) for natural turntable momentum
            currentRotationY += (targetRotationY - currentRotationY) * 0.12;
            modelGroup.rotation.y = currentRotationY;

            // Subtle natural breathing motion on spine
            const spine = vrmInstance.humanoid?.getNormalizedBoneNode('spine');
            if (spine) {
              spine.rotation.x = Math.sin(elapsed * 1.8) * 0.018;
            }

            vrmInstance.update(delta);
          }

          if (renderer) {
            renderer.render(scene, camera);
          }
        };

        animate();

        const handleResize = () => {
          if (!container || !renderer) return;
          const newW = container.clientWidth;
          const newH = container.clientHeight;
          if (newW === 0 || newH === 0) return;
          camera.aspect = newW / newH;
          camera.updateProjectionMatrix();
          renderer.setSize(newW, newH);
          if (vrmInstance) vrmInstance.update(0);
          renderer.render(scene, camera);
        };

        const resizeObserver = new ResizeObserver(handleResize);
        resizeObserver.observe(container);

        return () => {
          resizeObserver.disconnect();
          domElem.removeEventListener('mousedown', onMouseDown);
          window.removeEventListener('mousemove', onMouseMove);
          window.removeEventListener('mouseup', onMouseUp);
          domElem.removeEventListener('touchstart', onTouchStart);
          window.removeEventListener('touchmove', onTouchMove);
          window.removeEventListener('touchend', onMouseUp);
        };
      } catch (err: any) {
        console.error('Failed to render VRM preview:', err);
        if (!isCancelled) {
          setError(err?.message || 'Failed to load model');
          setLoading(false);
        }
      }
    };

    const cleanupPromise = init();

    return () => {
      isCancelled = true;
      cancelAnimationFrame(animFrameId);

      // Clean VRM geometries, materials, and textures
      if (vrmInstance) {
        vrmInstance.scene.traverse((o) => {
          const mesh = o as THREE.Mesh;
          if (mesh.isMesh) {
            if (mesh.geometry) mesh.geometry.dispose();
            if (mesh.material) {
              if (Array.isArray(mesh.material)) {
                mesh.material.forEach((m) => {
                  m.dispose();
                  for (const key in m) {
                    if (m[key] && typeof m[key].dispose === 'function') {
                      m[key].dispose();
                    }
                  }
                });
              } else {
                mesh.material.dispose();
                for (const key in mesh.material) {
                  // @ts-ignore
                  if (mesh.material[key] && typeof mesh.material[key].dispose === 'function') {
                    // @ts-ignore
                    mesh.material[key].dispose();
                  }
                }
              }
            }
          }
        });
      }

      if (renderer) {
        try {
          renderer.forceContextLoss?.();
          renderer.getContext()?.getExtension('WEBGL_lose_context')?.loseContext();
          renderer.dispose();
        } catch {}
      }
      cleanupPromise.then((cleanup) => {
        if (typeof cleanup === 'function') cleanup();
      });
    };
  }, [url, interactive, autoRotate, retryKey]);

  const retryRender = (e: React.MouseEvent) => {
    e.stopPropagation();
    setError(null);
    setLoading(true);
    setRetryKey((k) => k + 1);
  };

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative w-full h-full overflow-hidden select-none ${className}`}
    >
      <div ref={containerRef} className="w-full h-full" />

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[var(--bg-surface)]/90 backdrop-blur-sm transition-opacity duration-300 z-10">
          <div className="w-7 h-7 border-2 border-[var(--accent-primary)]/30 border-t-[var(--accent-primary)] rounded-full animate-spin mb-2" />
          <span className="text-[11px] font-body text-[var(--text-muted)] font-medium">Loading 3D Model…</span>
        </div>
      )}

      {/* Interactive 3D Rotation Badge */}
      {!loading && !error && interactive && (
        <div
          className={`absolute bottom-2.5 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-full bg-[var(--bg-elevated)] backdrop-blur-md border border-[var(--text-primary)]/10 text-[10px] font-body text-[var(--text-primary)]/80 pointer-events-none transition-opacity duration-300 ${
            isHovered ? 'opacity-100' : 'opacity-70'
          }`}
        >
          Drag to rotate 3D
        </div>
      )}

      {/* Quiet Error Fallback */}
      {error && !loading && (
        <div className="outfit-card-fallback absolute inset-0 flex flex-col items-center justify-center bg-[var(--bg-surface)]/90 backdrop-blur-sm text-center p-3 z-10 gap-2 font-body">
          <span className="text-[11px] font-body text-[var(--text-muted)]">Preview unavailable</span>
          <button
            type="button"
            onClick={retryRender}
            className="text-[10px] font-body font-semibold text-[var(--accent-primary)] hover:underline bg-[var(--accent-primary)]/10 hover:bg-[var(--accent-primary)]/20 border border-[var(--accent-primary)]/20 px-2.5 py-1 rounded-lg transition-all cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
