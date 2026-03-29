import { appendBananaJsAiRules } from '../bananajs-ai-rules.js'

const LEGACY_FLAT_GENERATE_CORE =
  'You are a BananaJS expert code generator. BananaJS uses decorators for routing.\n' +
  'Generate TypeScript code for BananaJS controller, DTO, and service.\n' +
  'Return ONLY three code blocks labeled with triple backticks and "typescript".'

/** Legacy flat scaffold: controller + DTO + service (three TypeScript code blocks). */
export const LEGACY_FLAT_GENERATE_SYSTEM_PROMPT = appendBananaJsAiRules(LEGACY_FLAT_GENERATE_CORE)
