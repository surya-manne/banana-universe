import type { Request, Response, NextFunction, RequestHandler } from 'express'
import { BadRequestError } from '../lib/Response/ApiError'
import type { UploadConfig } from '../lib/Upload/Upload.decorator'

type MulterInstance = {
  single(fieldName: string): RequestHandler
}

type MulterFactory = {
  (options: { storage: unknown; limits?: { fileSize?: number } }): MulterInstance
  memoryStorage(): unknown
}

export async function createUploadMiddleware(
  fieldName: string,
  options?: Partial<UploadConfig>,
): Promise<RequestHandler> {
  const maxSize = options?.maxSize ?? 5 * 1024 * 1024
  const allowedMimeTypes = options?.allowedMimeTypes

  const multerModule = await import('multer')
  const multerFn = (multerModule.default ?? multerModule) as MulterFactory

  const upload = multerFn({
    storage: multerFn.memoryStorage(),
    limits: { fileSize: maxSize },
  }).single(fieldName)

  return (req: Request, res: Response, next: NextFunction): void => {
    upload(req, res, (err: unknown) => {
      if (err) {
        return next(new BadRequestError())
      }
      const file = (req as Request & { file?: { mimetype: string } }).file
      if (file && allowedMimeTypes && allowedMimeTypes.length > 0) {
        if (!allowedMimeTypes.includes(file.mimetype)) {
          return next(new BadRequestError())
        }
      }
      return next()
    })
  }
}
