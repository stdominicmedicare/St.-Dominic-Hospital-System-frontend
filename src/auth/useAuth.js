import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../services/supabase';
import { apiGet, apiPost } from '../services/api';
import { ROLE_ROUTES } from '../utils/constants';

/** Profile fetch timeout (ms). Prevents auth bootstrap from hanging. */
const PROFILE_FETCH_TIMEOUT_MS = 8_000; // Further reduced since backend is fast

/** If onAuthStateChange hasn't resolved session after this, we call getSession() as fallback. */
const BOOTSTRAP_FALLBACK_MS = 300; // Reduced for faster response

/**
 * Fetch profile from backend GET /api/auth/me (service role, no RLS issues).
 * Returns { data, error }. Does not throw.
 */
async function fetchProfileWithTimeout() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PROFILE_FETCH_TIMEOUT_MS);

  try {
    const data = await apiGet('/api/auth/me', { signal: controller.signal });
    clearTimeout(timeoutId);
    return { data: data && (data.id || data.role) ? data : null, error: null };
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      return { data: null, error: new Error('Profile load timeout') };
    }
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * useAuth – production-safe auth with proper deduplication and state management.
 *
 * FIXES:
 * 1. Handles React StrictMode double mounting
 * 2. Prevents duplicate SIGNED_IN event handling
 * 3. Proper cleanup on unmount
 * 4. Debounced profile fetching
 * 5. Single source of truth for session state
 */
