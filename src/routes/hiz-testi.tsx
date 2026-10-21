import { createFileRoute } from "@tanstack/react-router";
import { SpeedTestScreen } from "@/screens/SpeedTestScreen";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/hiz-testi")({
  head: () => pageHead("Hız Testi", "İnternet hızını ve ping değerini ölç."),
  component: SpeedTestScreen,
});
