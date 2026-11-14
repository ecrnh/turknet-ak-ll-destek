import { createFileRoute } from "@tanstack/react-router";
import { QrSelfServiceScreen } from "@/features/qrSupport/screens/QrSelfServiceScreen";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/qr/destek")({
  head: () => pageHead("QR ile Destek", "Modemini okut, sorununu adım adım kendin çöz."),
  validateSearch: (s: Record<string, unknown>): { giris?: string } => (typeof s["giris"] === "string" ? { giris: s["giris"] } : {}),
  component: QrSelfServiceScreen,
});
