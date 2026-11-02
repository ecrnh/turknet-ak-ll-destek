import { createFileRoute } from "@tanstack/react-router";
import { AiUstaStartScreen } from "@/features/workflow/screens/AiUstaStartScreen";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/ai-usta")({
  head: () => pageHead("GIGA Teknik", "GIGA ile modem ve bağlantı sorunlarını görsel yönlendirmeyle adım adım çöz."),
  component: AiUstaStartScreen,
});
