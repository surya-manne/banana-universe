import { createModule } from '@banana-universe/bananajs'
import { CatalogController } from './Catalog.controller.js'
import { CatalogAppService } from './Catalog.service.js'
import { CatalogItemTypeOrmRepository, CatalogItemRepositoryToken } from './CatalogItem.repository.js'

export const catalogModule = createModule({
  id: 'catalog',
  controller: CatalogController,
  providers: [
    { token: CatalogItemRepositoryToken, useClass: CatalogItemTypeOrmRepository },
    CatalogAppService,
  ],
})
