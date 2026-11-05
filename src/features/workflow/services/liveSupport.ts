/**
 * LiveSupportService: simulated live chat after GIGA hands a process over.
 * The agent starts with the full troubleshooting context, so the customer never
 * repeats the problem. No real agent, chat backend or dispatch system exists.
 */
import { APPOINTMENT_SLOTS, CABLE_STATES, FIELD_TEAMS, REPAIR_CHECKS, TEAMS } from "@/data/mock";
import { uid } from "@/lib/format";
import { book, getWf, log, notify, registerOp, schedule, setData, workOrder } from "../engine";
import { useWorkflowStore as W } from "../store";
import type { WorkflowState } from "../store";
import type { LiveChatMessage, Workflow } from "../types";

export const LIVE_AGENT = "Selin · TürkNet Canlı Destek";

const msg = (from: LiveChatMessage["from"], text: string, offer?: LiveChatMessage["offer"]): LiveChatMessage => ({ id: uid(), from, text, at: Date.now(), ...(offer ? { offer } : {}) });

/** What the agent sees before the chat starts. Derived only from the real workflow and connection state. */
export function handoffSummary(wf: Workflow, connectivity: WorkflowState["connectivity"]): { label: string; value: string }[] {
  const step = (k: string) => wf.steps.find((s) => s.key === k);
  const note = (k: string) => step(k)?.note;
  const leds = String(wf.data["leds"] ?? "")
    .split("|")
    .filter(Boolean)
    .map((x) => {
      const [name, , state] = x.split(":");
      return `${name}: ${state}`;
    });
  const repair = String(wf.data["repair"] ?? "").split("|").filter(Boolean);
  const repairText = step("repair")?.status === "done" ? (note("repair") ?? "Tamamlandı") : repair.length ? `${repair.length}/${REPAIR_CHECKS.length} kontrol tamamlandı` : "Yapılmadı";
  const cable = CABLE_STATES.find((c) => c.id === wf.data["cable"]);
  const done = wf.steps.filter((s) => s.status === "done" && !["call", "report"].includes(s.key)).map((s) => s.label);
  const conn = connectivity.fixed === "up" ? "Ana bağlantı aktif" : connectivity.mobile === "active" ? "Ana bağlantı kesik · yedek bağlantı aktif" : "Ana bağlantı kesik";
  return [
    { label: "Sorun", value: String(wf.data["issue"] ?? wf.title) },
    ...(wf.data["channel"] === "qr" ? [
      { label: "Destek kanalı", value: "Modem üzerindeki kişisel QR etiketi" },
      { label: "Modem", value: `${String(wf.data["modemModel"] ?? "Modem")} · ${String(wf.data["modemSerial"] ?? "seri numarası tanındı")}` },
      { label: "Abonelik", value: String(wf.data["subscriberNo"] ?? "Abonelik eşleşti") },
    ] : []),
    ...(wf.data["channel"] === "ivr" ? [{ label: "Telefon görüşmesi", value: note("ivr_check") ?? "Telefonda temsilci istendi" }] : []),
    ...(wf.data["channel"] === "video" ? [
      { label: "GIGA görüntülü inceleme", value: String(wf.data["finding"] ?? "Görüşme notları aktarıldı") },
      { label: "Görüşmede uygulanan adımlar", value: String(wf.data["videoActions"] ?? "—").split(" | ").join(" → ") },
      { label: "Son bağlantı testi", value: String(wf.data["connectionTest"] ?? "—") },
      { label: "Görüşme süresi", value: `${String(wf.data["videoDuration"] ?? "—")} sn` },
    ] : []),
    { label: "Dijital onarım", value: repairText },
    { label: "Tespit edilen sorun", value: wf.data["finding"] ? String(wf.data["finding"]) : "Bilinen bir arıza bulunmadı" },
    ...(step("remote")?.status === "done" ? [{ label: "Uzaktan düzeltme", value: `${note("remote") ?? ""} → ${note("verify") ?? "sonuç yok"}` }] : []),
    { label: "Modem ışıkları", value: leds.length ? leds.join(" · ") : "Kontrol edilmedi" },
    { label: "Kablo kontrolü", value: cable ? cable.say : "Kontrol edilmedi" },
    { label: "Yapılan adımlar", value: done.length ? done.join(" → ") : "Henüz adım yapılmadı" },
    { label: "Mevcut durum", value: conn },
  ];
}

