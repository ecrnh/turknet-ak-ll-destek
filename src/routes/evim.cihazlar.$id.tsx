import { createFileRoute } from "@tanstack/react-router";
import { DeviceDetailScreen } from "@/features/evim/screens/DeviceScreens";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/evim/cihazlar/$id")({
  head: () => pageHead("Cihaz yönetimi", "Cihazın bağlantısını duraklat, interneti kapat ya da ağdan çıkar."),
  component: DeviceRoute,
});

function DeviceRoute() {
  const { id } = Route.useParams();
  return <DeviceDetailScreen id={id} />;
}
