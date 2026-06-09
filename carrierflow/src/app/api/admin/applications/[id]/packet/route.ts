import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { buildApplicationPacketZip } from "@/lib/applications/packet-zip";
import { handleApiError } from "../../../_utils";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    await requirePermission("applications:read");
    const { id } = await params;

    const { buffer, fileName } = await buildApplicationPacketZip(id);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (err) {
    if (err instanceof Error && err.message === "Application not found") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return handleApiError(err);
  }
}
