import { USER } from "@/data/mock";
import { useGigaChat } from "@/features/giga/chatStore";
import { startAiUsta } from "@/features/workflow/services/aiUsta";
import { track } from "@/lib/analytics";

/** One QR entry point shared by a physical scan and the label page's demo action. */
export function startQrGigaSupport() {
  const chat = useGigaChat.getState();
  chat.clear();
  chat.setEntryMode("qr");

  const wfId = startAiUsta("modem", { channel: "qr", modemSerial: USER.modemSerial });
  chat.add({ from: "bot", text: "", wfId });
  track("flow_started", "qr_support", { via: "giga", modem: USER.modemModel });
  return wfId;
}

