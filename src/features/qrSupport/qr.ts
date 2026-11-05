import QRCode from "qrcode";
import { USER } from "@/data/mock";

export const qrPayload = (serial: string) => {
  const origin = typeof window === "undefined" ? "https://turk.net" : window.location.origin;
  return `${origin}/qr/tara?sub=${encodeURIComponent(USER.subscriberNo)}&dev=${encodeURIComponent(serial)}`;
};

/** QR codes need literal colours; these mirror the plum/white brand tokens. */
const QR_DARK = "#4A0A5E";
const QR_LIGHT = "#FFFFFF";

export function makeQr(text: string, width = 320) {
  return QRCode.toDataURL(text, { width, margin: 1, errorCorrectionLevel: "M", color: { dark: QR_DARK, light: QR_LIGHT } });
}

export const isValidCode = (code: string, serial: string) => {
  const c = code.trim().toUpperCase();
  return c === serial || c === qrPayload(serial).toUpperCase() || /^MOD-[A-Z0-9]{6}$/.test(c);
};

export function matchesSupportQr(value: string, serial: string) {
  try {
    const url = new URL(value);
    const supportUri = url.protocol === "turknet:" && url.hostname === "support";
    const supportWebLink = url.pathname === "/qr/tara";
    return (supportUri || supportWebLink) && url.searchParams.get("dev") === serial && url.searchParams.get("sub") === USER.subscriberNo;
  } catch {
    return value.trim().toUpperCase() === serial.toUpperCase();
  }
}

