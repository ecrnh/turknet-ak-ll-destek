import { createFileRoute } from "@tanstack/react-router";
import { SelfRepairScreen } from "@/features/evim/screens/SelfRepairScreen";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/onarim")({
  validateSearch: (search: Record<string, unknown>) => ({
    kaynak: search["kaynak"] === "kisisel" ? ("kisisel" as const) : ("genel" as const),
  }),
  head: () => pageHead("Self Servis Onarım", "QR kodu okuttuktan sonra bağlantı sorununu adım adım, görsel rehberle çöz."),
  component: OnarimRoute,
});

function OnarimRoute() {
  const { kaynak } = Route.useSearch();
  return <SelfRepairScreen key={kaynak} source={kaynak} />;
}
