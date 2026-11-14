import { createFileRoute } from "@tanstack/react-router";
import { InviteScreen } from "@/features/evim/screens/FamilyScreens";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/evim/aile/davet")({
  head: () => pageHead("Aile üyesi davet et", "Telefon veya e-postayla aile üyesi davet et."),
  component: InviteScreen,
});
