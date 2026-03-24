import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';

type AppStateCallback = (state: AppStateStatus) => void;

export function useAppState(onForeground?: AppStateCallback, onBackground?: AppStateCallback) {
  const appState = useRef(AppState.currentState);
  const onForegroundRef = useRef(onForeground);
  const onBackgroundRef = useRef(onBackground);

  // Keep refs up to date without causing re-subscriptions
  onForegroundRef.current = onForeground;
  onBackgroundRef.current = onBackground;

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        onForegroundRef.current?.(nextAppState);
      }

      if (
        appState.current === 'active' &&
        nextAppState.match(/inactive|background/)
      ) {
        onBackgroundRef.current?.(nextAppState);
      }

      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return appState;
}
