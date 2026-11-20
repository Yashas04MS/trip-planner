import type { SessionSnapshot, TravelPreferences, UserProfile } from '../../shared/types';
import { store } from '../lib/store';

export interface LoadedSessionMemory {
  profile: UserProfile;
  preferences: TravelPreferences;
  snapshot: SessionSnapshot;
}

export async function loadSessionMemory(sessionId: string): Promise<LoadedSessionMemory | null> {
  const snapshot = await store.getSessionSnapshot(sessionId);
  if (!snapshot) return null;
  const [profile, preferences] = await Promise.all([
    store.getProfile(snapshot.session.user_id),
    store.getPreferences(snapshot.session.user_id),
  ]);
  return { profile, preferences, snapshot };
}
