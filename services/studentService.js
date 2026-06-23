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

  respondToSchedule: async (scheduleId, action, message = "") => {
    const response = await api.put(`/student-dashboard/schedules/${scheduleId}/respond`, {
      action,
      message,
    });
    return response.data;
  },

  saveReview: async (tutorId, review) => {
    const response = await api.put(`/student-dashboard/reviews/${tutorId}`, review);
    return response.data;
  },
};

export default studentService;
