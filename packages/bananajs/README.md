# BananaJS

**BananaJS** is an opinionated Node.js framework built on top of Express, designed to simplify routing for server-side applications. Inspired by frameworks like NestJS, BananaJS focuses on reducing the complexity of routing by using decorators, providing a more readable and maintainable codebase. It also includes powerful data validation capabilities through class-validator, making it easy to validate incoming request data such as body, query parameters, and path parameters. Additionally, it features standardized API responses and centralized error handling.

The combination of simplified routing, validation, and standardized responses/errors enhances productivity, reduces boilerplate code, and improves the overall structure and readability of your application.

## Features

- **Easy Routing with Decorators**: Simplifies the way routes are defined using decorators like `@Controller`, `@Get`, `@Post`, `@Put`, and `@Delete`.
- **Validation with Decorators**: Use `@Body`, `@Params`, and `@Query` decorators in combination with class-validator to validate request data explicitly. This ensures that data adheres to predefined validation rules.
- **Improved Readability**: The use of decorators enhances code readability and reduces boilerplate.
- **TypeScript Support**: Fully designed to work with TypeScript.
- **Built on Express**: Leverages the power of Express but adds additional structure and usability.
- **Standardized API Responses**: Utilizes `SuccessResponse` to provide consistent and structured success responses.
- **Centralized Error Handling**: Implements `ApiError` and specific error classes (`BadRequestError`, `NotFoundError`, etc.) for consistent error responses.

## Prerequisites

- **Node.js**
- **TypeScript**

## Mandatory Dependencies

- **Express**
- **class-validator** (for request data validation)

## Installation

1.  **Install BananaJS** in your project:

    ```bash
    npm install @banana-universe/bananajs
    ```

2.  **Install Mandatory dependencies** in your project:

    ```bash
    npm install express class-validator
    ```

3.  **Install TypeScript and Required Types**:

    If you haven't already, install TypeScript and the necessary type definitions for Express:

    ```bash
    npm install typescript @types/node @types/express --save-dev
    ```

4.  **Configure TypeScript**:

    In your `tsconfig.json`, enable `experimentalDecorators`:

    ```json
    {
      "compilerOptions": {
        "experimentalDecorators": true,
        "target": "ES6",
        "module": "commonjs",
        "outDir": "./dist",
        "rootDir": "./src",
        "strict": true,
        "esModuleInterop": true
      },
      "include": ["src/**/*"],
      "exclude": ["node_modules"]
    }
    ```

## Usage

Example: [https://github.com/sprakas/banana-universe/tree/main/apps/bananajs-demo](https://github.com/sprakas/banana-universe/tree/main/apps/bananajs-demo)

### Setting Up the Application

1.  **Create the Controller File**:

    In the `src/App/User/User.controller.ts` (or any file you prefer), define your APIs using the decorators provided by BananaJS and utilize `SuccessResponse` for standardized responses.

    ```typescript
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
      async create(req: Request, res: Response) {
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
    ```

2.  **Create the DTO File**:

    Use `class-validator` to define and validate your DTOs for each request type (body, query, params).

    `src/App/User/User.dto.ts`

    ```typescript
    import { IsEmail, IsString, Length } from 'class-validator'

    export class CreateUserDto {
      @Length(3, 20)
      @IsString()
      name!: string

      @IsEmail()
      @Length(0, 50)
      email!: string

      @IsString()
      password!: string
    }

    export class GetUserByIdDto {
      @IsString()
      id!: string
    }

    export class GetUserListDto {
      @IsString()
      page!: string

      @IsString()
      limit!: string
    }
    ```

3.  **Create the Application Entry File**:

    In your `src/index.ts` (or main file), initialize the app by importing `BananaApp` and passing in the routes.

    ```typescript
    import BananaApp from '@banana-universe/bananajs'
    import { UserController } from './routes'

    const bananaApp = new BananaApp([UserController]).getInstance()

    bananaApp.listen(3000, () => {
      console.log('Server started on port 3000')
    })
    ```

4.  **API Response and Error Handling:**

    - **API Response (`ApiResponse`, `SuccessResponse`)**:

      - Provides a standardized way to structure success responses.
      - `ApiResponse` is an abstract class defining the structure: `statusCode`, `status` (HTTP status), and `message`.
      - `SuccessResponse<T>` extends `ApiResponse` and includes a `data: T` property for the response payload.
      - The `send(res: Response, headers?: { [key: string]: string })` method prepares and sends the response.

      ```typescript
      // Example of SuccessResponse usage:
      return new SuccessResponse('User created successfully!', userData).send(res)
      ```

    - **Centralized Error Handling (`ApiError`, `BadRequestError`, etc.)**:

      - Manages errors consistently across the application.
      - `ApiError` is an abstract class extending `Error` and includes an `ErrorType` and `message`.
      - Specific error classes (e.g., `BadRequestError`, `NotFoundError`) extend `ApiError` and define specific error types and messages.
      - The `ApiError.handle(err: ApiError, res: Response)` method maps error types to corresponding `ApiResponse` instances for standardized error responses.

      ```typescript
      // Example of throwing and handling an error:
      try {
        // ... some operation that might fail
        if (someCondition) {
          throw new BadRequestError('Invalid input')
        }
      } catch (err) {
        if (err instanceof ApiError) {
          return ApiError.handle(err, res)
        } else {
          // Handle non-ApiError instances (e.g., generic errors)
          return ApiError.handle(new InternalError('Unexpected error'), res)
        }
      }
      ```

      - Error Types:
        - `BadRequestError`
        - `UnauthorizedError`
        - `PaymentRequiredError`
        - `ForbiddenError`
        - `NotFoundError`
        - `ConflictError`
        - `TooManyRequestsError`
        - `InternalError`
        - `BadGatewayError`
        - `ServiceUnavailableError`
        - `GatewayTimeoutError`
