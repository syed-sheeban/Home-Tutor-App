import api from "./api";

export const adminService = {
  getTutorRequests: async () => {
    const response = await api.get("/admin/tutor-requests");
    return response.data;
  },

  getDashboardStats: async () => {
    const response = await api.get("/admin/dashboard-stats");
    return response.data;
  },

  getUsers: async () => {
    const response = await api.get("/admin/users");
    return response.data;
  },

  processTutorRequest: async (tutorId, action) => {
    // action should be "approve" or "reject"
    const response = await api.put(`/admin/${action}-tutor/${tutorId}`);
    return response.data;
  },

  getTutorDocuments: async (tutorId, mode) => {
    const response = await api.get(`/admin/tutor-documents/${tutorId}/${mode}`);
    return response.data;
  },
};

export default adminService;
