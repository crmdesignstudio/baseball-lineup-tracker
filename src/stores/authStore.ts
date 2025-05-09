import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  email: string | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      email: null,
      token: null,
      isAuthenticated: false,
      login: (email: string, token: string) => set({ email, token, isAuthenticated: true }),
      logout: () => set({ email: null, token: null, isAuthenticated: false }),
    }),
    {
      name: 'auth-storage',
    }
  )
); 