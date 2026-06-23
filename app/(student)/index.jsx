import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import useAuthStore from "../../store/authStore";
import { studentService } from "../../services/studentService";
import {
  DashboardShell,
  EmptyState,
  ListRow,
  SectionCard,
  SkeletonDashboard,
  StatGrid,
} from "../../components/dashboard-kit";

const EMPTY = [];

export default function StudentDashboard() {
  const logout = useAuthStore((s) => s.logout);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionModal, setActionModal] = useState(null);

  const loadDashboard = useCallback(async () => {
    try {
      const response = await studentService.getStudentDashboard();
      setData(response);
    } catch (error) {
      Alert.alert("Student Dashboard", error?.response?.data?.message || "Could not load your dashboard.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboard();
  };

  const student = data?.student;
  const fullName = student?.user?.fullName || student?.user?.name || "Student";
  const firstName = fullName.split(" ")?.[0] || "Student";
  const stats = data?.stats || {};
  const sessions = data?.upcomingClasses || EMPTY;
  const completed = data?.completedClasses || EMPTY;
  const proposals = data?.scheduleProposals || EMPTY;
  const subjects = data?.subjectProgress || EMPTY;
  const tutors = data?.tutors || EMPTY;

  const statItems = useMemo(
    () => [
      { label: "Classes This Week", value: stats.classesThisWeek || 0, icon: "calendar-outline" },
      { label: "Average Progress", value: `${stats.averageProgress || 0}%`, icon: "trending-up-outline" },
      { label: "Completed", value: completed.length, icon: "checkmark-done-outline" },
      { label: "Active Tutors", value: stats.activeTutors || tutors.length, icon: "people-outline" },
    ],
    [stats, completed.length, tutors.length],
  );

  const submitScheduleResponse = async (proposal, action, message = "") => {
    try {
      await studentService.respondToSchedule(proposal.id, action, message);
      setActionModal(null);
      loadDashboard();
    } catch (error) {
      Alert.alert("Schedule", error?.response?.data?.message || "Could not update schedule.");
    }
  };

  const submitReview = async () => {
    try {
      await studentService.saveReview(actionModal.tutor.id, {
        rating: Number(actionModal.rating),
        text: actionModal.text,
      });
      setActionModal(null);
      loadDashboard();
    } catch (error) {
      Alert.alert("Tutor Review", error?.response?.data?.message || "Could not save review.");
    }
  };

  if (loading) return <SkeletonDashboard label="Loading student dashboard..." />;

  return (
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
    >
      <StatGrid stats={statItems} />

      <SectionCard title="Progress Overview" eyebrow="Learning" icon="trending-up-outline">
        {subjects.length ? (
          subjects.map((subject) => (
            <ListRow
              key={subject.name}
              icon="stats-chart-outline"
              title={subject.name}
              subtitle={subject.note || "Progress tracked from tutor updates"}
              meta={`${subject.progress || 0}%`}
            />
          ))
        ) : (
          <EmptyState label="Progress appears after classes, notes, or bookings are added." />
        )}
      </SectionCard>

      <SectionCard title="Upcoming Sessions" eyebrow="Schedule" icon="time-outline">
        {sessions.length ? (
          sessions.map((session) => (
            <ListRow
              key={session.id || `${session.subject}-${session.time}`}
              icon="calendar-outline"
              title={session.subject || "Session"}
              subtitle={session.tutor || "Tutor details pending"}
              meta={`${session.day || ""} ${session.time || ""}`.trim()}
              badge={session.mode}
            />
          ))
        ) : (
          <EmptyState label="No scheduled classes yet." />
        )}
      </SectionCard>

      <SectionCard title="Schedule Proposals" eyebrow="Needs Your Decision" icon="mail-unread-outline">
        {proposals.length ? (
          proposals.map((proposal) => (
            <ListRow
              key={proposal.id}
              icon="calendar-number-outline"
              title={`${proposal.subject || "Class"} with ${proposal.tutorName || "Tutor"}`}
              subtitle={`${proposal.date ? new Date(proposal.date).toLocaleDateString("en-IN") : "Date pending"} · ${proposal.startTime || ""}-${proposal.endTime || ""}`}
              badge={proposal.status}
              tone="warning"
              onPress={() => setActionModal({ type: "schedule", proposal, message: "" })}
            />
          ))
        ) : (
          <EmptyState label="No schedule proposals need your response." />
        )}
      </SectionCard>

      <SectionCard title="Completed Classes" eyebrow="History" icon="checkmark-done-outline">
        {completed.length ? (
          completed.map((session) => (
            <ListRow
              key={session.id}
              icon="checkmark-circle-outline"
              title={session.subject || "Class"}
              subtitle={session.tutor || "Tutor"}
              meta={`${session.date ? new Date(session.date).toLocaleDateString("en-IN") : ""} ${session.time || ""}`}
              badge="Completed"
              tone="success"
            />
          ))
        ) : (
          <EmptyState label="Completed classes will appear here." />
        )}
      </SectionCard>

      <SectionCard title="Assigned Tutors" eyebrow="Mentors" icon="people-outline">
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
      </SectionCard>

      <StudentActionModal
        modal={actionModal}
        setModal={setActionModal}
        onSchedule={submitScheduleResponse}
        onReview={submitReview}
      />
    </DashboardShell>
  );
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
              <TextInput
                style={styles.input}
                value={modal.rating}
                onChangeText={(rating) => setModal({ ...modal, rating })}
                keyboardType="number-pad"
                placeholder="Rating from 1 to 5"
              />
              <TextInput
                style={[styles.input, styles.multiline]}
                value={modal.text}
                onChangeText={(text) => setModal({ ...modal, text })}
                multiline
                placeholder="Share your feedback"
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
  modal: { backgroundColor: "#fff", borderRadius: 24, padding: 20, gap: 12 },
  eyebrow: { color: "#14b8a6", fontSize: 10, fontWeight: "900", letterSpacing: 1.5, textTransform: "uppercase" },
  title: { color: "#020617", fontSize: 23, fontWeight: "900" },
  copy: { color: "#64748b", fontSize: 13, lineHeight: 20 },
  input: { borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 14, padding: 12, color: "#0f172a" },
  multiline: { minHeight: 88, textAlignVertical: "top" },
  actions: { gap: 8 },
  primary: { backgroundColor: "#14b8a6", borderRadius: 14, padding: 13, alignItems: "center" },
  primaryText: { color: "#042f2e", fontWeight: "900" },
  secondary: { backgroundColor: "#fef3c7", borderRadius: 14, padding: 13, alignItems: "center" },
  secondaryText: { color: "#92400e", fontWeight: "900" },
  danger: { backgroundColor: "#fee2e2", borderRadius: 14, padding: 13, alignItems: "center" },
  dangerText: { color: "#991b1b", fontWeight: "900" },
  cancel: { padding: 10, alignItems: "center" },
  cancelText: { color: "#64748b", fontWeight: "800" },
});
