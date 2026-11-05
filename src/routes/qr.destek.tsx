import { createFileRoute } from "@tanstack/react-router";
import { QrSelfServiceScreen } from "@/features/qrSupport/screens/QrSelfServiceScreen";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/qr/destek")({
  head: () => pageHead("QR ile Destek", "Modemini okut, sorununu adım adım kendin çöz."),
  component: QrSelfServiceScreen,
});
