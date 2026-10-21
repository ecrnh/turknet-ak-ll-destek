import { createFileRoute } from "@tanstack/react-router";
import { GenericOpScreen } from "@/screens/GenericOpScreen";
import { GENERIC_OPS } from "@/data/mock";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/islem/$slug")({
  head: ({ params }) => pageHead(GENERIC_OPS[params.slug]?.title ?? "İşlem", "Turknet uygulamasından işlem yap."),
  component: OpPage,
});

function OpPage() {
  const { slug } = Route.useParams();
  return <GenericOpScreen key={slug} slug={slug} />;
}
