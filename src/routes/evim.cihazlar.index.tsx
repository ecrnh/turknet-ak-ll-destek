import { createFileRoute } from "@tanstack/react-router";
import { DevicesScreen } from "@/features/evim/screens/DeviceScreens";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/evim/cihazlar/")({
  head: () => pageHead("Modemim ve Cihazlarım", "Modemini ve ağına bağlı cihazları görüntüle, yönet."),
  component: DevicesScreen,
});
