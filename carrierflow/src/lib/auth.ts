import type { UserRole } from "@prisma/client";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export type Permission =
  | "config:manage"
  | "rules:publish"
  | "applications:read"
  | "applications:approve"
  | "applications:override"
  | "audit:read"
  | "onboarding:own";

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  SUPER_ADMIN: [
    "config:manage",
    "rules:publish",
    "applications:read",
    "applications:approve",
    "applications:override",
    "audit:read",
    "onboarding:own",
  ],
  ADMIN: [
    "config:manage",
    "rules:publish",
    "applications:read",
    "applications:approve",
    "applications:override",
    "audit:read",
  ],
  REVIEWER: ["applications:read", "applications:approve"],
  CARRIER: ["onboarding:own"],
};

export async function getSessionUser() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const user = await db.user.findUnique({ where: { id: userId } });
  return user;
}

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export async function requirePermission(permission: Permission) {
  const user = await getSessionUser();
  if (!user) {
    throw new AuthError("Unauthorized", 401);
  }
  if (!hasPermission(user.role, permission)) {
    throw new AuthError("Forbidden", 403);
  }
  return user;
}

export class AuthError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "AuthError";
  }
}
