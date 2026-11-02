import { createFileRoute } from "@tanstack/react-router";
import { HelpScreen } from "@/screens/HelpScreen";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/yardim")({
  head: () => pageHead("Destek", "İnternetiniz çalışmıyor, yavaş ya da modeminizde sorun mu var? AI Usta ile birlikte çözelim."),
  component: HelpScreen,
});
