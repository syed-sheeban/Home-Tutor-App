import { useCallback, useEffect, useMemo, useState } from "react";
import { Linking, Alert } from "react-native";
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
  const subjects = data?.subjectProgress || EMPTY;
  const tutors = data?.tutors || EMPTY;
  const materials = data?.materials || EMPTY;
  const goals = data?.goals || EMPTY;
  const monthlyGoal = data?.monthlyGoal || { title: "Build a stronger study routine", progress: 0 };

  const statItems = useMemo(
    () => [
      { label: "Classes This Week", value: stats.classesThisWeek || 0, icon: "calendar-outline" },
      { label: "Average Progress", value: `${stats.averageProgress || 0}%`, icon: "trending-up-outline" },
      { label: "Study Materials", value: stats.studyMaterials || materials.length, icon: "document-text-outline" },
      { label: "Active Tutors", value: stats.activeTutors || tutors.length, icon: "people-outline" },
    ],
    [stats, materials.length, tutors.length],
  );

  const messageTutor = (email, name) => {
    if (!email) {
      Alert.alert("Tutor Contact", "No email contact registered for this tutor.");
      return;
    }
    Linking.openURL(`mailto:${email}?subject=HomeTutor Inquiry&body=Hi ${name || "Tutor"},`).catch(() =>
      Alert.alert("Tutor Contact", "Could not launch email client."),
    );
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

      <SectionCard title="Assigned Tutors" eyebrow="Mentors" icon="people-outline">
        {tutors.length ? (
          tutors.map((tutor) => (
            <ListRow
              key={tutor.id || tutor.name}
              icon="person-outline"
              title={tutor.name || "Tutor"}
              subtitle={tutor.subject || tutor.experience || "Subject not added"}
              meta={tutor.next || "No next class"}
              onPress={() => messageTutor(tutor.email, tutor.name)}
            />
          ))
        ) : (
          <EmptyState label="Accepted tutors will appear here." />
        )}
      </SectionCard>

      <SectionCard title="Learning Goals" eyebrow="Focus" icon="flag-outline">
        <ListRow
          icon="target-outline"
          title={monthlyGoal.title}
          subtitle="Monthly learning focus"
          meta={`${monthlyGoal.progress || 0}%`}
        />
        {goals.map((goal, index) => (
          <ListRow key={`${goal}-${index}`} icon="checkmark-circle-outline" title={goal} />
        ))}
      </SectionCard>

      <SectionCard title="Study Materials" eyebrow="Library" icon="document-text-outline">
        {materials.length ? (
          materials.slice(0, 6).map((item) => (
            <ListRow
              key={item.id || item.title}
              icon="document-outline"
              title={item.title || "Study material"}
              subtitle={item.subject || item.tutor || "Shared material"}
              badge={item.type}
            />
          ))
        ) : (
          <EmptyState label="Study materials shared by tutors will appear here." />
        )}
      </SectionCard>
    </DashboardShell>
  );
}
