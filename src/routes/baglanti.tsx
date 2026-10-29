import { createFileRoute } from "@tanstack/react-router";
import { ConnectivityScreen } from "@/features/workflow/screens/ConnectivityScreen";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/baglanti")({
  head: () => pageHead("Bağlantım", "Sabit, mobil yedek ve geçici internet bağlantı durumunu gör."),
  component: ConnectivityScreen,
});
