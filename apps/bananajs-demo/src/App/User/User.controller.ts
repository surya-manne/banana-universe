import { Request, Response } from 'express'

import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Params,
  Query,
  SuccessResponse,
} from '@banana-universe/bananajs'
import { CreateUserDto, GetUserByIdDto, GetUserListDto } from './User.dto'

@Controller('/users')
export class UserController {
  @Post('/')
  @Body(CreateUserDto)
  async crete(req: Request, res: Response) {
    return new SuccessResponse('User created successfully!', req.body).send(res)
  }

  @Get('/list')
  @Query(GetUserListDto)
  async list(req: Request, res: Response) {
    return new SuccessResponse('sucess', req.query).send(res)
  }

  @Get('/:id')
  @Params(GetUserByIdDto)
  async get(req: Request, res: Response) {
    return new SuccessResponse('sucess', req.params).send(res)
  }

  @Put('/')
  async update(req: Request, res: Response) {
    return new SuccessResponse('User updated successfully!', {}).send(res)
  }

  @Delete('/')
  async delete(req: Request, res: Response) {
    return new SuccessResponse('User deleted successfully!', {}).send(res)
  }
}
