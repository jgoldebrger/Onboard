import { redirect } from "next/navigation";

type Props = { params: Promise<{ applicationId: string }> };

export default async function IdentityPage({ params }: Props) {
  const { applicationId } = await params;
  redirect(`/onboarding/${applicationId}`);
}
