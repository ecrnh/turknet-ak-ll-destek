import { createFileRoute } from "@tanstack/react-router";
import { HomeScreen } from "@/screens/HomeScreen";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/")({
  head: () => pageHead("Ana Sayfa", "Turknet hesabın, internet durumun, kampanyalar ve destek işlemlerin tek ekranda."),
  component: HomeScreen,
});
