import autocannon from 'autocannon'
import type { BenchmarkResult } from '../benchmark.js'

export async function runBasicRouteBenchmark(baseUrl: string): Promise<BenchmarkResult> {
  return new Promise((resolve, reject) => {
    autocannon({ url: `${baseUrl}/benchmark/basic`, duration: 5, connections: 10 }, (err, result) => {
      if (err) { reject(err); return }
      resolve({ scenario: 'basic-route', p99: result.latency.p99, p95: result.latency.p95, mean: result.latency.mean, requests: result.requests.total })
    })
  })
}
