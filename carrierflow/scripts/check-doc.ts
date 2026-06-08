import { PrismaClient } from "@prisma/client";

async function main() {
  const db = new PrismaClient();
  const id = process.argv[2] ?? "cmq11rj0n000rtl2k26b9ucfi";
  const appId = process.argv[3] ?? "cmq10vyu1000otlho882235dv";

  const doc = await db.carrierDocument.findUnique({ where: { id } });
  const reviewById = await db.documentReview.findUnique({ where: { id } });
  const combined = await db.carrierDocument.findFirst({
    where: { id, applicationId: appId },
    include: { review: true },
  });
  const application = await db.onboardingApplication.findUnique({
    where: { id: appId },
    select: {
      id: true,
      userId: true,
      status: true,
      user: { select: { id: true, email: true } },
    },
  });

  const all = await db.carrierDocument.findMany({
    where: { applicationId: appId },
    select: {
      id: true,
      fileName: true,
      documentTypeId: true,
      review: { select: { id: true, status: true, reviewProgress: true } },
    },
  });

  console.log(
    JSON.stringify({ application, doc, reviewById, combined, all }, null, 2),
  );
  await db.$disconnect();
}

main();
