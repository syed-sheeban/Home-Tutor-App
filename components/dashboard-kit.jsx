import { FlatList, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInUp } from "react-native-reanimated";
import { useRef, useState } from "react";
import { NotificationBell } from "./notification-bell";

const C = {
  bg: "#050810",
  primary: "#14b8a6",
  white: "#ffffff",
  white70: "rgba(255,255,255,0.70)",
  white50: "rgba(255,255,255,0.50)",
  white10: "rgba(255,255,255,0.10)",
  white07: "rgba(255,255,255,0.07)",
  panel: "#ffffff",
  slate950: "#020617",
  slate700: "#334155",
  slate500: "#64748b",
  slate200: "#e2e8f0",
  slate100: "#f1f5f9",
  amberBg: "#fef3c7",
  amberText: "#92400e",
  greenBg: "#dcfce7",
  greenText: "#166534",
  redBg: "#fee2e2",
  redText: "#991b1b",
  blueBg: "#dbeafe",
  blueText: "#1d4ed8",
  roseBg: "#ffe4e6",
  roseText: "#be123c",
};

export function DashboardShell({ title, subtitle, icon, children, refreshing, onRefresh, navigation = [], activeNavigationIndex: initialNavigationIndex = 0 }) {
  const sections = Array.isArray(children) ? children.filter(Boolean) : [children].filter(Boolean);
  const [activeNavigationIndex, setActiveNavigationIndex] = useState(initialNavigationIndex);
  const listRef = useRef(null);
  const router = useRouter();

  const navigateTo = (item, navigationIndex) => {
    setActiveNavigationIndex(navigationIndex);
    if (item.href) {
      router.push(item.href);
      return;
    }
    listRef.current?.scrollToIndex({ index: Math.max(0, item.index || 0), animated: true, viewPosition: 0.06 });
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.brandBar}>
        <View style={styles.brandLeft}>
          <View style={styles.brandIcon}>
            <Ionicons name={icon || "school-outline"} size={20} color={C.white} />
          </View>
          <View style={styles.brandCopy}>
            <Text style={styles.brandName}>TutorNest</Text>
            <Text style={styles.brandRole}>{title}</Text>
          </View>
        </View>
        <View style={styles.brandActions}>
          <NotificationBell compact />
          <TouchableOpacity style={styles.logoutButton} onPress={() => router.replace("/(tabs)/home")} activeOpacity={0.82} accessibilityLabel="Go to home">
            <Ionicons name="home-outline" size={19} color={C.white70} />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        ref={listRef}
        data={sections}
        keyExtractor={(_, index) => `section-${index}`}
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInUp.delay(index * 55).duration(360)}>{item}</Animated.View>
        )}
        ListHeaderComponent={<View>
          <HeroCard eyebrow={title} title={subtitle.title} text={subtitle.text} icon={subtitle.icon || icon} />
          {!!navigation.length && (
            <View style={styles.portalNavWrap}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.portalNav}>
                {navigation.map((item, index) => {
                  const active = index === activeNavigationIndex;
                  return <TouchableOpacity key={item.label} style={[styles.portalNavItem, active && styles.portalNavItemActive]} onPress={() => navigateTo(item, index)} activeOpacity={0.84}>
                    <Ionicons name={item.icon || "grid-outline"} size={14} color={active ? "#0f766e" : "#64748b"} />
                    <Text style={[styles.portalNavText, active && styles.portalNavTextActive]}>{item.label}</Text>
                  </TouchableOpacity>
                })}
              </ScrollView>
            </View>
          )}
        </View>}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={C.primary} /> : undefined
        }
        onScrollToIndexFailed={({ averageItemLength, index }) => {
          listRef.current?.scrollToOffset({ offset: Math.max(0, averageItemLength * index), animated: true });
        }}
      />
    </SafeAreaView>
  );
}

export function HeroCard({ eyebrow, title, text, icon }) {
  return (
    <View style={styles.hero}>
      <View style={styles.heroSideRail} />
      <View style={styles.heroTop}>
        <View style={styles.heroIcon}>
          <Ionicons name={icon || "sparkles-outline"} size={22} color={C.white} />
        </View>
        <Text style={styles.heroEyebrow}>{eyebrow}</Text>
      </View>
      <Text style={styles.heroTitle}>{title}</Text>
      <Text style={styles.heroText}>{text}</Text>
      <View style={styles.heroAccentLine} />
    </View>
  );
}

