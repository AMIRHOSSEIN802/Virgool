import { FileInterceptor } from '@nestjs/platform-express';
import { BadRequestException } from '@nestjs/common';
import { multerStorage } from '../utils/multer.utils';
import type { Request } from 'express';

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = /^image\/(png|jpe?g|webp|gif)$/i;

export function UploadFile(fieldName: string, folderName: string = 'images') {
  return class UploadUtility extends FileInterceptor(fieldName, {
    storage: multerStorage(folderName),
    limits: { fileSize: MAX_UPLOAD_BYTES },
    // Defense-in-depth: the multerStorage filename callback already whitelists
    // extensions, but an attacker controls the filename they send. Checking
    // the declared MIME type here too means a .png-renamed .exe must at least
    // lie about its content type as well before hitting the extension gate.
    fileFilter: (_req: Request, file, cb) => {
      if (ALLOWED_MIME.test(file.mimetype)) cb(null, true);
      else cb(new BadRequestException('فایل باید تصویر معتبر باشد'), false);
    },
  }) {}
}
