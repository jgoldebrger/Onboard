import { PrismaClient } from "@prisma/client";
import { processDocumentReview } from "../src/lib/documents/process-review";

async function main() {
  const db = new PrismaClient();
  const appId = process.argv[2];

  const stuck = await db.documentReview.findMany({
    where: {
      status: { in: ["PROCESSING", "PENDING"] },
      ...(appId ? { document: { applicationId: appId } } : {}),
    },
    select: { documentId: true, status: true, reviewProgress: true },
  });

  console.log(`Processing ${stuck.length} stuck review(s)...`);
  for (const row of stuck) {
    console.log(`→ ${row.documentId} (${row.status}, ${row.reviewProgress}%)`);
    const result = await processDocumentReview(row.documentId);
    console.log("  ", result);
  }

  await db.$disconnect();
}

main();
