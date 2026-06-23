import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";
import useAuthStore from "../../store/authStore";
import { tutorService } from "../../services/tutorService";
import {
  Badge,
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
  const requests = data?.pendingRequests || EMPTY;
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
              onPress={() =>
                Alert.alert("Booking Request", "Update this request?", [
                  { text: "Cancel", style: "cancel" },
                  { text: "Reject", style: "destructive", onPress: () => updateRequest(request.id, "REJECTED") },
                  { text: "Accept", onPress: () => updateRequest(request.id, "ACCEPTED") },
                ])
              }
            />
          ))
        ) : (
          <EmptyState label="No pending booking requests." />
        )}
      </SectionCard>

      <SectionCard title="Availability" eyebrow="Teaching" icon="time-outline">
        {(tutor?.availabilityNotes || EMPTY).length ? (
          tutor.availabilityNotes.map((slot) => <ListRow key={slot} icon="checkmark-circle-outline" title={slot} />)
        ) : (
          <EmptyState label="Availability notes from your tutor application will appear here." />
        )}
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
    </DashboardShell>
  );
}
