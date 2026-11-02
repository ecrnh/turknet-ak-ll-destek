import { createFileRoute } from "@tanstack/react-router";
import { LiveChatScreen } from "@/features/workflow/screens/LiveChatScreen";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/canli-destek/$id")({
  head: () => pageHead("Canlı Destek", "Temsilci yaptığınız kontrolleri görür; sorununuzu tekrar anlatmanız gerekmez."),
  component: ChatPage,
});

function ChatPage() {
  const { id } = Route.useParams();
  return <LiveChatScreen key={id} id={id} />;
}
