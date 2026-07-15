import { useCallback, useEffect, useMemo, useState } from "react";
import useAuthStore from "../../store/authStore";
import { parentService } from "../../services/parentService";
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

export default function ParentDashboard() {
  const logout = useAuthStore((s) => s.logout);
  const [data, setData] = useState(null);
  const [tutors, setTutors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const loadDashboard = useCallback(async () => {
    try {
      const [dashboardData, tutorData] = await Promise.all([
        parentService.getParentDashboard(),
        parentService.getParentTutors(),
      ]);
      setData(dashboardData);
      setTutors(Array.isArray(tutorData) ? tutorData : []);
    } catch (error) {
      setFeedback({ type: "error", title: "Parent Dashboard", message: error?.response?.data?.message || "Could not load parent dashboard." });
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

  const child = data?.child;
  const stats = useMemo(() => data?.stats || {}, [data?.stats]);
  const progressUpdates = data?.progressUpdates || EMPTY;
  const sessions = data?.upcomingSessions || EMPTY;
  const bookings = data?.bookingHistory || EMPTY;
  const reviews = data?.reviews || EMPTY;
  const notes = data?.notes || EMPTY;

  const statItems = useMemo(
    () => [
      { label: "Tutor Updates", value: stats.progressUpdates || progressUpdates.length, icon: "trending-up-outline" },
      { label: "Upcoming Sessions", value: stats.upcomingSessions || sessions.length, icon: "calendar-outline" },
      { label: "Active Tutors", value: stats.activeTutors || tutors.length, icon: "people-outline" },
      { label: "Bookings", value: bookings.length, icon: "document-text-outline" },
    ],
    [stats, progressUpdates.length, sessions.length, tutors.length, bookings.length],
  );

  if (loading) return <SkeletonDashboard label="Loading parent dashboard..." />;

  return (
    <DashboardShell
      title="Parent Dashboard"
      icon="people-circle-outline"
      subtitle={{
        title: child?.user?.fullName ? `${child.user.fullName}'s progress` : "Child learning overview",
        text: child
          ? `${child.classGrade || "Class not added"} - ${child.learningNeed || "Learning goal not added"}`
          : "Link a student profile to see progress, sessions, bookings, and reports.",
        icon: "heart-outline",
      }}
      refreshing={refreshing}
      onRefresh={onRefresh}
      onLogout={logout}
      navigation={[
        { label: "Overview", description: "Learning snapshot", icon: "grid-outline", index: 0 },
        { label: "Progress", description: "Tutor updates", icon: "trending-up-outline", index: 1 },
        { label: "Sessions", description: "Upcoming timetable", icon: "calendar-outline", index: 2 },
        { label: "Bookings", description: "Requests and history", icon: "document-text-outline", index: 4 },
        { label: "Reports", description: "Feedback and notes", icon: "book-outline", index: 5 },
      ]}
    >
      <StatGrid stats={statItems} />

      <SectionCard title="Tutor Progress Journal" eyebrow="Learning" icon="trending-up-outline">
        {progressUpdates.length ? (
          progressUpdates.map((item) => (
            <ListRow
              key={item.id}
              icon="stats-chart-outline"
              title={item.title || item.subject}
              subtitle={item.summary || "Tutor-written progress update"}
              meta={Number.isInteger(item.score) ? `${item.score}%` : formatDate(item.createdAt)}
            />
          ))
        ) : (
          <EmptyState label="Tutor progress updates will appear here after your child's tutor writes them." />
        )}
      </SectionCard>

      <SectionCard title="Upcoming Sessions" eyebrow="Schedule" icon="calendar-outline">
        {sessions.length ? (
          sessions.map((session) => (
            <ListRow
              key={session.id || `${session.subject}-${session.time}`}
              icon="time-outline"
              title={session.subject || "Session"}
              subtitle={session.tutor || "Tutor pending"}
              meta={session.time}
              badge={session.status}
              tone={getStatusTone(session.status)}
            />
          ))
        ) : (
          <EmptyState label="No scheduled sessions yet." />
        )}
      </SectionCard>

      <SectionCard title="Tutor Information" eyebrow="Verified Tutors" icon="people-outline">
        {tutors.length ? (
          tutors.slice(0, 5).map((tutor) => (
            <ListRow
              key={tutor.id}
              icon="person-outline"
              title={tutor.name || "Tutor"}
              subtitle={`${tutor.subject || "Subject"} - ${tutor.availableDays?.join(", ") || "Availability pending"} - ${tutor.teachingMode || "BOTH"}`}
              meta={tutor.rating ? `${tutor.rating}/5 (${tutor.reviews || 0})` : "New"}
            />
          ))
        ) : (
          <EmptyState label="Verified tutor suggestions will appear here." />
        )}
      </SectionCard>

      <SectionCard title="Booking History" eyebrow="Requests" icon="document-text-outline">
        {bookings.length ? (
          bookings.map((booking) => (
            <ListRow
              key={booking.id}
              icon="calendar-number-outline"
              title={booking.subject || "Booking"}
              subtitle={booking.tutor?.user?.fullName || "Tutor pending"}
              meta={booking.time || "Time pending"}
              badge={booking.status}
              tone={getStatusTone(booking.status)}
            />
          ))
        ) : (
          <EmptyState label="No booking history yet." />
        )}
      </SectionCard>

      <SectionCard title="Reports" eyebrow="Bookings & Feedback" icon="document-text-outline">
        {reviews.slice(0, 2).map((review) => (
          <ListRow
            key={review.id}
            icon="chatbubbles-outline"
            title={review.tutor?.user?.fullName || "Tutor review"}
            subtitle={review.text || "Review note"}
            meta={`${review.rating || 0}/5`}
          />
        ))}
        {notes.slice(0, 2).map((note) => (
          <ListRow
            key={note.id}
            icon="book-outline"
            title={note.tutor?.user?.fullName || "Session note"}
            subtitle={note.note || "Tutor note"}
          />
        ))}
        {!reviews.length && !notes.length && <EmptyState label="Feedback appears after tutor activity." />}
      </SectionCard>
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

function formatDate(value) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
