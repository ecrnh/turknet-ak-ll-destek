import { createFileRoute } from "@tanstack/react-router";
import { LiveSupportScreen } from "@/features/workflow/screens/LiveSupportScreen";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/canli-destek/$id")({
  head: () => pageHead("Canlı Destek", "Yaptığın kontroller temsilciye iletilir; sorununu baştan anlatmana gerek kalmaz."),
  component: LivePage,
});

function LivePage() {
  const { id } = Route.useParams();
  return <LiveSupportScreen key={id} id={id} />;
}
