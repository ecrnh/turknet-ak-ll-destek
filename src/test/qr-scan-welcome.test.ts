import { expect, it } from "vitest";
import { QR_SCAN_WELCOME } from "@/data/mock";

it("QR okutma karşılama ekranı dört saniye sürer", () => {
  expect(QR_SCAN_WELCOME.durationMs).toBe(4000);
});