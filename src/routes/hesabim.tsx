import { createFileRoute } from "@tanstack/react-router";
import { AccountScreen } from "@/screens/AccountScreen";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/hesabim")({
  head: () => pageHead("Hesabım", "Profilin, aile yetkilendirme, tercihler ve işlem geçmişi."),
  component: AccountScreen,
});
