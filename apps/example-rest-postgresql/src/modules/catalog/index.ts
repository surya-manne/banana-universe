import { createModule } from '@banana-universe/bananajs'
import { CatalogController } from './Catalog.controller.js'
import { CatalogAppService } from './application/Catalog.service.js'
import { CatalogItemTypeOrmRepository } from './infrastructure/CatalogItem.typeorm-repository.js'
import { CatalogItemMapperToken } from './domain/CatalogItem.mapper.js'

export const catalogModule = createModule({
  id: 'catalog',
  controller: CatalogController,
  providers: [
    { token: CatalogItemMapperToken, useClass: CatalogItemTypeOrmRepository },
    CatalogAppService,
  ],
})
