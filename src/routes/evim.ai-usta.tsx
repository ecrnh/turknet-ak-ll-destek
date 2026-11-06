import { createFileRoute } from "@tanstack/react-router";
import { EvimAiUstaScreen } from "@/features/evim/screens/RepairScreens";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/evim/ai-usta")({
  head: () => pageHead("AI Usta", "AI Usta modemini uzaktan analiz edip sorunu çözsün."),
  component: EvimAiUstaScreen,
});
