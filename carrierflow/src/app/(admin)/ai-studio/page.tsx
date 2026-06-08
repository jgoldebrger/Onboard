import { AiStudioClient } from "@/components/admin/ai-studio-client";
import { db } from "@/lib/db";
import { requireAdminPage } from "../_lib";

export default async function AiStudioPage() {
  await requireAdminPage("config:manage");

  const configs = await db.agentConfig.findMany({
    orderBy: { key: "asc" },
    include: {
      promptVersions: { orderBy: { version: "desc" }, take: 5 },
    },
  });

  const agents = configs.map((c) => ({
    id: c.id,
    key: c.key,
    name: c.name,
    isActive: c.isActive,
    published: c.promptVersions.find((v) => v.isPublished),
    versions: c.promptVersions,
  }));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold">AI Behavior Studio</h1>
        <p className="text-sm text-neutral-600">
          Edit prompts and models per agent. Published versions are used at runtime.
        </p>
      </header>
      <AiStudioClient initialAgents={agents} />
    </div>
  );
}
