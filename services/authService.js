import api from "./api";

export const authService = {
  login: async (email, password) => {
    const response = await api.post("/auth/login", { email, password });
    return response.data;
  },

  signup: async (payload) => {
    const response = await api.post("/auth/signup", payload);
    return response.data;
  },

  logout: async () => {
    // We try to notify the backend, but we clear client session regardless
    try {
      const response = await api.post("/auth/logout");
      return response.data;
    } catch (error) {
      console.warn("Backend logout failed or not supported", error);
      return { success: true };
    }
  },
};

export default authService;
