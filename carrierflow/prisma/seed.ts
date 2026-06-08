import { PrismaClient, QuestionType } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const CARRIER_TYPES = [
  { slug: "final-mile", name: "Final Mile" },
  { slug: "long-haul", name: "Long Haul" },
  { slug: "broker", name: "Broker" },
  { slug: "dedicated-fleet", name: "Dedicated Fleet" },
  { slug: "owner-operator", name: "Owner Operator" },
  { slug: "white-glove", name: "White Glove" },
  { slug: "ltl", name: "LTL" },
  { slug: "ftl", name: "FTL" },
];

const DOCUMENT_TYPES = [
  {
    key: "coi",
    name: "Certificate of Insurance",
    mimeTypes: ["application/pdf", "image/jpeg", "image/png"],
  },
  {
    key: "w9",
    name: "W-9",
    mimeTypes: ["application/pdf", "image/jpeg", "image/png"],
  },
  {
    key: "broker-authority",
    name: "Broker Authority Letter",
    mimeTypes: ["application/pdf"],
  },
  {
    key: "operating-authority",
    name: "Operating Authority",
    mimeTypes: ["application/pdf"],
  },
];

const QUESTIONS = [
  {
    key: "dot_number",
    label: "DOT number",
    type: QuestionType.TEXT,
    validation: { preset: "dot" },
  },
  {
    key: "company_legal_name",
    label: "Legal company name",
    type: QuestionType.TEXT,
  },
  {
    key: "mc_number",
    label: "MC number",
    type: QuestionType.TEXT,
    validation: { preset: "mc" },
  },
  {
    key: "has_lift_gate",
    label: "Do you have a lift gate?",
    type: QuestionType.YES_NO,
  },
  {
    key: "fleet_size",
    label: "Fleet size",
    type: QuestionType.NUMBER,
  },
];

const AGENT_CONFIGS = [
  { key: "interview", name: "Interview Agent" },
  { key: "document_review", name: "Document Review Agent" },
  { key: "verification", name: "Verification Agent" },
  { key: "risk", name: "Risk Assessment Agent" },
  { key: "approval", name: "Approval Recommendation Agent" },
];

async function main() {
  const partner = await db.partnerType.upsert({
    where: { slug: "carrier" },
    create: { slug: "carrier", name: "Carrier" },
    update: {},
  });

  for (const ct of CARRIER_TYPES) {
    await db.carrierType.upsert({
      where: {
        partnerTypeId_slug: { partnerTypeId: partner.id, slug: ct.slug },
      },
      create: {
        partnerTypeId: partner.id,
        slug: ct.slug,
        name: ct.name,
      },
      update: { name: ct.name },
    });
  }

  for (const doc of DOCUMENT_TYPES) {
    await db.documentType.upsert({
      where: { key: doc.key },
      create: doc,
      update: { name: doc.name, mimeTypes: doc.mimeTypes },
    });
  }

  for (const q of QUESTIONS) {
    await db.question.upsert({
      where: { key: q.key },
      create: q,
      update: {
        label: q.label,
        type: q.type,
        validation: "validation" in q ? q.validation : undefined,
      },
    });
  }

  for (const agent of AGENT_CONFIGS) {
    const config = await db.agentConfig.upsert({
      where: { key: agent.key },
      create: agent,
      update: { name: agent.name },
    });

    await db.agentPromptVersion.upsert({
      where: {
        agentConfigId_version: { agentConfigId: config.id, version: 1 },
      },
      create: {
        agentConfigId: config.id,
        version: 1,
        systemPrompt: `You are the ${agent.name} for CarrierFlow carrier onboarding.`,
        isPublished: true,
        publishedAt: new Date(),
      },
      update: {},
    });
  }

  const brokerType = await db.carrierType.findFirst({
    where: { slug: "broker", partnerTypeId: partner.id },
  });
  const coi = await db.documentType.findUnique({ where: { key: "coi" } });

  if (brokerType && coi) {
    const brokerQuestions = await db.question.findMany({
      where: {
        key: { in: ["dot_number", "company_legal_name", "mc_number"] },
      },
    });
    const ruleVersion = await db.ruleVersion.create({
      data: {
        name: "requirements/broker",
        description: "Required questions and documents for Broker",
        version: 1,
        isPublished: true,
        publishedAt: new Date(),
        conditions: {
          type: "group",
          op: "AND",
          children: [
            {
              type: "clause",
              field: "carrier_type",
              operator: "eq",
              value: "broker",
            },
          ],
        },
        actions: [
          ...brokerQuestions.map((q) => ({
            effect: "REQUIRE" as const,
            targetType: "question" as const,
            targetId: q.id,
          })),
          {
            effect: "REQUIRE",
            targetType: "document",
            targetId: coi.id,
          },
        ],
      },
    });

    await db.rule.create({
      data: {
        ruleVersionId: ruleVersion.id,
        priority: 50,
        isEnabled: true,
      },
    });
  }

  await db.riskRule.upsert({
    where: { key: "high_risk_broker" },
    create: {
      key: "high_risk_broker",
      label: "Broker carrier type baseline risk",
      points: 20,
      condition: {
        type: "clause",
        field: "carrier_type",
        operator: "eq",
        value: "broker",
      },
    },
    update: { points: 20, isEnabled: true },
  });

  await db.riskRule.upsert({
    where: { key: "gov_verification_failed" },
    create: {
      key: "gov_verification_failed",
      label: "FMCSA verification failed",
      points: 40,
      condition: {
        type: "clause",
        field: "govData.status",
        operator: "eq",
        value: "FAILED",
      },
    },
    update: { points: 40, isEnabled: true },
  });

  const adminPassword =
    process.env.SEED_ADMIN_PASSWORD ?? "changeme123";
  const adminHash = await bcrypt.hash(adminPassword, 10);
  await db.user.upsert({
    where: { email: "admin@carrierflow.local" },
    create: {
      id: "seed-admin",
      email: "admin@carrierflow.local",
      passwordHash: adminHash,
      role: "ADMIN",
    },
    update: { passwordHash: adminHash, role: "ADMIN" },
  });

  console.log("Seed complete");
  console.log("Dev admin: admin@carrierflow.local /", adminPassword);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
