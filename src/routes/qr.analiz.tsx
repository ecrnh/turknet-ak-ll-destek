import { createFileRoute } from "@tanstack/react-router";
import { QrAnalysisScreen } from "@/features/qrSupport/screens/QrAnalysisScreen";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/qr/analiz")({
  head: () => pageHead("Modem Analizi", "Hat, sinyal, optik güç, DNS ve Wi-Fi kontrolleri ile sağlık skoru."),
  component: QrAnalysisScreen,
});
