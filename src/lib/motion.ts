import type { Variants, Transition } from "motion/react";

/**
 * Signature easing curve & durations for the Lyra design system:
 * --ease-signature: cubic-bezier(0.16, 1, 0.3, 1)
 * --duration-entrance: 650ms
 * --duration-feedback: 180ms
 */
export const SIGNATURE_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export const entranceTransition: Transition = {
  duration: 0.45,
  ease: SIGNATURE_EASE,
};

export const entranceVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: entranceTransition,
  },
};

export const groupVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

/**
 * Quiet crossfade transition for page route changes & multi-step forms
 */
export const pageCrossfadeTransition: Transition = {
  duration: 0.24,
  ease: SIGNATURE_EASE,
};

export const pageCrossfadeVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: pageCrossfadeTransition },
  exit: { opacity: 0, transition: { duration: 0.16, ease: SIGNATURE_EASE } },
};
