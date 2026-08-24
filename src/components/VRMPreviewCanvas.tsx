import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { VRM } from '@pixiv/three-vrm';
import { loadVRM } from '../lib/vrmLoader';
import { applyRestPose, applyRelaxedHandPose } from '../lib/poseUtils';

interface VRMPreviewCanvasProps {
  url: string;
  className?: string;
}

export function VRMPreviewCanvas({ url, className = 'w-full h-full' }: VRMPreviewCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;
    let animFrameId: number;
    let renderer: THREE.WebGLRenderer | null = null;
    let vrmInstance: VRM | null = null;

    const init = async () => {
      const container = containerRef.current;
      if (!container) return;

      try {
        setLoading(true);
        setError(null);

        const width = container.clientWidth || 160;
        const height = container.clientHeight || 160;

        const scene = new THREE.Scene();

        const camera = new THREE.PerspectiveCamera(24, width / height, 0.1, 15);
        
        // Balanced studio lighting
        const ambient = new THREE.AmbientLight(0xfff5f8, 1.2);
        const key = new THREE.DirectionalLight(0xfff8f0, 1.3);
        key.position.set(1.5, 3.0, 2.5);
        const fill = new THREE.DirectionalLight(0xf0e6ff, 0.8);
        fill.position.set(-1.5, 2.0, 2.0);
        scene.add(ambient, key, fill);

        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(width, height);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.0;

        container.appendChild(renderer.domElement);

        // Load the actual VRM file
        const vrm = await loadVRM(url);
        if (isCancelled) {
          vrm.scene.traverse((o) => {
            if ((o as THREE.Mesh).geometry) (o as THREE.Mesh).geometry.dispose();
          });
          return;
        }
        vrmInstance = vrm;

        // Apply clean standard natural pose
        applyRestPose(vrm);
        applyRelaxedHandPose(vrm, 'left');
        applyRelaxedHandPose(vrm, 'right');
        vrm.humanoid?.update();

        scene.add(vrm.scene);

        // Frame camera on the upper body & outfit
        const box = new THREE.Box3().setFromObject(vrm.scene);
        const totalHeight = box.max.y - box.min.y;
        const topY = box.max.y + 0.04;
        const bottomY = box.min.y + totalHeight * 0.28;
        const targetHeight = topY - bottomY;
        const fov = camera.fov * (Math.PI / 180);
        const distance = (targetHeight * 1.18) / (2 * Math.tan(fov / 2));
        const centerY = (topY + bottomY) / 2;

        camera.position.set(0, centerY, Math.max(1.1, distance));
        camera.lookAt(0, centerY, 0);

        if (!isCancelled) {
          setLoading(false);
        }

        const clock = new THREE.Clock();

        const animate = () => {
          if (isCancelled) return;
          animFrameId = requestAnimationFrame(animate);

          const delta = clock.getDelta();
          const elapsed = clock.getElapsedTime();

          if (vrmInstance) {
            // Subtle breathing motion
            const spine = vrmInstance.humanoid?.getNormalizedBoneNode('spine');
            if (spine) {
              spine.rotation.x = Math.sin(elapsed * 1.8) * 0.015;
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
        };

        const resizeObserver = new ResizeObserver(handleResize);
        resizeObserver.observe(container);

        return () => {
          resizeObserver.disconnect();
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
      if (renderer) {
        renderer.dispose();
        if (renderer.domElement && renderer.domElement.parentNode) {
          renderer.domElement.parentNode.removeChild(renderer.domElement);
        }
      }
      cleanupPromise.then((cleanup) => {
        if (typeof cleanup === 'function') cleanup();
      });
    };
  }, [url]);

  return (
    <div ref={containerRef} className={`relative overflow-hidden ${className}`}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[var(--bg-surface)]">
          <div className="w-5 h-5 border-2 border-[var(--accent-primary)]/30 border-t-[var(--accent-primary)] rounded-full animate-spin" />
        </div>
      )}
      {error && !loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[var(--bg-surface)] text-xs text-[var(--text-muted)] text-center p-2">
          Model Preview
        </div>
      )}
    </div>
  );
}
