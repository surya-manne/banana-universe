import BananaApp, { defineBananaControllers } from '@banana-universe/bananajs'
import { Routes } from './routes'

const bananaApp = new BananaApp({
  controllers: defineBananaControllers(...Routes),
}).getInstance()

bananaApp.listen(3000, () => {
  console.log('Server started on port 3000')
})
