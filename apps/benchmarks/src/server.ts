import BananaApp from '@banana-universe/bananajs'
import { Controller, Get } from '@banana-universe/bananajs'
import { SuccessResponse } from '@banana-universe/bananajs'
import type { Request, Response } from 'express'
import { createServer as createHttpServer } from 'http'

@Controller('/benchmark')
class BenchmarkController {
  @Get('/basic')
  async basic(_req: Request, res: Response): Promise<void> {
    new SuccessResponse(200, 'OK', { ok: true }).send(res)
  }

  @Get('/auth')
  async auth(_req: Request, res: Response): Promise<void> {
    new SuccessResponse(200, 'OK', { ok: true }).send(res)
  }

  @Get('/cached')
  async cached(_req: Request, res: Response): Promise<void> {
    new SuccessResponse(200, 'OK', { data: 'cached', timestamp: Date.now() }).send(res)
  }
}

export async function createServer(): Promise<{ server: ReturnType<typeof createHttpServer>; baseUrl: string }> {
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
