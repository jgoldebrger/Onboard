import { db } from "@/lib/db";
import { requireAdminPage } from "../../_lib";
import { CarrierTypeForm } from "../carrier-type-form";

export default async function NewCarrierTypePage() {
  await requireAdminPage("config:manage");
  const partnerTypes = await db.partnerType.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">New carrier type</h1>
      <CarrierTypeForm partnerTypes={partnerTypes} />
    </div>
  );
}
