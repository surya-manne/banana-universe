import { z } from 'zod'

// ─── Use-case taxonomy ────────────────────────────────────────────────────────

/**
 * Broad categories the LLM assigns to an incoming module description.
 *
 * - `crud`             — standard list / get / create / update / delete
 * - `webhook`          — inbound HTTP webhook from an external provider (Stripe, GitHub, Twilio, …)
 * - `event-processor`  — consumes domain or integration events (message queue, pub/sub, saga listener)
 * - `integration`      — wraps an external API as an internal service (HTTP client, SDK adapter)
 * - `query-service`    — read-only query / report / aggregation endpoint
 * - `saga`             — multi-step orchestrated business process with compensating transactions
 * - `auth`             — authentication / authorisation (JWT, OAuth, RBAC, API-key management)
 * - `hybrid`           — two or more of the above combined
 * - `other`            — does not fit the above categories clearly
 */
export type UseCaseType =
  | 'crud'
  | 'webhook'
  | 'event-processor'
  | 'integration'
  | 'query-service'
  | 'saga'
  | 'auth'
  | 'hybrid'
  | 'other'

// ─── Schemas ─────────────────────────────────────────────────────────────────

export const UseCaseQuestionSchema = z.object({
  /** Machine-stable identifier for this question (used when passing answers back). */
  id: z.string().min(1),
  /** Human-readable question text shown to the developer. */
  question: z.string().min(1),
  /** Whether an answer is needed before generation can proceed. */
  required: z.boolean(),
  /** Safe fallback value; generation proceeds with this if the user skips the question. */
  default: z.string().optional(),
})

export type UseCaseQuestion = z.infer<typeof UseCaseQuestionSchema>

export const UseCaseAnalysisSchema = z.object({
  /** Classified use-case type. */
  useCase: z.enum([
    'crud',
    'webhook',
    'event-processor',
    'integration',
    'query-service',
    'saga',
    'auth',
    'hybrid',
    'other',
  ]),
  /** Inferred primary entity / aggregate name (PascalCase). */
  entityName: z.string().min(1),
  /**
   * Whether HITL is required before generation is safe.
   * `true` when the use case is non-trivial and answers materially change the output.
   */
  hitlRequired: z.boolean(),
  /**
   * Short human-readable explanation of what was identified (1–2 sentences).
   * Shown to the developer alongside the questions.
   */
  summary: z.string().min(1),
  /**
   * Operations this module is expected to expose or handle.
   * For webhooks: e.g. ["receiveWebhook", "verifySignature", "handlePaymentSucceeded"]
   * For CRUD: e.g. ["list", "getById", "create", "update", "delete"]
   */
  operations: z.array(z.string()).min(1),
  /**
   * Clarifying questions to ask the developer before code generation.
   * Empty for simple CRUD modules.
   */
  questions: z.array(UseCaseQuestionSchema),
})

export type UseCaseAnalysis = z.infer<typeof UseCaseAnalysisSchema>

// ─── User answers passed back into generation ─────────────────────────────────

export const UseCaseContextSchema = z.object({
  /** The analysis result returned by the plan step. */
  analysis: UseCaseAnalysisSchema,
  /**
   * Map of question IDs → developer answers.
   * Missing IDs fall back to the question's `default` value.
   */
  answers: z.record(z.string(), z.string()),
})

export type UseCaseContext = z.infer<typeof UseCaseContextSchema>

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns a ready-to-display list of questions with their defaults shown inline. */
export function formatQuestionsForDisplay(questions: UseCaseQuestion[]): string {
  return questions
    .map((q, i) => {
      const req = q.required ? ' (required)' : ''
      const def = q.default ? ` [default: ${q.default}]` : ''
      return `${i + 1}. ${q.question}${req}${def}`
    })
    .join('\n')
}

/** Resolve an answer from the context map, falling back to the question's default. */
export function resolveAnswer(
  answers: Record<string, string>,
  question: UseCaseQuestion,
): string | undefined {
  return answers[question.id] ?? question.default
}

/**
 * Build a human-readable answers summary to embed in the code-generation prompt.
 * This gives the LLM the full developer-intent context it needs.
 */
export function buildAnswersSummary(
  questions: UseCaseQuestion[],
  answers: Record<string, string>,
): string {
  const lines = questions.map((q) => {
    const answer = resolveAnswer(answers, q)
    return `${q.question}\n→ ${answer ?? '(not provided)'}`
  })
  return lines.join('\n\n')
}

export function tryParseUseCaseAnalysis(text: string): UseCaseAnalysis {
  const trimmed = text.trim()
  const fence = trimmed.match(/```(?:\w+)?\n?([\s\S]*?)```/)
  const body = fence ? fence[1].trim() : trimmed
  let parsed: unknown
  try {
    parsed = JSON.parse(body)
  } catch {
    const start = body.indexOf('{')
    const end = body.lastIndexOf('}')
    if (start >= 0 && end > start) {
      parsed = JSON.parse(body.slice(start, end + 1))
    } else {
      throw new Error('LLM returned unparseable use-case JSON.')
    }
  }
  return UseCaseAnalysisSchema.parse(parsed)
}
