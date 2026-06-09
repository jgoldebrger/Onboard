import { inngest } from "@/inngest/client";
import { sendAllIdleOnboardingReminders } from "@/lib/applications/idle-reminders";

export const onboardingReminders = inngest.createFunction(
  {
    id: "onboarding/idle-reminders",
    triggers: [{ cron: "0 9 * * 1" }],
  },
  async ({ step }) => {
    return step.run("send-idle-onboarding-reminders", async () => {
      return sendAllIdleOnboardingReminders();
    });
  },
);
