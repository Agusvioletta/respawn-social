import { create } from 'zustand'
import type { Profile } from '@/lib/types/database'

interface AuthState {
  user: (Profile & { email: string }) | null
  setUser: (user: (Profile & { email: string }) | null) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}))
