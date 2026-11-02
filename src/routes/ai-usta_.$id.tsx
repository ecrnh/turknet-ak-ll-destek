import { createFileRoute } from "@tanstack/react-router";
import { AiUstaSessionScreen } from "@/features/workflow/screens/AiUstaSessionScreen";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/ai-usta_/$id")({
  head: () => pageHead("AI Usta Oturumu", "Modeminizi gösterin; AI Usta güvenli adımlarla birlikte kontrol etsin."),
  component: SessionPage,
});

function SessionPage() {
  const { id } = Route.useParams();
  return <AiUstaSessionScreen key={id} id={id} />;
}
