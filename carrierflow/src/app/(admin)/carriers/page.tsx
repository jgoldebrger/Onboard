import { db } from "@/lib/db";
import { buildCarrierRow } from "@/lib/carriers/build-carrier-row";
import { requireAdminPage } from "../_lib";
import { CarriersTable } from "../_components/tables/carriers-table";

export default async function CarriersPage() {
  await requireAdminPage("applications:read");

  const [applications, carrierTypes] = await Promise.all([
    db.onboardingApplication.findMany({
      include: {
        user: { select: { email: true, companyName: true } },
        carrierType: { select: { id: true, name: true } },
        govVerifications: {
          orderBy: { verifiedAt: "desc" },
          take: 1,
          select: {
            dotNumber: true,
            mcNumber: true,
            companyName: true,
            status: true,
          },
        },
        answers: {
          where: {
            question: {
              key: { in: ["dot_number", "mc_number", "company_legal_name"] },
            },
          },
          include: { question: { select: { key: true } } },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
    db.carrierType.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const rows = applications.map((app) => buildCarrierRow(app));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Carriers</h1>
        <p className="text-sm text-muted-foreground">
          Onboarding applications with FMCSA (SAFER) data, documents, and version
          history.
        </p>
      </div>
      <CarriersTable data={rows} carrierTypes={carrierTypes} />
    </div>
  );
}
