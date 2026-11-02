import { createFileRoute } from "@tanstack/react-router";
import { SpeedAgentScreen } from "@/features/aiAgents/screens/SpeedAgentScreen";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/ajanlar/hiz")({
  head: () => pageHead("GIGA Hız Koruyucu", "GIGA hız düşüşünü tespit edip izin verdiğin uzaktan düzeltmeyi yapar."),
  component: SpeedAgentScreen,
});
