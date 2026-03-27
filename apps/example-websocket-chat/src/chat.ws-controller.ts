import 'reflect-metadata'
import {
  WsController,
  OnConnect,
  OnMessage,
  WsBody,
  type Constructor,
} from '@banana-universe/plugin-websocket'
import { JoinRoomDto, SendChatMessageDto } from './chat.dto.js'

export type WsLike = {
  send(data: string): void
}

// roomId -> list of messages (demo; in-memory)
const rooms = new Map<string, string[]>()

@WsController()
export class ChatWsController {
  private currentRoom = 'lobby'

  @OnConnect()
  onConnect(socket: WsLike): void {
    socket.send(JSON.stringify({ event: 'welcome', data: { room: this.currentRoom } }))
  }

  @OnMessage('join')
  onJoin(socket: WsLike, @WsBody(JoinRoomDto) body: JoinRoomDto): void {
    this.currentRoom = body.roomId
    if (!rooms.has(body.roomId)) rooms.set(body.roomId, [])
    socket.send(JSON.stringify({ event: 'joined', data: { roomId: body.roomId } }))
  }

  @OnMessage('message')
  onMessage(socket: WsLike, @WsBody(SendChatMessageDto) body: SendChatMessageDto): void {
    const list = rooms.get(this.currentRoom) ?? []
    list.push(body.text)
    rooms.set(this.currentRoom, list)
    socket.send(
      JSON.stringify({
        event: 'broadcast',
        data: { room: this.currentRoom, text: body.text },
      }),
    )
  }
}

export const wsControllers = [ChatWsController as unknown as Constructor]
