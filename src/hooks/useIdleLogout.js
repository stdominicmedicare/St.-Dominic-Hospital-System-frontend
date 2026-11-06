/**
 * Signs the user out after IDLE_TIMEOUT_MS of no mouse/keyboard/touch activity.
 * Spec (screen 15): auto log-out when idle = 15 minutes.
 */
import { useEffect, useRef } from 'react';
import { IDLE_TIMEOUT_MS } from '../utils/passwordPolicy';

export { IDLE_TIMEOUT_MS };

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];

export function useIdleLogout({ enabled, onIdle }) {
  const timerRef = useRef(null);
  const onIdleRef = useRef(onIdle);
  onIdleRef.current = onIdle;

  useEffect(() => {
    if (!enabled) return undefined;

    const reset = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        onIdleRef.current?.();
      }, IDLE_TIMEOUT_MS);
    };

    reset();
    ACTIVITY_EVENTS.forEach((ev) => window.addEventListener(ev, reset, { passive: true }));

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      ACTIVITY_EVENTS.forEach((ev) => window.removeEventListener(ev, reset));
    };
  }, [enabled]);
}
