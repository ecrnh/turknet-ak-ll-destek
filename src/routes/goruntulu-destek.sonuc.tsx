import { createFileRoute } from "@tanstack/react-router";
import { VideoResultScreen } from "@/features/videoSupport/screens/VideoResultScreen";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/goruntulu-destek/sonuc")({
  head: () => pageHead("Görüşme Özeti", "Görüntülü destek özeti, memnuniyet ve teknik ekip randevusu."),
  component: VideoResultScreen,
});
