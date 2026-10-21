import { createFileRoute } from "@tanstack/react-router";
import { QrScanScreen } from "@/features/qrSupport/screens/QrScanScreen";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/qr/tara")({
  head: () => pageHead("QR Tara", "Modemindeki QR etiketini okut, analiz başlasın."),
  component: QrScanScreen,
});
