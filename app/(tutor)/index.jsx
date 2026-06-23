import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import useAuthStore from "../../store/authStore";
import { tutorService } from "../../services/tutorService";
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

export default function TutorDashboard() {
  const logout = useAuthStore((s) => s.logout);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editor, setEditor] = useState(null);

  const loadDashboard = useCallback(async () => {
    try {
      const response = await tutorService.getTutorDashboard();
      setData(response);
    } catch (error) {
      Alert.alert("Tutor Dashboard", error?.response?.data?.message || "Could not load tutor dashboard.");
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

  const tutor = data?.tutor;
  const name = tutor?.user?.fullName || "Tutor";
  const requests = data?.activeRequests?.length
    ? [...(data?.pendingRequests || EMPTY), ...data.activeRequests]
    : data?.pendingRequests || EMPTY;
  const students = data?.students || EMPTY;
  const sessions = data?.schedules || EMPTY;
  const reviews = data?.reviews || EMPTY;
  const monthlyEarnings = data?.monthlyEarnings || 0;
  const status = tutor?.verificationStatus || (tutor?.isVerified ? "APPROVED" : "PENDING");

  const avgRating = reviews.length
    ? (reviews.reduce((total, review) => total + (review.rating || 0), 0) / reviews.length).toFixed(1)
    : "0";

  const stats = useMemo(
    () => [
      { label: "Today's Sessions", value: sessions.length, icon: "calendar-outline" },
      { label: "Students", value: students.length, icon: "people-outline" },
      { label: "Earnings", value: `Rs ${monthlyEarnings.toLocaleString("en-IN")}`, icon: "cash-outline" },
      { label: "Avg Rating", value: avgRating, icon: "star-outline" },
    ],
    [sessions.length, students.length, monthlyEarnings, avgRating],
  );

  const updateRequest = async (id, nextStatus) => {
    try {
      await tutorService.respondToBooking(id, nextStatus);
      loadDashboard();
    } catch (error) {
      Alert.alert("Booking Request", error?.response?.data?.message || "Could not update request.");
    }
  };

  const submitSchedule = async () => {
    try {
      await tutorService.proposeSchedule(editor.request.id, {
        date: editor.date,
        startTime: editor.startTime,
        endTime: editor.endTime,
        mode: editor.mode,
        message: editor.message,
      });
      setEditor(null);
      loadDashboard();
    } catch (error) {
      Alert.alert("Class Schedule", error?.response?.data?.message || "Could not propose schedule.");
    }
  };

  const saveAvailability = async () => {
    const existing = data?.availability || EMPTY;
    const slots = [
      ...existing.filter((slot) => slot.day !== editor.day),
      {
        day: editor.day,
        isOpen: true,
        startTime: editor.startTime,
        endTime: editor.endTime,
        mode: editor.teachingMode,
      },
    ];

    try {
      await tutorService.updateAvailability({
        slots,
        availabilityStatus: editor.availabilityStatus,
        teachingMode: editor.teachingMode,
        teachingRadius: Number(editor.teachingRadius),
      });
      setEditor(null);
      loadDashboard();
    } catch (error) {
      Alert.alert("Availability", error?.response?.data?.message || "Could not save availability.");
    }
  };

  if (loading) return <SkeletonDashboard label="Loading tutor workspace..." />;

  return (
    <DashboardShell
      title="Tutor Dashboard"
      icon="briefcase-outline"
      subtitle={{
        title: `Hello ${name}`,
        text: "Manage verification, sessions, students, earnings, availability, and reviews from a focused mobile workspace.",
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

      <SectionCard title="Today's Sessions" eyebrow="Schedule" icon="calendar-outline">
        {sessions.length ? (
          sessions.map((session, index) => (
            <ListRow
              key={session.id || index}
              icon="time-outline"
              title={session.student?.user?.fullName || "Student"}
              subtitle={`${session.subject || "Subject"} ${session.mode ? `• ${session.mode}` : ""}`}
              meta={session.time || "Time TBD"}
            />
          ))
        ) : (
          <EmptyState label="No sessions scheduled today." />
        )}
      </SectionCard>

      <SectionCard title="Students" eyebrow="Roster" icon="people-outline">
        {students.length ? (
          students.map((student, index) => (
            <ListRow
              key={student.id || index}
              icon="person-outline"
              title={student.student?.user?.fullName || "Student"}
              subtitle={`${student.classGrade || "Class not added"} ${student.subject ? `• ${student.subject}` : ""}`}
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
              subtitle={`${request.subject || "Subject"} ${request.time ? `• ${request.time}` : ""}`}
              badge={request.status || "PENDING"}
              tone={getStatusTone(request.status)}
              onPress={() => {
                if (request.status === "PENDING") {
                  Alert.alert("Booking Request", "Update this request?", [
                    { text: "Cancel", style: "cancel" },
                    { text: "Reject", style: "destructive", onPress: () => updateRequest(request.id, "REJECTED") },
                    { text: "Accept", onPress: () => updateRequest(request.id, "ACCEPTED") },
                  ]);
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

      <SectionCard title="Availability" eyebrow="Teaching" icon="time-outline">
        {(data?.availability || EMPTY).length ? (
          data.availability.filter((slot) => slot.isOpen).map((slot) => (
            <ListRow
              key={slot.id || slot.day}
              icon="checkmark-circle-outline"
              title={slot.day}
              subtitle={`${slot.startTime || "Time pending"}-${slot.endTime || ""}`}
              badge={slot.mode}
            />
          ))
        ) : (
          <EmptyState label="Configure your weekly teaching availability." />
        )}
        <TouchableOpacity
          style={styles.primary}
          onPress={() => setEditor({
            type: "availability",
            day: "Monday",
            startTime: "16:00",
            endTime: "20:00",
            teachingMode: tutor?.teachingMode || "BOTH",
            availabilityStatus: tutor?.availabilityStatus || "AVAILABLE",
            teachingRadius: String(tutor?.teachingRadius || 8),
          })}
        >
          <Text style={styles.primaryText}>Configure Availability</Text>
        </TouchableOpacity>
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
        onAvailability={saveAvailability}
      />
    </DashboardShell>
  );
}

function TutorEditor({ editor, setEditor, onSchedule, onAvailability }) {
  if (!editor) return null;
  const availability = editor.type === "availability";

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => setEditor(null)}>
      <View style={styles.backdrop}>
        <View style={styles.modal}>
          <Text style={styles.eyebrow}>{availability ? "Tutor Availability" : "Propose Class Schedule"}</Text>
          <Text style={styles.title}>
            {availability ? "Publish a real teaching slot" : editor.request.student?.user?.fullName || "Student"}
          </Text>
          <TextInput
            style={styles.input}
            value={availability ? editor.day : editor.date}
            onChangeText={(value) => setEditor({ ...editor, [availability ? "day" : "date"]: value })}
            placeholder={availability ? "Day (Monday)" : "Date (YYYY-MM-DD)"}
          />
          <TextInput style={styles.input} value={editor.startTime} onChangeText={(startTime) => setEditor({ ...editor, startTime })} placeholder="Start time (16:00)" />
          <TextInput style={styles.input} value={editor.endTime} onChangeText={(endTime) => setEditor({ ...editor, endTime })} placeholder="End time (17:00)" />
          {availability ? (
            <>
              <TextInput style={styles.input} value={editor.teachingMode} onChangeText={(teachingMode) => setEditor({ ...editor, teachingMode: teachingMode.toUpperCase() })} placeholder="BOTH, ONLINE, or OFFLINE" />
              <TextInput style={styles.input} value={editor.availabilityStatus} onChangeText={(availabilityStatus) => setEditor({ ...editor, availabilityStatus: availabilityStatus.toUpperCase() })} placeholder="AVAILABLE, LIMITED, or UNAVAILABLE" />
              <TextInput style={styles.input} value={editor.teachingRadius} onChangeText={(teachingRadius) => setEditor({ ...editor, teachingRadius })} keyboardType="number-pad" placeholder="Teaching radius" />
            </>
          ) : (
            <>
              <TextInput style={styles.input} value={editor.mode} onChangeText={(mode) => setEditor({ ...editor, mode: mode.toUpperCase() })} placeholder="ONLINE or OFFLINE" />
              <TextInput style={[styles.input, styles.multiline]} value={editor.message} onChangeText={(message) => setEditor({ ...editor, message })} multiline placeholder="Optional instructions" />
            </>
          )}
          <TouchableOpacity style={styles.primary} onPress={availability ? onAvailability : onSchedule}>
            <Text style={styles.primaryText}>{availability ? "Save Availability" : "Send Proposal"}</Text>
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
  modal: { backgroundColor: "#fff", borderRadius: 24, padding: 20, gap: 11 },
  eyebrow: { color: "#14b8a6", fontSize: 10, fontWeight: "900", letterSpacing: 1.4, textTransform: "uppercase" },
  title: { color: "#020617", fontSize: 22, fontWeight: "900" },
  input: { borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 14, padding: 12, color: "#0f172a" },
  multiline: { minHeight: 82, textAlignVertical: "top" },
  primary: { marginTop: 10, backgroundColor: "#14b8a6", borderRadius: 14, padding: 13, alignItems: "center" },
  primaryText: { color: "#042f2e", fontWeight: "900" },
  cancel: { padding: 10, alignItems: "center" },
  cancelText: { color: "#64748b", fontWeight: "800" },
});
