import { createFileRoute } from "@tanstack/react-router";
import { AiUstaStartScreen } from "@/features/workflow/screens/AiUstaStartScreen";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/ai-usta")({
  head: () => pageHead("AI Usta", "Modem ve bağlantı sorunlarını görsel yönlendirmeyle adım adım çöz."),
  component: AiUstaStartScreen,
});
