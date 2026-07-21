import { io } from "socket.io-client";
import { API_BASE_URL } from "./api";
import useAuthStore from "../store/authStore";

const socketOrigin = API_BASE_URL.replace(/\/api\/?$/, "");

export function subscribeToDashboardUpdates(onUpdate) {
  const { isAuthenticated, user, role } = useAuthStore.getState();
  if (!isAuthenticated) return undefined;

  const socket = io(socketOrigin, { transports: ["websocket", "polling"] });
  socket.emit("notification:subscribe", {
    role: role || user?.role,
    userId: user?.id,
  });
  socket.on("dashboard:update", (payload) => onUpdate?.(payload));

  return () => socket.disconnect();
}

export function shouldRefreshDashboard(payload) {
  const reason = String(payload?.reason || "");
  return (
    reason.startsWith("schedule-") ||
    reason.startsWith("payment-") ||
    reason.startsWith("withdraw-") ||
    reason === "review-saved" ||
    reason === "progress-created"
  );
}
