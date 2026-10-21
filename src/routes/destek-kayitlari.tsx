import { createFileRoute } from "@tanstack/react-router";
import { RecordsScreen } from "@/screens/RecordsScreen";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/destek-kayitlari")({
  head: () => pageHead("Tüm Destek Kayıtları", "Görüntülü, QR, ajan ve chat destek kayıtların tek zaman çizelgesinde."),
  component: RecordsScreen,
});
