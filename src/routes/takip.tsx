import { createFileRoute } from "@tanstack/react-router";
import { TrackHubScreen } from "@/features/workflow/screens/TrackHubScreen";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/takip")({
  head: () => pageHead("Benim İçin Takip Et", "Tüm aktif taleplerini, kararlarını ve iş emirlerini tek yerden takip et."),
  component: TrackHubScreen,
});
