import autocannon from 'autocannon'
import { createServer } from './server.js'

export interface BenchmarkResult {
  scenario: string
  p99: number
  p95: number
  mean: number
  requests: number
}

async function runBenchmark(scenario: string, url: string): Promise<BenchmarkResult> {
  return new Promise((resolve, reject) => {
    const instance = autocannon(
      {
        url,
        duration: 5,
        connections: 10,
        pipelining: 1,
        warmup: { connections: 2, duration: 1 },
      },
      (err, result) => {
        if (err) { reject(err); return }
        resolve({
          scenario,
          p99: result.latency.p99,
          p95: result.latency.p95,
          mean: result.latency.mean,
          requests: result.requests.total,
        })
      },
    )
    autocannon.track(instance, { renderProgressBar: false })
  })
}

async function main(): Promise<void> {
  const { server, baseUrl } = await createServer()
  console.log(`Running benchmarks against ${baseUrl}`)

  const results: BenchmarkResult[] = []
  const scenarios: Array<[string, string]> = [
    ['health', `${baseUrl}/health`],
    ['basic-route', `${baseUrl}/benchmark/basic`],
    ['auth-route', `${baseUrl}/benchmark/auth`],
    ['cached-route', `${baseUrl}/benchmark/cached`],
  ]

  for (const [name, url] of scenarios) {
    console.log(`Running scenario: ${name}`)
    const result = await runBenchmark(name, url)
    results.push(result)
    console.log(`  p99=${result.p99}ms p95=${result.p95}ms mean=${result.mean}ms requests=${result.requests}`)
  }

  const { writeFile } = await import('fs/promises')
  await writeFile('results.json', JSON.stringify(results, null, 2))
  console.log('Results saved to results.json')

  server.close()
}

main().catch((err: unknown) => {
  console.error('Benchmark failed:', err)
  process.exit(1)
})
