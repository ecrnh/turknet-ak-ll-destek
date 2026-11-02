import { createFileRoute } from "@tanstack/react-router";
import { PreferencesScreen } from "@/screens/PreferencesScreen";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/tercihler")({
  head: () => pageHead("Tercihlerim", "Büyük yazı, basit mod, GIGA izinleri ve bildirim tercihleri."),
  component: PreferencesScreen,
});
