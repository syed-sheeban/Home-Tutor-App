import { useCallback, useEffect, useMemo, useState } from "react";
import { Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import useAuthStore from "../../store/authStore";
import { tutorService } from "../../services/tutorService";
import { shouldRefreshDashboard, subscribeToDashboardUpdates } from "../../services/dashboardRealtime";
import PremiumFeedbackModal from "../../components/premium-feedback-modal";
import {
  DashboardShell,
  EmptyState,
  ListRow,
  SectionCard,
  SkeletonDashboard,
  StatGrid,
  getStatusTone,
} from "../../components/dashboard-kit";

const EMPTY = [];

function addOneHour(value) {
  const [hours = 0, minutes = 0] = String(value || "16:00").split(":").map(Number);
  return `${String((hours + 1) % 24).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export default function TutorDashboard() {
  const logout = useAuthStore((s) => s.logout);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editor, setEditor] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [requestPrompt, setRequestPrompt] = useState(null);

  const loadDashboard = useCallback(async () => {
    try {
      const response = await tutorService.getTutorDashboard();
      setData(response);
    } catch (error) {
      setFeedback({ type: "error", title: "Tutor Dashboard", message: error?.response?.data?.message || "Could not load tutor dashboard." });
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

  const tutor = data?.tutor;
  const name = tutor?.user?.fullName || "Tutor";
  const requests = data?.activeRequests?.length
    ? [...(data?.pendingRequests || EMPTY), ...data.activeRequests]
    : data?.pendingRequests || EMPTY;
  const students = data?.students || EMPTY;
  const sessions = data?.upcomingSchedules || data?.schedules || EMPTY;
  const scheduleProposals = data?.scheduleProposals || EMPTY;
  const progressUpdates = data?.progressUpdates || EMPTY;
  const reviews = data?.reviews || EMPTY;
  const status = tutor?.verificationStatus || (tutor?.isVerified ? "APPROVED" : "PENDING");
  const availabilityStatus = String(tutor?.availabilityStatus || "AVAILABLE").toUpperCase();
  const scheduleQueue = requests.filter((request) =>
    ["ACCEPTED", "SCHEDULE_PROPOSED", "CHANGES_REQUESTED"].includes(request.status),
  );

  const avgRating = reviews.length
    ? (reviews.reduce((total, review) => total + (review.rating || 0), 0) / reviews.length).toFixed(1)
    : "0";

  const stats = useMemo(
    () => [
      { label: "Sessions", value: sessions.length, icon: "calendar-outline" },
      { label: "Students", value: students.length, icon: "people-outline" },
      { label: "Schedule Decisions", value: scheduleProposals.length, icon: "mail-unread-outline" },
      { label: "Avg Rating", value: avgRating, icon: "star-outline" },
    ],
    [sessions.length, students.length, scheduleProposals.length, avgRating],
  );

  const updateRequest = async (id, nextStatus) => {
    try {
      await tutorService.respondToBooking(id, nextStatus);
      setFeedback({ type: "success", title: "Booking Updated", message: `Request marked ${nextStatus.toLowerCase()}.` });
      loadDashboard();
    } catch (error) {
      setFeedback({ type: "error", title: "Booking Request", message: error?.response?.data?.message || "Could not update request." });
    }
  };

  const submitSchedule = async () => {
    const startTime = editor.startTime;
    try {
      await tutorService.proposeSchedule(editor.request.id, {
        date: editor.date,
        startTime,
        endTime: editor.endTime || addOneHour(startTime),
        message: editor.message,
      });
      setEditor(null);
      setFeedback({ type: "success", title: "Schedule Proposed", message: "The class schedule was sent to the student." });
      loadDashboard();
    } catch (error) {
      setFeedback({ type: "error", title: "Class Schedule", message: error?.response?.data?.message || "Could not propose schedule." });
    }
  };

  const submitProgressUpdate = async () => {
    try {
      await tutorService.sendProgressUpdate({
        studentId: editor.student.studentId,
        subject: editor.subject || editor.student.subject,
        title: editor.title,
        summary: editor.summary,
        nextSteps: editor.nextSteps,
        score: editor.score,
      });
      setEditor(null);
      setFeedback({ type: "success", title: "Progress Sent", message: "Progress update was sent to parent and student." });
      loadDashboard();
    } catch (error) {
      setFeedback({ type: "error", title: "Progress Update", message: error?.response?.data?.message || "Could not send progress update." });
    }
  };

  const updateAvailability = async (nextStatus) => {
    try {
      const response = await tutorService.updateAvailability({ availabilityStatus: nextStatus });
      setData((current) => ({
        ...(current || {}),
        tutor: response?.tutor || { ...current?.tutor, availabilityStatus: nextStatus },
      }));
      setFeedback({
        type: "success",
        title: "Availability Updated",
        message: nextStatus === "AVAILABLE" ? "Your tutor card now shows currently available." : "Your tutor card now shows currently unavailable.",
      });
      loadDashboard();
    } catch (error) {
      setFeedback({ type: "error", title: "Availability", message: error?.response?.data?.message || "Could not update availability." });
    }
  };

  if (loading) return <SkeletonDashboard label="Loading tutor workspace..." />;

  return (
    <DashboardShell
      title="Tutor Dashboard"
      icon="briefcase-outline"
      subtitle={{
        title: `Hello ${name}`,
        text: "Manage requests, class schedules, students, progress updates, and reviews from a focused mobile workspace.",
        icon: "shield-checkmark-outline",
      }}
      refreshing={refreshing}
      onRefresh={onRefresh}
      onLogout={logout}
    >
      <StatGrid stats={stats} />

      <SectionCard title="Verification Status" eyebrow="Profile" icon="shield-checkmark-outline">
        <ListRow
          icon="ribbon-outline"
          title={status === "APPROVED" ? "Verified Tutor" : "Tutor profile under review"}
          subtitle={tutor?.degree || tutor?.experience || "Complete your profile for administrator review."}
          badge={status}
          tone={getStatusTone(status)}
        />
      </SectionCard>

      <SectionCard title="Availability" eyebrow="Tutor Card Status" icon="radio-button-on-outline">
        <View style={styles.availabilityPanel}>
          <View style={styles.availabilityCopy}>
            <Text style={styles.availabilityTitle}>
              {availabilityStatus === "UNAVAILABLE" ? "Currently unavailable" : "Currently available"}
            </Text>
            <Text style={styles.availabilityText}>
              This status appears on your Find Tutor card for students and parents.
            </Text>
          </View>
          <View style={styles.availabilityActions}>
            {[
              { label: "Currently Available", value: "AVAILABLE" },
              { label: "Currently Unavailable", value: "UNAVAILABLE" },
            ].map((item) => {
              const active = availabilityStatus === item.value;
              return (
                <TouchableOpacity
                  key={item.value}
                  style={[styles.availabilityButton, active && styles.availabilityButtonActive]}
                  onPress={() => updateAvailability(item.value)}
                  activeOpacity={0.84}
                >
                  <Text style={[styles.availabilityButtonText, active && styles.availabilityButtonTextActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </SectionCard>

      <SectionCard title="Scheduled Classes" eyebrow="Schedule" icon="calendar-outline">
        {sessions.length ? (
          sessions.map((session, index) => (
            <ListRow
              key={session.id || index}
              icon="time-outline"
              title={session.student?.user?.fullName || "Student"}
              subtitle={`${session.subject || "Subject"} ${session.mode ? `- ${session.mode}` : ""}`}
              meta={session.time || "Time TBD"}
            />
          ))
        ) : <EmptyState label="No scheduled classes yet." />}
        {scheduleProposals.map((session) => (
          <ListRow
            key={`proposal-${session.id}`}
            icon="calendar-number-outline"
            title={session.student?.user?.fullName || session.studentName || "Student"}
            subtitle={`${session.subject || "Subject"} - Offline class`}
            meta={session.time || [session.startTime, session.endTime].filter(Boolean).join(" - ")}
            badge={String(session.status || "PENDING").replaceAll("_", " ")}
            tone={getStatusTone(session.status)}
          />
        ))}
      </SectionCard>

      <SectionCard title="Students" eyebrow="Roster" icon="people-outline">
        {students.length ? (
          students.map((student, index) => (
            <ListRow
              key={student.id || index}
              icon="person-outline"
              title={student.student?.user?.fullName || "Student"}
              subtitle={`${student.classGrade || "Class not added"} ${student.subject ? `- ${student.subject}` : ""}`}
            />
          ))
        ) : (
          <EmptyState label="Accepted students will appear here." />
        )}
      </SectionCard>

      <SectionCard title="Booking Requests" eyebrow="Activity" icon="notifications-outline">
        {requests.length ? (
          requests.map((request) => (
            <ListRow
              key={request.id}
              icon="mail-unread-outline"
              title={request.student?.user?.fullName || "Student request"}
              subtitle={`${request.subject || "Subject"} ${request.time ? `- ${request.time}` : ""}`}
              badge={request.status || "PENDING"}
              tone={getStatusTone(request.status)}
              onPress={() => {
                if (request.status === "PENDING") {
                  setRequestPrompt(request);
                  return;
                }

                if (["ACCEPTED", "CHANGES_REQUESTED"].includes(request.status)) {
                  setEditor({
                    type: "schedule",
                    request,
                    date: "",
                    startTime: "16:00",
                    endTime: "17:00",
                    mode: "OFFLINE",
                    message: "",
                  });
                }
              }}
            />
          ))
        ) : (
          <EmptyState label="No pending booking requests." />
        )}
      </SectionCard>

      <SectionCard title="Set Class Schedule" eyebrow="Accepted Students" icon="calendar-number-outline">
        {scheduleQueue.length ? (
          scheduleQueue.map((request) => (
            <ListRow
              key={`schedule-${request.id}`}
              icon="calendar-outline"
              title={request.student?.user?.fullName || "Student"}
              subtitle={`${request.classGrade || "Class not added"} - ${request.subject || "Subject"}${request.status === "CHANGES_REQUESTED" ? "\nStudent requested changes" : ""}`}
              badge={String(request.status || "ACCEPTED").replaceAll("_", " ")}
              tone={getStatusTone(request.status)}
              onPress={() => setEditor({
                type: "schedule",
                request,
                date: "",
                startTime: "16:00",
                endTime: "",
                message: "",
              })}
            />
          ))
        ) : (
          <EmptyState label="No accepted requests waiting for schedule." />
        )}
      </SectionCard>

      <SectionCard title="Send Progress Updates" eyebrow="Parent + Student" icon="chatbox-ellipses-outline">
        {students.length ? (
          students.map((student) => (
            <ListRow
              key={`progress-${student.studentId || student.id}`}
              icon="create-outline"
              title={student.student?.user?.fullName || "Student"}
              subtitle={`${student.classGrade || "Class not added"} - ${student.subject || "Subject"}`}
              meta="Tap to write"
              onPress={() => setEditor({
                type: "progress",
                student,
                subject: student.subject || "",
                title: "",
                summary: "",
                nextSteps: "",
                score: "",
              })}
            />
          ))
        ) : (
          <EmptyState label="Accepted students will appear here." />
        )}
        {progressUpdates.slice(0, 3).map((update) => (
          <ListRow
            key={`sent-${update.id}`}
            icon="trending-up-outline"
            title={update.title || update.subject}
            subtitle={update.summary || "Progress update"}
            meta={update.student?.user?.fullName || "Student"}
          />
        ))}
      </SectionCard>

      <SectionCard title="Reviews" eyebrow="Performance" icon="star-outline">
        {reviews.length ? (
          reviews.slice(0, 5).map((review) => (
            <ListRow
              key={review.id}
              icon="star-outline"
              title={`${review.rating || 0}/5 rating`}
              subtitle={review.text || "Review shared by student"}
              meta={review.student?.user?.fullName}
            />
          ))
        ) : (
          <EmptyState label="Reviews will appear after completed sessions." />
        )}
      </SectionCard>

      <TutorEditor
        editor={editor}
        setEditor={setEditor}
        onSchedule={submitSchedule}
        onProgress={submitProgressUpdate}
      />
      <PremiumFeedbackModal
        visible={!!requestPrompt}
        type="warning"
        title="Update Booking Request"
        message={requestPrompt ? `${requestPrompt.student?.user?.fullName || "Student"} requested ${requestPrompt.subject || "a class"}.` : ""}
        actions={[
          { label: "Accept Request", primary: true, onPress: () => updateRequest(requestPrompt.id, "ACCEPTED") },
          { label: "Reject Request", danger: true, onPress: () => updateRequest(requestPrompt.id, "REJECTED") },
          { label: "Cancel" },
        ]}
        onClose={() => setRequestPrompt(null)}
      />
      <PremiumFeedbackModal
        visible={!!feedback}
        type={feedback?.type}
        title={feedback?.title}
        message={feedback?.message}
        onClose={() => setFeedback(null)}
      />
    </DashboardShell>
  );
}

function TutorEditor({ editor, setEditor, onSchedule, onProgress }) {
  if (!editor) return null;
  const progress = editor.type === "progress";

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => setEditor(null)}>
      <View style={styles.backdrop}>
        <View style={styles.modal}>
          <Text style={styles.eyebrow}>{progress ? "Progress Writer" : "Propose Class Schedule"}</Text>
          <Text style={styles.title}>
            {progress ? editor.student.student?.user?.fullName || "Student" : editor.request.student?.user?.fullName || "Student"}
          </Text>
          {progress ? (
            <>
              <TextInput style={styles.input} value={editor.subject} onChangeText={(subject) => setEditor({ ...editor, subject })} placeholder="Subject" />
              <TextInput style={styles.input} value={editor.title} onChangeText={(title) => setEditor({ ...editor, title })} placeholder="Short progress title" />
              <TextInput style={[styles.input, styles.multiline]} value={editor.summary} onChangeText={(summary) => setEditor({ ...editor, summary })} multiline placeholder="Write clear progress details" />
              <TextInput style={[styles.input, styles.multiline]} value={editor.nextSteps} onChangeText={(nextSteps) => setEditor({ ...editor, nextSteps })} multiline placeholder="Next focus or homework plan" />
              <TextInput style={styles.input} value={editor.score} onChangeText={(score) => setEditor({ ...editor, score })} keyboardType="number-pad" placeholder="Optional score 0-100" />
            </>
          ) : (
            <>
              <TextInput style={styles.input} value={editor.date} onChangeText={(date) => setEditor({ ...editor, date })} placeholder="Date (YYYY-MM-DD)" />
              <TextInput style={styles.input} value={editor.startTime} onChangeText={(startTime) => setEditor({ ...editor, startTime })} placeholder="Start time (16:00)" />
              <TextInput style={styles.input} value={editor.endTime} onChangeText={(endTime) => setEditor({ ...editor, endTime })} placeholder="End time auto-fills if blank" />
              <TextInput style={[styles.input, styles.multiline]} value={editor.message} onChangeText={(message) => setEditor({ ...editor, message })} multiline placeholder="Optional instructions" />
            </>
          )}
          <TouchableOpacity style={styles.primary} onPress={progress ? onProgress : onSchedule}>
            <Text style={styles.primaryText}>{progress ? "Send Progress Update" : "Send Proposal"}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancel} onPress={() => setEditor(null)}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(2,6,23,0.72)", justifyContent: "center", padding: 20 },
  modal: { backgroundColor: "#fff", borderRadius: 8, padding: 20, gap: 11 },
  eyebrow: { color: "#14b8a6", fontSize: 10, fontWeight: "900", letterSpacing: 1.4, textTransform: "uppercase" },
  title: { color: "#020617", fontSize: 22, fontWeight: "900" },
  input: { borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 8, padding: 12, color: "#0f172a" },
  multiline: { minHeight: 82, textAlignVertical: "top" },
  availabilityPanel: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#99f6e4",
    backgroundColor: "#f0fdfa",
    padding: 14,
    gap: 13,
  },
  availabilityCopy: { gap: 4 },
  availabilityTitle: { color: "#020617", fontSize: 17, fontWeight: "900" },
  availabilityText: { color: "#475569", fontSize: 12, lineHeight: 18, fontWeight: "700" },
  availabilityActions: { gap: 8 },
  availabilityButton: {
    minHeight: 46,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  availabilityButtonActive: {
    backgroundColor: "#020617",
    borderColor: "#020617",
  },
  availabilityButtonText: { color: "#334155", fontSize: 13, fontWeight: "900" },
  availabilityButtonTextActive: { color: "#fff" },
  primary: { marginTop: 10, backgroundColor: "#14b8a6", borderRadius: 8, padding: 13, alignItems: "center" },
  primaryText: { color: "#042f2e", fontWeight: "900" },
  cancel: { padding: 10, alignItems: "center" },
  cancelText: { color: "#64748b", fontWeight: "800" },
});
