import { createFileRoute } from "@tanstack/react-router";
import { ImpactDashboard } from "@/screens/dashboard/ImpactDashboard";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/dashboard")({
  head: () => pageHead("Etki Panosu", "Self-servis ve proaktif destek KPI'ları, huniler ve A/B test planı."),
  component: ImpactDashboard,
});
