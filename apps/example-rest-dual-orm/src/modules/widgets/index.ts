import { createModule } from '@banana-universe/bananajs'
import { WidgetController } from './Widget.controller.js'
import { WidgetAppService } from './application/Widget.service.js'
import { WidgetTypeOrmRepository } from './infrastructure/Widget.typeorm-repository.js'
import { WidgetMapperToken } from './domain/Widget.mapper.js'

export const widgetsModule = createModule({
  id: 'widgets',
  controller: WidgetController,
  providers: [
    { token: WidgetMapperToken, useClass: WidgetTypeOrmRepository },
    WidgetAppService,
  ],
})
