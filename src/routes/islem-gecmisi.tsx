import { createFileRoute } from "@tanstack/react-router";
import { HistoryScreen } from "@/screens/HistoryScreen";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/islem-gecmisi")({
  head: () => pageHead("İşlem Geçmişi", "Hesabında yapılan tüm işlemler."),
  component: HistoryScreen,
});
