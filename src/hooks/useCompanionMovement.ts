import { useRef, useEffect } from 'react';
import * as THREE from 'three';

export const ACTIONS = {
  IDLE: 'idle',
  WALK_FORWARD: 'walk_forward',
  WALK_BACKWARD: 'walk_backward',
  STRAFE_LEFT: 'strafe_left',
  STRAFE_RIGHT: 'strafe_right',
  TURN_LEFT: 'turn_left',
  TURN_RIGHT: 'turn_right',
  TURN_AROUND: 'turn_around',
  DANCE: 'dance',
};

const STAGE_RADIUS = 2.2;
const WALK_SPEED = 0.6;   // units per second
const TURN_SPEED = Math.PI * 0.6; // radians per second

export function useCompanionMovement(
  vrmScene: THREE.Group | null
) {
  const activeAction = useRef<string>(ACTIONS.IDLE);
  const targetRotationY = useRef<number | null>(null);

  useEffect(() => {
    const handleTrigger = (e: CustomEvent) => {
      const actionName = e.detail;
      if (!Object.values(ACTIONS).includes(actionName)) return;

      // @ts-ignore
      const crossfadeToAction = window.crossfadeToAction;
      if (!crossfadeToAction) return;

      activeAction.current = actionName;

      if (actionName === ACTIONS.DANCE) {
        crossfadeToAction(actionName, 0.3, false); // play once
      } else if (actionName.startsWith('turn_')) {
        const currentRot = vrmScene ? vrmScene.rotation.y : 0;
        if (actionName === ACTIONS.TURN_LEFT) targetRotationY.current = currentRot + Math.PI / 2;
        else if (actionName === ACTIONS.TURN_RIGHT) targetRotationY.current = currentRot - Math.PI / 2;
        else if (actionName === ACTIONS.TURN_AROUND) targetRotationY.current = currentRot + Math.PI;
        
        crossfadeToAction(actionName, 0.3, true);
      } else if (actionName.startsWith('walk_') || actionName.startsWith('strafe_')) {
        crossfadeToAction(actionName, 0.3, true);
      } else {
        crossfadeToAction(ACTIONS.IDLE, 0.5, true);
      }
    };

    window.addEventListener('lyraAction', handleTrigger as EventListener);
    return () => window.removeEventListener('lyraAction', handleTrigger as EventListener);
  }, [vrmScene]);

  const update = (delta: number) => {
    if (!vrmScene) return;

    // @ts-ignore
    const crossfadeToAction = window.crossfadeToAction;
    if (!crossfadeToAction) return;

    if (activeAction.current === ACTIONS.DANCE) {
      // DANCE completes on its own through mixer finished event, handled in VRMModel
    } else if (activeAction.current.startsWith('turn_') && targetRotationY.current !== null) {
      const diff = targetRotationY.current - vrmScene.rotation.y;
      
      // Normalize diff to -PI to PI
      let normalizedDiff = diff;
      while (normalizedDiff > Math.PI) normalizedDiff -= Math.PI * 2;
      while (normalizedDiff < -Math.PI) normalizedDiff += Math.PI * 2;
      
      if (Math.abs(normalizedDiff) < 0.05) {
        vrmScene.rotation.y = targetRotationY.current;
        activeAction.current = ACTIONS.IDLE;
        targetRotationY.current = null;
        crossfadeToAction(ACTIONS.IDLE, 0.3, true);
      } else {
        const step = Math.sign(normalizedDiff) * Math.min(TURN_SPEED * delta, Math.abs(normalizedDiff));
        vrmScene.rotation.y += step;
      }
    } else if (activeAction.current.startsWith('walk_') || activeAction.current.startsWith('strafe_')) {
      const moveDir = new THREE.Vector3();
      if (activeAction.current === ACTIONS.WALK_FORWARD) moveDir.set(0, 0, 1);
      else if (activeAction.current === ACTIONS.WALK_BACKWARD) moveDir.set(0, 0, -1);
      else if (activeAction.current === ACTIONS.STRAFE_LEFT) moveDir.set(1, 0, 0);
      else if (activeAction.current === ACTIONS.STRAFE_RIGHT) moveDir.set(-1, 0, 0);

      moveDir.applyEuler(new THREE.Euler(0, vrmScene.rotation.y, 0));
      moveDir.multiplyScalar(WALK_SPEED * delta);

      const nextPos = vrmScene.position.clone().add(moveDir);
      const dist = Math.sqrt(nextPos.x * nextPos.x + nextPos.z * nextPos.z);

      if (dist > STAGE_RADIUS) {
        // Trigger turn around
        activeAction.current = ACTIONS.TURN_AROUND;
        targetRotationY.current = vrmScene.rotation.y + Math.PI;
        crossfadeToAction(ACTIONS.TURN_AROUND, 0.3, true);
      } else {
        vrmScene.position.copy(nextPos);
      }
    }
  };

  return { activeAction, update };
}
