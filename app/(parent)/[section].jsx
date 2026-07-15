import { useLocalSearchParams } from "expo-router";
import ParentDashboard from "./index";

export default function ParentDashboardPage() {
  const { section } = useLocalSearchParams();
  return <ParentDashboard section={String(section || "overview")} />;
}
