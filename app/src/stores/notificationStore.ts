import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface NotificationState {
  // Mensajes no leídos — persiste en localStorage
  unreadMessages: number
  addUnread: () => void
  clearUnread: () => void

  // Notificaciones no leídas (likes, comentarios, seguidores)
  unreadNotifs: number
  setUnreadNotifs: (n: number) => void
  addUnreadNotif: () => void
  clearUnreadNotifs: () => void

  // Timestamp de la última vez que el usuario abrió /notifications
  lastNotifAt: string
  setLastNotifAt: (ts: string) => void

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

      unreadNotifs: 0,
      setUnreadNotifs: (n) => set({ unreadNotifs: n }),
      addUnreadNotif:  () => set((s) => ({ unreadNotifs: s.unreadNotifs + 1 })),
      clearUnreadNotifs: () => set({ unreadNotifs: 0 }),

      lastNotifAt: new Date(0).toISOString(),
      setLastNotifAt: (ts) => set({ lastNotifAt: ts }),

      readNotifIds: [],
      markRead: (ids) =>
        set((s) => ({ readNotifIds: [...new Set([...s.readNotifIds, ...ids])] })),
      clearReadNotifs: () => set({ readNotifIds: [] }),
    }),
    { name: 'respawn-notifications' }
  )
)
