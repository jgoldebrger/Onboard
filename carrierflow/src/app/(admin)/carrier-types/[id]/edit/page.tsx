import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdminPage } from "../../../_lib";
import { DeleteButton } from "../../../_components/delete-button";
import { CarrierTypeForm } from "../../carrier-type-form";

type Params = { params: Promise<{ id: string }> };

export default async function EditCarrierTypePage({ params }: Params) {
  await requireAdminPage("config:manage");
  const { id } = await params;

  const [carrierType, partnerTypes] = await Promise.all([
    db.carrierType.findUnique({ where: { id } }),
    db.partnerType.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  if (!carrierType) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Edit carrier type</h1>
        <Link
          href={`/carrier-types/${id}/requirements`}
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Configure requirements
        </Link>
      </div>
      <CarrierTypeForm
        partnerTypes={partnerTypes}
        initial={{
          id: carrierType.id,
          partnerTypeId: carrierType.partnerTypeId,
          slug: carrierType.slug,
          name: carrierType.name,
          description: carrierType.description ?? "",
          isActive: carrierType.isActive,
        }}
      />
      <DeleteButton
        apiPath={`/api/admin/carrier-types/${id}`}
        redirectTo="/carrier-types"
      />
    </div>
  );
}
