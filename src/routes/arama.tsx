import { createFileRoute } from "@tanstack/react-router";
import { SearchScreen } from "@/screens/SearchScreen";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/arama")({
  head: () => pageHead("Arama", "Uygulamadaki işlem ve sayfaları ara."),
  component: SearchScreen,
});
