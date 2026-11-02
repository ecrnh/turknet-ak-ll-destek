import { createFileRoute } from "@tanstack/react-router";
import { BenimIcinHalletScreen } from "@/screens/BenimIcinHalletScreen";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/hallet")({
  head: () => pageHead("Benim İçin Hallet", "Sen söyle, biz halledelim: taşınma, fatura kontrolü ve işlem takibi tek yerde."),
  component: BenimIcinHalletScreen,
});
