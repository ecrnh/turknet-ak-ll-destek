/**
 * MOCK external systems. None of these talk to a real TurkNet, operator, CRM,
 * billing, logistics or network system. Each returns demo data chosen by the
 * scenario panel (DemoConfig). Replace these adapters with real API clients
 * later; business logic in services/* only depends on their return shapes.
 */
import { CURRENT_ADDRESS, MODEM_LED_DEMO, type DemoAddress } from "@/data/mock";
import { useWorkflowStore } from "./store";
import type { EligibilityResult } from "./rules";

export const MOCK_LABEL = "Demo verisi · gerçek sistem bağlantısı yok";

const cfg = () => useWorkflowStore.getState().config;

export const MockInfraAPI = {
  name: "Altyapı sorgu servisi (mock)",
  checkAddress(addr: DemoAddress): { result: EligibilityResult; reason: string } {
    switch (cfg().addressCheck) {
      case "eligible":
        return { result: "eligible", reason: `${addr.district} için fiber altyapı ve boş port mevcut (demo).` };
      case "eligible_external":
        return { result: "eligible_external", reason: `${addr.district} fiber altyapısı altyapı sağlayıcısına ait; port tahsisi için dış talep gerekiyor (demo).` };
      case "no_port":
        return { result: "no_port", reason: `${addr.line} binasına bağlı dağıtım kutusunda boş port yok. Altyapı genişletmesi planlanması gerekiyor (demo).` };
      case "no_response":
        return { result: "no_response", reason: "Altyapı sorgu servisi 30 sn içinde yanıt vermedi (demo zaman aşımı)." };
    }
  },
};

export const MockProviderAPI = {
  name: "Altyapı sağlayıcı / dış operatör (mock)",
  status(): "ready" | "no_response" {
    return cfg().externalResponse;
  },
};

export const MockBillingAPI = {
  name: "Ödeme mutabakat servisi (mock)",
  reconcile(): "settled" | "duplicate" {
    return cfg().reconciliation;
  },
};

export const MockNetworkAPI = {
  name: "Ağ izleme ve uzaktan yönetim (mock)",
  diagnoseOutage(): { type: "line" | "regional"; detail: string; affected: number } {
    return cfg().outageType === "regional"
      ? { type: "regional", detail: "Kadıköy–Ümraniye omurga hattında kesinti; aynı santraldeki 312 abone etkileniyor (demo).", affected: 312 }
      : { type: "line", detail: `${CURRENT_ADDRESS.port}: optik sinyal kaybı (LOS). Komşu hatlar normal (demo).`, affected: 1 };
  },
  neighboursHealthy(): boolean {
    return true;
  },
  remoteFixWorks(): boolean {
    return cfg().proactive === "remote_fix";
  },
  connectionAfterSelfFix(): boolean {
    return cfg().aiFix === "fixed";
  },
};

export const MockVisionAPI = {
  name: "Görsel analiz (simülasyon · gerçek model yok)",
  analyzeModemPhoto() {
    return MODEM_LED_DEMO;
  },
};

export const MockLogisticsAPI = {
  name: "Kurye / cihaz gönderim (mock)",
  trackingNo: () => `KRY-${Math.floor(100000 + Math.random() * 900000)}`,
};

export const MockHybridAPI = {
  name: "Hibrit İnternet cihaz / SIM / kapsama servisi (mock)",
  checks() {
    const c = cfg();
    return { device: c.hybridDevice, sim: c.hybridDevice, coverage: c.hybridCoverage };
  },
  activationSucceeds(): boolean {
    return cfg().hybridActivation === "success";
  },
};
