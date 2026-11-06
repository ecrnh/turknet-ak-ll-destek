import { createFileRoute } from "@tanstack/react-router";
import { QrEntryScreen } from "@/features/evim/screens/QrEntryScreen";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/evim/qr")({
  head: () => pageHead("QR ile devam et", "Modem QR kodunu okut, rolüne göre TürkNet Evim'e geç."),
  component: QrEntryScreen,
});
