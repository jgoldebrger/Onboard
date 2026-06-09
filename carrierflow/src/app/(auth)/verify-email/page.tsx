import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { VerifyEmailPanel } from "@/components/auth/verify-email-panel";
import { isEmailVerified } from "@/lib/auth/email-verification";
import { getSessionUser } from "@/lib/auth";

export default async function VerifyEmailPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/sign-in");
  }

  const user = await getSessionUser();
  if (!user) {
    redirect("/sign-in");
  }

  return (
    <VerifyEmailPanel
      email={user.email}
      isVerified={isEmailVerified(user)}
    />
  );
}
