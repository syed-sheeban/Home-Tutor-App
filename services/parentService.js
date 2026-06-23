import api from "./api";

export const parentService = {
  getParentDashboard: async () => {
    const response = await api.get("/parent-dashboard");
    return response.data;
  },

  getParentTutors: async () => {
    const response = await api.get("/parent-dashboard/tutors");
    return response.data;
  },

  createParentBooking: async (bookingPayload) => {
    const response = await api.post("/parent-dashboard/bookings", bookingPayload);
    return response.data;
  },
};

export default parentService;
