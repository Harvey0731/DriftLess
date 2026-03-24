import { AppState } from 'react-native';
import { renderHook } from '@testing-library/react-native';
import { useAppState } from '../useAppState';

// Mock AppState.addEventListener
const listeners: Array<(state: string) => void> = [];
const mockRemove = jest.fn();

jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
  listeners.push(listener as (state: string) => void);
  return { remove: mockRemove } as any;
});

// Helper to simulate AppState changes
function simulateAppStateChange(newState: string) {
  listeners.forEach((listener) => listener(newState));
}

beforeEach(() => {
  jest.clearAllMocks();
  listeners.length = 0;
  // Reset AppState.currentState to 'active'
  Object.defineProperty(AppState, 'currentState', {
    value: 'active',
    writable: true,
  });
});

describe('useAppState', () => {
  it('subscribes to AppState changes on mount', () => {
    renderHook(() => useAppState());
    expect(AppState.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('calls onForeground when app comes to foreground from background', () => {
    const onForeground = jest.fn();
    // Start as background
    Object.defineProperty(AppState, 'currentState', { value: 'background', writable: true });

    renderHook(() => useAppState(onForeground));
    simulateAppStateChange('active');
    expect(onForeground).toHaveBeenCalledWith('active');
  });

  it('calls onBackground when app goes to background from active', () => {
    const onBackground = jest.fn();
    Object.defineProperty(AppState, 'currentState', { value: 'active', writable: true });

    renderHook(() => useAppState(undefined, onBackground));
    simulateAppStateChange('background');
    expect(onBackground).toHaveBeenCalledWith('background');
  });

  it('does not call onForeground when going active to active', () => {
    const onForeground = jest.fn();
    Object.defineProperty(AppState, 'currentState', { value: 'active', writable: true });

    renderHook(() => useAppState(onForeground));
    simulateAppStateChange('active');
    expect(onForeground).not.toHaveBeenCalled();
  });

  it('cleans up event listener on unmount', () => {
    const { unmount } = renderHook(() => useAppState());
    unmount();
    expect(mockRemove).toHaveBeenCalled();
  });

  it('calls onForeground when transitioning from inactive to active', () => {
    const onForeground = jest.fn();
    Object.defineProperty(AppState, 'currentState', { value: 'inactive', writable: true });

    renderHook(() => useAppState(onForeground));
    simulateAppStateChange('active');
    expect(onForeground).toHaveBeenCalledWith('active');
  });

  it('returns a ref with the current appState', () => {
    const { result } = renderHook(() => useAppState());
    expect(result.current).toBeDefined();
    expect(result.current.current).toBeDefined();
  });
});
