import { describe, expect, it } from "vitest";
import { normalizePerms, permsFor, qrNextStep, resolveRole, NO_PERMS, OWNER_PERMS, type EvimMember } from "@/features/evim/rules";

const m = (id: string, status: EvimMember["status"], perms = { troubleshoot: true, devicesView: true, devicesManage: false, billsView: false }): EvimMember => ({ id, name: id, contact: "", relation: "", status, perms, since: 0 });

describe("TürkNet Evim QR flow", () => {
  it("sends users without the app to install first", () => expect(qrNextStep({ appInstalled: false, loggedIn: false })).toBe("install"));
  it("asks signed-out users to log in", () => expect(qrNextStep({ appInstalled: true, loggedIn: false })).toBe("login"));
  it("opens Evim once installed and signed in", () => expect(qrNextStep({ appInstalled: true, loggedIn: true })).toBe("evim"));
});

describe("TürkNet Evim roles", () => {
  const members = [m("elif", "active"), m("mert", "invited"), m("can", "requested")];
  it("owner has every permission", () => {
    expect(resolveRole("owner", members)).toBe("owner");
    expect(permsFor("owner", members)).toEqual(OWNER_PERMS);
  });
  it("active member gets only granted permissions", () => {
    expect(resolveRole("elif", members)).toBe("member");
    expect(permsFor("elif", members).billsView).toBe(false);
  });
  it("invited or requesting users are not yet authorized", () => {
    expect(resolveRole("mert", members)).toBe("unauthorized");
    expect(resolveRole("can", members)).toBe("unauthorized");
    expect(permsFor("can", members)).toEqual(NO_PERMS);
  });
  it("managing devices implies viewing them", () => {
    expect(normalizePerms({ troubleshoot: false, devicesView: false, devicesManage: true, billsView: false }).devicesView).toBe(true);
  });
});
