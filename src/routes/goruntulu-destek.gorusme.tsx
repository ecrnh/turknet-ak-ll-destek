import { createFileRoute } from "@tanstack/react-router";
import { VideoCallScreen } from "@/features/videoSupport/screens/VideoCallScreen";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/goruntulu-destek/gorusme")({
  head: () => pageHead("Görüntülü Görüşme", "Turknet uzmanı ile canlı görüntülü destek görüşmesi."),
  component: VideoCallScreen,
});
