import { redirect } from "next/navigation";

type Props = { params: Promise<{ applicationId: string }> };

export default async function DocumentsPage({ params }: Props) {
  const { applicationId } = await params;
  redirect(`/onboarding/${applicationId}`);
}
