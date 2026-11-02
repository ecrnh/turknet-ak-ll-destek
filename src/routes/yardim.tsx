import { createFileRoute } from "@tanstack/react-router";
import { HelpScreen } from "@/screens/HelpScreen";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/yardim")({
  head: () => pageHead("Yardım", "Dijital onarım, görüntülü destek ve QR ile destek talebi."),
  component: HelpScreen,
});
