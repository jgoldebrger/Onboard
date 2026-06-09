import { redirect } from "next/navigation";
import { AuthError, requirePermission, type Permission } from "@/lib/auth";
import { requireAdminMfaEnrolled } from "@/lib/auth/guards";

export async function requireAdminPage(permission: Permission) {
  try {
    const user = await requirePermission(permission);
    requireAdminMfaEnrolled(user);
    return user;
  } catch (e) {
    if (e instanceof AuthError) {
      if (e.status === 401) redirect("/sign-in");
      redirect("/");
    }
    throw e;
  }
}
