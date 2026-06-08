import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdminPage } from "../../_lib";

type Params = { params: Promise<{ id: string }> };

/** Application review lives on the carriers detail page (SAFER tabs + files). */
export default async function ApplicationReviewPage({ params }: Params) {
  await requireAdminPage("applications:read");
  const { id } = await params;

  const exists = await db.onboardingApplication.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!exists) notFound();

  redirect(`/carriers/${id}`);
}
