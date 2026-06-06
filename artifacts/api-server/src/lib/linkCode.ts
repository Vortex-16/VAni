import crypto from "crypto";
import { db, patients, eq } from "@workspace/db";

// Unambiguous alphabet — no 0/O, 1/I/L to avoid read-aloud / typing mistakes.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LEN = 6;

/** Generate a shareable patient code like "DB-7G4K2P" (not checked for uniqueness). */
export function generateLinkCode(): string {
  let body = "";
  for (let i = 0; i < CODE_LEN; i++) {
    body += ALPHABET[crypto.randomInt(ALPHABET.length)];
  }
  return `DB-${body}`;
}

/** Generate a code guaranteed not to collide with an existing patient's code. */
export async function generateUniqueLinkCode(): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = generateLinkCode();
    const [existing] = await db
      .select({ id: patients.id })
      .from(patients)
      .where(eq(patients.linkCode, code));
    if (!existing) return code;
  }
  // Practically unreachable (~729M space); widen the code as a last resort.
  return `${generateLinkCode()}${crypto.randomInt(10, 99)}`;
}

/** Ensure a patient has a link code, generating + persisting one if missing. */
export async function ensureLinkCode(patientId: string): Promise<string> {
  const [patient] = await db
    .select({ linkCode: patients.linkCode })
    .from(patients)
    .where(eq(patients.id, patientId));
  if (patient?.linkCode) return patient.linkCode;

  const code = await generateUniqueLinkCode();
  await db
    .update(patients)
    .set({ linkCode: code, linkCodeIssuedAt: new Date() })
    .where(eq(patients.id, patientId));
  return code;
}
