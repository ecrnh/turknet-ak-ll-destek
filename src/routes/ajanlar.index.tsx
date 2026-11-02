import { createFileRoute } from "@tanstack/react-router";
import { AgentCenterScreen } from "@/features/aiAgents/screens/AgentCenterScreen";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/ajanlar/")({
  head: () => pageHead("GIGA", "TürkNet'in akıllı dijital yardımcısı GIGA: neler yapabildiği, otomatik kontroller ve son aksiyonlar."),
  component: AgentCenterScreen,
});
