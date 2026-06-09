import { inngest } from "@/inngest/client";
import { refreshAllApprovedCarriers } from "@/lib/compliance/refresh";

export const complianceRequalify = inngest.createFunction(
  {
    id: "compliance/requalify",
    triggers: [{ cron: "0 8 * * *" }],
  },
  async ({ step }) => {
    return step.run("requalify-all-approved", () =>
      refreshAllApprovedCarriers(),
    );
  },
);
