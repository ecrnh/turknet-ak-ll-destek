import { createFileRoute } from "@tanstack/react-router";
import { AutoChecksScreen } from "@/features/aiAgents/screens/AutoChecksScreen";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/ajanlar/kontroller")({
  head: () => pageHead("Otomatik kontroller", "Hız Koruyucu, modem sağlık kontrolü ve fatura hatırlatıcısını aç/kapat; hangi teknik bilgilerin kontrol edildiğini gör."),
  component: AutoChecksScreen,
});
