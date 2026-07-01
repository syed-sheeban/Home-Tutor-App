import { useEffect, useMemo, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Animated, { FadeInUp } from "react-native-reanimated";
import useNotificationStore from "../store/notificationStore";
import { NotificationCard } from "../components/notification-bell";
import { Colors } from "../constants/Colors";

const filters = ["All", "Unread", "Read", "Announcement", "Reminder", "Payments", "System", "Verification"];

export default function NotificationsScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");
  const { notifications, unreadCount, loading, refreshing, error, offlinePreview, loadNotifications, refreshNotifications, markRead, markAllRead, clearRead } =
    useNotificationStore();

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const visibleNotifications = useMemo(() => {
    const term = query.trim().toLowerCase();
    return notifications.filter((item) => {
      const type = String(item.notificationType || "").toLowerCase();
      const matchesFilter =
        filter === "All" ||
        (filter === "Unread" && !item.isRead) ||
        (filter === "Read" && item.isRead) ||
        type.includes(filter.toLowerCase().replace("payments", "payment").replace("system", "system"));
      const matchesSearch =
        !term ||
        [item.title, item.message, item.notificationType, item.priority]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));

      return matchesFilter && matchesSearch;
    });
  }, [filter, notifications, query]);

  const sections = useMemo(() => groupNotifications(visibleNotifications), [visibleNotifications]);

  const openNotification = async (item) => {
    if (!item.isRead) await markRead(item.id);
    if (item.actionUrl) router.push(item.actionUrl);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={() => router.back()} activeOpacity={0.84}>
          <Ionicons name="arrow-back" size={20} color={Colors.white} />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>Notification Center</Text>
          <Text style={styles.title}>My Notifications</Text>
        </View>
        <View style={styles.unreadPill}>
          <Text style={styles.unreadValue}>{unreadCount > 99 ? "99+" : unreadCount}</Text>
        </View>
      </View>

      <FlatList
        data={sections}
        keyExtractor={(item) => item.title}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshNotifications} tintColor={Colors.primary} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <>
            <Animated.View entering={FadeInUp.duration(320)} style={styles.hero}>
              <View style={styles.heroIcon}>
                <Ionicons name="notifications-outline" size={24} color={Colors.white} />
              </View>
              <Text style={styles.heroTitle}>Never miss a class update</Text>
              <Text style={styles.heroText}>Unread alerts, reminders, verification updates, and payment messages stay organized here.</Text>
              {offlinePreview && <Text style={styles.offlineText}>API fallback preview is active until backend notifications are available.</Text>}
              {!!error && !offlinePreview && <Text style={styles.errorText}>{error}</Text>}
            </Animated.View>

            <View style={styles.searchBox}>
              <Ionicons name="search" size={18} color={Colors.lightSub} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search notifications"
                placeholderTextColor={Colors.lightSub}
                style={styles.searchInput}
              />
            </View>

            <FlatList
              horizontal
              data={filters}
              keyExtractor={(item) => item}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.filterChip, filter === item && styles.filterChipActive]}
                  onPress={() => setFilter(item)}
                  activeOpacity={0.84}
                >
                  <Text style={[styles.filterText, filter === item && styles.filterTextActive]}>{item}</Text>
                </TouchableOpacity>
              )}
            />

            <View style={styles.quickActions}>
              <TouchableOpacity style={styles.quickAction} onPress={markAllRead} activeOpacity={0.86}>
                <Ionicons name="checkmark-done-outline" size={17} color={Colors.white} />
                <Text style={styles.quickActionText}>Mark all read</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickActionMuted} onPress={clearRead} activeOpacity={0.86}>
                <Ionicons name="trash-outline" size={17} color={Colors.lightText} />
                <Text style={styles.quickActionMutedText}>Clear read</Text>
              </TouchableOpacity>
            </View>
          </>
        }
        renderItem={({ item: section, index }) => (
          <Animated.View entering={FadeInUp.delay(index * 55).duration(320)} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.items.map((item) => (
              <View key={String(item.id)} style={styles.itemWrap}>
                <NotificationCard item={item} onPress={() => openNotification(item)} />
                <View style={styles.inlineActions}>
                  {!item.isRead && (
                    <TouchableOpacity onPress={() => markRead(item.id)} activeOpacity={0.84}>
                      <Ionicons name="checkmark-circle-outline" size={18} color={Colors.primary} />
                    </TouchableOpacity>
                  )}
                  <Text style={styles.swipeHint}>Swipe actions ready for push upgrade</Text>
                </View>
              </View>
            ))}
          </Animated.View>
        )}
        ListEmptyComponent={!loading ? <EmptyNotifications /> : null}
      />
    </SafeAreaView>
  );
}

