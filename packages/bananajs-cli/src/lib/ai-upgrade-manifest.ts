/**
 * Migration manifest seeded from docs/MIGRATION.md.
 * Each entry describes a known deprecated pattern, the semver range where it was removed,
 * and a static regex for detection + a safe mechanical replacement (when available).
 *
 * Source of truth: docs/MIGRATION.md — do not duplicate change history here;
 * keep only the machine-actionable detection/transform data.
 */

export interface UpgradePattern {
  /** Human-readable ID for deduplication and reporting. */
  id: string
  /** Semver range where this pattern was deprecated / removed (e.g. ">=0.5.0"). */
  sinceVersion: string
  /** Short description of the deprecated pattern. */
  description: string
  /** Regex to detect the deprecated usage in TypeScript source. */
  detect: RegExp
  /**
   * If a safe mechanical replacement exists, returns the transformed source.
   * `null` means LLM pass required — emit as a finding without auto-applying.
   */
  safeFix: ((src: string) => string) | null
  /** Docs reference for the full migration guide. */
  docsRef: string
}

export const UPGRADE_MANIFEST: UpgradePattern[] = [
  // ── v0.5.0 — class-validator / class-transformer removed ────────────────────
  {
    id: 'class-validator-import',
    sinceVersion: '>=0.5.0',
    description: 'class-validator is no longer used in BananaJS — switch to Zod @Body schemas',
    detect: /from\s+['"]class-validator['"]/g,
    safeFix: null,
    docsRef: 'docs/MIGRATION.md#step-3-validation-migration',
  },
  {
    id: 'class-transformer-import',
    sinceVersion: '>=0.5.0',
    description: 'class-transformer is no longer used in BananaJS — switch to Zod @Body schemas',
    detect: /from\s+['"]class-transformer['"]/g,
    safeFix: null,
    docsRef: 'docs/MIGRATION.md#step-3-validation-migration',
  },
  {
    id: 'is-valid-dto-class',
    sinceVersion: '>=0.5.0',
    description: 'IsString/IsEmail/IsNotEmpty decorators from class-validator not needed when using Zod',
    detect: /@(?:IsString|IsEmail|IsNotEmpty|IsNumber|IsOptional|IsArray|IsBoolean|IsEnum|IsDate|IsInt|IsPositive|IsUUID|Length|Min|Max|MinLength|MaxLength)\s*\(/g,
    safeFix: null,
    docsRef: 'docs/MIGRATION.md#step-3-validation-migration',
  },

  // ── v0.5.0 — leading slash in @Controller / @Get etc. ───────────────────────
  {
    id: 'controller-leading-slash',
    sinceVersion: '>=0.5.0',
    description: '@Controller segment must not have a leading slash (e.g. "users" not "/users")',
    detect: /@Controller\s*\(\s*['"`]\/[^'"`]*['"`]/g,
    safeFix: (src) =>
      src.replace(
        /@Controller\s*\(\s*(['"`])\/([^'"`]*)(['"`])/g,
        (_, q1, seg, q2) => `@Controller(${q1}${seg}${q2}`,
      ),
    docsRef: 'docs/MIGRATION.md#step-2-controller-migration',
  },
  {
    id: 'route-decorator-leading-slash',
    sinceVersion: '>=0.5.0',
    description: '@Get/@Post/@Put/@Patch/@Delete segment must not have a leading slash',
    detect: /@(?:Get|Post|Put|Patch|Delete)\s*\(\s*['"`]\/[^'"`]*['"`]/g,
    safeFix: (src) =>
      src.replace(
        /@(Get|Post|Put|Patch|Delete)\s*\(\s*(['"`])\/([^'"`]*)(['"`])/g,
        (_, method, q1, seg, q2) => `@${method}(${q1}${seg}${q2}`,
      ),
    docsRef: 'docs/MIGRATION.md#step-2-controller-migration',
  },

  // ── v0.5.0 — positional array bootstrap (old API) ──────────────────────────
  {
    id: 'banana-app-positional-array',
    sinceVersion: '>=0.5.0',
    description:
      'BananaApp() no longer accepts a positional array — use new BananaApp({ controllers: defineBananaControllers(...) })',
    detect: /new\s+BananaApp\s*\(\s*\[/g,
    safeFix: null,
    docsRef: 'docs/MIGRATION.md#bootstrap-api-breaking',
  },

  // ── v0.6.0 — Awilix removed, use tsyringe ──────────────────────────────────
  {
    id: 'awilix-import',
    sinceVersion: '>=0.6.0',
    description:
      'Awilix is no longer supported — migrate DI to tsyringe (injectable, inject, providers)',
    detect: /from\s+['"]awilix['"]/g,
    safeFix: null,
    docsRef: 'docs/MIGRATION.md#awilix--tsyringe-bananajs--06',
  },
  {
    id: 'create-banana-container',
    sinceVersion: '>=0.6.0',
    description:
      'createBananaContainer() was removed — use createBananaProviderContainer() + registerBananaProviders()',
    detect: /createBananaContainer\s*\(/g,
    safeFix: null,
    docsRef: 'docs/MIGRATION.md#awilix--tsyringe-bananajs--06',
  },
  {
    id: 'banana-app-options-services',
    sinceVersion: '>=0.6.0',
    description:
      'defineBananaAppOptions({ services: ... }) was removed — use providers: [{ token, useClass }]',
    detect: /defineBananaAppOptions\s*\(\s*\{[^}]*\bservices\s*:/g,
    safeFix: null,
    docsRef: 'docs/MIGRATION.md#awilix--tsyringe-bananajs--06',
  },

  // ── v0.5.0 — plugin-zod @ZodBody / @ZodQuery / @ZodParams shim ─────────────
  {
    id: 'plugin-zod-decorators',
    sinceVersion: '>=0.5.0',
    description:
      '@ZodBody/@ZodQuery/@ZodParams from plugin-zod are shims — import @Body/@Query/@Params directly from @banana-universe/bananajs',
    detect: /@(?:ZodBody|ZodQuery|ZodParams)\s*\(/g,
    safeFix: (src) =>
      src
        .replace(/@ZodBody\s*\(/g, '@Body(')
        .replace(/@ZodQuery\s*\(/g, '@Query(')
        .replace(/@ZodParams\s*\(/g, '@Params('),
    docsRef: 'docs/MIGRATION.md',
  },

  // ── v0.5.0 — direct res.json() in controllers should use BaseController helpers ─
  {
    id: 'direct-res-json',
    sinceVersion: '>=0.5.0',
    description:
      'Direct res.json() in controller methods — extend BaseController and use this.ok() / this.error()',
    detect: /\bres\.json\s*\(/g,
    safeFix: null,
    docsRef: 'docs/MIGRATION.md#step-5-response-standardization',
  },

  // ── v0.3.0+ — AppContext.container.resolve() in controllers ────────────────
  {
    id: 'container-resolve-in-controller',
    sinceVersion: '>=0.3.0',
    description:
      'AppContext.container.resolve() inside a controller method — inject via constructor instead',
    detect: /AppContext\.container\.resolve\s*\(/g,
    safeFix: null,
    docsRef: 'docs/MIGRATION.md',
  },
]

/** All pattern IDs that have a safe mechanical fix (applicable with --apply). */
export const SAFE_APPLY_IDS = new Set(
  UPGRADE_MANIFEST.filter((p) => p.safeFix !== null).map((p) => p.id),
)
