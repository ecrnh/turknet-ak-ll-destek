import { createFileRoute } from "@tanstack/react-router";
import { BackupAgentScreen } from "@/features/aiAgents/screens/BackupAgentScreen";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/ajanlar/yedek")({
  head: () => pageHead("Kesinti Yedekleme Ajanı", "Kesintide seni en yakın sağlıklı altyapıdan geçici bağlayan ajan."),
  component: BackupAgentScreen,
});
