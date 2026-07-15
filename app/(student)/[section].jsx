import { useLocalSearchParams } from "expo-router";
import StudentDashboard from "./index";

export default function StudentDashboardPage() {
  const { section } = useLocalSearchParams();
  return <StudentDashboard section={String(section || "overview")} />;
}
