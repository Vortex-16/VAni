import { db, patients } from "@workspace/db";
async function main() {
  const data = await db.select().from(patients);
  console.log(data.map(p => ({ id: p.id, name: p.name, linkCode: p.linkCode })));
}
main().catch(console.error);
