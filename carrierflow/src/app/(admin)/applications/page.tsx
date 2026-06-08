import { db } from "@/lib/db";
import { requireAdminPage } from "../_lib";
import {
  ApplicationsTable,
  type ApplicationRow,
} from "../_components/tables/applications-table";

export default async function ApplicationsPage() {
  await requireAdminPage("applications:read");

  const [applications, carrierTypes] = await Promise.all([
    db.onboardingApplication.findMany({
      include: {
        user: { select: { email: true, companyName: true } },
        carrierType: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    db.carrierType.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const rows: ApplicationRow[] = applications.map((app) => ({
    id: app.id,
    email: app.user.email,
    companyName: app.user.companyName,
    status: app.status,
    carrierTypeName: app.carrierType?.name ?? null,
    carrierTypeId: app.carrierType?.id ?? null,
    riskScore: app.riskScore,
    riskLevel: app.riskLevel,
    updatedAt: app.updatedAt.toISOString(),
  }));

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Applications</h1>
      <ApplicationsTable data={rows} carrierTypes={carrierTypes} />
    </div>
  );
}
