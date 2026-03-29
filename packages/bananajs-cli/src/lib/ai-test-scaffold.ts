import * as fs from 'fs/promises'
import * as path from 'path'
import chalk from 'chalk'

const SKELETON = `import 'reflect-metadata'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
// TODO: import your bootstrap factory, e.g. import { createApp } from '../bootstrap.js'

test('smoke: BananaTestApp-style HTTP check', async () => {
  // const banana = await createApp()
  // const app = banana.getInstance()
  // const res = await request(app).get('/your-module/healthz').expect(200)
  // assert.equal(res.body.data?.status, 'up')
  assert.equal(true, true)
})
`

export interface AiTestScaffoldOptions {
  out?: string
  cwd?: string
}

/** Writes a minimal supertest + node:test skeleton aligned with BananaTestApp recipes. */
export async function runAiTestScaffold(opts: AiTestScaffoldOptions): Promise<void> {
  const cwd = opts.cwd ?? process.cwd()
  const rel = opts.out ?? 'src/__tests__/ai-scaffold.test.ts'
  const abs = path.join(cwd, rel)
  await fs.mkdir(path.dirname(abs), { recursive: true })
  await fs.writeFile(abs, SKELETON, 'utf-8')
  console.log(chalk.green(`Wrote test skeleton: ${rel}`))
  console.log(chalk.cyan('Next: wire createApp / BananaTestApp and replace the placeholder assertion.'))
}
