import type { Request, Response } from 'express'
import {
  Auth,
  BaseController,
  Body,
  Controller,
  Get,
  NotFoundError,
  Params,
  Post,
  Public,
  Query,
  PaginatedResponse,
} from '@banana-universe/bananajs'
import { CatalogAppService } from './application/catalog.app-service.js'
import { CatalogItemIdParamsSchema, CreateCatalogItemSchema } from './catalog.dto.js'
import { CatalogListQuerySchema, type CatalogListQuery } from './catalog-list-query.dto.js'

@Controller('catalog')
@Auth()
export class CatalogController extends BaseController {
  constructor(private readonly catalogAppService: CatalogAppService) {
    super()
  }

  @Get('healthz')
  @Public()
  async health(_req: Request, res: Response) {
    return this.ok(res, 'ok', { status: 'up' })
  }

  @Post('items')
  @Body(CreateCatalogItemSchema)
  async create(req: Request, res: Response) {
    const dto = req.body as { name: string; sku: string }
    const item = await this.catalogAppService.create(dto.name, dto.sku)
    return this.ok(res, 'created', {
      id: item.id,
      name: item.name,
      sku: item.sku,
    })
  }

  @Get('items')
  @Query(CatalogListQuerySchema)
  async list(req: Request, res: Response) {
    const q = req.query as unknown as CatalogListQuery
    const page = q.page ?? 1
    const limit = q.limit ?? 20
    const { items, total } = await this.catalogAppService.listPaged(page, limit)
    const totalPages = Math.ceil(total / limit) || 1
    return new PaginatedResponse(
      'ok',
      items.map((i) => ({ id: i.id, name: i.name, sku: i.sku })),
      { page, limit, total, totalPages },
    ).send(res)
  }

  @Get('items/:id')
  @Params(CatalogItemIdParamsSchema)
  async getById(req: Request, res: Response) {
    const { id } = req.params as { id: string }
    const item = await this.catalogAppService.findById(id)
    if (!item) {
      throw new NotFoundError('Catalog item not found')
    }
    return this.ok(res, 'ok', {
      id: item.id,
      name: item.name,
      sku: item.sku,
    })
  }
}
