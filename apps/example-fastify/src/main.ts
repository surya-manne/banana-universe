import 'reflect-metadata'
import Fastify from 'fastify'
import fastifyExpress from '@fastify/express'
import { createFastifyBananaApp } from './bootstrap.js'

const port = Number(process.env.PORT ?? 3000)
const fastify = Fastify()
await fastify.register(fastifyExpress)

const banana = await createFastifyBananaApp()
await fastify.use(banana.getInstance())

await fastify.listen({ port, host: '0.0.0.0' })
console.log(`example-fastify (Fastify + @fastify/express + BananaJS) listening on ${port}`)
