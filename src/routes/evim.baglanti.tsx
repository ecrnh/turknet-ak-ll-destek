import { createFileRoute } from "@tanstack/react-router";
import { ConnectionScreen } from "@/features/evim/screens/RepairScreens";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/evim/baglanti")({
  head: () => pageHead("Bağlantı Problemleri", "Bağlantı sorununu adım adım kendin çöz."),
  component: ConnectionScreen,
});
