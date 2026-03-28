import { randomUUID } from 'node:crypto'
import type { DataSource } from 'typeorm'
import { inject, injectable } from 'tsyringe'
import { TenantNoteOrmEntity } from './note.orm-entity.js'

@injectable()
export class NoteAppService {
  constructor(@inject('dataSource') private readonly dataSource: DataSource) {}

  async create(tenantId: string, title: string): Promise<{ id: string; title: string }> {
    const repo = this.dataSource.getRepository(TenantNoteOrmEntity)
    const row = repo.create({
      id: randomUUID(),
      tenantId,
      title,
    })
    const saved = await repo.save(row)
    return { id: saved.id, title: saved.title }
  }

  async listForTenant(tenantId: string): Promise<Array<{ id: string; title: string }>> {
    const repo = this.dataSource.getRepository(TenantNoteOrmEntity)
    const rows = await repo.find({ where: { tenantId } })
    return rows.map((r) => ({ id: r.id, title: r.title }))
  }

  async deleteIfOwned(tenantId: string, id: string): Promise<boolean> {
    const repo = this.dataSource.getRepository(TenantNoteOrmEntity)
    const row = await repo.findOne({ where: { id, tenantId } })
    if (!row) return false
    await repo.remove(row)
    return true
  }
}
