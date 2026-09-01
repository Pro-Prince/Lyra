import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { VRM } from '@pixiv/three-vrm';
import { ArrowRight, Check } from 'lucide-react';
import { loadCompanionModel, safeUpdateVRM } from '../lib/companionRenderer';
import { frameOutfit } from '../lib/poseUtils';
import { useOutfitThumbnail } from '../lib/outfitCache';

export function useDragRotate(onDrag: (deltaX: number) => void) {
  const isDragging = useRef(false);
  const lastX = useRef(0);
  const totalMovement = useRef(0);

  return {
    onPointerDown: (e: React.PointerEvent) => {
      isDragging.current = true;
      lastX.current = e.clientX;
      totalMovement.current = 0;
      try {
        (e.currentTarget as HTMLElement)?.setPointerCapture?.(e.pointerId);
      } catch {}
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (!isDragging.current) return;
      const deltaX = e.clientX - lastX.current;
      lastX.current = e.clientX;
      totalMovement.current += Math.abs(deltaX);
      onDrag(deltaX);
    },
    onPointerUp: (e: React.PointerEvent) => {
      isDragging.current = false;
      try {
        (e.currentTarget as HTMLElement)?.releasePointerCapture?.(e.pointerId);
      } catch {}
    },
    onPointerLeave: () => {
      isDragging.current = false;
    },
    onPointerCancel: (e: React.PointerEvent) => {
      isDragging.current = false;
      try {
        (e.currentTarget as HTMLElement)?.releasePointerCapture?.(e.pointerId);
      } catch {}
    },
    hasDragged: () => totalMovement.current > 4
  };
}

export function setupCardScene(
  vrm: VRM,
  container: HTMLDivElement,
  rendererRef: React.MutableRefObject<THREE.WebGLRenderer | null>,
  modelRef: React.MutableRefObject<VRM | null>,
  sceneRef: React.MutableRefObject<THREE.Scene | null>,
  cameraRef: React.MutableRefObject<THREE.PerspectiveCamera | null>
) {
  const width = Math.max(container.clientWidth, 64);
  const height = Math.max(container.clientHeight, 64);

  // Scene
  const scene = new THREE.Scene();
  sceneRef.current = scene;

  // Lighting tuned for wardrobe preview clarity
  const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
  const keyLight = new THREE.DirectionalLight(0xfff8f0, 1.4);
  keyLight.position.set(1.5, 2.5, 2.0);
  const fillLight = new THREE.DirectionalLight(0xf0e8ff, 0.8);
  fillLight.position.set(-1.5, 1.5, 1.5);
  scene.add(ambientLight, keyLight, fillLight);

  // Camera
  const camera = new THREE.PerspectiveCamera(28, width / height, 0.1, 20);
  cameraRef.current = camera;

  // Renderer - created once, rendering on-demand
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'low-power',
    preserveDrawingBuffer: true
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width, height);
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.pointerEvents = 'none';

  // Mount canvas into DOM
  container.innerHTML = '';
  container.appendChild(renderer.domElement);
  rendererRef.current = renderer;

  // Attach VRM
  modelRef.current = vrm;
  scene.add(vrm.scene);

  // Frame outfit
  frameOutfit(vrm.scene, camera, height);
  vrm.scene.updateMatrixWorld(true);
}

export interface WardrobeCardProps {
  modelId: string;
  label: string;
  tag?: string;
  isSelected?: boolean;
  onSelect?: () => void;
  className?: string;
  showRotateHint?: boolean;
  useFeatureStyle?: boolean;
}

