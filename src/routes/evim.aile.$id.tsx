import { createFileRoute } from "@tanstack/react-router";
import { MemberPermsScreen } from "@/features/evim/screens/FamilyScreens";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/evim/aile/$id")({
  head: () => pageHead("Yetkileri düzenle", "Aile üyesinin TürkNet Evim yetkilerini düzenle."),
  component: MemberRoute,
});

function MemberRoute() {
  const { id } = Route.useParams();
  return <MemberPermsScreen id={id} />;
}
