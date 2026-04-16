import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface NotificationState {
  // Mensajes no leídos — persiste en localStorage
  unreadMessages: number
  addUnread: () => void
  clearUnread: () => void

  // IDs de notificaciones ya leídas — persiste en localStorage
  readNotifIds: string[]
  markRead: (ids: string[]) => void
  clearReadNotifs: () => void
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      unreadMessages: 0,
      addUnread:    () => set((s) => ({ unreadMessages: s.unreadMessages + 1 })),
      clearUnread:  () => set({ unreadMessages: 0 }),

      readNotifIds: [],
      markRead: (ids) =>
        set((s) => ({ readNotifIds: [...new Set([...s.readNotifIds, ...ids])] })),
      clearReadNotifs: () => set({ readNotifIds: [] }),
    }),
    { name: 'respawn-notifications' }
  )
)
