import Constants from "expo-constants";
import { Platform } from "react-native";

const normalizeOrigin = (value) => String(value || "").trim().replace(/\/+$/, "");

const getExpoHost = () => {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoClient?.hostUri ||
    Constants.manifest?.debuggerHost;

  return String(hostUri || "").split(":")[0];
};

export const WEB_APP_BASE_URL = (() => {
  const configuredUrl =
    process.env.EXPO_PUBLIC_WEB_APP_BASE_URL ||
    Constants.expoConfig?.extra?.webAppBaseUrl;

  if (configuredUrl) return normalizeOrigin(configuredUrl);

  const expoHost = getExpoHost();
  if (expoHost && !["localhost", "127.0.0.1"].includes(expoHost)) {
    return `http://${expoHost}:5173`;
  }

  if (Platform.OS === "android") return "http://10.0.2.2:5173";

  return "http://localhost:5173";
})();

export const buildAuthUrl = ({ mode, role = "student", sessionReset }) =>
  `${WEB_APP_BASE_URL}/auth?mode=${encodeURIComponent(mode)}&role=${encodeURIComponent(role)}&sessionReset=${encodeURIComponent(sessionReset)}`;
