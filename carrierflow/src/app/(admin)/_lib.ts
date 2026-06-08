import { redirect } from "next/navigation";
import { AuthError, requirePermission, type Permission } from "@/lib/auth";

export async function requireAdminPage(permission: Permission) {
  try {
    return await requirePermission(permission);
  } catch (e) {
    if (e instanceof AuthError) {
      if (e.status === 401) redirect("/sign-in");
      redirect("/");
    }
    throw e;
  }
}
