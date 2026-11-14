import { createFileRoute } from "@tanstack/react-router";
import { FamilyScreen } from "@/features/family/screens/FamilyScreen";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/aile/")({
  head: () => pageHead("TürkNet Evim", "Aile üyelerini gör, yetkilerini yönet, onların adına güvenle işlem yap."),
  component: FamilyScreen,
});
