// ============================================================================
// KetakKetik — Profile Hook
// ============================================================================

import { useState, useCallback, useEffect } from 'react';
import { Profile, ThemeMode } from '@app/types/ui';

const STORAGE_KEY_PROFILES = 'ketakketik-profiles';
const STORAGE_KEY_ACTIVE = 'ketakketik-active-profile';

/** Generate a simple UUID v4-like identifier */
function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Create a default profile */
function createDefaultProfile(name: string): Profile {
  const now = Date.now();
  return {
    id: generateId(),
    name,
    avatar: '',
    theme: 'auto' as ThemeMode,
    createdAt: now,
    lastActive: now,
    active: true,
  };
}

/** Load profiles from localStorage */
function loadProfiles(): Profile[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_PROFILES);
    if (stored) {
      const parsed = JSON.parse(stored) as Profile[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    /* ignore corrupt data */
  }
  // Default first profile
  return [createDefaultProfile('Default')];
}

/** Save profiles to localStorage */
function saveProfiles(profiles: Profile[]): void {
  localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(profiles));
}

/**
 * React hook providing profile state management.
 * Handles current profile, profile list, switching, creation, and deletion.
 */
export function useProfile(): {
  current: Profile;
  list: Profile[];
  switchProfile: (id: string) => void;
  createProfile: (name: string) => void;
  deleteProfile: (id: string) => void;
  refreshCurrent: () => void;
} {
  const [list, setList] = useState<Profile[]>(loadProfiles);
  const [currentId, setCurrentId] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY_ACTIVE) || list[0]?.id || '';
  });

  // Derive current profile from list
  const current =
    list.find((p) => p.id === currentId && p.active) || list[0] || createDefaultProfile('Default');

  // Persist active profile
  useEffect(() => {
    if (current.id) {
      localStorage.setItem(STORAGE_KEY_ACTIVE, current.id);
    }
  }, [current.id]);

  const switchProfile = useCallback(
    (id: string): void => {
      const updated = list.map((p) => ({
        ...p,
        active: p.id === id,
        lastActive: p.id === id ? Date.now() : p.lastActive,
      }));
      setList(updated);
      saveProfiles(updated);
      setCurrentId(id);
    },
    [list],
  );

  const createProfile = useCallback(
    (name: string): void => {
      const newProfile = createDefaultProfile(name);
      const updated = [
        ...list.map((p) => ({ ...p, active: false })),
        { ...newProfile, active: true },
      ];
      setList(updated);
      saveProfiles(updated);
      setCurrentId(newProfile.id);
    },
    [list],
  );

  const deleteProfile = useCallback(
    (id: string): void => {
      if (list.length <= 1) return; // Never delete the last profile
      const remaining = list.filter((p) => p.id !== id);
      const newActive =
        id === currentId ? remaining[0].id : current.id;
      setList(remaining);
      saveProfiles(remaining);
      if (id === currentId) {
        setCurrentId(newActive);
      }
    },
    [list, currentId, current],
  );

  const refreshCurrent = useCallback((): void => {
    const profiles = loadProfiles();
    setList(profiles);
    const active = profiles.find((p) => p.active);
    if (active) {
      setCurrentId(active.id);
    }
  }, []);

  return {
    current,
    list,
    switchProfile,
    createProfile,
    deleteProfile,
    refreshCurrent,
  };
}
