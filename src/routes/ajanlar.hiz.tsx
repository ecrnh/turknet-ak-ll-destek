import { createFileRoute } from "@tanstack/react-router";
import { SpeedAgentScreen } from "@/features/aiAgents/screens/SpeedAgentScreen";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/ajanlar/hiz")({
  head: () => pageHead("Hız Koruyucu Ajan", "Hız düşüşünü tespit edip otomatik düzelten ajan."),
  component: SpeedAgentScreen,
});
