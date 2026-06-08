import { SignInForm } from "@/components/auth/sign-in-form";

export default function SignInPage() {
  const googleEnabled =
    !!process.env.AUTH_GOOGLE_ID && !!process.env.AUTH_GOOGLE_SECRET;

  return <SignInForm googleEnabled={googleEnabled} />;
}
