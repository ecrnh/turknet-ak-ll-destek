import { createFileRoute } from "@tanstack/react-router";
import { BillingShieldScreen } from "@/features/workflow/screens/BillingShieldScreen";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/fatura-kalkani")({
  head: () => pageHead("Fatura Kalkanı", "Fatura ve ödemelerindeki olası farklılıkları görünür kılar; inceleme yalnızca senin onayınla başlar."),
  /** `kontrol=1`: GIGA already ran the comparison before opening this screen. */
  validateSearch: (s: Record<string, unknown>): { kontrol?: number } => (Number(s["kontrol"]) === 1 ? { kontrol: 1 } : {}),
  component: BillingShieldScreen,
});
