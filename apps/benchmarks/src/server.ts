import BananaApp from '@banana-universe/bananajs'
import { BaseController, Controller, Get } from '@banana-universe/bananajs'
import type { Request, Response } from 'express'
import { createServer as createHttpServer } from 'http'

@Controller('benchmark')
class BenchmarkController extends BaseController {
  @Get('basic')
  async basic(_req: Request, res: Response): Promise<void> {
    this.ok(res, 'OK', { ok: true })
  }

  @Get('auth')
  async auth(_req: Request, res: Response): Promise<void> {
    this.ok(res, 'OK', { ok: true })
  }

  @Get('cached')
  async cached(_req: Request, res: Response): Promise<void> {
    this.ok(res, 'OK', { data: 'cached', timestamp: Date.now() })
  }
}

export async function createServer(): Promise<{
  server: ReturnType<typeof createHttpServer>
  baseUrl: string
}> {
  const app = await BananaApp.create([BenchmarkController], {
    health: { enabled: true, path: '/health' },
    logger: false,
  })

  return new Promise((resolve) => {
    const server = createHttpServer(app.getInstance())
    server.listen(0, () => {
      const addr = server.address()
      const port = typeof addr === 'object' && addr ? addr.port : 3000
      resolve({ server, baseUrl: `http://localhost:${port}` })
    })
  })
}
