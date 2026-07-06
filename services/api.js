import axios from "axios";
import Constants from "expo-constants";
import { Platform } from "react-native";
import useAuthStore from "../store/authStore";

const normalizeApiUrl = (value) => {
  const trimmed = String(value || "").trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
};

const getExpoHost = () => {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoClient?.hostUri ||
    Constants.manifest?.debuggerHost;

  return String(hostUri || "").split(":")[0];
};

const getLocalApiBaseUrl = () => {
  const configuredUrl =
    process.env.EXPO_PUBLIC_API_BASE_URL ||
    Constants.expoConfig?.extra?.apiBaseUrl;

  if (configuredUrl) return normalizeApiUrl(configuredUrl);

  const expoHost = getExpoHost();
  if (expoHost && !["localhost", "127.0.0.1"].includes(expoHost)) {
    return `http://${expoHost}:5000/api`;
  }

  if (Platform.OS === "android") return "http://10.0.2.2:5000/api";

  return "http://localhost:5000/api";
};

export const API_BASE_URL = getLocalApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 12000,
});

api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;

// ── Subject / Mode constants (used by discover screen) ──────────────────────
export const subjects = [
  "All",
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "English",
  "Computer Science",
  "History",
  "Geography",
];

export const modes = ["All", "Home", "Online", "Hybrid"];

// ── Public: fetch all tutors (GET /tutors) ───────────────────────────────────
export async function getTutors(filters = {}) {
  try {
    const params = {};
    if (filters.query) params.search = filters.query;
    if (filters.subject && filters.subject !== "All") params.subject = filters.subject;
    const res = await api.get("/tutors", { params });
    return Array.isArray(res.data) ? res.data : res.data?.tutors ?? [];
  } catch (err) {
    console.warn("getTutors error:", err?.response?.data || err.message);
    return [];
  }
}

// ── Public: fetch nearby tutors (GET /tutors/nearby) ────────────────────────
export async function getNearbyTutors(lat, lng, radius = 5) {
  try {
    const res = await api.get("/tutors/nearby", { params: { lat, lng, radius } });
    return Array.isArray(res.data) ? res.data : res.data?.tutors ?? [];
  } catch (err) {
    console.warn("getNearbyTutors error:", err?.response?.data || err.message);
    return [];
  }
}

// ── Auth-gated: create booking (POST /bookings) ──────────────────────────────
export async function requestLesson(data) {
  const res = await api.post("/bookings", data);
  return res.data;
}

// ── Auth-gated: get student bookings ────────────────────────────────────────
export async function getBookings(status = "all") {
  try {
    const res = await api.get("/student/bookings");
    const list = Array.isArray(res.data) ? res.data : res.data?.bookings ?? [];
    if (status === "all") return list;
    return list.filter((b) => b.status?.toLowerCase() === status);
  } catch (err) {
    console.warn("getBookings error:", err?.response?.data || err.message);
    return [];
  }
}

// ── Auth-gated: get current user profile ────────────────────────────────────
export async function getProfile() {
  try {
    const res = await api.get("/student/dashboard");
    return res.data;
  } catch (err) {
    console.warn("getProfile error:", err?.response?.data || err.message);
    return null;
  }
}
