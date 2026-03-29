import { createModule } from '@banana-universe/bananajs'
import { TagController } from './Tag.controller.js'

export const tagsModule = createModule({
  id: 'tags',
  controller: TagController,
  providers: [],
})
