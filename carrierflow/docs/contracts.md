# CarrierFlow — Integration Contracts (Wave 0)

All subagents must conform to these types and API shapes. Do not change without parent integrator approval.

## Data access

- **Server-only:** No Supabase or Prisma from browser. All access via API routes + Auth.js session.
- **Storage:** Use `StorageProvider` from `@/lib/storage` — never hardcode Supabase URLs in domain code.

## Rules engine

```typescript
type ConditionNode =
  | { type: "group"; op: "AND" | "OR"; children: ConditionNode[] }
  | { type: "clause"; field: string; operator: string; value: unknown };

type RuleAction = {
  effect: "REQUIRE" | "OPTIONAL" | "BLOCK_APPROVAL" | "ADD_RISK";
  targetType: "question" | "document" | "carrier_type";
  targetId: string;
  params?: Record<string, unknown>;
};

type EvaluationContext = {
  carrierTypeId?: string;
  carrierTypeSlug?: string;
  answers: Map<string, unknown>;
  documents: Map<string, { status: string; extractedData?: Record<string, unknown> }>;
  govData?: Record<string, unknown>;
  identityData?: Record<string, unknown>;
};

type EvaluationResult = {
  requiredQuestionIds: string[];
  requiredDocumentTypeIds: string[];
  blocked: boolean;
  blockReasons: string[];
  riskAdditions: { ruleId: string; points: number; label: string }[];
};
```

Public API (implemented in Wave 2A):

- `loadPublishedRules(): Promise<PublishedRule[]>`
- `evaluateRules(context: EvaluationContext): Promise<EvaluationResult>`
- `resolveRequirements(applicationId: string): Promise<EvaluationResult>`

**Runtime vs snapshot:** Evaluation uses all enabled rules whose `RuleVersion` is published. `ruleVersionSnapshot` on submit is for audit replay only (Wave 4).

**Clause fields:** Use `carrier_type` / `carrierTypeSlug` for carrier type; use `answer.<questionKey>` or bare question key for answers.

**OPTIONAL effect:** Defined in types; not applied in Phase 1 evaluator (no-op).

### Admin rules API (`/api/admin/rules`)

| Method | Path | `[id]` refers to |
|--------|------|------------------|
| GET, POST | `/api/admin/rules` | — |
| POST | `/api/admin/rules/[id]/publish` | `RuleVersion.id` |
| PATCH | `/api/admin/rules/[id]/toggle` | `Rule.id` |

Conditions/actions live on `RuleVersion`; `Rule` rows are priority + `isEnabled`.

## Storage

```typescript
interface FileMeta {
  contentType: string;
  size: number;
}

interface StoredObject {
  storageKey: string;
  bucket: string;
}

interface StorageProvider {
  upload(bucket: string, path: string, file: Buffer, meta: FileMeta): Promise<StoredObject>;
  getSignedUrl(bucket: string, path: string, expiresIn: number): Promise<string>;
  delete(bucket: string, path: string): Promise<void>;
}
```

Buckets: `carrier-documents`, `identity-documents`, `application-attachments`.

Path pattern: `{applicationId}/{documentTypeKey}/{uuid}.{ext}`

## API response shapes

### GET `/api/applications/[id]`

```json
{
  "id": "string",
  "status": "DRAFT | IN_PROGRESS | ...",
  "carrierTypeId": "string | null",
  "riskScore": 0,
  "riskLevel": "LOW",
  "progress": { "questionsAnswered": 0, "questionsRequired": 0, "documentsUploaded": 0, "documentsRequired": 0 }
}
```

### POST document upload → `202 Accepted`

```json
{
  "documentId": "string",
  "reviewStatus": "PROCESSING"
}
```

### GET document review poll

```json
{
  "status": "PROCESSING | PASSED | FAILED | NEEDS_REVIEW",
  "ruleResults": [],
  "failureReasons": []
}
```

## Audit

```typescript
auditLog(params: {
  actorId?: string;
  entityType: string;
  entityId: string;
  action: string;
  before?: unknown;
  after?: unknown;
  ipAddress?: string;
}): Promise<void>;
```

## RBAC permissions

- `config:manage` — SUPER_ADMIN, ADMIN
- `rules:publish` — SUPER_ADMIN, ADMIN
- `applications:read` — SUPER_ADMIN, ADMIN, REVIEWER
- `applications:approve` — SUPER_ADMIN, ADMIN, REVIEWER
- `applications:override` — SUPER_ADMIN, ADMIN
- `audit:read` — SUPER_ADMIN, ADMIN
- `onboarding:own` — CARRIER (own application only)

## Rule snapshot on submit

On `POST /api/applications/[id]/submit`, set `ruleVersionSnapshot`:

```json
{
  "publishedRuleVersionIds": ["cuid..."],
  "capturedAt": "ISO-8601"
}
```

## Interview API (Wave 2C)

- `GET /api/interview/[applicationId]/questions` — owner only; `resolveRequirements` + question/doc metadata
- `POST /api/interview/[applicationId]/message` — body `{ message }`; returns agent reply + `savedAnswerKeys`

## Async documents (Wave 3A)

- Event: `document/uploaded` → `{ documentId }`
- Inngest function id: `document/process` (idempotent on `documentId`)

## FMCSA verification (Wave 3B)

- `POST /api/verification/[applicationId]/run` — body `{ dotNumber?, mcNumber?, companyName? }`
- `GET /api/verification/[applicationId]` — latest record
- Client: `lookupCarrier` in `@/lib/fmcsa` (24h DB cache)

## Admin overrides (Wave 4)

- `POST /api/admin/applications/[id]/override` — permission `applications:override`
- Body: `{ entityType: "document_review" | "identity", entityId, reason }`
- Writes `ApprovalLog` action `OVERRIDE_RULE` + `AuditLog`

## Admin UI routes (Wave 2B)

Route group `(admin)` — URLs have no `/admin` prefix: `/applications`, `/carrier-types`, `/questions`, `/documents`, `/risk-rules`, `/rules`, `/audit`.

Config CRUD APIs: `/api/admin/carrier-types`, `questions`, `document-types`, `risk-rules`. Applications: `/api/admin/applications`. Audit: `/api/admin/audit`.

## Phase 2 (implemented)

### AI Behavior Studio

- Admin UI: `/ai-studio`
- APIs: `GET /api/admin/ai-studio`, `POST /api/admin/ai-studio/[configId]/prompts`, `POST /api/admin/ai-studio/prompts/[versionId]/publish`, `POST .../test`, `GET .../runs`
- Runtime: `resolveAgentConfig(agentKey)` loads published `AgentPromptVersion`; falls back to code defaults
- `AgentRunLog` records latency/confidence per run

### Document review SSE

- `GET /api/documents/[applicationId]/[docId]/stream` — `text/event-stream`, polls every 2s until not `PROCESSING`
- Client prefers EventSource, falls back to poll

### Email (Resend)

- `RESEND_API_KEY` + `EMAIL_FROM` — sends on submit, approve, reject, request-info
- Dev without key: logs to console

### Visual rules builder

- `/rules` — Visual tree + JSON tabs for conditions (nested AND/OR groups)

## Phase 1 scope (subagents)

**In scope:** Form-based rules builder, default prompts in code, poll (not SSE), COI/W9 focus.
