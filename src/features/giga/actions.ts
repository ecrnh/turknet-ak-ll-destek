/**
 * The only place GIGA turns a recognised request into a real process. Every
 * branch calls the shared workflow services, so the screen or chat card GIGA
 * shows always reflects the real state (never a success GIGA only claimed).
 */
import type { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import type { UstaIssueId } from "@/data/mock";
import { useAppStore } from "@/features/core/appStore";
import { decide, log } from "@/features/workflow/engine";
import type { Intent } from "@/features/workflow/rules";
import { startAiUsta } from "@/features/workflow/services/aiUsta";
import { runBillingShield } from "@/features/workflow/services/billing";
import { openOutage } from "@/features/workflow/services/hybrid";
import { startSpeedCheck } from "@/features/workflow/services/proactive";
import { useWorkflowStore } from "@/features/workflow/store";

type Navigate = ReturnType<typeof useNavigate>;

export const INTENT_LABEL: Record<Intent, string> = {
  relocation: "Taşınma ve Nakil",
  billing: "Fatura Kalkanı",
  ai_usta: "GIGA Teknik",
  temp_internet: "Bağlantım · Hibrit İnternet",
  speed: "Hız kontrolü",
  track: "İşlemlerim",
};

export type Launch =
  /** A process now runs; show it (chat card or detail screen). */
  | { kind: "workflow"; wfId: string }
  /** The flow continues on its own screen (wizard, outage page…). */
  | { kind: "screen"; to: string }
  /** Checks ran and found nothing to do. */
  | { kind: "clear"; text: string; to: string };

/** Runs the real service behind an intent. `usta` carries what the customer already said, so GIGA Teknik does not ask it again. */
export function launchIntent(intent: Intent, said: string, usta?: UstaIssueId | "modem"): Launch {
  log(null, "customer", "info", `GIGA'ya talep: “${said}” → ${INTENT_LABEL[intent]}`, "Talep anlama: ağırlıklı anahtar kelime ve bağlam (demo)");
  switch (intent) {
    case "relocation":
      return { kind: "screen", to: "/tasinma" };
    case "billing": {
      const r = runBillingShield();
      if (r.wfId) return { kind: "workflow", wfId: r.wfId };
      return { kind: "clear", text: "Kontrolü bitirdim: faturan ve ödeme kayıtların uyumlu görünüyor, beklenmeyen bir ücret veya farklılık bulmadım.", to: "/fatura-kalkani?kontrol=1" };
    }
    case "ai_usta": {
      // A known outage is already being tracked: no modem steps for the customer.
      if (openOutage()) return { kind: "screen", to: "/hibrit" };
      const id = startAiUsta(usta === "modem" ? "modem" : "no_internet");
      const wf = useWorkflowStore.getState().workflows.find((w) => w.id === id);
      if (usta && usta !== "modem" && wf?.decision?.key === "usta_issue") decide(id, usta, "customer");
      return { kind: "workflow", wfId: id };
    }
    case "speed":
      return { kind: "workflow", wfId: startSpeedCheck() };
    case "temp_internet":
      return { kind: "screen", to: openOutage() ? "/hibrit" : "/baglanti" };
    case "track":
      return { kind: "screen", to: "/takip" };
  }
}

/** Screen-based entry (no chat): runs the intent and opens where it continues. */
export function startIntent(intent: Intent, said: string, navigate: Navigate) {
  const r = launchIntent(intent, said);
  if (r.kind === "workflow") return navigate({ to: "/surec/$id", params: { id: r.wfId } });
  if (r.kind === "clear") {
    toast.success("Faturan kontrol edildi", { description: "Faturan ve ödemelerin uyumlu görünüyor." });
    return navigate({ to: "/fatura-kalkani", search: { kontrol: 1 } });
  }
  return navigate({ to: r.to as "/" });
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
