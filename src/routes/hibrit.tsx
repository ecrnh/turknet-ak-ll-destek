import { createFileRoute } from "@tanstack/react-router";
import { HybridScreen } from "@/features/workflow/screens/HybridScreen";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/hibrit")({
  head: () => pageHead("Hibrit İnternet", "Kesinti 24 saati aşarsa aboneliğinize dahil ücretsiz yedek bağlantınızı etkinleştirin."),
  component: HybridScreen,
});
