import { createFileRoute } from "@tanstack/react-router";
import { BillingShieldScreen } from "@/features/workflow/screens/BillingShieldScreen";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/fatura-kalkani")({
  head: () => pageHead("Fatura Kalkanı", "Fatura ve ödemelerindeki olası tutarsızlıkları otomatik yakala."),
  component: BillingShieldScreen,
});
