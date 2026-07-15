import { useLocalSearchParams } from "expo-router";
import AdminDashboard from "./index";

export default function AdminDashboardPage() {
  const { section } = useLocalSearchParams();
  return <AdminDashboard section={String(section || "overview")} />;
}
