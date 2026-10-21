import { createFileRoute } from "@tanstack/react-router";
import { BillsScreen } from "@/screens/BillsScreen";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/faturalar/")({
  head: () => pageHead("Fatura ve Ödeme", "Faturalarını görüntüle, öde ve otomatik ödeme talimatı ver."),
  component: BillsScreen,
});
