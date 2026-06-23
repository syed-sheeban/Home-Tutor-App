import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { getNearbyTutors, getTutors, requestLesson } from "../../services/api";
import useAuthStore from "../../store/authStore";
import LocationMapPicker from "../../components/location-map-picker";

// Screen width not used for layout spacing

const SUBJECT_FILTERS = ["All", "Mathematics", "Physics", "Chemistry", "Biology", "English", "Computer Science"];

const getSubjectLabel = (subject) => {
  if (!subject) return "";
  if (typeof subject === "string") return subject;
  return subject.subject || subject.name || subject.title || "";
};

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuthStore();

  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState("All");
  const [tutors, setTutors] = useState([]);
  const [searchLocation, setSearchLocation] = useState(null);
  const [searchLocationName, setSearchLocationName] = useState("");
  const [radius, setRadius] = useState(5);
  const [showMap, setShowMap] = useState(true);
  const [loading, setLoading] = useState(true);
  const [bookingId, setBookingId] = useState(null);
  const [bookingForm, setBookingForm] = useState({ subject: "", time: "", fee: "" });
  const [submitting, setSubmitting] = useState(false);

  const loadTutors = useCallback(async () => {
    setLoading(true);
    const data = searchLocation
      ? await getNearbyTutors(searchLocation.lat, searchLocation.lng, radius)
      : await getTutors({ query, subject });
    setTutors(data);
    setLoading(false);
  }, [query, radius, searchLocation, subject]);

  useEffect(() => {
    const timer = setTimeout(loadTutors, 350);
    return () => clearTimeout(timer);
  }, [loadTutors]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tutors.filter(
      (t) => {
        const tutorSubjects = (t.subjects || []).map((item) =>
          getSubjectLabel(item).toLowerCase(),
        );
        const matchesSubject =
          subject === "All" || tutorSubjects.includes(subject.toLowerCase());
        const matchesQuery =
          !q ||
          t.name?.toLowerCase().includes(q) ||
          t.area?.toLowerCase().includes(q) ||
          tutorSubjects.some((item) => item.includes(q));

        return matchesSubject && matchesQuery;
      }
    );
  }, [query, subject, tutors]);

  const handleBookingSubmit = async (tutor) => {
    if (!isAuthenticated) {
      Alert.alert("Sign In Required", "Please sign in to request a lesson.", [
        { text: "Cancel", style: "cancel" },
        { text: "Sign In", onPress: () => router.push("/(auth)/login") },
      ]);
      return;
    }
    try {
      setSubmitting(true);
      await requestLesson({
        tutorId: tutor.id || tutor._id,
        subject: bookingForm.subject || (tutor.subjects || [])[0] || "General",
        time: bookingForm.time,
        fee: bookingForm.fee,
      });
      Alert.alert("✓ Request Sent", `Your booking request has been sent to ${tutor.name}.`);
      setBookingId(null);
      setBookingForm({ subject: "", time: "", fee: "" });
    } catch (err) {
      Alert.alert(
        "Could Not Book",
        err?.response?.data?.message || "Please log in as a student or parent to book a tutor."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Find Tutors</Text>
          <Text style={styles.headerSub}>
            {loading ? "Loading..." : `${filtered.length} verified tutor${filtered.length !== 1 ? "s" : ""} available`}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.headerLoginBtn}
          onPress={() => router.push(isAuthenticated ? null : "/(auth)/login")}
          activeOpacity={0.85}
        >
          <Ionicons name={isAuthenticated ? "person" : "log-in-outline"} size={16} color="#fff" />
          <Text style={styles.headerLoginText}>{isAuthenticated ? "Account" : "Sign In"}</Text>
        </TouchableOpacity>
      </View>

      {/* ── Search bar ── */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={20} color="#64748b" />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search Maths, Physics, tutor name, area…"
          placeholderTextColor="#94a3b8"
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery("")}>
            <Ionicons name="close-circle" size={18} color="#94a3b8" />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Subject chips ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
      >
        {SUBJECT_FILTERS.map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.chip, subject === s && styles.chipActive]}
            onPress={() => setSubject(s)}
            activeOpacity={0.8}
          >
            <Text style={[styles.chipText, subject === s && styles.chipTextActive]}>{s}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.locatorIntro}>
        <View style={styles.locatorIntroCopy}>
          <Text style={styles.locatorEyebrow}>MAP MATCHING</Text>
          <Text style={styles.locatorTitle}>
            {searchLocation ? "Nearby matching is active" : "Find tutors around your home"}
          </Text>
          <Text style={styles.locatorText}>
            {searchLocation
              ? `${searchLocationName} · ${radius} km radius`
              : "Search your exact locality and rank verified tutors by real distance."}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.mapToggle, showMap && styles.mapToggleActive]}
          onPress={() => setShowMap((current) => !current)}
          activeOpacity={0.84}
        >
          <Ionicons
            name={showMap ? "close-outline" : "map-outline"}
            size={18}
            color={showMap ? "#fff" : DARK}
          />
          <Text style={[styles.mapToggleText, showMap && styles.mapToggleTextActive]}>
            {showMap ? "Hide" : "Map"}
          </Text>
        </TouchableOpacity>
      </View>

      {showMap && (
        <LocationMapPicker
          value={searchLocation}
          locationName={searchLocationName}
          markers={tutors}
          radius={radius}
          onRadiusChange={setRadius}
          title="Where do you need a tutor?"
          subtitle="Search your locality or tap the map. Jammu & Kashmir locations only."
          confirmLabel="Find nearby tutors"
          onConfirm={(location, name) => {
            setSearchLocation(location);
            setSearchLocationName(name);
          }}
        />
      )}

      {searchLocation && (
        <View style={styles.activeLocationBar}>
          <View style={styles.activeLocationIcon}>
            <Ionicons name="navigate" size={17} color="#fff" />
          </View>
          <View style={styles.activeLocationCopy}>
            <Text style={styles.activeLocationLabel}>DISTANCE SORTING ACTIVE</Text>
            <Text style={styles.activeLocationName} numberOfLines={2}>
              {searchLocationName}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.clearLocationButton}
            onPress={() => {
              setSearchLocation(null);
              setSearchLocationName("");
            }}
          >
            <Ionicons name="close" size={17} color="#475569" />
          </TouchableOpacity>
        </View>
      )}

      {/* ── Tutor list ── */}
      {loading ? (
        <View style={styles.loadingBlock}>
          <ActivityIndicator color="#14b8a6" size="large" />
          <Text style={styles.loadingText}>Finding the best tutors…</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="compass-outline" size={48} color="#cbd5e1" />
          <Text style={styles.emptyTitle}>No tutors found</Text>
          <Text style={styles.emptySub}>
            Try a different subject or clear the search filter.
          </Text>
          <TouchableOpacity
            style={styles.emptyBtn}
            onPress={() => { setQuery(""); setSubject("All"); }}
            activeOpacity={0.85}
          >
            <Text style={styles.emptyBtnText}>Clear Filters</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.grid}>
          {filtered.map((tutor, index) => (
            <TutorCard
              key={tutor.id || tutor._id || index}
              tutor={tutor}
              index={index}
              isBookingOpen={bookingId === (tutor.id || tutor._id)}
              bookingForm={bookingForm}
              setBookingForm={setBookingForm}
              onRequestMatch={() => {
                const firstSubject = Array.isArray(tutor.subjects)
                  ? getSubjectLabel(tutor.subjects[0])
                  : getSubjectLabel(tutor.subject);
                setBookingId(tutor.id || tutor._id);
                setBookingForm({
                  subject: firstSubject || "",
                  time: "",
                  fee: "",
                });
              }}
              onSubmit={() => handleBookingSubmit(tutor)}
              onCancel={() => setBookingId(null)}
              submitting={submitting}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

// ── TutorCard component ───────────────────────────────────────────────────────
function TutorCard({ tutor, index, isBookingOpen, bookingForm, setBookingForm, onRequestMatch, onSubmit, onCancel, submitting }) {
  const subjectList = Array.isArray(tutor.subjects)
    ? tutor.subjects.map(getSubjectLabel).filter(Boolean)
    : tutor.subject
      ? [getSubjectLabel(tutor.subject)].filter(Boolean)
      : [];
  const displayName = tutor.name || tutor.user?.fullName || "Tutor";
  const displayArea = tutor.area || tutor.location || tutor.locationName || "Location available after contact";
  const displayRate = tutor.hourlyRate ? `₹${tutor.hourlyRate}/hr` : "On request";
  const displayExperience = tutor.experience || tutor.teachingExperience || "Experience not added";
  const isVerified = tutor.verified || tutor.isVerified || tutor.verificationStatus === "APPROVED";

  return (
    <View style={styles.card}>
      {/* Photo + rank */}
      <View style={styles.cardMedia}>
        {tutor.image ? (
          <ImageBackground
            source={{ uri: tutor.image }}
            style={styles.cardPhoto}
            imageStyle={{ borderRadius: 16 }}
          >
            <View style={styles.cardPhotoOverlay} />
            <Text style={styles.cardRank}>0{index + 1}</Text>
          </ImageBackground>
        ) : (
          <View style={[styles.cardPhoto, styles.cardPhotoFallback]}>
            <View style={styles.fallbackAvatar}>
              <Text style={styles.fallbackAvatarText}>{displayName.charAt(0).toUpperCase()}</Text>
            </View>
            <Text style={styles.cardRank}>0{index + 1}</Text>
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.cardContent}>
        {/* Header row */}
        <View style={styles.cardHeader}>
          <View style={{ flex: 1, gap: 3 }}>
            <View style={styles.nameRow}>
              <Text style={styles.cardName} numberOfLines={1}>{displayName}</Text>
              {isVerified && (
                <View style={styles.verifiedMark}>
                  <Ionicons name="shield-checkmark" size={13} color="#0f766e" />
                </View>
              )}
            </View>
            <View style={styles.degreeHighlight}>
              <Ionicons name="ribbon-outline" size={16} color="#0f766e" />
              <Text style={styles.cardDegree} numberOfLines={2}>{tutor.degree || "Qualification not added"}</Text>
            </View>
          </View>
          {tutor.rating != null && (
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={12} color="#facc15" />
              <Text style={styles.ratingText}>{tutor.rating}</Text>
            </View>
          )}
        </View>

        {/* Meta row */}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="location-outline" size={14} color="#0f766e" />
            <Text style={styles.metaText} numberOfLines={1}>{displayArea}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={14} color="#0f766e" />
            <Text style={styles.metaText} numberOfLines={1}>{displayExperience}</Text>
          </View>
          {tutor.reviews != null && (
            <View style={styles.metaItem}>
              <Ionicons name="star-outline" size={14} color="#0f766e" />
              <Text style={styles.metaText}>{tutor.reviews} reviews</Text>
            </View>
          )}
        </View>

        {/* Subjects */}
        {subjectList.length > 0 && (
          <View style={styles.subjectRow}>
            {subjectList.slice(0, 4).map((s, i) => (
              <View key={i} style={styles.subjectTag}>
                <Ionicons name="book-outline" size={11} color="#14b8a6" />
                <Text style={styles.subjectTagText}>{s}</Text>
              </View>
            ))}
            {subjectList.length > 4 && (
              <View style={styles.subjectTagMuted}>
                <Text style={styles.subjectTagMutedText}>+{subjectList.length - 4}</Text>
              </View>
            )}
          </View>
        )}

        {/* Footer row: distance + rate */}
        <View style={styles.cardFooter}>
          <View style={styles.footerStat}>
            <Text style={styles.footerStatLabel}>Distance</Text>
            <Text style={styles.footerStatVal}>
              {tutor.distance != null ? `${Number(tutor.distance).toFixed(1)} km` : "Set location"}
            </Text>
          </View>
          <View style={styles.footerStat}>
            <Text style={styles.footerStatLabel}>Session Rate</Text>
            <Text style={styles.footerStatVal}>{displayRate}</Text>
          </View>
        </View>

        {/* Booking form / button */}
        {isBookingOpen ? (
          <View style={styles.bookingForm}>
            <TextInput
              style={styles.bookingInput}
              value={bookingForm.subject}
              onChangeText={(v) => setBookingForm((f) => ({ ...f, subject: v }))}
              placeholder={subjectList[0] || "Subject"}
              placeholderTextColor="#94a3b8"
            />
            <TextInput
              style={styles.bookingInput}
              value={bookingForm.time}
              onChangeText={(v) => setBookingForm((f) => ({ ...f, time: v }))}
              placeholder="Preferred time (e.g. Mon 5 PM)"
              placeholderTextColor="#94a3b8"
            />
            <TextInput
              style={styles.bookingInput}
              value={bookingForm.fee}
              onChangeText={(v) => setBookingForm((f) => ({ ...f, fee: v }))}
              placeholder="Expected fee (₹)"
              placeholderTextColor="#94a3b8"
              keyboardType="numeric"
            />
            <View style={styles.bookingActions}>
              <TouchableOpacity
                style={styles.bookingSendBtn}
                onPress={onSubmit}
                disabled={submitting}
                activeOpacity={0.85}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="send-outline" size={14} color="#fff" />
                    <Text style={styles.bookingSendText}>Send Request</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.bookingCancelBtn} onPress={onCancel} activeOpacity={0.85}>
                <Text style={styles.bookingCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.requestMatchBtn}
            onPress={onRequestMatch}
            activeOpacity={0.88}
          >
            <Ionicons name="calendar-outline" size={17} color="#0f172a" />
            <Text style={styles.requestMatchText}>Request Match</Text>
            <Ionicons name="chevron-forward" size={16} color="#0f172a" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const PRIMARY = "#14b8a6";
const DARK = "#0f172a";
const SOFT = "#f8fafc";
const WHITE = "#ffffff";
const SLATE500 = "#64748b";

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: SOFT },
  content: { paddingHorizontal: 18, paddingBottom: 100, gap: 16 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    color: DARK,
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  headerSub: { color: SLATE500, fontSize: 13, marginTop: 3 },
  headerLoginBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: DARK,
    borderRadius: 99,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  headerLoginText: { color: WHITE, fontSize: 13, fontWeight: "800" },

  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: WHITE,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: DARK,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  searchInput: { flex: 1, color: DARK, fontSize: 14, fontWeight: "500" },

  chips: { gap: 8, paddingRight: 18 },
  chip: {
    backgroundColor: WHITE,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: 99,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipActive: { backgroundColor: DARK, borderColor: DARK },
  chipText: { color: SLATE500, fontSize: 13, fontWeight: "800" },
  chipTextActive: { color: WHITE },

  locatorIntro: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 20,
    backgroundColor: DARK,
    padding: 16,
  },
  locatorIntroCopy: { flex: 1 },
  locatorEyebrow: {
    color: PRIMARY,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.4,
  },
  locatorTitle: {
    color: "#fff",
    fontSize: 18,
    lineHeight: 23,
    fontWeight: "900",
    marginTop: 5,
  },
  locatorText: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 11,
    lineHeight: 17,
    fontWeight: "700",
    marginTop: 4,
  },
  mapToggle: {
    minWidth: 60,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 5,
    backgroundColor: "#fff",
  },
  mapToggleActive: { backgroundColor: "rgba(255,255,255,0.12)" },
  mapToggleText: { color: DARK, fontSize: 11, fontWeight: "900" },
  mapToggleTextActive: { color: "#fff" },
  activeLocationBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#99f6e4",
    backgroundColor: "#ecfdf5",
    padding: 12,
  },
  activeLocationIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0f766e",
  },
  activeLocationCopy: { flex: 1 },
  activeLocationLabel: {
    color: "#047857",
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1,
  },
  activeLocationName: {
    color: "#064e3b",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "900",
    marginTop: 2,
  },
  clearLocationButton: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },

  loadingBlock: { alignItems: "center", gap: 12, paddingVertical: 60 },
  loadingText: { color: SLATE500, fontSize: 14 },

  emptyState: { alignItems: "center", gap: 10, paddingVertical: 60 },
  emptyTitle: { color: DARK, fontSize: 20, fontWeight: "900" },
  emptySub: { color: SLATE500, fontSize: 14, textAlign: "center", maxWidth: 260 },
  emptyBtn: {
    marginTop: 8,
    backgroundColor: DARK,
    borderRadius: 99,
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
  emptyBtnText: { color: WHITE, fontSize: 14, fontWeight: "800" },

  grid: { gap: 18 },

  card: {
    backgroundColor: WHITE,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#dbe4ee",
    overflow: "hidden",
    shadowColor: DARK,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 4,
  },
  cardMedia: { height: 150 },
  cardPhoto: {
    flex: 1,
    justifyContent: "flex-start",
    padding: 12,
  },
  cardPhotoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(2,6,23,0.28)",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  cardPhotoFallback: {
    backgroundColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
  },
  fallbackAvatar: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  fallbackAvatarText: { color: DARK, fontSize: 28, fontWeight: "900" },
  cardRank: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -1,
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  cardContent: { padding: 18, gap: 15 },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  cardName: { flex: 1, color: "#020617", fontSize: 22, lineHeight: 27, fontWeight: "900" },
  degreeHighlight: {
    alignSelf: "flex-start",
    maxWidth: "100%",
    marginTop: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(20,184,166,0.26)",
    backgroundColor: "#ecfdf5",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  cardDegree: { flex: 1, color: "#065f46", fontSize: 15, lineHeight: 20, fontWeight: "900" },
  verifiedMark: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#ccfbf1",
    alignItems: "center",
    justifyContent: "center",
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#fefce8",
    borderWidth: 1,
    borderColor: "#fde68a",
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  ratingText: { color: "#713f12", fontSize: 14, fontWeight: "900" },

  metaRow: { gap: 8 },
  metaItem: {
    minHeight: 34,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderRadius: 12,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 10,
  },
  metaText: { flex: 1, color: "#334155", fontSize: 14, lineHeight: 19, fontWeight: "800" },

  subjectRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  subjectTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#f0fdfa",
    borderWidth: 1,
    borderColor: "rgba(20,184,166,0.22)",
    borderRadius: 99,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  subjectTagText: { color: "#0f766e", fontSize: 13, fontWeight: "900" },
  subjectTagMuted: {
    borderRadius: 99,
    backgroundColor: "#e2e8f0",
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  subjectTagMutedText: { color: "#475569", fontSize: 13, fontWeight: "900" },

  cardFooter: {
    flexDirection: "row",
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  footerStat: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 11,
  },
  footerStatLabel: { color: "#64748b", fontSize: 11, lineHeight: 15, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.8 },
  footerStatVal: { color: "#020617", fontSize: 16, lineHeight: 21, fontWeight: "900", marginTop: 4 },

  requestMatchBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: PRIMARY,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 15,
    justifyContent: "center",
    marginTop: 4,
  },
  requestMatchText: { color: "#020617", fontSize: 16, fontWeight: "900", flex: 1, textAlign: "center" },

  bookingForm: { gap: 8, marginTop: 4 },
  bookingInput: {
    backgroundColor: SOFT,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: DARK,
    fontSize: 15,
    fontWeight: "700",
  },
  bookingActions: { flexDirection: "row", gap: 10, marginTop: 2 },
  bookingSendBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: DARK,
    borderRadius: 12,
    paddingVertical: 12,
  },
  bookingSendText: { color: WHITE, fontSize: 15, fontWeight: "900" },
  bookingCancelBtn: {
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  bookingCancelText: { color: SLATE500, fontSize: 15, fontWeight: "900" },
});
