import Constants from "expo-constants";

const LIVE_WEB_APP_BASE_URL = "https://backend-production-a779f.up.railway.app";

const normalizeOrigin = (value) => String(value || "").trim().replace(/\/+$/, "");

export const WEB_APP_BASE_URL = (() => {
  const envUrl = process.env.EXPO_PUBLIC_WEB_APP_BASE_URL;
  if (envUrl) return normalizeOrigin(envUrl);

  const configuredUrl = Constants.expoConfig?.extra?.webAppBaseUrl;
  if (configuredUrl) return normalizeOrigin(configuredUrl);

  return LIVE_WEB_APP_BASE_URL;
})();

export const buildAuthUrl = ({ mode, role = "student", sessionReset }) =>
  `${WEB_APP_BASE_URL}/auth?mode=${encodeURIComponent(mode)}&role=${encodeURIComponent(role)}&sessionReset=${encodeURIComponent(sessionReset)}`;
