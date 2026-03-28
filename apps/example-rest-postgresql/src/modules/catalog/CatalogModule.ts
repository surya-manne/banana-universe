import { createModule } from '@banana-universe/bananajs'
import { CatalogController } from './CatalogController.js'
import { CatalogAppService } from './application/CatalogAppService.js'
import { CatalogItemTypeOrmRepository } from './infrastructure/CatalogItemTypeOrmRepository.js'
import { CatalogItemMapperToken } from './domain/CatalogItemMapper.js'

export const catalogModule = createModule({
  id: 'catalog',
  controller: CatalogController,
  providers: [
    { token: CatalogItemMapperToken, useClass: CatalogItemTypeOrmRepository },
    CatalogAppService,
  ],
})
