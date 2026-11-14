import { createFileRoute } from "@tanstack/react-router";
import { FamilyScreen } from "@/features/evim/screens/FamilyScreens";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/evim/aile/")({
  head: () => pageHead("Aile Yönetimi", "Aile üyelerini, yetkileri ve davetleri yönet."),
  component: FamilyScreen,
});
