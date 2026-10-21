import { createFileRoute } from "@tanstack/react-router";
import { AgentCenterScreen } from "@/features/aiAgents/screens/AgentCenterScreen";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/ajanlar/")({
  head: () => pageHead("AI Ajanlarım", "Proaktif AI ajanların, son aksiyonları ve bu ayki özet."),
  component: AgentCenterScreen,
});
