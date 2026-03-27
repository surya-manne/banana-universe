# BananaJS

**BananaJS** is an opinionated Node.js framework built on top of Express, designed to simplify routing for server-side applications. Inspired by frameworks like NestJS, BananaJS focuses on reducing the complexity of routing by using decorators, providing a more readable and maintainable codebase. It uses **Zod** for request validation (`@Body`, `@Query`, `@Params`, `@Headers`), keeping rules declarative and type-safe. Additionally, it features standardized API responses and centralized error handling.

The combination of simplified routing, validation, and standardized responses/errors enhances productivity, reduces boilerplate code, and improves the overall structure and readability of your application.

## Features

- **Easy Routing with Decorators**: Simplifies the way routes are defined using decorators like `@Controller`, `@Get`, `@Post`, `@Put`, and `@Delete`.
- **Validation with Decorators**: Use `@Body`, `@Params`, `@Query`, and `@Headers` with Zod schemas to validate request data before handlers run.
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
- **zod** (for request validation schemas)

## Installation

1.  **Install BananaJS** in your project:

    ```bash
    npm install @banana-universe/bananajs
    ```

2.  **Install Mandatory dependencies** in your project:

    ```bash
    npm install express zod
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

Example: [https://github.com/surya-manne/banana-universe/tree/main/apps/bananajs-demo](https://github.com/surya-manne/banana-universe/tree/main/apps/bananajs-demo)

### Setting Up the Application

1.  **Create the Controller File**:

    In the `src/App/User/User.controller.ts` (or any file you prefer), define your APIs using the decorators provided by BananaJS and utilize `SuccessResponse` for standardized responses.

    ```typescript
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
      async create(req: Request, res: Response) {
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
    ```

2.  **Create Zod schemas** (`src/App/User/User.dto.ts`):

    ```typescript
    import { z } from 'zod'

    export const CreateUserSchema = z.object({
      name: z.string().min(3).max(20),
      email: z.string().email().max(50),
      password: z.string().min(1),
    })

    export const GetUserByIdSchema = z.object({
      id: z.string().min(1),
    })

    export const GetUserListSchema = z.object({
      page: z.coerce.number().optional(),
      limit: z.coerce.number().optional(),
    })
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
