import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

const useAuthStore = create((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  role: null,
  isVerified: null,
  tutorApplicationRequired: false,
  isLoading: true,

  login: async (user, token, isVerified, tutorApplicationRequired) => {
    const role = (user?.role || "").toUpperCase();
    const resolvedVerified =
      isVerified !== undefined
        ? isVerified
        : user?.isVerified !== undefined
          ? user.isVerified
          : user?.tutor?.isVerified !== undefined
            ? user.tutor.isVerified
            : role === "TUTOR"
              ? false
              : true;
    const resolvedApplicationRequired =
      tutorApplicationRequired !== undefined ? tutorApplicationRequired : role === "TUTOR" && !resolvedVerified;
    const isVerifiedVal = String(resolvedVerified);
    const tutorApplicationRequiredVal = String(resolvedApplicationRequired);
    
    await AsyncStorage.setItem("token", token);
    await AsyncStorage.setItem("user", JSON.stringify(user));
    await AsyncStorage.setItem("role", role);
    await AsyncStorage.setItem("isAuthenticated", "true");
    await AsyncStorage.setItem("isVerified", isVerifiedVal);
    await AsyncStorage.setItem("tutorApplicationRequired", tutorApplicationRequiredVal);

    set({
      user,
      token,
      isAuthenticated: true,
      role,
      isVerified: isVerifiedVal === "true",
      tutorApplicationRequired: tutorApplicationRequiredVal === "true",
      isLoading: false,
    });
  },

  logout: async () => {
    await AsyncStorage.removeItem("token");
    await AsyncStorage.removeItem("user");
    await AsyncStorage.removeItem("role");
    await AsyncStorage.removeItem("isAuthenticated");
    await AsyncStorage.removeItem("isVerified");
    await AsyncStorage.removeItem("tutorApplicationRequired");

    set({
      user: null,
      token: null,
      isAuthenticated: false,
      role: null,
      isVerified: null,
      tutorApplicationRequired: false,
      isLoading: false,
    });
  },

  loadUser: async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const userStr = await AsyncStorage.getItem("user");
      const role = await AsyncStorage.getItem("role");
      const isAuthenticated = await AsyncStorage.getItem("isAuthenticated");
      const isVerified = await AsyncStorage.getItem("isVerified");
      const tutorAppReq = await AsyncStorage.getItem("tutorApplicationRequired");

      if (token && userStr) {
        set({
          token,
          user: JSON.parse(userStr),
          role: role || "",
          isAuthenticated: isAuthenticated === "true",
          isVerified: isVerified === "true",
          tutorApplicationRequired: tutorAppReq === "true",
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      console.error("Failed to load user session", error);
      set({ isLoading: false });
    }
  },

  setVerificationStatus: async (isVerified) => {
    await AsyncStorage.setItem("isVerified", String(isVerified));
    set({ isVerified: !!isVerified });
  },

  setTutorApplicationRequired: async (required) => {
    await AsyncStorage.setItem("tutorApplicationRequired", String(required));
    set({ tutorApplicationRequired: !!required });
  }
}));

export default useAuthStore;

