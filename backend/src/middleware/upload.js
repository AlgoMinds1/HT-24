import multer from 'multer';
import { ApiError } from '../utils/api-error.js';

// Whitelisted MIME types per media category
export const ALLOWED_MIME_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  audio: [
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/wave',
    'audio/x-wav',
    'audio/ogg',
    'audio/x-m4a',
    'audio/m4a',
    'audio/aac',
    'audio/flac'
  ],
  pdf: ['application/pdf']
};

export const ALL_ALLOWED_MIMES = [
  ...ALLOWED_MIME_TYPES.image,
  ...ALLOWED_MIME_TYPES.audio,
  ...ALLOWED_MIME_TYPES.pdf
];

// Memory storage keeps files strictly in RAM buffers, preventing disk leakage and path traversal risks
const storage = multer.memoryStorage();

const multerInstance = multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB upper bound across all media
    files: 1 // strictly 1 file per verification request
  },
  fileFilter: (req, file, cb) => {
    const mime = (file.mimetype || '').toLowerCase();
    
    // Check if MIME is in global allowed set
    const isAllowed = ALL_ALLOWED_MIMES.some(m => mime === m || mime.startsWith(m));
    if (!isAllowed) {
      return cb(
        ApiError.unsupportedMediaType(
          `Unsupported file format: "${file.mimetype}". Accepted formats are Images (JPEG, PNG, WebP, GIF), Audio (MP3, WAV, OGG, M4A, AAC), or PDF documents.`,
          'UNSUPPORTED_MEDIA_TYPE'
        ),
        false
      );
    }
    cb(null, true);
  }
});

/**
 * Express middleware wrapper around multer.single('file')
 * Translates Multer errors (file size, unexpected fields) into structured ApiErrors.
 */
export function uploadMiddleware(req, res, next) {
  // If not multipart/form-data (e.g. application/json text verification), skip multer
  if (!req.is('multipart/form-data')) {
    return next();
  }

  const upload = multerInstance.single('file');
  upload(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(
            ApiError.badRequest(
              'Uploaded file exceeds the maximum size limit of 20MB. Please upload a smaller file.',
              'FILE_TOO_LARGE'
            )
          );
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return next(
            ApiError.badRequest(
              'Unexpected file field. Please upload file under the "file" form field.',
              'INVALID_FORM_FIELD'
            )
          );
        }
        return next(ApiError.badRequest(err.message, 'UPLOAD_ERROR'));
      }
      return next(err);
    }
    next();
  });
}
