import { useCallback, useEffect } from 'react';
import type { TravelPreferences, UserProfile } from '../../shared/types';
import { apiFetch, setInMemoryAuthToken } from '../lib/api';
import { useSessionStore } from '../store/session.store';

let authInitPromise: Promise<UserProfile | null> | null = null;

export function useAuth() {
  const profile = useSessionStore((s) => s.profile);
  const preferences = useSessionStore((s) => s.preferences);
  const calendarConnected = useSessionStore((s) => s.calendarConnected);
  const authLoading = useSessionStore((s) => s.authLoading);
  const setAuthState = useSessionStore((s) => s.setAuthState);

  const refreshMe = useCallback(
    async (showLoading = false) => {
      if (showLoading) {
        setAuthState({ authLoading: true });
      }
      try {
        const data = await apiFetch<{
          authenticated: boolean;
          profile: UserProfile | null;
          preferences: TravelPreferences | null;
          calendarConnected: boolean;
        }>('/api/auth/session');

        setAuthState({
          profile: data.profile,
          preferences: data.preferences,
          calendarConnected: data.calendarConnected,
          authLoading: false,
        });
        return data.profile;
      } catch {
        setAuthState({
          profile: null,
          preferences: null,
          calendarConnected: false,
          authLoading: false,
        });
        return null;
      }
    },
    [setAuthState],
  );

  useEffect(() => {
    if (!authInitPromise) {
      authInitPromise = refreshMe(true);
    }
  }, [refreshMe]);

  const signInDemo = useCallback(async () => {
    const res = await apiFetch<{
      profile: UserProfile;
      preferences: TravelPreferences;
      token: string;
    }>('/api/auth/demo', { method: 'POST' });
    setInMemoryAuthToken(res.token);
    setAuthState({
      profile: res.profile,
      preferences: res.preferences,
      authLoading: false,
    });
    return res.profile;
  }, [setAuthState]);

  const signInEmail = useCallback(
    async (email: string, fullName?: string) => {
      const res = await apiFetch<{
        profile: UserProfile;
        preferences: TravelPreferences;
        token: string;
      }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, fullName }),
      });
      setInMemoryAuthToken(res.token);
      setAuthState({
        profile: res.profile,
        preferences: res.preferences,
        authLoading: false,
      });
      return res.profile;
    },
    [setAuthState],
  );

  const signOut = useCallback(async () => {
    await apiFetch('/api/auth/logout', { method: 'POST' });
    setInMemoryAuthToken(null);
    useSessionStore.getState().resetSession();
    setAuthState({
      profile: null,
      preferences: null,
      calendarConnected: false,
      authLoading: false,
    });
  }, [setAuthState]);

  return {
    profile,
    preferences,
    calendarConnected,
    authLoading,
    refreshMe: () => refreshMe(false),
    signInDemo,
    signInEmail,
    signOut,
  };
}
