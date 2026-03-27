import BananaApp from '@banana-universe/bananajs'
import { Routes } from './routes'

const bananaApp = new BananaApp(Routes).getInstance()

bananaApp.listen(3000, () => {
  console.log('Server started on port 3000')
})
