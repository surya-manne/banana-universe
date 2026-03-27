import { readFile } from 'fs/promises'

interface BenchmarkResult {
  scenario: string
  p99: number
  p95: number
  mean: number
  requests: number
}

const REGRESSION_THRESHOLD = 0.10 // 10%

async function main(): Promise<void> {
  let results: BenchmarkResult[]
  let baseline: BenchmarkResult[]

  try {
    results = JSON.parse(await readFile('results.json', 'utf-8')) as BenchmarkResult[]
  } catch {
    console.error('results.json not found. Run benchmark first.')
    process.exit(1)
    return
  }

  try {
    baseline = JSON.parse(await readFile('baseline.json', 'utf-8')) as BenchmarkResult[]
  } catch {
    console.error('baseline.json not found. Using current results as baseline.')
    process.exit(0)
    return
  }

  console.log('\nBenchmark Report')
  console.log('='.repeat(70))
  console.log(`${'Scenario'.padEnd(20)} ${'p99 (ms)'.padEnd(12)} ${'Baseline p99'.padEnd(14)} Status`)
  console.log('-'.repeat(70))

  let regressions = 0
  for (const result of results) {
    const base = baseline.find((b) => b.scenario === result.scenario)
    if (!base) {
      console.log(`${result.scenario.padEnd(20)} ${String(result.p99).padEnd(12)} ${'N/A'.padEnd(14)} NEW`)
      continue
    }
    const regression = (result.p99 - base.p99) / base.p99
    const regressed = regression > REGRESSION_THRESHOLD
    if (regressed) regressions++
    const status = regressed ? `REGRESSED (+${(regression * 100).toFixed(1)}%)` : 'OK'
    console.log(`${result.scenario.padEnd(20)} ${String(result.p99).padEnd(12)} ${String(base.p99).padEnd(14)} ${status}`)
  }

  console.log('='.repeat(70))

  if (regressions > 0) {
    console.error(`\n${regressions} scenario(s) regressed by more than ${REGRESSION_THRESHOLD * 100}%`)
    process.exit(1)
  } else {
    console.log('\nAll scenarios within acceptable bounds.')
    process.exit(0)
  }
}

main().catch((err: unknown) => {
  console.error('Report failed:', err)
  process.exit(1)
})
