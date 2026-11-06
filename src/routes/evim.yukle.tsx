import { createFileRoute } from "@tanstack/react-router";
import { InstallScreen } from "@/features/evim/screens/OnboardingScreens";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/evim/yukle")({
  head: () => pageHead("Uygulamayı indir", "TürkNet uygulamasını yükle ve QR akışına devam et."),
  component: InstallScreen,
});
