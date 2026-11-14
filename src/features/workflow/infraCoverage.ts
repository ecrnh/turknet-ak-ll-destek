import { NO_INFRA_AREAS } from "@/data/mock";

const norm = (v: string) => v.trim().toLocaleLowerCase("tr-TR").replace(/\s*(mah\.?|mahallesi)$/u, "").trim();

/** True when TürkNet has no infrastructure at the given address (demo coverage map). */
export function hasNoInfrastructure(addr: { district: string; neighborhood: string }): boolean {
  return NO_INFRA_AREAS.some((a) => norm(a.district) === norm(addr.district) && (!a.neighborhood || norm(a.neighborhood) === norm(addr.neighborhood)));
}
