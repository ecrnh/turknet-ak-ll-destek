import { createFileRoute } from "@tanstack/react-router";
import { WorkflowDetailScreen } from "@/features/workflow/screens/WorkflowDetailScreen";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/surec/$id")({
  head: () => pageHead("Süreç Detayı", "Talebinin adımlarını, kararlarını ve işlem günlüğünü gör."),
  component: DetailPage,
});

function DetailPage() {
  const { id } = Route.useParams();
  return <WorkflowDetailScreen key={id} id={id} />;
}
