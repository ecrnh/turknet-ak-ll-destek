import { createFileRoute } from "@tanstack/react-router";
import { QrScanScreen } from "@/features/qrSupport/screens/QrScanScreen";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/qr/tara")({
  validateSearch: (search: Record<string, unknown>): { sub?: string | undefined; dev?: string | undefined } => ({
    sub: typeof search["sub"] === "string" ? search["sub"]  : undefined,
    dev: typeof search["dev"] === "string" ? search["dev"]  : undefined,
  }),
  head: () => pageHead("QR Tara", "Modemindeki QR etiketiyle GIGA bağlantı desteğini başlat."),
  component: QrScanRoute,
});

function QrScanRoute() {
  const { sub, dev } = Route.useSearch();
  return <QrScanScreen deepLink={{ sub: sub ?? "", dev: dev ?? "" }} />;
}

