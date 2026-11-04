import { createFileRoute } from "@tanstack/react-router";
import { HybridScreen } from "@/features/workflow/screens/HybridScreen";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/hibrit")({
  head: () => pageHead("İnternet Durumu", "Ana internetinizin durumu, kesinti bilgisi ve NetBox yedek bağlantınız tek ekranda."),
  component: HybridScreen,
});
