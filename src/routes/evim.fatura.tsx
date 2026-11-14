import { createFileRoute } from "@tanstack/react-router";
import { EvimBillsScreen } from "@/features/evim/screens/RepairScreens";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/evim/fatura")({
  head: () => pageHead("Fatura İşlemleri", "Faturanı görüntüle, öde ya da itiraz et."),
  component: EvimBillsScreen,
});
