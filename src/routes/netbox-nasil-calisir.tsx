import { createFileRoute } from "@tanstack/react-router";
import { NetBoxInfoScreen } from "@/features/workflow/screens/NetBoxInfoScreen";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/netbox-nasil-calisir")({
  head: () => pageHead("NetBox nasıl çalışır?", "NetBox'ın paketinize dahil ücretsiz yedek internet olarak nasıl çalıştığı: kesintide mobil ağdan devreye girer, ana hat gelince otomatik geri döner."),
  component: NetBoxInfoScreen,
});