export function StatGrid({ stats }) {
  return (
    <View style={styles.statGrid}>
      {stats.map((item, index) => (
        <View key={item.label} style={[styles.statCard, index % 3 === 1 && styles.statCardBlue, index % 3 === 2 && styles.statCardRose]}>
          <Ionicons
            name={item.icon || "analytics-outline"}
            size={19}
            color={index % 3 === 1 ? C.blueText : index % 3 === 2 ? C.roseText : C.primary}
          />
          <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
            {item.value}
          </Text>
          <Text style={styles.statLabel}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

export function SectionCard({ title, eyebrow, icon, children, actionLabel, onAction }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionAccent} />
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleWrap}>
          {!!eyebrow && <Text style={styles.sectionEyebrow}>{eyebrow}</Text>}
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        {!!icon && <Ionicons name={icon} size={22} color={C.primary} />}
      </View>
      {children}
      {!!actionLabel && (
        <TouchableOpacity style={styles.sectionAction} onPress={onAction} activeOpacity={0.84}>
          <Text style={styles.sectionActionText}>{actionLabel}</Text>
          <Ionicons name="arrow-forward" size={15} color={C.white} />
        </TouchableOpacity>
      )}
    </View>
  );
}

export function ListRow({ title, subtitle, meta, icon, badge, tone = "neutral", onPress }) {
  return (
    <TouchableOpacity disabled={!onPress} onPress={onPress} style={styles.row} activeOpacity={0.84}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon || "ellipse-outline"} size={18} color={C.primary} />
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle} numberOfLines={2}>
          {title}
        </Text>
        {!!subtitle && (
          <Text style={styles.rowSubtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        )}
      </View>
      <View style={styles.rowEnd}>
        {!!badge && <Badge label={badge} tone={tone} />}
        {!!meta && <Text style={styles.rowMeta}>{meta}</Text>}
      </View>
      {!!onPress && <Ionicons name="chevron-forward" size={16} color={C.slate500} />}
    </TouchableOpacity>
  );
}

export function Badge({ label, tone = "neutral" }) {
  const palette =
    tone === "success"
      ? { bg: C.greenBg, text: C.greenText }
      : tone === "danger"
        ? { bg: C.redBg, text: C.redText }
        : tone === "warning"
          ? { bg: C.amberBg, text: C.amberText }
          : { bg: C.slate100, text: C.slate700 };

  return (
    <View style={[styles.badge, { backgroundColor: palette.bg }]}>
      <Text style={[styles.badgeText, { color: palette.text }]}>{label}</Text>
    </View>
  );
}

export function EmptyState({ label }) {
  return (
    <View style={styles.empty}>
      <Ionicons name="file-tray-outline" size={20} color={C.primary} />
      <Text style={styles.emptyText}>{label}</Text>
    </View>
  );
}

export function SkeletonDashboard({ label = "Loading dashboard..." }) {
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.skeletonWrap}>
        <View style={styles.skeletonHero} />
        {[1, 2, 3, 4].map((item) => (
          <View key={item} style={styles.skeletonLine} />
        ))}
        <Text style={styles.skeletonText}>{label}</Text>
      </View>
    </SafeAreaView>
  );
}

export function getStatusTone(status) {
  const normalized = String(status || "").toUpperCase();
  if (["APPROVED", "ACCEPTED", "ACTIVE", "VERIFIED", "PAID", "COMPLETED"].includes(normalized)) return "success";
  if (["REJECTED", "FAILED", "BLOCKED", "CANCELLED"].includes(normalized)) return "danger";
  if (["PENDING", "REVIEW", "UNDER REVIEW", "CREATED", "ATTEMPTED", "PENDING_PAYMENT"].includes(normalized)) return "warning";
  return "neutral";
}