export const chatOf = (wfId: string) => W.getState().chats.find((c) => c.workflowId === wfId);

function push(wfId: string, m: LiveChatMessage) {
  W.setState((s) => ({ chats: s.chats.map((c) => (c.workflowId === wfId ? { ...c, messages: [...c.messages, m] } : c)) }));
}

/** "Canlı desteğe geç": only after a real handoff. Idempotent. */
export function openLiveChat(wfId: string): boolean {
  const wf = getWf(wfId);
  if (!wf?.handoff) return false;
  if (chatOf(wfId)) return true;
  W.setState((s) => ({
    chats: [
      ...s.chats,
      {
        workflowId: wfId,
        agent: LIVE_AGENT,
        startedAt: Date.now(),
        messages: [
          msg("agent", `Merhaba, ben Selin. “${String(wf.data["issue"] ?? wf.title)}” konusundaki talebini aldım; şimdi incelemeye başlıyorum. Sana yardımcı olmak için buradayım.`),
        ],
      },
    ],
  }));
  log(wfId, "team", "info", `Canlı destek görüşmesi başladı: ${LIVE_AGENT} (demo)`, `${wf.handoff.context.length} adımlık bağlam temsilciye hazır geldi`);
  return true;
}

export function sendLiveChat(wfId: string, text: string): boolean {
  const t = text.trim();
  if (!t || !chatOf(wfId)) return false;
  push(wfId, msg("customer", t));
  schedule("live.reply", wfId, 1200);
  return true;
}

registerOp("live.reply", (wfId) => {
  const chat = chatOf(wfId);
  if (!chat) return;
  const asked = chat.messages.some((m) => m.offer === "field_visit");
  const visit = getWf(wfId)?.data["fieldVisit"];
  if (!asked && !visit) {
    push(wfId, msg("agent", "Teşekkürler. Kontrollerine göre sorun modeminden değil, hattından kaynaklanıyor gibi görünüyor. Bunu uzaktan çözemiyoruz; senin için saha ekibi randevusu oluşturmamı ister misin?", "field_visit"));
  } else {
    push(wfId, msg("agent", visit ? "Notunu randevu kaydına ekledim. Ekip gelmeden önce SMS alacaksın (demo)." : "Not aldım. Başka bir konuda yardımcı olabileceğim bir şey var mı?"));
  }
});

/** Customer accepts the agent's offer: physical intervention is needed, so a field work order and appointment are created. */
export function acceptFieldVisit(wfId: string): boolean {
  const wf = getWf(wfId);
  if (!wf?.handoff || wf.data["fieldVisit"]) return false;
  const slot = APPOINTMENT_SLOTS[1]!;
  const team = FIELD_TEAMS[0]!;
  const wo = workOrder(wfId, { kind: "field_repair", title: "Hat arızası · saha ziyareti", team: `${TEAMS.field} · ${team.name}` }, "Canlı destek, fiziksel müdahale gerektiğini belirledi; müşteri randevuyu onayladı");
  book(wfId, slot, wo.id);
  setData(wfId, { fieldVisit: slot.label });
  push(wfId, msg("customer", "Evet, randevu oluştur."));
  push(wfId, msg("agent", `Randevun oluşturuldu: ${slot.label} · ${team.name}. Yaptığın kontroller ekibe iletildi. Süreci İşlemlerim'den takip edebilirsin.`));
  notify(wfId, "Teknik ekip randevunuz oluşturuldu", `${slot.label} · Ekip yola çıkmadan önce SMS alacaksınız (demo).`);
  return true;
}

export function declineFieldVisit(wfId: string) {
  if (!chatOf(wfId)) return;
  push(wfId, msg("customer", "Şimdilik gerek yok."));
  push(wfId, msg("agent", "Anladım. Kaydın açık kalıyor; istediğin zaman buradan randevu isteyebilirsin."));
}

