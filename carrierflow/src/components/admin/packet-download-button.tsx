"use client";

import { Button } from "@/components/ui/button";

export function PacketDownloadButton({
  applicationId,
}: {
  applicationId: string;
}) {
  return (
    <Button type="button" variant="outline" size="sm" asChild>
      <a href={`/api/admin/applications/${applicationId}/packet`}>
        Download packet (ZIP)
      </a>
    </Button>
  );
}
