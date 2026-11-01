import { createFileRoute } from "@tanstack/react-router";
import { NotificationsScreen } from "@/screens/NotificationsScreen";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/bildirimler")({
  head: () => pageHead("Bildirimler", "Ajan aksiyonları, kesinti bilgilendirmeleri ve destek talebi durumları."),
  component: NotificationsScreen,
});
