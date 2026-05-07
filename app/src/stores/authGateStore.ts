import { create } from 'zustand'

interface AuthGateState {
  open: boolean
  show: () => void
  hide: () => void
}

export const useAuthGateStore = create<AuthGateState>((set) => ({
  open: false,
  show: () => set({ open: true }),
  hide: () => set({ open: false }),
}))
