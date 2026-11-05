import { USER } from "@/data/mock";
import { useGigaChat } from "@/features/giga/chatStore";
import { track } from "@/lib/analytics";

/**
 * One QR entry point shared by a physical scan and the label page's demo action.
 * Opens GIGA in QR mode: the customer first writes (or picks) what they need;
 * GIGA starts the matching flow from that message.
 */
export function startQrGigaSupport() {
  const chat = useGigaChat.getState();
  chat.clear();
  chat.setEntryMode(null);
  track("flow_started", "qr_support", { via: "self_service", modem: USER.modemModel });
}
