import { createFileRoute } from "@tanstack/react-router";
import { AgentCenterScreen } from "@/features/aiAgents/screens/AgentCenterScreen";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/ajanlar/")({
  head: () => pageHead("GIGA", "GIGA'ya ihtiyacını yaz ya da söyle: bağlantı sorunu, fatura, taşınma, Hibrit İnternet ve işlem durumun için doğru süreç senin için başlasın."),
  component: AgentCenterScreen,
});
