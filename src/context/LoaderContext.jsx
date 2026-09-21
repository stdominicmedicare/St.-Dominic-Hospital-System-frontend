/**
 * Global platform loader – show/hide by event (signup, login, data, session, save).
 */
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import PlatformLoader from '../components/common/PlatformLoader';

const LoaderContext = createContext(null);

export function LoaderProvider({ children }) {
  const [state, setState] = useState({
    visible: false,
    event: 'default',
    title: undefined,
    message: undefined,
  });

  const showLoader = useCallback((event = 'default', options = {}) => {
    setState({
      visible: true,
      event,
      title: options.title,
      message: options.message,
    });
  }, []);

  const hideLoader = useCallback(() => {
    setState((prev) => ({ ...prev, visible: false }));
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      showLoader,
      hideLoader,
    }),
    [state, showLoader, hideLoader]
  );

  return (
    <LoaderContext.Provider value={value}>
      {children}
      <PlatformLoader
        visible={state.visible}
        event={state.event}
        title={state.title}
        message={state.message}
      />
    </LoaderContext.Provider>
  );
}

export function usePlatformLoader() {
  const ctx = useContext(LoaderContext);
  if (!ctx) {
    throw new Error('usePlatformLoader must be used within LoaderProvider');
  }
  return ctx;
}
