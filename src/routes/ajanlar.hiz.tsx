import { createFileRoute } from "@tanstack/react-router";
import { SpeedAgentScreen } from "@/features/aiAgents/screens/SpeedAgentScreen";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/ajanlar/hiz")({
  head: () => pageHead("Hız Koruyucu", "Hızında belirgin bir düşüş olursa izin verdiğin güvenli uzaktan düzeltmeler denenir."),
  component: SpeedAgentScreen,
});
