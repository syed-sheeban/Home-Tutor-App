import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "../../constants/Colors";
import useAuthStore from "../../store/authStore";
import { tutorService } from "../../services/tutorService";
import { NotificationBell } from "../../components/notification-bell";

const dashboardRoutes = {
  STUDENT: "/(student)",
  TUTOR: "/(tutor)",
  PARENT: "/(parent)",
  ADMIN: "/(admin)",
};

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { isAuthenticated, role, user, logout, isLoading, isVerified, setVerificationStatus, setTutorApplicationRequired } = useAuthStore();
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [logoutVisible, setLogoutVisible] = useState(false);
  const [checkingDashboard, setCheckingDashboard] = useState(false);
  const [dashboardModal, setDashboardModal] = useState(null);

  const displayName = user?.fullName || user?.name || "HomeTutor Member";
  const displayEmail = user?.email || "No email available";
  const normalizedRole = String(role || user?.role || "").toUpperCase();

  const openDashboard = async () => {
    if (normalizedRole === "TUTOR") {
      setCheckingDashboard(true);
      try {
        const tutor = await tutorService.getTutorApplication();
        const status = tutor?.verificationStatus || (tutor?.isVerified ? "APPROVED" : "PENDING");

        if (status === "APPROVED") {
          await setVerificationStatus(true);
          await setTutorApplicationRequired(false);
          router.push("/(tutor)");
          return;
        }

        await setVerificationStatus(false);
        await setTutorApplicationRequired(false);
        setDashboardModal({
          title: "Verification Under Process",
          message: "Your tutor application is with admin for review. Your tutor dashboard unlocks after approval.",
          icon: "time-outline",
          actions: [
            { label: "View Application", primary: true, onPress: () => router.push("/(public)/become-tutor") },
            { label: "Close" },
          ],
        });
        return;
      } catch (error) {
        if (error?.response?.status === 404) {
          await setVerificationStatus(false);
          await setTutorApplicationRequired(true);
          setDashboardModal({
            title: "Application Required",
            message: "Submit your tutor application form first. Admin approval is required before your dashboard opens.",
            icon: "document-text-outline",
            actions: [
              { label: "Submit Application", primary: true, onPress: () => router.push("/(public)/become-tutor") },
              { label: "Close" },
            ],
          });
          return;
        }

        if (!isVerified) {
          setDashboardModal({
            title: "Verification Under Process",
            message: "Your tutor account is waiting for admin approval. We will open your dashboard once verification is complete.",
            icon: "shield-half-outline",
          });
          return;
        }
      } finally {
        setCheckingDashboard(false);
      }
    }

    const route = dashboardRoutes[normalizedRole];
    if (route) router.push(route);
    else {
      setDashboardModal({
        title: "Dashboard Unavailable",
        message: "No dashboard is available for this account role.",
        icon: "grid-outline",
      });
    }
  };

  const handleLogout = async () => {
    setLogoutVisible(false);
    await logout();
    router.replace("/(tabs)/home");
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 20 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerCopy}>
            <Text style={styles.headerTitle}>Profile</Text>
            <Text style={styles.headerSub}>Account access and dashboard controls.</Text>
          </View>
          {isAuthenticated && <NotificationBell compact />}
        </View>
      </View>

      {isAuthenticated ? (
        <View style={styles.sectionGap}>
          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.name}>{displayName}</Text>
              <Text style={styles.email}>{displayEmail}</Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleText}>{normalizedRole || "MEMBER"}</Text>
              </View>
            </View>
          </View>

          <MenuButton
            icon="grid-outline"
            label={checkingDashboard ? "Checking Dashboard..." : "My Dashboard"}
            onPress={openDashboard}
            disabled={checkingDashboard}
          />
          <MenuButton icon="person-circle-outline" label="Profile Settings" onPress={() => setSettingsVisible(true)} />
          <LogoutCard onPress={() => setLogoutVisible(true)} />
        </View>
      ) : (
        <View style={styles.sectionGap}>
          <View style={styles.guestCard}>
            <View style={styles.guestAvatar}>
              <Ionicons name="person-outline" size={30} color={Colors.primary} />
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.name}>Guest Session</Text>
              <Text style={styles.guestSub}>Sign in to open your HomeTutor dashboard.</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.signInBtn} onPress={() => router.push("/(auth)/login")}>
            <Text style={styles.signInBtnText}>Sign In</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.signUpBtn} onPress={() => router.push("/(auth)/signup")}>
            <Text style={styles.signUpBtnText}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      )}

      <Modal visible={settingsVisible} transparent animationType="slide" onRequestClose={() => setSettingsVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Profile Settings</Text>
              <TouchableOpacity onPress={() => setSettingsVisible(false)}>
                <Ionicons name="close-circle" size={26} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <InfoRow label="Name" value={displayName} />
            <InfoRow label="Email" value={displayEmail} />
            <InfoRow label="Role" value={normalizedRole || "MEMBER"} />
          </View>
        </View>
      </Modal>

      <Modal visible={logoutVisible} transparent animationType="fade" onRequestClose={() => setLogoutVisible(false)}>
        <View style={styles.logoutBackdrop}>
          <View style={styles.logoutModalCard}>
            <View style={styles.logoutModalIcon}>
              <Ionicons name="log-out-outline" size={28} color={Colors.primary} />
            </View>
            <Text style={styles.logoutModalTitle}>Sign out of HomeTutor?</Text>
            <Text style={styles.logoutModalText}>You will return to the homepage and can sign in again whenever you need your dashboard.</Text>
            <View style={styles.logoutActions}>
              <TouchableOpacity style={styles.logoutStayButton} onPress={() => setLogoutVisible(false)} activeOpacity={0.85}>
                <Text style={styles.logoutStayText}>Stay Signed In</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.logoutConfirmButton} onPress={handleLogout} activeOpacity={0.85}>
                <Text style={styles.logoutConfirmText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <DashboardAccessModal
        visible={!!dashboardModal}
        title={dashboardModal?.title}
        message={dashboardModal?.message}
        icon={dashboardModal?.icon}
        actions={dashboardModal?.actions}
        onClose={() => setDashboardModal(null)}
      />
    </ScrollView>
  );
}

