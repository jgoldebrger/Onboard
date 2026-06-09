import { inngest } from "@/inngest/client";
import { refreshAllApprovedCarriers } from "@/lib/compliance/refresh";

export const complianceFmcsaRefresh = inngest.createFunction(
  {
    id: "compliance/fmcsa-refresh",
    triggers: [{ cron: "0 6 * * *" }],
  },
  async ({ step }) => {
    return step.run("refresh-fmcsa-all-approved", () =>
      refreshAllApprovedCarriers(),
    );
  },
);
