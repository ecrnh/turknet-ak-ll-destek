import { createFileRoute } from "@tanstack/react-router";
import { EvimHomeScreen } from "@/features/evim/screens/EvimHomeScreen";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/evim/")({
  head: () => pageHead("TürkNet Evim", "Evindeki internet, cihazlar ve aile yetkileri tek yerde."),
  component: EvimHomeScreen,
});
