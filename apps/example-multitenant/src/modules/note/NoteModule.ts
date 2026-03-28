import { createModule } from '@banana-universe/bananajs'
import { NoteController } from './NoteController.js'
import { NoteAppService } from './NoteAppService.js'

export const noteModule = createModule({
  id: 'notes',
  controller: NoteController,
  providers: [NoteAppService],
})
