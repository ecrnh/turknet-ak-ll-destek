/**
 * AutoPayService: "Akıllı Otomatik Ödeme" (simulated payment mandate).
 * TürkNet never debits without an authorised instruction; the customer is told
 * before each collection, can approve or skip an unusually high bill, and is
 * warned if a collection fails. No real card, bank or billing record is touched.
 */
import { useAppStore } from "@/features/core/appStore";
import { fmtTL } from "@/lib/format";
import { isUnusualBill } from "../rules";
import { useWorkflowStore as W } from "../store";
import type { AutoPayMethod, AutoPayState } from "../types";

const patch = (p: Partial<AutoPayState>) => W.setState((s) => ({ autoPay: { ...s.autoPay, ...p } }));
const addLog = (text: string) => W.setState((s) => ({ autoPay: { ...s.autoPay, log: [{ at: Date.now(), text }, ...s.autoPay.log].slice(0, 20) } }));
const tell = (title: string, body: string) => useAppStore.getState().notify({ kind: "bill", title, body, to: "/otomatik-odeme" });

/** The customer's usual monthly bill (demo: the seeded bill amount). */
export const usualBill = () => W.getState().bills[0]?.amount ?? 749.9;

/** Valid Turkish IBAN shape: TR + 24 digits (spaces ignored). Demo validation only. */
export const isValidIban = (v: string) => /^TR\d{24}$/.test(v.replace(/\s+/g, "").toUpperCase());

/** Never keep or show the full number: "TR•• •••• … 1234". */
export const maskIban = (v: string) => `TR•• •••• •••• ${v.replace(/\s+/g, "").slice(-4)}`;

export function setupAutoPay(method: AutoPayMethod, askIfUnusual: boolean, consent: boolean): boolean {
  if (!consent || !method.label.trim()) return false;
  patch({ status: "active", method, askIfUnusual, setupAt: Date.now(), cycle: null });
  addLog(`Talimat oluşturuldu · ${method.label}`);
  tell("Otomatik ödeme talimatınız oluşturuldu", `${method.label} · Her tahsilattan önce size haber vereceğiz.`);
  return true;
}

export function changeAutoPayMethod(method: AutoPayMethod): boolean {
  if (W.getState().autoPay.status !== "active" || !method.label.trim()) return false;
  patch({ method });
  addLog(`Ödeme yöntemi değiştirildi · ${method.label}`);
  return true;
}

export function setAskIfUnusual(on: boolean) {
  patch({ askIfUnusual: on });
  addLog(on ? "Yüksek tutarda önce onay iste: açık" : "Yüksek tutarda önce onay iste: kapalı");
}

export function cancelAutoPay(): boolean {
  if (W.getState().autoPay.status !== "active") return false;
  patch({ status: "off", method: null, cycle: null });
  addLog("Talimat iptal edildi");
  tell("Otomatik ödeme talimatınız iptal edildi", "Faturalarınızı bundan sonra kendiniz ödeyebilirsiniz.");
  return true;
}

/** Demo: the next collection is coming up. Higher-than-usual bills wait for approval when the customer asked for it. */
export function announceCollection(unusual = false): boolean {
  const ap = W.getState().autoPay;
  if (ap.status !== "active") return false;
  const usual = usualBill();
  const amount = unusual ? Math.round(usual * 1.62 * 100) / 100 : usual;
  const due = W.getState().bills[0]?.due ?? "—";
  const hold = ap.askIfUnusual && isUnusualBill(amount, usual);
  patch({ cycle: { amount, usual, due, status: hold ? "held_for_approval" : "notified", at: Date.now() } });
  if (hold) {
    addLog(`Tahsilat onaya alındı · ${fmtTL(amount)} (genelde ${fmtTL(usual)})`);
    tell("Faturanız her zamankinden yüksek", `Bu ay ${fmtTL(amount)} (genelde ${fmtTL(usual)}). Onay vermeden otomatik tahsil etmeyeceğiz.`);
  } else {
    addLog(`Tahsilat hatırlatması · ${fmtTL(amount)} · ${due}`);
    tell("Otomatik ödeme hatırlatması", `${fmtTL(amount)} son ödeme tarihinde (${due}) talimatınızdan tahsil edilecek.`);
  }
  return true;
}

export function approveCollection(): boolean {
  const c = W.getState().autoPay.cycle;
  if (!c || c.status !== "held_for_approval") return false;
  patch({ cycle: { ...c, status: "notified", at: Date.now() } });
  addLog(`Yüksek tutar onaylandı · ${fmtTL(c.amount)}`);
  return true;
}

export function skipCollection(): boolean {
  const c = W.getState().autoPay.cycle;
  if (!c || (c.status !== "held_for_approval" && c.status !== "notified")) return false;
  patch({ cycle: { ...c, status: "skipped", at: Date.now() } });
  addLog("Bu ayki otomatik tahsilat atlandı");
  return true;
}

/** Demo: the collection day. Success is never assumed; the result comes from the demo setting. */
export function runCollection(): boolean {
  const s = W.getState();
  const c = s.autoPay.cycle;
  if (s.autoPay.status !== "active" || !c || c.status !== "notified") return false;
  if (s.config.autoPayResult === "fail") {
    patch({ cycle: { ...c, status: "failed", at: Date.now() } });
    addLog(`Tahsilat gerçekleşmedi · ${fmtTL(c.amount)}`);
    tell("Otomatik ödeme gerçekleşmedi", "Talimatınızdan tahsilat yapılamadı. Faturanızı başka bir yöntemle ödeyebilirsiniz.");
  } else {
    patch({ cycle: { ...c, status: "paid", at: Date.now() } });
    addLog(`Tahsilat yapıldı · ${fmtTL(c.amount)} (demo)`);
    tell("Otomatik ödemeniz alındı", `${fmtTL(c.amount)} talimatınızdan tahsil edildi (demo).`);
  }
  return true;
}

export function setAutoPayResult(r: "success" | "fail") {
  W.setState((s) => ({ config: { ...s.config, autoPayResult: r } }));
}
