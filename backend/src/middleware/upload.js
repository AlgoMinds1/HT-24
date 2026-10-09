import multer from 'multer';

// Memory storage keeps files strictly in RAM buffers, eliminating disk leaks and path traversal risks
const storage = multer.memoryStorage();

export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB max file size
    files: 1 // exactly 1 file per request
  }
});
