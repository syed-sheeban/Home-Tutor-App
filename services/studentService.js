import api from "./api";

export const studentService = {
  getStudentDashboard: async () => {
    const response = await api.get("/student-dashboard");
    return response.data;
  },

  createBooking: async (bookingPayload) => {
    const response = await api.post("/bookings", bookingPayload);
    return response.data;
  },
};

export default studentService;
