export interface EmotionMapping {
  expression: string;
  glowShift: string; // #FF8FC0, #C9A6FF, or #FFD9B3
  gesture: string;
}

export const EMOTION_MAP: Record<string, EmotionMapping> = {
  warm: {
    expression: 'happy',
    glowShift: '#FF8FC0',
    gesture: 'nod',
  },
  playful: {
    expression: 'happy',
    glowShift: '#C9A6FF',
    gesture: 'tilt',
  },
  thoughtful: {
    expression: 'relaxed',
    glowShift: '#FFD9B3',
    gesture: 'look_away',
  },
  excited: {
    expression: 'surprised',
    glowShift: '#FF8FC0',
    gesture: 'wave',
  },
  calm: {
    expression: 'relaxed',
    glowShift: '#C9A6FF',
    gesture: 'breathe',
  },
  happy: {
    expression: 'happy',
    glowShift: '#FF8FC0',
    gesture: 'nod',
  },
  curious: {
    expression: 'relaxed',
    glowShift: '#FFD9B3',
    gesture: 'tilt',
  },
  soft: {
    expression: 'relaxed',
    glowShift: '#C9A6FF',
    gesture: 'breathe',
  }
};

export function getEmotionMapping(tag?: string): EmotionMapping {
  if (!tag) return EMOTION_MAP['warm'];
  const clean = tag.toLowerCase().replace(/\[|\]/g, '').trim();
  return EMOTION_MAP[clean] || EMOTION_MAP['warm'];
}
