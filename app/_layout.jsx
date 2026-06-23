import { useEffect } from "react";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import useAuthStore from "../store/authStore";
import { Colors } from "../constants/Colors";

function RouteController() {
  const router = useRouter();
  const segments = useSegments();
  const { isAuthenticated, role, isVerified, isLoading, loadUser } = useAuthStore();

  // Load user session on startup
  useEffect(() => {
    loadUser();
  }, [loadUser]);

  // Handle auth-based routing logic
  useEffect(() => {
    if (isLoading) return;

    const inStudentGroup = segments[0] === "(student)";
    const inParentGroup = segments[0] === "(parent)";
    const inTutorGroup = segments[0] === "(tutor)";
    const inAdminGroup = segments[0] === "(admin)";
    const inTabsGroup = segments[0] === "(tabs)";
    const inPublicGroup = segments[0] === "(public)";

    if (!isAuthenticated) {
      if (inStudentGroup || inParentGroup || inTutorGroup || inAdminGroup) {
        router.replace("/(tabs)/home");
      }
    } else if (inTutorGroup && String(role || "").toUpperCase() === "TUTOR" && !isVerified) {
      router.replace("/(public)/become-tutor");
    } else if (!inTabsGroup && !inPublicGroup && !inStudentGroup && !inParentGroup && !inTutorGroup && !inAdminGroup) {
      router.replace("/(tabs)/home");
    }
  }, [isAuthenticated, role, isVerified, isLoading, segments, router]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(public)" options={{ headerShown: false }} />
      <Stack.Screen name="(student)" options={{ headerShown: false }} />
      <Stack.Screen name="(parent)" options={{ headerShown: false }} />
      <Stack.Screen name="(tutor)" options={{ headerShown: false }} />
      <Stack.Screen name="(admin)" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <RouteController />
        <StatusBar style="dark" backgroundColor={Colors.background} />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: "center",
    alignItems: "center",
  },
});
