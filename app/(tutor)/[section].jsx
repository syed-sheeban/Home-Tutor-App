import { useLocalSearchParams } from "expo-router";
import TutorDashboard from "./index";

export default function TutorDashboardPage() {
  const { section } = useLocalSearchParams();
  return <TutorDashboard section={String(section || "overview")} />;
}
