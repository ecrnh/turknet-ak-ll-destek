import { createFileRoute } from "@tanstack/react-router";
import { RelocationStartScreen } from "@/features/workflow/screens/RelocationStartScreen";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/tasinma")({
  head: () => pageHead("İnternetini Taşı", "Yeni adresini gir; altyapı, iş emri ve randevu sürecini TurkNet yönetsin."),
  component: RelocationStartScreen,
});
