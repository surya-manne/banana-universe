import { Request, Response } from 'express'

import {
  BaseController,
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Params,
  Query,
} from '@banana-universe/bananajs'
import { CreateUserSchema, GetUserByIdSchema, GetUserListSchema } from './User.dto'

@Controller('users')
export class UserController extends BaseController {
  @Post('')
  @Body(CreateUserSchema)
  async crete(req: Request, res: Response) {
    return this.ok(res, 'User created successfully!', req.body)
  }

  @Get('list')
  @Query(GetUserListSchema)
  async list(req: Request, res: Response) {
    return this.ok(res, 'sucess', req.query)
  }

  @Get(':id')
  @Params(GetUserByIdSchema)
  async get(req: Request, res: Response) {
    return this.ok(res, 'sucess', req.params)
  }

  @Put('')
  async update(req: Request, res: Response) {
    return this.ok(res, 'User updated successfully!', {})
  }

  @Delete('')
  async delete(req: Request, res: Response) {
    return this.ok(res, 'User deleted successfully!', {})
  }
}
