import { createFileRoute } from "@tanstack/react-router";
import { LiveSupportScreen } from "@/features/workflow/screens/LiveSupportScreen";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/canli-destek/$id")({
  head: () => pageHead("Canlı Destek", "GIGA'nın ilettiği bağlamla temsilciyle görüş; sorununu baştan anlatma."),
  component: LivePage,
});

function LivePage() {
  const { id } = Route.useParams();
  return <LiveSupportScreen key={id} id={id} />;
}
