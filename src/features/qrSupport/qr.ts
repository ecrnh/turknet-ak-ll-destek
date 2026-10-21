import QRCode from "qrcode";
import { USER } from "@/data/mock";

export const qrPayload = (serial: string) => `turknet://support?sub=${USER.subscriberNo}&dev=${serial}`;

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
