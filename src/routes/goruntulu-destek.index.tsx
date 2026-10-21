import { createFileRoute } from "@tanstack/react-router";
import { VideoIntroScreen } from "@/features/videoSupport/screens/VideoIntroScreen";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/goruntulu-destek/")({
  head: () => pageHead("Görüntülü Destek", "Uzmanımız kameradan modemini görsün; saha ekibi beklemeden çözüm."),
  component: VideoIntroScreen,
});