export const dashboardColors = C;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f6f8fb" },
  brandBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: C.bg,
    borderBottomWidth: 0,
  },
  brandLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  brandIcon: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  brandCopy: { flex: 1 },
  brandName: { color: C.white, fontSize: 17, fontWeight: "900" },
  brandRole: { color: C.white50, fontSize: 11, fontWeight: "800", marginTop: 1 },
  brandActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  logoutButton: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: C.white07,
    borderWidth: 1,
    borderColor: C.white10,
    alignItems: "center",
    justifyContent: "center",
  },
  content: { padding: 16, paddingBottom: 34, gap: 10 },
  hero: {
    overflow: "hidden",
    borderRadius: 8,
    backgroundColor: "#0f172a",
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#1e293b",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 8,
  },
  heroSideRail: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
    backgroundColor: C.primary,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  heroEyebrow: { color: "rgba(255,255,255,0.72)", fontSize: 10, fontWeight: "900", letterSpacing: 1.7, textTransform: "uppercase", flex: 1 },
  heroTitle: { color: C.white, fontSize: 28, lineHeight: 34, fontWeight: "900" },
  heroText: { color: "rgba(255,255,255,0.70)", fontSize: 13, lineHeight: 21, fontWeight: "700", marginTop: 9 },
  heroAccentLine: {
    height: 4,
    width: 86,
    borderRadius: 8,
    backgroundColor: C.primary,
    marginTop: 18,
  },
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
  statCard: {
    flexGrow: 1,
    flexBasis: "47%",
    minHeight: 112,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#99f6e4",
    backgroundColor: "#ecfdf5",
    padding: 15,
    justifyContent: "space-between",
  },
  statCardBlue: { borderColor: "#bfdbfe", backgroundColor: C.blueBg },
  statCardRose: { borderColor: "#fecdd3", backgroundColor: C.roseBg },
  statValue: { color: C.slate950, fontSize: 23, fontWeight: "900", marginTop: 8 },
  statLabel: { color: C.slate700, fontSize: 11, fontWeight: "800", lineHeight: 15 },
  section: {
    overflow: "hidden",
    borderRadius: 8,
    backgroundColor: C.panel,
    borderWidth: 1,
    borderColor: C.slate200,
    padding: 17,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 3,
  },
  sectionAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: C.primary,
  },
  sectionHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 12 },
  sectionTitleWrap: { flex: 1 },
  sectionEyebrow: { color: C.primary, fontSize: 10, fontWeight: "900", letterSpacing: 1.6, textTransform: "uppercase" },
  sectionTitle: { color: C.slate950, fontSize: 18, fontWeight: "900", marginTop: 2 },
  sectionAction: {
    marginTop: 12,
    backgroundColor: C.slate950,
    borderRadius: 8,
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  sectionActionText: { color: C.white, fontSize: 13, fontWeight: "900" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 8,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: C.slate200,
    padding: 12,
    marginBottom: 9,
  },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: C.white,
    alignItems: "center",
    justifyContent: "center",
  },
  rowBody: { flex: 1, minWidth: 0 },
  rowTitle: { color: C.slate950, fontSize: 13, fontWeight: "900", lineHeight: 18 },
  rowSubtitle: { color: C.slate500, fontSize: 11, fontWeight: "700", lineHeight: 16, marginTop: 2 },
  rowEnd: { alignItems: "flex-end", gap: 5, maxWidth: "31%" },
  rowMeta: { color: C.slate500, fontSize: 10, fontWeight: "800", textAlign: "right" },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { fontSize: 9, fontWeight: "900", letterSpacing: 0.4, textTransform: "uppercase" },
  empty: {
    minHeight: 82,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.slate200,
    backgroundColor: C.slate100,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 14,
  },
  emptyText: { color: C.slate500, fontSize: 12, fontWeight: "800", textAlign: "center" },
  skeletonWrap: { flex: 1, padding: 16, justifyContent: "center", gap: 12 },
  skeletonHero: { height: 160, borderRadius: 8, backgroundColor: C.white07 },
  skeletonLine: { height: 74, borderRadius: 8, backgroundColor: C.white07 },
  skeletonText: { color: C.white50, textAlign: "center", fontSize: 13, fontWeight: "800", marginTop: 4 },
  portalNavWrap: { marginTop: -9, marginBottom: 16, backgroundColor: C.white, borderRadius: 16, borderWidth: 1, borderColor: C.slate200, shadowColor: "#0f172a", shadowOpacity: 0.07, shadowRadius: 12, elevation: 2 },
  portalNav: { paddingHorizontal: 8, paddingVertical: 8, gap: 6 },
  portalNavItem: { minHeight: 34, flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, borderRadius: 10, backgroundColor: "#f8fafc" },
  portalNavItemActive: { backgroundColor: "#ccfbf1" },
  portalNavText: { color: "#64748b", fontSize: 10, fontWeight: "900" },
  portalNavTextActive: { color: "#0f766e" },
});
