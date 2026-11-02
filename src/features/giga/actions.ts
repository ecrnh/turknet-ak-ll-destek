/**
 * The only place GIGA turns a recognised request into a real process. Every
 * branch calls the shared workflow services, so the screen GIGA opens always
 * shows the real state (never a success GIGA only claimed).
 */
import type { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useAppStore } from "@/features/core/appStore";
import { log } from "@/features/workflow/engine";
import type { Intent } from "@/features/workflow/rules";
import { startAiUsta } from "@/features/workflow/services/aiUsta";
import { runBillingShield } from "@/features/workflow/services/billing";
import { openOutage } from "@/features/workflow/services/hybrid";
import { startSpeedCheck } from "@/features/workflow/services/proactive";

type Navigate = ReturnType<typeof useNavigate>;

export const INTENT_LABEL: Record<Intent, string> = {
  relocation: "Taşınma ve Nakil",
  billing: "Fatura Kalkanı",
  ai_usta: "GIGA Teknik",
  temp_internet: "Bağlantım · Hibrit İnternet",
  speed: "Hız kontrolü",
  track: "İşlemlerim",
};

export function startIntent(intent: Intent, said: string, navigate: Navigate) {
  log(null, "customer", "info", `GIGA'ya talep: “${said}” → ${INTENT_LABEL[intent]}`, "Talep algılama: anahtar kelime eşleşmesi (demo)");
  switch (intent) {
    case "relocation":
      return navigate({ to: "/tasinma" });
    case "billing": {
      const r = runBillingShield();
      if (r.wfId) return navigate({ to: "/surec/$id", params: { id: r.wfId } });
      toast.success("GIGA faturanı kontrol etti", { description: "Faturan ve ödemelerin uyumlu görünüyor." });
      return navigate({ to: "/fatura-kalkani", search: { kontrol: 1 } });
    }
    case "ai_usta":
      // A known outage is already being tracked: no modem steps for the customer.
      if (openOutage()) return navigate({ to: "/hibrit" });
      return navigate({ to: "/surec/$id", params: { id: startAiUsta() } });
    case "speed":
      return navigate({ to: "/surec/$id", params: { id: startSpeedCheck() } });
    case "temp_internet":
      return navigate({ to: openOutage() ? "/hibrit" : "/baglanti" });
    case "track":
      return navigate({ to: "/takip" });
  }
}

/** Hands the chat to a person with the whole conversation attached (demo record). */
export function handoffToHuman(transcript: string[]): string {
  const said = transcript.filter(Boolean);
  log(null, "customer", "info", "GIGA konuşmayı uzmana aktardı", "Müşteri insan desteği istedi; konuşma özeti kayda eklendi");
  return useAppStore.getState().addRecord({
    channel: "GIGA",
    title: "GIGA → uzman aktarımı",
    summary: said.length ? `Konuşma uzmana iletildi: “${said[said.length - 1]!.slice(0, 60)}”` : "Müşteri doğrudan uzman desteği istedi.",
    status: "Uzmana aktarıldı",
    ...(said.length ? { details: said.map((s) => `Müşteri: ${s}`) } : {}),
    to: "/goruntulu-destek",
  });
}
