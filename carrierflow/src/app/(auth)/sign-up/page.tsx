import { SignUpForm } from "@/components/auth/sign-up-form";

type SignUpPageProps = {
  searchParams: Promise<{ invite?: string }>;
};

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const { invite } = await searchParams;
  return <SignUpForm inviteToken={invite} />;
}
