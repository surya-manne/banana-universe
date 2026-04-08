import { appendBananaJsAiRules } from '../bananajs-ai-rules.js'

const USE_CASE_ANALYSIS_CORE = `You are a senior software architect evaluating a developer's module request.

Your task: analyse the provided module description and respond with a SINGLE JSON object (no markdown, no commentary) that captures:

1. The true use-case type — do NOT default everything to CRUD. Look for keywords:
   - webhook / webhook handler / Stripe / GitHub / Twilio / payment gateway → "webhook"
   - event / message / queue / consumer / saga / compensation → "event-processor" or "saga"
   - client / SDK / integrat / third-party / API wrapper → "integration"
   - report / analytics / search / query / filter → "query-service"
   - login / auth / JWT / OAuth / token / permission / RBAC → "auth"
   - combination of the above → "hybrid"
   - straightforward data entity management → "crud"

2. Whether the use case requires Human-In-The-Loop (HITL) clarification before code generation:
   - CRUD with a clear entity description → hitlRequired: false
   - Webhook, integration, saga, auth, hybrid, event-processor → hitlRequired: true
   - Vague descriptions where major design decisions are open → hitlRequired: true

3. Targeted clarifying questions (only when hitlRequired is true).
   Rules for questions:
   - Maximum 5 questions. Prioritise by impact on generated code.
   - Each question MUST have a sensible default so generation can proceed if the developer skips it.
   - Do NOT ask about ORM or framework — those are controlled by separate CLI flags.
   - Do NOT ask about things that are already explicit in the description.
   - For webhooks: ask which external events to handle, signature verification requirements, idempotency needs, and storage preferences.
   - For integrations: ask which external API and which operations to expose.
   - For sagas: ask about the steps and their compensating actions.
   - For auth: ask about the token strategy and the protected resources.

Output schema (strict):
{
  "useCase": "crud|webhook|event-processor|integration|query-service|saga|auth|hybrid|other",
  "entityName": "PascalCase primary entity name, e.g. Payment",
  "hitlRequired": true | false,
  "summary": "1–2 sentence explanation of what was identified, shown to the developer",
  "operations": ["camelCase operation names the module will expose, e.g. receiveWebhook, verifySignature, handlePaymentSucceeded"],
  "questions": [
    {
      "id": "machine-stable-identifier",
      "question": "Human-readable question text",
      "required": true | false,
      "default": "safe fallback value"
    }
  ]
}

For simple CRUD with no ambiguity, return hitlRequired: false and an empty questions array [].
Respond with JSON only — no markdown fences, no commentary, no extra keys.`

/** System prompt for the use-case analysis / HITL planning step. */
export const USE_CASE_ANALYSIS_SYSTEM = appendBananaJsAiRules(USE_CASE_ANALYSIS_CORE)

// ─── Context-aware generation system prompts ──────────────────────────────────

/**
 * Build a context-aware entity extraction prompt that incorporates the use-case
 * analysis and user answers, so the LLM generates domain-appropriate fields
 * instead of defaulting to generic CRUD fields.
 */
export function buildContextAwareExtractionPrompt(
  description: string,
  useCaseSummary: string,
  operations: string[],
  answersSummary: string,
): string {
  return (
    `Module description: "${description}"\n\n` +
    `Use-case identified: ${useCaseSummary}\n\n` +
    `Operations this module must support: ${operations.join(', ')}\n\n` +
    `Developer clarifications:\n${answersSummary}\n\n` +
    `Based on the above, research the domain model and produce a COMPLETE, production-realistic field list ` +
    `for the PRIMARY entity/aggregate. Include fields that support the identified operations — ` +
    `for example, a webhook module for Stripe needs stripeEventId (for idempotency), eventType, status, rawPayload, processedAt, etc.\n\n` +
    `Respond with JSON only — no markdown, no explanation.`
  )
}

/**
 * Build a context-aware application service implementation prompt.
 * Replaces the generic CRUD-only service template with one appropriate
 * for the identified use case.
 */
export function buildContextAwareServicePrompt(
  useCase: string,
  operations: string[],
  answersSummary: string,
  ormGuide: string,
): string {
  const operationsList = operations.map((op) => `  - ${op}`).join('\n')

  let useCaseGuidance = ''

  switch (useCase) {
    case 'webhook':
      useCaseGuidance =
        '## Webhook Handler Guidelines\n' +
        '- Implement a `receiveWebhook(rawBody: Buffer | string, signature: string)` method first\n' +
        '- Verify the webhook signature before processing (use the signature header from the external provider)\n' +
        '- Implement idempotency: check if the event ID was already processed before doing work\n' +
        '- Persist the raw event to the database BEFORE processing it (at-least-once delivery)\n' +
        '- Route to specific handler methods per event type (e.g. `handlePaymentSucceeded`, `handleChargeFailed`)\n' +
        '- Return appropriate HTTP status (200 = processed, 400 = bad signature, 409 = duplicate)\n'
      break
    case 'event-processor':
      useCaseGuidance =
        '## Event Processor Guidelines\n' +
        '- Implement a `processEvent(event: DomainEvent)` dispatcher that routes to type-specific handlers\n' +
        '- Each handler is a separate method (e.g. `onOrderCreated`, `onOrderCancelled`)\n' +
        '- Implement idempotency tracking to prevent duplicate processing\n' +
        '- Update aggregate state in response to events — do not implement plain CRUD\n'
      break
    case 'integration':
      useCaseGuidance =
        '## Integration Service Guidelines\n' +
        '- Wrap an external API client; inject it via constructor\n' +
        '- Each method maps to one external API operation\n' +
        '- Apply circuit-breaker / retry patterns where appropriate\n' +
        '- Map external error responses to BananaJS ApiError subclasses\n'
      break
    case 'query-service':
      useCaseGuidance =
        '## Query Service Guidelines\n' +
        '- Read-only methods only — no create/update/delete\n' +
        '- Accept filter/sort/pagination parameters\n' +
        '- Always use `.lean()` for Mongoose or `SELECT` projections for TypeORM\n' +
        '- Return paginated result sets with `{ items, total }`\n'
      break
    case 'auth':
      useCaseGuidance =
        '## Auth Service Guidelines\n' +
        '- Implement token generation and validation operations\n' +
        '- Never log or return raw tokens or credentials\n' +
        '- Use short-lived access tokens and longer-lived refresh tokens\n' +
        '- Implement revocation support (token blacklist or short TTL)\n'
      break
    case 'saga':
      useCaseGuidance =
        '## Saga Guidelines\n' +
        '- Implement both forward steps and compensating transactions\n' +
        '- Track saga state machine transitions explicitly\n' +
        '- Each step is atomic — design for partial failure recovery\n'
      break
    default:
      useCaseGuidance = ''
  }

  return (
    `You are a BananaJS DDD expert implementing the application service layer.\n\n` +
    `Use-case type: ${useCase}\n` +
    `Required operations:\n${operationsList}\n\n` +
    `Developer clarifications:\n${answersSummary}\n\n` +
    (useCaseGuidance ? useCaseGuidance + '\n' : '') +
    `${ormGuide}\n\n` +
    `Implement the stub methods with realistic, production-quality logic.\n` +
    `Throw correct BananaJS error types: NotFoundError, ConflictError, BadRequestError.\n` +
    `Do not add imports not already in the file or not resolvable from @banana-universe/bananajs.\n` +
    `Keep class structure, decorators, and exports exactly as-is.\n` +
    `Return a SINGLE complete valid TypeScript source file. No markdown fences, no commentary.`
  )
}
