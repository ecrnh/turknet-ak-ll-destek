import { createFileRoute } from "@tanstack/react-router";
import { OperationsScreen } from "@/screens/OperationsScreen";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/islemler")({
  head: () => pageHead("İşlemler", "Abonelik, internet ve destek işlemlerini uygulamadan yap."),
  component: OperationsScreen,
});
