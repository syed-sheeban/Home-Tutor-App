import { useCallback, useEffect, useMemo, useState } from "react";
import { Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import useAuthStore from "../../store/authStore";
import { studentService } from "../../services/studentService";
import { shouldRefreshDashboard, subscribeToDashboardUpdates } from "../../services/dashboardRealtime";
import { getDashboardCache, setDashboardCache } from "../../services/dashboardCache";
import PremiumFeedbackModal from "../../components/premium-feedback-modal";
import {
  DashboardShell,
  EmptyState,
  ListRow,
  SectionCard,
  SkeletonDashboard,
  StatGrid,
} from "../../components/dashboard-kit";

const EMPTY = [];

export default function StudentDashboard({ section = "overview" }) {
  const logout = useAuthStore((s) => s.logout);
  const [data, setData] = useState(() => getDashboardCache("student"));
  const [loading, setLoading] = useState(() => !getDashboardCache("student"));
  const [refreshing, setRefreshing] = useState(false);
  const [actionModal, setActionModal] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const loadDashboard = useCallback(async () => {
    try {
      const response = await studentService.getStudentDashboard();
      setData(response);
      setDashboardCache("student", response);
    } catch (error) {
      setFeedback({ type: "error", title: "Student Dashboard", message: error?.response?.data?.message || "Could not load your dashboard." });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => subscribeToDashboardUpdates((payload) => {
    if (shouldRefreshDashboard(payload)) loadDashboard();
  }), [loadDashboard]);

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboard();
  };

  const student = data?.student;
  const fullName = student?.user?.fullName || student?.user?.name || "Student";
  const firstName = fullName.split(" ")?.[0] || "Student";
  const stats = useMemo(() => data?.stats || {}, [data?.stats]);
  const sessions = data?.upcomingClasses || EMPTY;
  const completed = data?.completedClasses || EMPTY;
  const proposals = data?.scheduleProposals || EMPTY;
  const progressUpdates = data?.progressUpdates || EMPTY;
  const latestProgress = progressUpdates[0];
  const tutors = data?.tutors || EMPTY;
  const savedReviews = tutors.filter((tutor) => tutor.review);
  const nextClass = sessions[0];

  const statItems = useMemo(
    () => [
      { label: "Classes This Week", value: stats.classesThisWeek || 0, icon: "calendar-outline" },
      { label: "Tutor Updates", value: stats.progressUpdates || progressUpdates.length, icon: "trending-up-outline" },
      { label: "Schedule Decisions", value: proposals.length, icon: "mail-unread-outline" },
      { label: "Active Tutors", value: stats.activeTutors || tutors.length, icon: "people-outline" },
    ],
    [stats, progressUpdates.length, proposals.length, tutors.length],
  );

  const submitScheduleResponse = async (proposal, action, message = "") => {
    try {
      await studentService.respondToSchedule(proposal.id, action, message);
      setActionModal(null);
      setFeedback({ type: "success", title: "Schedule Updated", message: "Your schedule response was sent." });
      loadDashboard();
    } catch (error) {
      setFeedback({ type: "error", title: "Schedule", message: error?.response?.data?.message || "Could not update schedule." });
    }
  };

  const submitReview = async () => {
    try {
      await studentService.saveReview(actionModal.tutor.id, {
        rating: Number(actionModal.rating),
        text: actionModal.text,
      });
      setActionModal(null);
      setFeedback({ type: "success", title: "Review Saved", message: "Your tutor feedback was saved." });
      loadDashboard();
    } catch (error) {
      setFeedback({ type: "error", title: "Tutor Review", message: error?.response?.data?.message || "Could not save review." });
    }
  };

  if (loading) return <SkeletonDashboard label="Loading student dashboard..." />;

  return (
    <>
      <DashboardShell
        title="Student Dashboard"
        icon="school-outline"
        subtitle={{
          title: `Hello, ${fullName}`,
          text: `${firstName}, your progress, sessions, tutors, goals, and study materials are ready in one calm workspace.`,
          icon: "sparkles-outline",
        }}
        refreshing={refreshing}
        onRefresh={onRefresh}
        onLogout={logout}
        activeNavigationIndex={["overview", "schedule", "tutors", "progress", "reviews"].indexOf(section)}
        navigation={[
          { label: "Overview", icon: "grid-outline", href: "/(student)" },
          { label: "Schedule", icon: "calendar-outline", href: "/(student)/schedule" },
          { label: "Tutors", icon: "people-outline", href: "/(student)/tutors" },
          { label: "Progress", icon: "trending-up-outline", href: "/(student)/progress" },
          { label: "Reviews", icon: "star-outline", href: "/(student)/reviews" },
        ]}
      >
        {section === "overview" && <StatGrid stats={statItems} />}

      {section === "overview" && <SectionCard title="Next Class" eyebrow="Focus" icon="calendar-number-outline">
        {nextClass ? (
          <ListRow
            icon="school-outline"
            title={`${nextClass.subject || "Class"} with ${nextClass.tutor || "Tutor"}`}
            subtitle="Offline class"
            meta={`${formatClassDay(nextClass.date || nextClass.day)} ${formatClassTime(nextClass.startTime, nextClass.endTime, nextClass.time)}`}
            badge={nextClass.status || "Scheduled"}
            tone="success"
          />
        ) : (
          <EmptyState label="Your upcoming classes will appear once a tutor schedules them." />
        )}
      </SectionCard>}

      {section === "progress" && <SectionCard title="Tutor Progress Journal" eyebrow="Learning Focus" icon="trending-up-outline">
        {latestProgress && (
          <View style={styles.featureCard}>
            <Text style={styles.featureEyebrow}>{latestProgress.subject || "Latest update"}</Text>
            <Text style={styles.featureTitle}>{latestProgress.title}</Text>
            <Text style={styles.featureText}>{latestProgress.summary}</Text>
            {!!latestProgress.nextSteps && <Text style={styles.featureNext}>Next focus: {latestProgress.nextSteps}</Text>}
          </View>
        )}
        {progressUpdates.length ? (
          progressUpdates.map((update) => (
            <ListRow
              key={update.id}
              icon="stats-chart-outline"
              title={update.title || update.subject}
              subtitle={update.summary || "Tutor progress update"}
              meta={Number.isInteger(update.score) ? `${update.score}%` : formatDate(update.createdAt)}
            />
          ))
        ) : (
          <EmptyState label="Tutor-written progress updates will appear here." />
        )}
      </SectionCard>}

      {section === "schedule" && <SectionCard title="Upcoming Sessions" eyebrow="Schedule" icon="time-outline">
        {sessions.length ? (
          sessions.map((session) => (
            <ListRow
              key={session.id || `${session.subject}-${session.time}`}
              icon="calendar-outline"
              title={session.subject || "Session"}
              subtitle={session.tutor || "Tutor details pending"}
              meta={`${formatClassDay(session.date || session.day)} ${formatClassTime(session.startTime, session.endTime, session.time)}`}
              badge={session.mode || "Offline"}
            />
          ))
        ) : (
          <EmptyState label="No scheduled classes yet." />
        )}
      </SectionCard>}

      {section === "schedule" && <SectionCard title="Schedule Proposals" eyebrow="Needs Your Decision" icon="mail-unread-outline">
        {proposals.length ? (
          proposals.map((proposal) => (
            <ListRow
              key={proposal.id}
              icon="calendar-number-outline"
              title={`${proposal.subject || "Class"} with ${proposal.tutorName || "Tutor"}`}
              subtitle={`${proposal.date ? new Date(proposal.date).toLocaleDateString("en-IN") : "Date pending"} - ${proposal.startTime || ""}-${proposal.endTime || ""}`}
              badge={proposal.status}
              tone="warning"
              onPress={() => setActionModal({ type: "schedule", proposal, message: "" })}
            />
          ))
        ) : (
          <EmptyState label="No schedule proposals need your response." />
        )}
      </SectionCard>}

      {section === "schedule" && <SectionCard title="Completed Classes" eyebrow="History" icon="checkmark-done-outline">
        {completed.length ? (
          completed.map((session) => (
            <ListRow
              key={session.id}
              icon="checkmark-circle-outline"
              title={session.subject || "Class"}
              subtitle={session.tutor || "Tutor"}
              meta={`${formatDate(session.date)} ${session.time || ""}`}
              badge="Completed"
              tone="success"
            />
          ))
        ) : (
          <EmptyState label="Completed classes will appear here." />
        )}
      </SectionCard>}

      {section === "tutors" && <SectionCard title="Assigned Tutors" eyebrow="Mentors" icon="people-outline">
        {tutors.length ? (
          tutors.map((tutor) => (
            <ListRow
              key={tutor.id || tutor.name}
              icon="person-outline"
              title={tutor.name || "Tutor"}
              subtitle={tutor.subject || tutor.experience || "Subject not added"}
              meta={tutor.canReview ? "Tap to review" : "Review unlocks after class"}
              onPress={
                tutor.canReview
                  ? () => setActionModal({
                      type: "review",
                      tutor,
                      rating: String(tutor.review?.rating || 5),
                      text: tutor.review?.text || "",
                    })
                  : undefined
              }
            />
          ))
        ) : (
          <EmptyState label="Accepted tutors will appear here." />
        )}
      </SectionCard>}

      {section === "reviews" && <SectionCard title="Your Tutor Feedback" eyebrow="Reviews" icon="star-outline">
        {savedReviews.length ? (
          savedReviews.map((tutor) => (
            <ListRow
              key={`review-${tutor.id || tutor.name}`}
              icon="star-outline"
              title={tutor.name || "Tutor"}
              subtitle={tutor.review?.text || "Feedback saved"}
              meta={`${tutor.review?.rating || 0}/5`}
              onPress={() => setActionModal({ type: "review", tutor, rating: String(tutor.review?.rating || 5), text: tutor.review?.text || "" })}
            />
          ))
        ) : (
          <EmptyState label="Your submitted tutor feedback will appear here." />
        )}
      </SectionCard>}

      </DashboardShell>

      <StudentActionModal
        modal={actionModal}
        setModal={setActionModal}
        onSchedule={submitScheduleResponse}
        onReview={submitReview}
      />
      <PremiumFeedbackModal
        visible={!!feedback}
        type={feedback?.type}
        title={feedback?.title}
        message={feedback?.message}
        onClose={() => setFeedback(null)}
      />
    </>
  );
}


function formatDate(value) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatClassDay(value) {
  if (!value) return "Day pending";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short" });
}

function formatClassTime(start, end, fallback) {
  if (!start && !end) return fallback || "Time pending";
  const format = (value) => {
    if (!value) return "";
    const date = new Date(`2026-01-01T${value}:00`);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  };
  return [start, end].filter(Boolean).map(format).join(" - ");
}

function StudentActionModal({ modal, setModal, onSchedule, onReview }) {
  if (!modal) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => setModal(null)}>
      <View style={styles.backdrop}>
        <View style={styles.modal}>
          <Text style={styles.eyebrow}>{modal.type === "review" ? "Tutor Review" : "Schedule Proposal"}</Text>
          <Text style={styles.title}>
            {modal.type === "review" ? modal.tutor.name : modal.proposal.subject}
          </Text>

          {modal.type === "review" ? (
            <>
              <View style={styles.starField}>
                <Text style={styles.fieldLabel}>Rating</Text>
                <View style={styles.starRow}>
                  {[1, 2, 3, 4, 5].map((value) => {
                    const active = Number(modal.rating) >= value;
                    return (
                      <TouchableOpacity
                        key={value}
                        style={[styles.starButton, active && styles.starButtonActive]}
                        onPress={() => setModal({ ...modal, rating: value })}
                        activeOpacity={0.82}
                      >
                        <Text style={[styles.starText, active && styles.starTextActive]}>*</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
              <TextInput
                style={[styles.input, styles.multiline]}
                value={modal.text}
                onChangeText={(text) => setModal({ ...modal, text })}
                multiline
                placeholder="Write your custom review"
              />
              <TouchableOpacity style={styles.primary} onPress={onReview}>
                <Text style={styles.primaryText}>Save Review</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.copy}>
                {modal.proposal.tutorName} proposed {modal.proposal.startTime}-{modal.proposal.endTime}.
              </Text>
              <TextInput
                style={[styles.input, styles.multiline]}
                value={modal.message}
                onChangeText={(message) => setModal({ ...modal, message })}
                multiline
                placeholder="Message required when requesting changes"
              />
              <View style={styles.actions}>
                <TouchableOpacity style={styles.primary} onPress={() => onSchedule(modal.proposal, "ACCEPT")}>
                  <Text style={styles.primaryText}>Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondary} onPress={() => onSchedule(modal.proposal, "REQUEST_CHANGES", modal.message)}>
                  <Text style={styles.secondaryText}>Request Changes</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.danger} onPress={() => onSchedule(modal.proposal, "REJECT", modal.message)}>
                  <Text style={styles.dangerText}>Reject</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          <TouchableOpacity style={styles.cancel} onPress={() => setModal(null)}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(2,6,23,0.72)", justifyContent: "center", padding: 20 },
  modal: { backgroundColor: "#fff", borderRadius: 8, padding: 20, gap: 12 },
  eyebrow: { color: "#14b8a6", fontSize: 10, fontWeight: "900", letterSpacing: 1.5, textTransform: "uppercase" },
  title: { color: "#020617", fontSize: 23, fontWeight: "900" },
  copy: { color: "#64748b", fontSize: 13, lineHeight: 20 },
  input: { borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 8, padding: 12, color: "#0f172a" },
  multiline: { minHeight: 88, textAlignVertical: "top" },
  fieldLabel: { color: "#334155", fontSize: 11, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.8 },
  starField: {
    borderWidth: 1,
    borderColor: "#fde68a",
    borderRadius: 8,
    backgroundColor: "#fffbeb",
    padding: 12,
    gap: 9,
  },
  starRow: { flexDirection: "row", gap: 8 },
  starButton: {
    width: 42,
    height: 42,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#fde68a",
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  starButtonActive: { backgroundColor: "#020617", borderColor: "#020617" },
  starText: { color: "#d97706", fontSize: 22, fontWeight: "900" },
  starTextActive: { color: "#facc15" },
  actions: { gap: 8 },
  primary: { backgroundColor: "#14b8a6", borderRadius: 8, padding: 13, alignItems: "center" },
  primaryText: { color: "#042f2e", fontWeight: "900" },
  secondary: { backgroundColor: "#fef3c7", borderRadius: 8, padding: 13, alignItems: "center" },
  secondaryText: { color: "#92400e", fontWeight: "900" },
  danger: { backgroundColor: "#fee2e2", borderRadius: 8, padding: 13, alignItems: "center" },
  dangerText: { color: "#991b1b", fontWeight: "900" },
  cancel: { padding: 10, alignItems: "center" },
  cancelText: { color: "#64748b", fontWeight: "800" },
  featureCard: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ccfbf1",
    backgroundColor: "#f0fdfa",
    padding: 14,
    marginBottom: 10,
  },
  featureEyebrow: { color: "#0f766e", fontSize: 10, fontWeight: "900", letterSpacing: 1.1, textTransform: "uppercase" },
  featureTitle: { color: "#020617", fontSize: 17, fontWeight: "900", marginTop: 5 },
  featureText: { color: "#475569", fontSize: 13, lineHeight: 19, fontWeight: "700", marginTop: 6 },
  featureNext: { color: "#0f766e", fontSize: 12, lineHeight: 18, fontWeight: "900", marginTop: 8 },
});
