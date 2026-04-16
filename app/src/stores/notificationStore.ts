import { create } from 'zustand'

interface NotificationState {
  unreadMessages: number
  addUnread: () => void
  clearUnread: () => void
}

export const useNotificationStore = create<NotificationState>((set) => ({
  unreadMessages: 0,
  addUnread: () => set((s) => ({ unreadMessages: s.unreadMessages + 1 })),
  clearUnread: () => set({ unreadMessages: 0 }),
}))
