import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function OnboardingPage() {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");

  let application = await db.onboardingApplication.findFirst({
    where: { userId: user.id, status: { in: ["DRAFT", "IN_PROGRESS"] } },
    orderBy: { createdAt: "desc" },
  });

  if (!application) {
    application = await db.onboardingApplication.create({
      data: { userId: user.id, status: "DRAFT" },
    });
  }

  redirect(`/onboarding/${application.id}`);
}
