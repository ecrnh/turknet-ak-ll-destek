import { QR_MODEMS, QR_SETUP_COPY } from "@/data/mock";

export type ModemId = (typeof QR_MODEMS)[number]["id"];
export function modemGuide(id: ModemId) {
  const modem = QR_MODEMS.find((m) => m.id === id) ?? QR_MODEMS[0];
  const steps = QR_SETUP_COPY.steps.map((step) => ({
    ...step,
    body: step.kind === "line"
      ? modem.connection === "fiber"
        ? `Fiber kabloyu ${modem.brand} ${modem.model} modeminin ${modem.port} girişine nazikçe tak. DSL veya LAN portunu kullanma.`
        : `Duvardaki telefon prizinden gelen ince kabloyu ${modem.brand} ${modem.model} modeminin ${modem.port} girişine tak. LAN portunu kullanma.`
      : step.kind === "lights" ? `1–2 dakika bekle. ${modem.lights}` : step.body,
  }));
  return { modem, steps };
}