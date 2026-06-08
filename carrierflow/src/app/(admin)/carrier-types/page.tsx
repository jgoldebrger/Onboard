import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdminPage } from "../_lib";
import {
  CarrierTypesTable,
  type CarrierTypeRow,
} from "../_components/tables/carrier-types-table";

export default async function CarrierTypesPage() {
  await requireAdminPage("config:manage");

  const carrierTypes = await db.carrierType.findMany({
    include: { partnerType: { select: { name: true } } },
    orderBy: { name: "asc" },
  });

  const rows: CarrierTypeRow[] = carrierTypes.map((ct) => ({
    id: ct.id,
    name: ct.name,
    slug: ct.slug,
    partnerName: ct.partnerType.name,
    isActive: ct.isActive,
    version: ct.version,
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Carrier types</h1>
        <Link
          href="/carrier-types/new"
          className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/90"
        >
          New carrier type
        </Link>
      </div>

      <CarrierTypesTable data={rows} />
    </div>
  );
}
