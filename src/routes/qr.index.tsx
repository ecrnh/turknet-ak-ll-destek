import { createFileRoute } from "@tanstack/react-router";
import { QrLabelScreen } from "@/features/qrSupport/screens/QrLabelScreen";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/qr/")({
  head: () => pageHead("QR Etiketim", "Modemine özel QR koduyla GIGA bağlantını tanısın ve doğru desteği başlatsın."),
  component: QrLabelScreen,
});

