import { createFileRoute } from "@tanstack/react-router";
import { AutoPayScreen } from "@/features/workflow/screens/AutoPayScreen";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/otomatik-odeme")({
  head: () => pageHead("Akıllı Otomatik Ödeme", "Otomatik ödeme talimatını kur, tahsilattan önce haber al, yüksek tutarda önce onay ver."),
  component: AutoPayScreen,
});
