import { describe, expect, it } from "vitest";
import { afterCheck, afterDiagnosis, afterVerify, QR_REPAIR_PATH, retryStep, SOLVE_POINTS } from "@/features/evim/selfRepair";

describe("Self Servis Onarım", () => {
  it("QR never lands in the chat", () => expect(QR_REPAIR_PATH).not.toContain("ajanlar"));
  it("general QR asks which problem to solve", () => expect(afterVerify("genel")).toBe("choose"));
  it("personal QR goes straight to repair analysis", () => expect(afterVerify("kisisel")).toBe("analyze"));
  it("slow internet leads to visual technical support", () => expect(afterDiagnosis("slow")).toBe("camera"));
  it("no connection leads to a remote restart check", () => expect(afterDiagnosis("down")).toBe("check"));
  it("success and failure are separate outcomes", () => {
    expect(afterCheck(true)).toBe("solved");
    expect(afterCheck(false)).toBe("unsolved");
  });
  it("retry repeats the cable guide for slow internet", () => expect(retryStep("slow")).toBe("guide"));
  it("solving earns 15 points", () => expect(SOLVE_POINTS).toBe(15));
});
