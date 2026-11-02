import { createFileRoute } from "@tanstack/react-router";
import { FamilyMemberScreen } from "@/features/family/screens/FamilyMemberScreen";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/aile/uye/$id")({
  head: () => pageHead("Aile Üyesi Görünümü", "Yetkilendirilmiş aile üyesinin görebildiği ve yapabildiği işlemler."),
  component: MemberPage,
});

function MemberPage() {
  const { id } = Route.useParams();
  return <FamilyMemberScreen key={id} id={id} />;
}
