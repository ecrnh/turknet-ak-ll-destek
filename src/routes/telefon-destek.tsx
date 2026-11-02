import { createFileRoute } from "@tanstack/react-router";
import { PhoneSupportScreen } from "@/features/workflow/screens/PhoneSupportScreen";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/telefon-destek")({
  head: () => pageHead("Telefonla Destek", "TürkNet'i arayın; sesli asistan sorunu anlar ve sizi bağlamınızla uygulamaya geçirir."),
  component: PhoneSupportScreen,
});