export function WardrobeCard({
  modelId,
  label,
  tag,
  isSelected = false,
  onSelect,
  className = '',
  showRotateHint = true,
  useFeatureStyle = false
}: WardrobeCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const modelRef = useRef<VRM | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rotationRef = useRef(0);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  function renderFrame() {
    if (!rendererRef.current || !sceneRef.current || !cameraRef.current || !modelRef.current || !modelRef.current.scene) return;
    try {
      modelRef.current.scene.rotation.y = rotationRef.current;
      safeUpdateVRM(modelRef.current, 0);
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    } catch (e) {
      console.warn('[WardrobeCard renderFrame] Exception:', e);
    }
  }

  function handleDrag(deltaX: number) {
    rotationRef.current += deltaX * 0.01;
    renderFrame(); // render only when rotation actually changes, not every frame regardless
  }

  const dragHandlers = useDragRotate(handleDrag);

  useEffect(() => {
    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;
    rotationRef.current = 0;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const vrm = await loadCompanionModel(modelId); // same cache, same guarantees as everywhere else
        if (cancelled || !containerRef.current) return;

        setupCardScene(vrm, containerRef.current, rendererRef, modelRef, sceneRef, cameraRef);
        renderFrame(); // one frame, not a continuous loop
        setLoading(false);

        // Render on resize only (e.g. drawer opening transition), not continuously
        if (containerRef.current) {
          resizeObserver = new ResizeObserver(() => {
            if (!containerRef.current || !rendererRef.current || !cameraRef.current || !modelRef.current) return;
            const w = containerRef.current.clientWidth;
            const h = containerRef.current.clientHeight;
            if (w === 0 || h === 0) return;
            cameraRef.current.aspect = w / h;
            cameraRef.current.updateProjectionMatrix();
            rendererRef.current.setSize(w, h);
            frameOutfit(modelRef.current.scene, cameraRef.current, h);
            renderFrame();
          });
          resizeObserver.observe(containerRef.current);
        }
      } catch (err: any) {
        console.error(`Failed to load wardrobe model ${modelId}:`, err);
        if (!cancelled) {
          setError(err?.message || 'Failed to load model');
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (rendererRef.current) {
        try {
          rendererRef.current.forceContextLoss?.();
          rendererRef.current.getContext()?.getExtension('WEBGL_lose_context')?.loseContext();
          rendererRef.current.dispose();
        } catch {}
        if (rendererRef.current.domElement?.parentElement) {
          rendererRef.current.domElement.parentElement.removeChild(rendererRef.current.domElement);
        }
        rendererRef.current = null;
      }
      if (sceneRef.current && modelRef.current?.scene) {
        sceneRef.current.remove(modelRef.current.scene);
      }
      modelRef.current = null;
      sceneRef.current = null;
      cameraRef.current = null;
    };
  }, [modelId]);

  const { hasDragged, ...pointerHandlers } = dragHandlers;

  const handleClick = () => {
    if (hasDragged()) return; // Don't trigger select if user was dragging to rotate
    if (onSelect) onSelect();
  };

  return (
    <div
      className={`outfit-card group relative cursor-pointer select-none transition-all duration-300 ${
        isSelected 
          ? "bg-[var(--accent-primary)]/[0.05] border-[var(--accent-primary)]/40" 
          : "bg-[var(--bg-surface)] border-[var(--text-primary)]/10"
      } p-4 rounded-2xl border ${className}`}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      {...pointerHandlers}
    >
      {/* 3D Canvas Container */}
      <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-black/20 border border-[var(--text-primary)]/5">
        <div ref={containerRef} className="outfit-card-canvas w-full h-full" />

        {/* Loading placeholder */}
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[var(--bg-surface)] z-10">
            <div className="w-6 h-6 border-2 border-[var(--accent-primary)]/30 border-t-[var(--accent-primary)] rounded-full animate-spin mb-2" />
            <span className="text-[10px] font-body text-[var(--text-muted)]">Loading 3D…</span>
          </div>
        )}

        {/* Error Fallback */}
        {error && !loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[var(--bg-surface)] p-2 text-center z-10">
            <span className="text-[10px] text-[var(--text-muted)]">Model unavailable</span>
          </div>
        )}

        {/* Drag to rotate hint badge */}
        {!loading && !error && showRotateHint && (
          <div
            className={`absolute bottom-1.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-[var(--bg-base)] border border-[var(--text-primary)]/10 text-[9px] font-body text-[var(--text-primary)]/70 pointer-events-none transition-opacity duration-200 ${
              isHovered ? 'opacity-100' : 'opacity-0'
            }`}
          >
            Drag to turn
          </div>
        )}
      </div>

      {/* Label and Info */}
      <div className="mt-5 flex flex-col items-center text-center w-full">
        <span className={`outfit-label font-heading text-lg sm:text-xl truncate w-full transition-colors mb-3 ${isSelected ? 'text-[var(--accent-primary)] font-semibold' : 'text-[var(--text-primary)] font-semibold group-hover:text-[var(--accent-primary)]'}`}>
          {label}
        </span>
        
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelect?.();
          }}
          className="btn btn-primary btn-sm w-full group/btn"
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            <span>Wear this look</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
          </span>
        </button>
      </div>
    </div>
  );
}

export default WardrobeCard;
