import { create } from "zustand";
import notificationService from "../services/notificationService";

const fallbackNotifications = [
  {
    id: "demo-1",
    title: "Welcome to HomeTutor",
    message: "Your notifications will appear here as soon as the platform sends them.",
    notificationType: "GENERAL",
    priority: "MEDIUM",
    createdAt: new Date().toISOString(),
    isRead: false,
  },
];

const normalizeNotification = (item) => ({
  ...item,
  id: item.id,
  isRead: Boolean(item.isRead || item.readAt),
  notificationType: item.notificationType || item.type || "GENERAL",
  priority: item.priority || "MEDIUM",
});

const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  refreshing: false,
  error: null,
  offlinePreview: false,

  loadNotifications: async ({ silent = false } = {}) => {
    if (!silent) set({ loading: true, error: null });
    try {
      const [items, unreadCount] = await Promise.all([
        notificationService.getNotifications(),
        notificationService.getUnreadCount(),
      ]);
      const notifications = items.map(normalizeNotification);
      set({
        notifications,
        unreadCount,
        loading: false,
        refreshing: false,
        error: null,
        offlinePreview: false,
      });
    } catch (error) {
      const message = error?.response?.data?.message || "Could not load notifications.";
      const current = get().notifications;
      set({
        notifications: current.length ? current : fallbackNotifications,
        unreadCount: current.length ? current.filter((item) => !item.isRead).length : 1,
        loading: false,
        refreshing: false,
        error: message,
        offlinePreview: true,
      });
    }
  },

  refreshNotifications: async () => {
    set({ refreshing: true });
    await get().loadNotifications({ silent: true });
  },

  markRead: async (notificationId) => {
    const previous = get().notifications;
    const next = previous.map((item) => (item.id === notificationId ? { ...item, isRead: true } : item));
    set({ notifications: next, unreadCount: next.filter((item) => !item.isRead).length });
    try {
      await notificationService.markRead(notificationId);
    } catch {
      set({ notifications: previous, unreadCount: previous.filter((item) => !item.isRead).length });
    }
  },

  markAllRead: async () => {
    const previous = get().notifications;
    const next = previous.map((item) => ({ ...item, isRead: true }));
    set({ notifications: next, unreadCount: 0 });
    try {
      await notificationService.markAllRead();
    } catch {
      set({ notifications: previous, unreadCount: previous.filter((item) => !item.isRead).length });
    }
  },

  clearRead: async () => {
    const previous = get().notifications;
    const next = previous.filter((item) => !item.isRead);
    set({ notifications: next, unreadCount: next.filter((item) => !item.isRead).length });
    try {
      await notificationService.clearRead();
    } catch {
      set({ notifications: previous, unreadCount: previous.filter((item) => !item.isRead).length });
    }
  },
}));

export default useNotificationStore;