export function useAuth() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState(null);
  const [error, setError] = useState(null);
  
  // Refs for tracking state and preventing race conditions
  const mountedRef = useRef(true);
  const listenerFiredRef = useRef(false);
  const sessionInitializedRef = useRef(false);
  const profileFetchInProgressRef = useRef(false);
  const currentUserIdRef = useRef(null);
  const subscriptionRef = useRef(null);
  
  /** Single source of truth: loading = we don't know session yet, or we're still loading profile for current user */
  const loading = sessionLoading || (!!user && profileLoading);

  const setProfileFromUser = useCallback(async (userId) => {
    // Skip if same user and profile already loaded
    if (currentUserIdRef.current === userId && profile && !profileError) {
      console.log('[useAuth] Profile already loaded for this user, skipping');
      return;
    }

    // Prevent duplicate profile fetches
    if (profileFetchInProgressRef.current) {
      console.log('[useAuth] Profile fetch already in progress, skipping');
      return;
    }

    currentUserIdRef.current = userId;
    profileFetchInProgressRef.current = true;
    setProfileLoading(true);
    setProfileError(null);
    
    console.log('[useAuth] Fetching profile for user:', userId);
    const { data, error: fetchErr } = await fetchProfileWithTimeout();
    
    if (!mountedRef.current) {
      profileFetchInProgressRef.current = false;
      return;
    }
    
    setProfile(data || null);
    setProfileError(fetchErr?.message || null);
    
    if (fetchErr) {
      console.error('[useAuth] Profile fetch failed:', fetchErr.message);
    } else if (data) {
      console.log('[useAuth] Profile loaded successfully:', data.role);
    }
    
    setProfileLoading(false);
    profileFetchInProgressRef.current = false;
  }, [profile, profileError]);

  useEffect(() => {
    mountedRef.current = true;

    // If session is already initialized, don't run bootstrap again
    // This prevents re-initialization on navigation and StrictMode remounts
    if (sessionInitializedRef.current) {
      console.log('[useAuth] Session already initialized, skipping bootstrap');
      return;
    }

    console.log('[useAuth] Initializing auth session');
    listenerFiredRef.current = false;

    function applySession(session, skipProfileFetch = false) {
      console.log('[useAuth] Applying session:', session ? 'logged in' : 'logged out');
      
      if (!session?.user) {
        setUser(null);
        setProfile(null);
        setProfileLoading(false);
        setProfileError(null);
        setError(null);
        setSessionLoading(false);
        sessionInitializedRef.current = true;
        currentUserIdRef.current = null;
        return;
      }
      
      setUser(session.user);
      setSessionLoading(false);
      sessionInitializedRef.current = true;
      
      if (!skipProfileFetch) {
        setProfileFromUser(session.user.id);
      }
    }

    // Primary bootstrap: onAuthStateChange
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mountedRef.current) return;

        console.log('[useAuth] Auth state change:', event);
        listenerFiredRef.current = true;

        switch (event) {
          case 'SIGNED_OUT':
            setUser(null);
            setProfile(null);
            setProfileLoading(false);
            setProfileError(null);
            setError(null);
            setSessionLoading(false);
            sessionInitializedRef.current = false;
            currentUserIdRef.current = null;
            profileFetchInProgressRef.current = false;
            break;

          case 'TOKEN_REFRESHED':
            // Token refreshed - update user but keep existing profile
            if (session?.user) {
              setUser(session.user);
              console.log('[useAuth] Token refreshed, keeping existing profile');
            }
            break;

          case 'INITIAL_SESSION':
            // Initial session on mount
            if (session?.user && !sessionInitializedRef.current) {
              applySession(session);
            }
            break;

          case 'SIGNED_IN':
            // Always apply on sign-in. Bootstrap may have already marked the session
            // as initialized while logged out; ignoring this left Login stuck with user=null.
            if (session?.user) {
              const sameUserAlreadyLoaded =
                sessionInitializedRef.current &&
                currentUserIdRef.current === session.user.id;
              if (sameUserAlreadyLoaded) {
                console.log('[useAuth] SIGNED_IN for current user — keeping session');
                setUser(session.user);
              } else {
                applySession(session);
              }
            }
            break;

          default:
            break;
        }
      }
    );

    subscriptionRef.current = subscription;

    // Fallback: if listener hasn't fired after a short delay, check session manually
    const fallbackId = setTimeout(async () => {
      if (listenerFiredRef.current || !mountedRef.current || sessionInitializedRef.current) {
        return;
      }
      
      console.log('[useAuth] Fallback: checking session via getSession()');
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mountedRef.current) return;
        listenerFiredRef.current = true;
        applySession(session);
      } catch (err) {
        console.error('[useAuth] Fallback getSession failed:', err);
        if (mountedRef.current) {
          listenerFiredRef.current = true;
          setUser(null);
          setProfile(null);
          setSessionLoading(false);
          setProfileLoading(false);
          sessionInitializedRef.current = true;
        }
      }
    }, BOOTSTRAP_FALLBACK_MS);

    return () => {
      console.log('[useAuth] Cleanup: unsubscribing');
      mountedRef.current = false;
      clearTimeout(fallbackId);
      subscriptionRef.current?.unsubscribe();
      subscriptionRef.current = null;
    };
  }, [setProfileFromUser]);

  const signIn = useCallback(async (email, password) => {
    setError(null);
    console.log('[useAuth] Signing in...');

    try {
      // Phase 5: pre-check lockout / suspend before Supabase password auth
      try {
        await apiPost('/api/auth/check-lock', { email });
      } catch (lockErr) {
        const msg = lockErr?.message || 'Account locked or suspended';
        const code = lockErr?.data?.code;
        setError(msg);
        return { error: msg, code };
      }

      const { data, error: e } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (e) {
        console.error('[useAuth] Sign in failed:', e.message);

        // Record failed attempt for lockout + audit (best-effort)
        try {
          await apiPost('/api/auth/failed-login', {
            email,
            reason: e.message || 'Invalid login credentials',
          });
        } catch (failErr) {
          if (failErr?.data?.code === 'ACCOUNT_LOCKED') {
            const msg = failErr.message || 'Account locked after failed logins';
            setError(msg);
            return { error: msg, code: 'ACCOUNT_LOCKED' };
          }
        }

        let errorMessage = e.message;
        if (e.message.includes('Failed to fetch') || e.message.includes('ERR_NAME_NOT_RESOLVED')) {
          errorMessage = 'Cannot connect to Supabase. Please check your Supabase URL in .env file. The project might not exist or the URL is incorrect.';
        } else if (e.message.includes('Invalid login credentials')) {
          errorMessage = 'Invalid email or password. Please check your credentials.';
        }

        setError(errorMessage);
        return { error: errorMessage };
      }

      console.log('[useAuth] Sign in successful');
      if (data?.session?.user && mountedRef.current) {
        setUser(data.session.user);
        setSessionLoading(false);
        sessionInitializedRef.current = true;
        setProfileFromUser(data.session.user.id);
      }

      // Reset lockout counters + audit login (authenticated)
      try {
        await apiPost('/api/auth/login-success', {});
      } catch (auditErr) {
        console.warn('[useAuth] login-success audit failed:', auditErr?.message);
      }

      return { data };
    } catch (err) {
      console.error('[useAuth] Sign in error:', err);

      let errorMessage = err.message;
      if (err.message.includes('Failed to fetch') || err.message.includes('ERR_NAME_NOT_RESOLVED')) {
        errorMessage = 'Network error: Cannot connect to Supabase. Please verify your Supabase project URL in the .env file.';
      }

      setError(errorMessage);
      return { error: errorMessage };
    }
  }, [setProfileFromUser]);

  const signOut = useCallback(async (reason = 'manual') => {
    setError(null);
    console.log('[useAuth] Signing out...', reason);

    try {
      try {
        await apiPost('/api/auth/logout', { reason });
      } catch {
        /* best-effort audit */
      }
      await supabase.auth.signOut();
      console.log('[useAuth] Sign out successful');
    } catch (err) {
      console.warn('[useAuth] signOut failed:', err);
    } finally {
      if (mountedRef.current) {
        setUser(null);
        setProfile(null);
        setProfileLoading(false);
        setProfileError(null);
        setSessionLoading(false);
        sessionInitializedRef.current = false;
        currentUserIdRef.current = null;
        profileFetchInProgressRef.current = false;
      }
    }
  }, []);

  const refreshProfile = useCallback(() => {
    console.log('[useAuth] Refreshing profile...');
    if (user?.id) {
      profileFetchInProgressRef.current = false; // Reset flag
      currentUserIdRef.current = null; // Force refetch
      setProfileFromUser(user.id);
    }
  }, [user?.id, setProfileFromUser]);

  const dashboardPath = profile?.role && ROLE_ROUTES[profile.role]
    ? ROLE_ROUTES[profile.role]
    : null;

  return {
    user,
    profile,
    role: profile?.role ?? null,
    loading,
    sessionLoading,
    profileLoading,
    error,
    profileError,
    signIn,
    signOut,
    refreshProfile,
    dashboardPath,
    isAuthenticated: !!user,
  };
}