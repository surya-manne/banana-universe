import type { AiReviewFinding } from './ai-review-schema.js'

/** Maps structured findings to SARIF 2.1.0 (single adapter; core review stays JSON-stable). */
export function findingsToSarif(args: {
  findings: AiReviewFinding[]
  toolName: string
  runId: string
}): Record<string, unknown> {
  const { findings, toolName, runId } = args
  const rules = findings.map((f, i) => ({
    id: `bananajs/${f.severity}/${i}`,
    shortDescription: { text: f.message },
  }))
  const results = findings.map((f, i) => ({
    ruleId: `bananajs/${f.severity}/${i}`,
    level: f.severity === 'error' ? 'error' : f.severity === 'warn' ? 'warning' : 'note',
    message: { text: f.message },
    locations: f.file
      ? [
          {
            physicalLocation: {
              artifactLocation: { uri: f.file },
              ...(f.line !== undefined ? { region: { startLine: f.line } } : {}),
            },
          },
        ]
      : [],
  }))
  return {
    $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: {
            name: toolName,
            version: '1.0.0',
            rules,
          },
        },
        results,
        automationDetails: { id: runId },
      },
    ],
  }
}