function EmptyNotifications() {
  return (
    <View style={styles.empty}>
      <Ionicons name="file-tray-outline" size={24} color={Colors.primary} />
      <Text style={styles.emptyTitle}>No notifications found</Text>
      <Text style={styles.emptyText}>Try another filter or pull down to refresh.</Text>
    </View>
  );
}

function groupNotifications(items) {
  const groups = { Unread: [], Today: [], Yesterday: [], Earlier: [] };
  const today = new Date();
  const todayKey = today.toDateString();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yesterdayKey = yesterday.toDateString();

  items.forEach((item) => {
    if (!item.isRead) {
      groups.Unread.push(item);
      return;
    }

    const key = new Date(item.createdAt || item.scheduledAt || Date.now()).toDateString();
    if (key === todayKey) groups.Today.push(item);
    else if (key === yesterdayKey) groups.Yesterday.push(item);
    else groups.Earlier.push(item);
  });

  return Object.entries(groups)
    .filter(([, groupItems]) => groupItems.length)
    .map(([title, groupItems]) => ({ title, items: groupItems }));
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.surfaceMid,
    borderWidth: 1,
    borderColor: Colors.borderMid,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCopy: { flex: 1 },
  eyebrow: { color: Colors.primary, fontSize: 10, fontWeight: "900", letterSpacing: 1.5, textTransform: "uppercase" },
  title: { color: Colors.white, fontSize: 22, fontWeight: "900", marginTop: 2 },
  unreadPill: { minWidth: 42, height: 42, borderRadius: 21, backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center", paddingHorizontal: 10 },
  unreadValue: { color: Colors.white, fontSize: 14, fontWeight: "900" },
  content: { padding: 16, paddingBottom: 34 },
  hero: {
    borderRadius: 24,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.lightBorder,
    padding: 20,
    marginBottom: 14,
  },
  heroIcon: { width: 50, height: 50, borderRadius: 17, backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  heroTitle: { color: Colors.lightText, fontSize: 25, lineHeight: 30, fontWeight: "900" },
  heroText: { color: Colors.lightSub, fontSize: 13, lineHeight: 20, fontWeight: "700", marginTop: 8 },
  offlineText: { color: "#92400e", fontSize: 11, lineHeight: 16, fontWeight: "800", marginTop: 10 },
  errorText: { color: Colors.danger, fontSize: 11, lineHeight: 16, fontWeight: "800", marginTop: 10 },
  searchBox: {
    minHeight: 48,
    borderRadius: 17,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.lightBorder,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  searchInput: { flex: 1, color: Colors.lightText, fontSize: 14, fontWeight: "800" },
  filterList: { gap: 8, paddingBottom: 12 },
  filterChip: { height: 38, borderRadius: 19, borderWidth: 1, borderColor: Colors.borderMid, backgroundColor: Colors.surfaceMid, justifyContent: "center", paddingHorizontal: 14 },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { color: Colors.textSecondary, fontSize: 12, fontWeight: "900" },
  filterTextActive: { color: Colors.white },
  quickActions: { flexDirection: "row", gap: 10, marginBottom: 16 },
  quickAction: { flex: 1, minHeight: 46, borderRadius: 15, backgroundColor: Colors.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  quickActionText: { color: Colors.white, fontSize: 13, fontWeight: "900" },
  quickActionMuted: { flex: 1, minHeight: 46, borderRadius: 15, backgroundColor: Colors.white, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  quickActionMutedText: { color: Colors.lightText, fontSize: 13, fontWeight: "900" },
  section: { marginBottom: 12 },
  sectionTitle: { color: Colors.white, fontSize: 14, fontWeight: "900", marginBottom: 9 },
  itemWrap: { marginBottom: 2 },
  inlineActions: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 4, marginTop: -5, marginBottom: 8 },
  swipeHint: { color: Colors.textMuted, fontSize: 10, fontWeight: "800" },
  empty: {
    minHeight: 160,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
  },
  emptyTitle: { color: Colors.white, fontSize: 16, fontWeight: "900", marginTop: 10 },
  emptyText: { color: Colors.textSecondary, fontSize: 12, fontWeight: "700", textAlign: "center", marginTop: 4 },
});
