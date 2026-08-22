export enum AppState {
  IDLE = 'IDLE',
  LISTENING = 'LISTENING',
  PROCESSING = 'PROCESSING',
  SPEAKING = 'SPEAKING'
}

import { useState } from 'react';

export function useAppState() {
  const [state, setState] = useState<AppState>(AppState.IDLE);

  return {
    state,
    setState,
  };
}
