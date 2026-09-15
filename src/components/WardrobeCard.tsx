import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { VRM } from '@pixiv/three-vrm';
import { ArrowRight, Check, Loader2, RotateCcw } from 'lucide-react';
import { loadCompanionModel, safeUpdateVRM, disposeVRM } from '../lib/companionRenderer';
import { frameOutfit, applyRestPose, settleVRMPhysics } from '../lib/poseUtils';
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
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
  const keyLight = new THREE.DirectionalLight(0xfff8f0, 1.2);
  keyLight.position.set(1.5, 2.5, 2.0);
  const fillLight = new THREE.DirectionalLight(0xf0e8ff, 0.8);
  fillLight.position.set(-1.5, 1.5, 1.5);
  scene.add(ambientLight, keyLight, fillLight);

  // Camera
  const camera = new THREE.PerspectiveCamera(28, width / height, 0.1, 20);
  cameraRef.current = camera;

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  // Renderer - created once
  const renderer = new THREE.WebGLRenderer({
    antialias: !isMobile, // Disable AA on mobile to save memory
    alpha: true,
    powerPreference: 'low-power',
    preserveDrawingBuffer: false // Reduced memory footprint
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setPixelRatio(isMobile ? 1 : Math.min(window.devicePixelRatio || 1, 2));
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

  // Apply rest pose & fully settle physics so skirts, dresses, and hair hang naturally
  applyRestPose(vrm);
  settleVRMPhysics(vrm, 100, 0.016);
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
  selectedText?: string;
  unselectedText?: string;
  compact?: boolean;
  loadDelay?: number;
}

export function WardrobeCard({
  modelId,
  label,
  tag,
  isSelected = false,
  onSelect,
  className = '',
  showRotateHint = true,
  useFeatureStyle = false,
  selectedText = 'Currently wearing',
  unselectedText = 'Wear this look',
  compact = false,
  loadDelay = 0
}: WardrobeCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const modelRef = useRef<VRM | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rotationRef = useRef(0);
  const onDragDeltaRef = useRef<((deltaX: number) => void) | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isInView, setIsInView] = useState(true);

  // Use IntersectionObserver to pause rendering when scrolled far offscreen
  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof IntersectionObserver === 'undefined') {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setIsInView(true);
      }
    }, { threshold: 0, rootMargin: '200px' });

    observer.observe(container);
    return () => observer.disconnect();
  }, [retryKey]);

  const dragHandlers = useDragRotate((deltaX: number) => {
    onDragDeltaRef.current?.(deltaX);
  });

  const handleRetry = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setError(null);
    setLoading(true);
    setRetryKey(prev => prev + 1);
  };

  useEffect(() => {
    // Prevent loading heavy 3D scene if offscreen
    if (!isInView) return;

    let cancelled = false;
    let animId: number | null = null;
    let delayTimer: any = null;
    let safetyTimeoutTimer: any = null;
    let resizeObserver: ResizeObserver | null = null;
    const container = containerRef.current;
    if (!container) return;

    rotationRef.current = 0;

    const renderCard = () => {
      if (rendererRef.current && sceneRef.current && cameraRef.current && modelRef.current?.scene) {
        modelRef.current.scene.rotation.y = rotationRef.current;
        safeUpdateVRM(modelRef.current, 0.016);
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };

    let velocity = 0;
    const stepMomentum = () => {
      if (Math.abs(velocity) > 0.0003) {
        velocity *= 0.90;
        rotationRef.current += velocity;
        renderCard();
        animId = requestAnimationFrame(stepMomentum);
      } else {
        velocity = 0;
        animId = null;
        renderCard();
      }
    };

    onDragDeltaRef.current = (deltaX: number) => {
      rotationRef.current += deltaX * 0.012;
      velocity = deltaX * 0.006;
      renderCard();
      if (animId === null && Math.abs(velocity) > 0.0003) {
        animId = requestAnimationFrame(stepMomentum);
      }
    };

    (async () => {
      try {
        setLoading(true);
        setError(null);

        // Safety fallback timer to prevent infinite spinner if load hangs
        safetyTimeoutTimer = setTimeout(() => {
          if (!cancelled && loading) {
            console.warn(`[WardrobeCard] Load timeout reached for ${modelId}`);
            setError('Loading timed out');
            setLoading(false);
          }
        }, 12000);

        if (loadDelay > 0) {
          await new Promise((r) => {
            delayTimer = setTimeout(r, loadDelay);
          });
        }
        if (cancelled || !containerRef.current) return;

        const vrm = await loadCompanionModel(modelId);

        if (cancelled || !containerRef.current) return;

        setupCardScene(vrm, containerRef.current, rendererRef, modelRef, sceneRef, cameraRef);

        // Initial render with model and skirt fully settled
        renderCard();

        // Run a short 20-frame settle loop to ensure GPU pipeline flushes cleanly and rests
        let settleFrames = 20;
        const settleStep = () => {
          if (cancelled) return;
          renderCard();
          settleFrames--;
          if (settleFrames > 0) {
            animId = requestAnimationFrame(settleStep);
          } else {
            animId = null;
          }
        };
        settleStep();

        // Resize observer
        if (containerRef.current) {
          resizeObserver = new ResizeObserver((entries) => {
            if (!containerRef.current || !rendererRef.current || !cameraRef.current || !modelRef.current) return;
            const { width, height } = entries[0].contentRect;
            if (width === 0 || height === 0) return;
            cameraRef.current.aspect = width / height;
            cameraRef.current.updateProjectionMatrix();
            rendererRef.current.setSize(width, height);
            frameOutfit(modelRef.current.scene, cameraRef.current, height);
            renderCard();
          });
          resizeObserver.observe(containerRef.current);
        }

        if (safetyTimeoutTimer) clearTimeout(safetyTimeoutTimer);
        setLoading(false);
      } catch (err: any) {
        console.error(`Failed to load wardrobe model ${modelId}:`, err?.message || String(err));
        if (safetyTimeoutTimer) clearTimeout(safetyTimeoutTimer);
        if (!cancelled) {
          setError(err?.message || 'Failed to load model');
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (delayTimer) {
        clearTimeout(delayTimer);
        delayTimer = null;
      }
      if (safetyTimeoutTimer) {
        clearTimeout(safetyTimeoutTimer);
        safetyTimeoutTimer = null;
      }
      if (animId !== null) {
        cancelAnimationFrame(animId);
        animId = null;
      }
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (rendererRef.current) {
        try {
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
      if (modelRef.current) {
        try {
          disposeVRM(modelRef.current);
        } catch {}
      }
      modelRef.current = null;
      sceneRef.current = null;
      cameraRef.current = null;
      onDragDeltaRef.current = null;
    };
  }, [isInView, modelId, retryKey, loadDelay]);

  const { hasDragged, ...pointerHandlers } = dragHandlers;

  return (
    <div
      className={`outfit-card group relative select-none transition-all duration-300 ${
        isSelected 
          ? "bg-[var(--accent-primary)]/[0.05] border-[var(--accent-primary)]/40" 
          : "bg-[var(--bg-surface)] border-[var(--text-primary)]/10"
      } ${compact ? 'p-4 md:p-3.5 rounded-2xl' : 'p-4 rounded-2xl'} border ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 3D Canvas Container */}
      <div 
        className="relative w-full aspect-square rounded-xl overflow-hidden bg-black/20 border border-[var(--text-primary)]/5 cursor-grab active:cursor-grabbing touch-none"
        {...pointerHandlers}
      >
        <div ref={containerRef} className="outfit-card-canvas w-full h-full" />

        {/* Loading placeholder */}
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[var(--bg-surface)] z-10">
            <div className="w-6 h-6 border-2 border-[var(--accent-primary)]/30 border-t-[var(--accent-primary)] rounded-full animate-spin mb-2" />
            <span className="text-[10px] font-body text-[var(--text-muted)]">Loading 3D…</span>
          </div>
        )}

        {/* Error Fallback with Try Again button */}
        {error && !loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[var(--bg-surface)]/95 p-3 text-center z-10">
            <div className="w-8 h-8 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <span className="text-[11px] font-medium text-rose-300 mb-0.5">Could not load preview</span>
            <span className="text-[9px] text-[var(--text-muted)] mb-2 max-w-[120px] leading-tight">
              Tap below to retry loading
            </span>
            <button
              type="button"
              onClick={handleRetry}
              className="px-2.5 py-1 rounded-lg bg-[var(--accent-primary)]/15 hover:bg-[var(--accent-primary)]/25 border border-[var(--accent-primary)]/30 text-[var(--accent-primary)] text-[11px] font-medium flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-sm"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Try Again</span>
            </button>
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
      <div className={`${compact ? 'mt-4 md:mt-4' : 'mt-5'} flex flex-col items-center text-center w-full`}>
        <span className={`outfit-label font-heading ${compact ? 'text-base md:text-lg mb-2 md:mb-2.5' : 'text-lg sm:text-xl mb-3'} truncate w-full transition-colors ${isSelected ? 'text-[var(--accent-primary)] font-semibold' : 'text-[var(--text-primary)] font-semibold group-hover:text-[var(--accent-primary)]'}`}>
          {label}
        </span>
        
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelect?.();
          }}
          className={`btn ${isSelected ? 'btn-secondary' : 'btn-primary'} ${compact ? 'btn-sm !h-10 md:!h-9 !py-0 !px-4 md:!px-3 text-sm md:text-xs' : 'btn-sm'} w-full group/btn`}
        >
          <span className="relative z-10 flex items-center justify-center gap-1 sm:gap-2">
            {isSelected ? (
              <>
                <Check className={`${compact ? 'w-3.5 h-3.5 sm:w-4 sm:h-4' : 'w-4 h-4'} text-[var(--accent-primary)] shrink-0`} />
                <span className="truncate">{selectedText}</span>
              </>
            ) : (
              <>
                <span className="truncate">{unselectedText}</span>
                <ArrowRight className={`${compact ? 'w-3.5 h-3.5 sm:w-4 sm:h-4' : 'w-4 h-4'} shrink-0 transition-transform group-hover/btn:translate-x-1`} />
              </>
            )}
          </span>
        </button>
      </div>
    </div>
  );
}

export default WardrobeCard;
