import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { User } from '@/api/types';

interface AuthState {
  token: string | null;
  user: User | null;
  setSession: (token: string, user: User) => void;
  setUser: (user: User) => void;
  clear: () => void;
}

/**
 * Global auth state. The token is kept in sessionStorage (cleared when the tab closes),
 * never in source code or localStorage. It is sent only by the API client.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setSession: (token, user) => set({ token, user }),
      setUser: (user) => set({ user }),
      clear: () => set({ token: null, user: null }),
    }),
    { name: 'mood-music-auth', storage: createJSONStorage(() => sessionStorage) },
  ),
);
