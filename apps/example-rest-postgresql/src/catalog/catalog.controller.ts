import type { Request, Response } from 'express'
import {
  Auth,
  Body,
  Controller,
  Get,
  NotFoundError,
  Params,
  Post,
  Public,
  Query,
  SuccessResponse,
  PaginatedResponse,
} from '@banana-universe/bananajs'
import { CatalogAppService } from './application/catalog.app-service.js'
import { CreateCatalogItemDto, CatalogItemIdParams } from './catalog.dto.js'
import { CatalogListQueryDto } from './catalog-list-query.dto.js'

@Controller('/catalog')
@Auth()
export class CatalogController {
  constructor(private readonly catalogAppService: CatalogAppService) {}

  @Get('/healthz')
  @Public()
  async health(_req: Request, res: Response) {
    return new SuccessResponse('ok', { status: 'up' }).send(res)
  }

  @Post('/items')
  @Body(CreateCatalogItemDto)
  async create(req: Request, res: Response) {
    const dto = req.body as CreateCatalogItemDto
    const item = await this.catalogAppService.create(dto.name, dto.sku)
    return new SuccessResponse('created', {
      id: item.id,
      name: item.name,
      sku: item.sku,
    }).send(res)
  }

  @Get('/items')
  @Query(CatalogListQueryDto)
  async list(req: Request, res: Response) {
    const q = req.query as unknown as CatalogListQueryDto
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

  @Get('/items/:id')
  @Params(CatalogItemIdParams)
  async getById(req: Request, res: Response) {
    const { id } = req.params as unknown as CatalogItemIdParams
    const item = await this.catalogAppService.findById(id)
    if (!item) {
      throw new NotFoundError('Catalog item not found')
    }
    return new SuccessResponse('ok', {
      id: item.id,
      name: item.name,
      sku: item.sku,
    }).send(res)
  }
}
