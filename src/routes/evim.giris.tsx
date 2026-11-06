import { createFileRoute } from "@tanstack/react-router";
import { LoginScreen } from "@/features/evim/screens/OnboardingScreens";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/evim/giris")({
  head: () => pageHead("Giriş yap", "TürkNet hesabınla giriş yap ve TürkNet Evim'e geç."),
  component: LoginScreen,
});
