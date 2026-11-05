import { createFileRoute } from "@tanstack/react-router";
import { QrScanScreen } from "@/features/qrSupport/screens/QrScanScreen";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/qr/tara")({
  validateSearch: (search: Record<string, unknown>) => ({
    sub: typeof search.sub === "string" ? search.sub : "",
    dev: typeof search.dev === "string" ? search.dev : "",
  }),
  head: () => pageHead("QR Tara", "Modemindeki QR etiketiyle GIGA bağlantı desteğini başlat."),
  component: QrScanRoute,
});

function QrScanRoute() {
  const { sub, dev } = Route.useSearch();
  return <QrScanScreen deepLink={{ sub, dev }} />;
}

