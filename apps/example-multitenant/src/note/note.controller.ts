import 'reflect-metadata'
import type { Request, Response } from 'express'
import {
  Auth,
  BaseController,
  Body,
  Can,
  Controller,
  Delete,
  Get,
  NotFoundError,
  Params,
  Post,
  Public,
  Tenant,
} from '@banana-universe/bananajs'
import { getTenantId } from '@banana-universe/bananajs'
import { NoteAppService } from './note.app-service.js'
import { CreateNoteSchema, NoteIdParamsSchema } from './note.dto.js'

@Controller('notes')
@Tenant()
@Auth()
export class NoteController extends BaseController {
  constructor(private readonly noteAppService: NoteAppService) {
    super()
  }

  @Get('healthz')
  @Public()
  health(_req: Request, res: Response) {
    return this.ok(res, 'ok', { status: 'up' })
  }

  @Post('')
  @Body(CreateNoteSchema)
  @Can('create', 'note')
  async create(req: Request, res: Response) {
    const tenantId = getTenantId() ?? 'unknown'
    const dto = req.body as { title: string }
    const row = await this.noteAppService.create(tenantId, dto.title)
    return this.ok(res, 'created', { id: row.id, title: row.title })
  }

  @Get('')
  async list(_req: Request, res: Response) {
    const tenantId = getTenantId() ?? 'unknown'
    const rows = await this.noteAppService.listForTenant(tenantId)
    return this.ok(res, 'ok', rows)
  }

  @Delete(':id')
  @Params(NoteIdParamsSchema)
  @Can('delete', 'note')
  async remove(req: Request, res: Response) {
    const tenantId = getTenantId() ?? 'unknown'
    const { id } = req.params as { id: string }
    const ok = await this.noteAppService.deleteIfOwned(tenantId, id)
    if (!ok) throw new NotFoundError('Note not found')
    return this.ok(res, 'deleted', { id })
  }
}
