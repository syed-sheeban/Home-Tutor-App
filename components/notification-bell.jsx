import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { io } from "socket.io-client";
import useNotificationStore from "../store/notificationStore";
import { Colors } from "../constants/Colors";
import { API_BASE_URL } from "../services/api";
import useAuthStore from "../store/authStore";

const typeIcon = {
  ANNOUNCEMENT: "megaphone-outline",
  REMINDER: "alarm-outline",
  PAYMENT: "card-outline",
  VERIFICATION: "shield-checkmark-outline",
  SYSTEM_UPDATE: "sparkles-outline",
  CLASS_UPDATE: "calendar-outline",
  GENERAL: "notifications-outline",
};

const priorityColor = {
  HIGH: Colors.danger,
  MEDIUM: Colors.warning,
  LOW: Colors.success,
};

export function NotificationBell({ compact = false }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { user, role, isAuthenticated } = useAuthStore();
  const { notifications, unreadCount, loadNotifications, markRead, markAllRead, clearRead, offlinePreview } =
    useNotificationStore();

  useEffect(() => {
    loadNotifications({ silent: true });
    const timer = setInterval(() => loadNotifications({ silent: true }), 45000);
    return () => clearInterval(timer);
  }, [loadNotifications]);

  useEffect(() => {
    if (!isAuthenticated) return undefined;
    const socketUrl = API_BASE_URL.replace(/\/api\/?$/, "");
    const socket = io(socketUrl, { transports: ["websocket", "polling"] });
    socket.emit("notification:subscribe", {
      role: role || user?.role,
      userId: user?.id,
    });
    socket.on("notification:new", () => loadNotifications({ silent: true }));
    return () => socket.disconnect();
  }, [isAuthenticated, loadNotifications, role, user?.id, user?.role]);

  const previewItems = useMemo(() => notifications.slice(0, 5), [notifications]);
  const badge = unreadCount > 99 ? "99+" : String(unreadCount || "");

  const openNotification = async (item) => {
    if (!item.isRead) await markRead(item.id);
    setOpen(false);
    if (item.actionUrl) router.push(item.actionUrl);
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.bellButton, compact && styles.compactBell]}
        onPress={() => setOpen(true)}
        activeOpacity={0.84}
        accessibilityLabel="Open notifications"
      >
        <Ionicons name="notifications-outline" size={compact ? 19 : 21} color={Colors.white} />
        {!!unreadCount && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.panel}>
            <View style={styles.panelHeader}>
              <View>
                <Text style={styles.eyebrow}>Notification Center</Text>
                <Text style={styles.panelTitle}>{unreadCount} unread update{unreadCount === 1 ? "" : "s"}</Text>
              </View>
              <TouchableOpacity style={styles.closeButton} onPress={() => setOpen(false)} activeOpacity={0.84}>
                <Ionicons name="close" size={18} color={Colors.lightText} />
              </TouchableOpacity>
            </View>

            {offlinePreview && (
              <View style={styles.offlineBanner}>
                <Ionicons name="cloud-offline-outline" size={16} color={Colors.warning} />
                <Text style={styles.offlineText}>Showing cached preview until the notification API is available.</Text>
              </View>
            )}

            <ScrollView showsVerticalScrollIndicator={false} style={styles.list} contentContainerStyle={styles.listContent}>
              {previewItems.length ? (
                previewItems.map((item, index) => (
                  <Animated.View key={String(item.id)} entering={FadeInDown.delay(index * 45).duration(260)}>
                    <NotificationCard item={item} onPress={() => openNotification(item)} />
                  </Animated.View>
                ))
              ) : (
                <View style={styles.empty}>
                  <Ionicons name="file-tray-outline" size={22} color={Colors.primary} />
                  <Text style={styles.emptyText}>No notifications yet.</Text>
                </View>
              )}
            </ScrollView>

            <View style={styles.actions}>
              <TouchableOpacity style={styles.primaryAction} onPress={() => { setOpen(false); router.push("/notifications"); }} activeOpacity={0.86}>
                <Text style={styles.primaryActionText}>View All</Text>
                <Ionicons name="arrow-forward" size={16} color={Colors.white} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryAction} onPress={markAllRead} activeOpacity={0.86}>
                <Text style={styles.secondaryActionText}>Mark Read</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryAction} onPress={clearRead} activeOpacity={0.86}>
                <Text style={styles.secondaryActionText}>Clear Read</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

