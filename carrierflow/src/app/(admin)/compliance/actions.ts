"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { acknowledgeAlert } from "@/lib/compliance/alerts";

export async function acknowledgeComplianceAlert(
  alertId: string,
  notes?: string,
) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  await acknowledgeAlert(alertId, session.user.id, notes);
  revalidatePath("/compliance");
  revalidatePath("/carriers");
}
