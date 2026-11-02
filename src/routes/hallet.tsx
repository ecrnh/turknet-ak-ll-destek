import { createFileRoute } from "@tanstack/react-router";
import { HalletScreen } from "@/features/workflow/screens/HalletScreen";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/hallet")({
  head: () => pageHead("Benim İçin Hallet", "Taşınma, fatura kontrolü ve işlem takibi: siz söyleyin, TürkNet sizin için halletsin."),
  component: HalletScreen,
});
