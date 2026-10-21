import { createFileRoute } from "@tanstack/react-router";
import { PastBillsScreen } from "@/screens/PastBillsScreen";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/faturalar/gecmis")({
  head: () => pageHead("Geçmiş Faturalarım", "Geçmiş dönem faturalarını görüntüle ve indir."),
  component: PastBillsScreen,
});