export function NotificationCard({ item, onPress }) {
  const priority = String(item.priority || "MEDIUM").toUpperCase();
  const type = String(item.notificationType || "GENERAL").toUpperCase().replace(/\s+/g, "_");
  const color = priorityColor[priority] || Colors.primary;

  return (
    <TouchableOpacity style={[styles.card, !item.isRead && styles.unreadCard]} onPress={onPress} activeOpacity={0.86}>
      <View style={[styles.cardIcon, { backgroundColor: `${color}22` }]}>
        <Ionicons name={typeIcon[type] || typeIcon.GENERAL} size={18} color={color} />
      </View>
      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
          {!item.isRead && <View style={[styles.unreadDot, { backgroundColor: color }]} />}
        </View>
        <Text style={styles.cardMessage} numberOfLines={2}>{item.message}</Text>
        <View style={styles.cardMeta}>
          <Text style={[styles.priority, { color }]}>{priority}</Text>
          <Text style={styles.time}>{formatTime(item.createdAt || item.scheduledAt)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function formatTime(value) {
  if (!value) return "Just now";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Just now";
  return date.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

const styles = StyleSheet.create({
  bellButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.surfaceMid,
    borderWidth: 1,
    borderColor: Colors.borderMid,
    alignItems: "center",
    justifyContent: "center",
  },
  compactBell: { width: 38, height: 38, borderRadius: 19 },
  badge: {
    position: "absolute",
    right: -2,
    top: -3,
    minWidth: 19,
    height: 19,
    borderRadius: 10,
    backgroundColor: Colors.danger,
    borderWidth: 2,
    borderColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: { color: Colors.white, fontSize: 9, fontWeight: "900" },
  backdrop: { flex: 1, backgroundColor: "rgba(2,6,23,0.62)", padding: 16, justifyContent: "flex-start" },
  panel: {
    marginTop: 48,
    borderRadius: 26,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.lightBorder,
    maxHeight: "78%",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 28,
    elevation: 14,
  },
  panelHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, padding: 18 },
  eyebrow: { color: Colors.primary, fontSize: 10, fontWeight: "900", letterSpacing: 1.5, textTransform: "uppercase" },
  panelTitle: { color: Colors.lightText, fontSize: 21, fontWeight: "900", marginTop: 3 },
  closeButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.lightBg, alignItems: "center", justifyContent: "center" },
  offlineBanner: {
    marginHorizontal: 18,
    marginBottom: 8,
    borderRadius: 14,
    backgroundColor: "#fffbeb",
    borderWidth: 1,
    borderColor: "#fde68a",
    padding: 10,
    flexDirection: "row",
    gap: 8,
  },
  offlineText: { flex: 1, color: "#92400e", fontSize: 11, lineHeight: 16, fontWeight: "800" },
  list: { maxHeight: 390 },
  listContent: { paddingHorizontal: 14, paddingBottom: 8 },
  card: {
    flexDirection: "row",
    gap: 11,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.lightBorder,
    backgroundColor: Colors.lightBg,
    padding: 12,
    marginBottom: 10,
  },
  unreadCard: { backgroundColor: "#ffffff", borderColor: "rgba(20,184,166,0.35)" },
  cardIcon: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  cardBody: { flex: 1, minWidth: 0 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardTitle: { flex: 1, color: Colors.lightText, fontSize: 13, fontWeight: "900" },
  unreadDot: { width: 8, height: 8, borderRadius: 4 },
  cardMessage: { color: Colors.lightSub, fontSize: 12, lineHeight: 17, fontWeight: "700", marginTop: 4 },
  cardMeta: { flexDirection: "row", justifyContent: "space-between", gap: 10, marginTop: 8 },
  priority: { fontSize: 10, fontWeight: "900", letterSpacing: 0.8 },
  time: { color: Colors.lightSub, fontSize: 10, fontWeight: "800" },
  empty: { minHeight: 120, alignItems: "center", justifyContent: "center", gap: 8 },
  emptyText: { color: Colors.lightSub, fontSize: 12, fontWeight: "800" },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 9, borderTopWidth: 1, borderTopColor: Colors.lightBorder, padding: 14 },
  primaryAction: {
    flexGrow: 1,
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: Colors.secondary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingHorizontal: 14,
  },
  primaryActionText: { color: Colors.white, fontSize: 13, fontWeight: "900" },
  secondaryAction: { minHeight: 44, borderRadius: 14, backgroundColor: Colors.lightBg, alignItems: "center", justifyContent: "center", paddingHorizontal: 13 },
  secondaryActionText: { color: Colors.lightText, fontSize: 12, fontWeight: "900" },
});
