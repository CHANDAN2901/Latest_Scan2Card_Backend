import express from 'express';
import multer from 'multer';
import { uploadFile, uploadMultipleFiles, getSignedUrl, uploadProfileImage, uploadLeadFiles } from '../controllers/fileUpload.controller';

const router = express.Router();

// Multer configuration with file size limit
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 10, // Maximum 10 files
  },
});

/**
 * @route   POST /api/upload/single
 * @desc    Upload a single file to S3
 * @access  Public (add authentication middleware if needed)
 * @body    file: File (required)
 * @body    folder: string (optional, default: 'uploads')
 * @body    makePublic: boolean (optional, default: false)
 * @body    expiresIn: number (optional, default: 3600 seconds)
 */
router.post('/single', upload.single('file'), uploadFile);

/**
 * @route   POST /api/upload/multiple
 * @desc    Upload multiple files to S3
 * @access  Public (add authentication middleware if needed)
 * @body    files: File[] (required)
 * @body    folder: string (optional)
 * @body    makePublic: boolean (optional)
 * @body    expiresIn: number (optional)
 */
router.post('/multiple', upload.array('files', 10), uploadMultipleFiles);

/**
 * @route   GET /api/upload/signed-url/:key
 * @desc    Generate a signed URL for an existing private file
 * @access  Public (add authentication middleware if needed)
 * @params  key: string (required) - S3 object key
 * @query   expiresIn: number (optional, default: 3600 seconds)
 */
router.get('/signed-url/:key(*)', getSignedUrl);

/**
 * @route   POST /api/upload/profile-image
 * @desc    Upload a profile image to S3 (stored in profile-images folder)
 * @access  Public (add authentication middleware if needed)
 * @body    file: File (required) - Image file only (JPEG, PNG, GIF, WebP)
 */
router.post('/profile-image', upload.single('file'), uploadProfileImage);

/**
 * @route   POST /api/upload/lead-files
 * @desc    Upload lead files to S3 (stored in lead-files folder, max 3 files)
 * @access  Public (add authentication middleware if needed)
 * @body    files: File[] (required) - Image or PDF files (max 3)
 */
router.post('/lead-files', upload.array('files', 3), uploadLeadFiles);

// Backward compatibility
router.post('/upload', upload.single('file'), uploadFile);

export default router;
