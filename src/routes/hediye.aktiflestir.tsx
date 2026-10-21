import { createFileRoute } from "@tanstack/react-router";
import { GiftActivateScreen } from "@/features/giftData/screens/GiftActivateScreen";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/hediye/aktiflestir")({
  head: () => pageHead("Hediyeyi Aktifleştir", "Hediye interneti hangi operatörü kullanırsan kullan hattına tanımla."),
  component: GiftActivateScreen,
});