function MenuButton({ icon, label, onPress, danger, disabled }) {
  return (
    <TouchableOpacity
      style={[styles.menuButton, danger && styles.menuButtonDanger, disabled && styles.menuButtonDisabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
    >
      <Ionicons name={icon} size={21} color={danger ? Colors.danger : Colors.primary} />
      <Text style={[styles.menuText, danger && styles.menuTextDanger]}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
    </TouchableOpacity>
  );
}

function InfoRow({ label, value }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function LogoutCard({ onPress }) {
  return (
    <View style={styles.logoutCard}>
      <View style={styles.logoutCardIcon}>
        <Ionicons name="shield-checkmark-outline" size={23} color={Colors.primary} />
      </View>
      <View style={styles.logoutCardCopy}>
        <Text style={styles.logoutCardTitle}>Secure session</Text>
        <Text style={styles.logoutCardText}>Sign out cleanly from this device when you are done.</Text>
      </View>
      <TouchableOpacity style={styles.logoutCardButton} onPress={onPress} activeOpacity={0.85}>
        <Ionicons name="log-out-outline" size={18} color={Colors.white} />
        <Text style={styles.logoutCardButtonText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

function DashboardAccessModal({ visible, title, message, icon = "shield-checkmark-outline", actions, onClose }) {
  const modalActions = actions?.length ? actions : [{ label: "Continue", primary: true }];

  const handleAction = (action) => {
    onClose();
    action.onPress?.();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.dashboardModalBackdrop}>
        <View style={styles.dashboardModalCard}>
          <View style={styles.dashboardModalIcon}>
            <Ionicons name={icon} size={31} color={Colors.primary} />
          </View>
          <Text style={styles.dashboardModalTitle}>{title}</Text>
          <Text style={styles.dashboardModalText}>{message}</Text>
          <View style={styles.dashboardModalActions}>
            {modalActions.map((action) => (
              <TouchableOpacity
                key={action.label}
                style={[styles.dashboardModalButton, action.primary && styles.dashboardModalButtonPrimary]}
                onPress={() => handleAction(action)}
                activeOpacity={0.86}
              >
                <Text style={[styles.dashboardModalButtonText, action.primary && styles.dashboardModalButtonPrimaryText]}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: Colors.background, flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 110 },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: "center",
    alignItems: "center",
  },
  header: { marginBottom: 20 },
  headerTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  headerCopy: { flex: 1 },
  headerTitle: { color: Colors.text, fontSize: 28, fontWeight: "900" },
  headerSub: { color: Colors.textSecondary, fontSize: 14, marginTop: 4 },
  sectionGap: { gap: 14 },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 18,
    padding: 16,
    gap: 14,
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#ccfbf1",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { color: "#0f766e", fontSize: 24, fontWeight: "900" },
  profileInfo: { flex: 1 },
  name: { color: "#020617", fontSize: 18, fontWeight: "900" },
  email: { color: "#475569", fontSize: 13, marginTop: 2, fontWeight: "700" },
  roleBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#f0fdfa",
    borderWidth: 1,
    borderColor: "rgba(20,184,166,0.22)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
    marginTop: 7,
  },
  roleText: { color: "#0f766e", fontSize: 10, fontWeight: "900", letterSpacing: 0.5 },
  menuButton: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingHorizontal: 15,
  },
  menuButtonDanger: { borderColor: "rgba(176,80,49,0.22)" },
  menuButtonDisabled: { opacity: 0.62 },
  menuText: { flex: 1, color: Colors.text, fontSize: 15, fontWeight: "900" },
  menuTextDanger: { color: Colors.danger },
  logoutCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    padding: 16,
    gap: 14,
  },
  logoutCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "rgba(20,184,166,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  logoutCardCopy: { gap: 4 },
  logoutCardTitle: { color: Colors.text, fontSize: 16, fontWeight: "900" },
  logoutCardText: { color: Colors.textSecondary, fontSize: 13, lineHeight: 20, fontWeight: "600" },
  logoutCardButton: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  logoutCardButtonText: { color: Colors.white, fontSize: 14, fontWeight: "900" },
  guestCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 14,
  },
  guestAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(23,63,53,0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  guestSub: { color: Colors.textSecondary, fontSize: 13, marginTop: 2 },
  signInBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 13,
    paddingVertical: 14,
    alignItems: "center",
  },
  signInBtnText: { color: Colors.white, fontSize: 14, fontWeight: "900" },
  signUpBtn: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: 13,
    paddingVertical: 13,
    alignItems: "center",
  },
  signUpBtnText: { color: Colors.primary, fontSize: 14, fontWeight: "900" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(2,6,23,0.48)", justifyContent: "flex-end" },
  modalCard: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    gap: 12,
  },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  modalTitle: { color: "#020617", fontSize: 18, fontWeight: "900" },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingVertical: 11,
  },
  infoLabel: { color: "#64748b", fontSize: 13, fontWeight: "800" },
  infoValue: { flex: 1, color: "#020617", fontSize: 13, fontWeight: "900", textAlign: "right" },
  logoutBackdrop: { flex: 1, backgroundColor: "rgba(2,6,23,0.68)", justifyContent: "center", padding: 24 },
  logoutModalCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.borderMid,
    backgroundColor: Colors.background,
    padding: 22,
    alignItems: "center",
  },
  logoutModalIcon: {
    width: 62,
    height: 62,
    borderRadius: 22,
    backgroundColor: "rgba(20,184,166,0.12)",
    borderWidth: 1,
    borderColor: "rgba(20,184,166,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  logoutModalTitle: { color: Colors.text, fontSize: 21, fontWeight: "900", textAlign: "center", marginTop: 16 },
  logoutModalText: { color: Colors.textSecondary, fontSize: 14, lineHeight: 22, textAlign: "center", marginTop: 8 },
  logoutActions: { width: "100%", gap: 10, marginTop: 22 },
  logoutStayButton: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceMid,
    alignItems: "center",
    justifyContent: "center",
  },
  logoutStayText: { color: Colors.text, fontSize: 14, fontWeight: "900" },
  logoutConfirmButton: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  logoutConfirmText: { color: Colors.white, fontSize: 14, fontWeight: "900" },
  dashboardModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(2,6,23,0.68)",
    justifyContent: "center",
    padding: 24,
  },
  dashboardModalCard: {
    borderRadius: 26,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#fff",
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.24,
    shadowRadius: 28,
    elevation: 10,
  },
  dashboardModalIcon: {
    width: 70,
    height: 70,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(20,184,166,0.24)",
    backgroundColor: "rgba(20,184,166,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  dashboardModalTitle: { color: "#020617", fontSize: 23, lineHeight: 28, fontWeight: "900", textAlign: "center" },
  dashboardModalText: { color: "#334155", fontSize: 14, lineHeight: 22, fontWeight: "700", textAlign: "center", marginTop: 9 },
  dashboardModalActions: { width: "100%", gap: 10, marginTop: 22 },
  dashboardModalButton: {
    minHeight: 48,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    alignItems: "center",
    justifyContent: "center",
  },
  dashboardModalButtonPrimary: { borderColor: Colors.primary, backgroundColor: Colors.primary },
  dashboardModalButtonText: { color: "#020617", fontSize: 14, fontWeight: "900" },
  dashboardModalButtonPrimaryText: { color: Colors.white },
});
