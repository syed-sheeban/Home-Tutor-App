import api from "./api";

export const tutorService = {
  getTutors: async (params = {}) => {
    const response = await api.get("/tutors", { params });
    return response.data;
  },

  getTutorsNearby: async (lat, lng, params = {}) => {
    const response = await api.get("/tutors/nearby", {
      params: { lat, lng, ...params },
    });
    return response.data;
  },

  getTutorApplication: async () => {
    const response = await api.get("/tutors/me/application");
    return response.data;
  },

  updateTutorApplication: async (payload) => {
    if (payload.qualificationFile?.uri) {
      const formData = new FormData();

      Object.entries(payload).forEach(([key, value]) => {
        if (key === "qualificationFile") return;
        if (value === undefined || value === null) return;
        if (Array.isArray(value)) {
          formData.append(key, JSON.stringify(value));
          return;
        }
        formData.append(key, String(value));
      });

      formData.append("qualificationFile", {
        uri: payload.qualificationFile.uri,
        name: payload.qualificationFile.name || payload.qualificationFileName || "qualification-certificate",
        type: payload.qualificationFile.mimeType || "application/octet-stream",
      });

      try {
        const response = await api.put("/tutors/me/application", formData, {
          headers: { "Content-Type": "multipart/form-data" },
          transformRequest: (data) => data,
        });
        return response.data;
      } catch (error) {
        const fallbackPayload = { ...payload };
        delete fallbackPayload.qualificationFile;
        fallbackPayload.qualificationFileName =
          payload.qualificationFileName || payload.qualificationFile.name || "qualification-certificate";

        const response = await api.put("/tutors/me/application", fallbackPayload);
        return response.data;
      }
    }

    const response = await api.put("/tutors/me/application", payload);
    return response.data;
  },

  getTutorDashboard: async () => {
    const response = await api.get("/tutor-dashboard");
    return response.data;
  },

  respondToBooking: async (bookingId, status) => {
    const response = await api.put(`/tutor-dashboard/booking/${bookingId}`, { status });
    return response.data;
  },
};

export default tutorService;
