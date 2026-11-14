import { describe, expect, it } from "vitest";
import { hasNoInfrastructure } from "@/features/workflow/infraCoverage";

describe("relocation infrastructure coverage", () => {
  it("Şile has no infrastructure", () => expect(hasNoInfrastructure({ district: "şile ", neighborhood: "Ağva Mah." })).toBe(true));
  it("only Riva in Beykoz lacks infrastructure", () => {
    expect(hasNoInfrastructure({ district: "Beykoz", neighborhood: "Riva Mahallesi" })).toBe(true);
    expect(hasNoInfrastructure({ district: "Beykoz", neighborhood: "Kavacık Mah." })).toBe(false);
  });
  it("Kadıköy demo address is covered", () => expect(hasNoInfrastructure({ district: "Kadıköy", neighborhood: "Caferağa Mah." })).toBe(false));
});
