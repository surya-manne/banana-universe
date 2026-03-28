import 'dotenv/config'
import 'reflect-metadata'
import { createChatApp } from './bootstrap.js'

const port = Number(process.env.PORT ?? 3000)

const { banana, wsPlugin } = await createChatApp()
const server = banana.getInstance().listen(port, () => {
  console.log(`example-websocket-chat HTTP on ${port}, WS upgrade path /ws`)
})
wsPlugin.attachToServer(server)
