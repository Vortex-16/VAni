import { db, patients, careLinks, eq, and } from "@workspace/db";

/**
 * Returns all patients a manager (family/caregiver user) is linked to, via either
 * the new care_links table (active) OR the legacy patients.caregiverId pointer.
 * Merging both keeps existing flows working while care_links rolls out.
 */
export async function getManagedPatients(managerId: string) {
  const [viaLegacy, viaLinks] = await Promise.all([
    db.select().from(patients).where(eq(patients.caregiverId, managerId)),
    db
      .select({ p: patients })
      .from(careLinks)
      .innerJoin(patients, eq(careLinks.patientId, patients.id))
      .where(and(eq(careLinks.managerId, managerId), eq(careLinks.status, "active"))),
  ]);

  const byId = new Map<string, typeof patients.$inferSelect>();
  for (const p of viaLegacy) byId.set(p.id, p);
  for (const r of viaLinks) byId.set(r.p.id, r.p);
  return [...byId.values()];
}
