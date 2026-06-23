import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";
import useAuthStore from "../../store/authStore";
import { parentService } from "../../services/parentService";
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

  const loadDashboard = useCallback(async () => {
    try {
      const [dashboardData, tutorData] = await Promise.all([
        parentService.getParentDashboard(),
        parentService.getParentTutors(),
      ]);
      setData(dashboardData);
      setTutors(Array.isArray(tutorData) ? tutorData : []);
    } catch (error) {
      Alert.alert("Parent Dashboard", error?.response?.data?.message || "Could not load parent dashboard.");
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

  const child = data?.child;
  const stats = data?.stats || {};
  const progress = data?.progressOverview || EMPTY;
  const sessions = data?.upcomingSessions || EMPTY;
  const bookings = data?.bookingHistory || EMPTY;
  const invoices = data?.invoices || EMPTY;
  const reviews = data?.reviews || EMPTY;
  const notes = data?.notes || EMPTY;

  const statItems = useMemo(
    () => [
      { label: "Avg Progress", value: `${stats.averageProgress || 0}%`, icon: "trending-up-outline" },
      { label: "Sessions", value: stats.upcomingSessions || sessions.length, icon: "calendar-outline" },
      { label: "Tutors", value: stats.activeTutors || tutors.length, icon: "people-outline" },
      { label: "Invoice Total", value: `Rs ${stats.totalPayments || 0}`, icon: "card-outline" },
    ],
    [stats, sessions.length, tutors.length],
  );

  if (loading) return <SkeletonDashboard label="Loading parent dashboard..." />;

  return (
    <DashboardShell
      title="Parent Dashboard"
      icon="people-circle-outline"
      subtitle={{
        title: child?.user?.fullName ? `${child.user.fullName}'s progress` : "Child learning overview",
        text: child
          ? `${child.classGrade || "Class not added"} • ${child.learningNeed || "Learning goal not added"}`
          : "Link a student profile to see progress, sessions, bookings, and reports.",
        icon: "heart-outline",
      }}
      refreshing={refreshing}
      onRefresh={onRefresh}
      onLogout={logout}
    >
      <StatGrid stats={statItems} />

      <SectionCard title="Child Progress" eyebrow="Learning" icon="trending-up-outline">
        {progress.length ? (
          progress.map((item) => (
            <ListRow
              key={item.name}
              icon="stats-chart-outline"
              title={item.name}
              subtitle={item.note || "Progress tracked from sessions"}
              meta={`${item.progress || 0}%`}
            />
          ))
        ) : (
          <EmptyState label="Progress appears after bookings and sessions are added." />
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
              subtitle={`${tutor.subject || "Subject"} ${tutor.location ? `• ${tutor.location}` : ""}`}
              meta={tutor.rating ? `${tutor.rating}/5` : "New"}
            />
          ))
        ) : (
          <EmptyState label="Verified tutor suggestions will appear here." />
        )}
      </SectionCard>

      <SectionCard title="Payments" eyebrow="Invoices" icon="card-outline">
        {invoices.length ? (
          invoices.map((invoice) => (
            <ListRow
              key={invoice.id}
              icon="receipt-outline"
              title={invoice.invoiceNo || "Invoice"}
              subtitle={invoice.subject || "HomeTutor payment"}
              meta={`Rs ${invoice.amount || 0}`}
              badge={invoice.status}
              tone={getStatusTone(invoice.status)}
            />
          ))
        ) : (
          <EmptyState label="No invoice records yet." />
        )}
      </SectionCard>

      <SectionCard title="Reports" eyebrow="Bookings & Feedback" icon="document-text-outline">
        {bookings.slice(0, 3).map((booking) => (
          <ListRow
            key={booking.id}
            icon="calendar-number-outline"
            title={booking.subject || "Booking"}
            subtitle={booking.tutor?.user?.fullName || "Tutor pending"}
            badge={booking.status}
            tone={getStatusTone(booking.status)}
          />
        ))}
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
        {!bookings.length && !reviews.length && !notes.length && <EmptyState label="Reports appear after tutor activity." />}
      </SectionCard>
    </DashboardShell>
  );
}
