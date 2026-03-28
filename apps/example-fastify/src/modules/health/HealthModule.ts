import { createModule } from '@banana-universe/bananajs'
import { HealthController } from './HealthController.js'

export const healthModule = createModule({
  id: 'health',
  controller: HealthController,
  providers: [],
})
