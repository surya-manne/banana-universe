import 'reflect-metadata'
import type { Request, Response } from 'express'
import {
  Auth,
  Body,
  Can,
  Controller,
  Delete,
  Get,
  NotFoundError,
  Params,
  Post,
  Public,
  SuccessResponse,
  Tenant,
} from '@banana-universe/bananajs'
import { getTenantId } from '@banana-universe/bananajs'
import { NoteAppService } from './note.app-service.js'
import { CreateNoteDto, NoteIdParams } from './note.dto.js'

@Controller('/notes')
@Tenant()
@Auth()
export class NoteController {
  constructor(private readonly noteAppService: NoteAppService) {}

  @Get('/healthz')
  @Public()
  health(_req: Request, res: Response) {
    return new SuccessResponse('ok', { status: 'up' }).send(res)
  }

  @Post('/')
  @Body(CreateNoteDto)
  @Can('create', 'note')
  async create(req: Request, res: Response) {
    const tenantId = getTenantId() ?? 'unknown'
    const dto = req.body as CreateNoteDto
    const row = await this.noteAppService.create(tenantId, dto.title)
    return new SuccessResponse('created', { id: row.id, title: row.title }).send(res)
  }

  @Get('/')
  async list(_req: Request, res: Response) {
    const tenantId = getTenantId() ?? 'unknown'
    const rows = await this.noteAppService.listForTenant(tenantId)
    return new SuccessResponse('ok', rows).send(res)
  }

  @Delete('/:id')
  @Params(NoteIdParams)
  @Can('delete', 'note')
  async remove(req: Request, res: Response) {
    const tenantId = getTenantId() ?? 'unknown'
    const { id } = req.params as unknown as NoteIdParams
    const ok = await this.noteAppService.deleteIfOwned(tenantId, id)
    if (!ok) throw new NotFoundError('Note not found')
    return new SuccessResponse('deleted', { id }).send(res)
  }
}
