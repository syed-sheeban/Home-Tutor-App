import api from "./api";

const unwrapList = (data) => (Array.isArray(data) ? data : data?.notifications || []);

export const notificationService = {
  getNotifications: async (params = {}) => {
    const response = await api.get("/notifications", { params });
    return unwrapList(response.data);
  },

  getUnreadCount: async () => {
    const response = await api.get("/notifications/unread-count");
    return Number(response.data?.count || response.data?.unread || 0);
  },

  markRead: async (notificationId) => {
    const response = await api.put(`/notifications/${notificationId}/read`);
    return response.data;
  },

  markAllRead: async () => {
    const response = await api.put("/notifications/read-all");
    return response.data;
  },

  clearRead: async () => {
    const response = await api.delete("/notifications/clear-read");
    return response.data;
  },
};

export default notificationService;
