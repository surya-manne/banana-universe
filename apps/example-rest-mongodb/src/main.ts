import 'reflect-metadata'
import { createMongoApp } from './bootstrap.js'

const port = Number(process.env.PORT ?? 3000)
const banana = await createMongoApp()
banana.getInstance().listen(port, () => {
  console.log(`example-rest-mongodb listening on ${port}`)
})
