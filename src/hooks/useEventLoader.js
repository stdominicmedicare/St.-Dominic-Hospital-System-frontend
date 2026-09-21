/**
 * Show the platform loader while `active` is true.
 * Event: signup | login | session | data | save | default
 */
import { useEffect } from 'react';
import { usePlatformLoader } from '../context/LoaderContext';

export function useEventLoader(active, event = 'data', options = {}) {
  const { showLoader, hideLoader } = usePlatformLoader();

  useEffect(() => {
    if (active) {
      showLoader(event, options);
      return () => hideLoader();
    }
    hideLoader();
    return undefined;
    // options is intentionally not a dep — pass stable values or inline literals
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, event, showLoader, hideLoader]);
}
