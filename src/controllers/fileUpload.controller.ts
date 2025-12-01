import { Request, Response } from 'express';
import { uploadFileToS3, generateSignedUrl, UploadOptions } from '../services/awsS3.service';

/**
 * Upload a single file to S3
 */
export const uploadFile = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    // Get upload options from request body
    const options: UploadOptions = {
      folder: req.body.folder || 'uploads',
      makePublic: req.body.makePublic === 'true' || req.body.makePublic === true,
      expiresIn: parseInt(req.body.expiresIn || '3600'),
    };

    console.log(`📤 Uploading file: ${req.file.originalname} (${req.file.size} bytes)`);

    // Upload to S3
    const result = await uploadFileToS3(req.file, options);

    console.log(`✅ File uploaded successfully: ${result.key}`);

    return res.status(200).json({
      success: true,
      message: 'File uploaded successfully',
      data: result,
    });
  } catch (error: any) {
    console.error('❌ Error uploading file:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload file',
    });
  }
};

/**
 * Upload multiple files to S3
 */
export const uploadMultipleFiles = async (req: Request, res: Response) => {
  try {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded',
      });
    }

    const options: UploadOptions = {
      folder: req.body.folder || 'uploads',
      makePublic: req.body.makePublic === 'true' || req.body.makePublic === true,
      expiresIn: parseInt(req.body.expiresIn || '3600'),
    };

    console.log(`📤 Uploading ${req.files.length} files...`);

    // Upload all files
    const uploadPromises = req.files.map(file => uploadFileToS3(file, options));
    const results = await Promise.all(uploadPromises);

    console.log(`✅ ${results.length} files uploaded successfully`);

    return res.status(200).json({
      success: true,
      message: `${results.length} files uploaded successfully`,
      data: results,
    });
  } catch (error: any) {
    console.error('❌ Error uploading files:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload files',
    });
  }
};

/**
 * Generate a new signed URL for an existing file
 */
export const getSignedUrl = async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const expiresIn = parseInt(req.query.expiresIn as string || '3600');

    if (!key) {
      return res.status(400).json({
        success: false,
        message: 'File key is required',
      });
    }

    const url = await generateSignedUrl(key, expiresIn);

    return res.status(200).json({
      success: true,
      message: 'Signed URL generated successfully',
      data: {
        key,
        url,
        expiresIn,
      },
    });
  } catch (error: any) {
    console.error('❌ Error generating signed URL:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate signed URL',
    });
  }
};

/**
 * Upload profile image to S3 (stored in profile-images folder)
 */
export const uploadProfileImage = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No profile image uploaded',
      });
    }

    // Only allow image files for profile
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedMimeTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: 'Only image files (JPEG, PNG, GIF, WebP) are allowed for profile images',
      });
    }

    const options: UploadOptions = {
      folder: 'profile-images',
      makePublic: false,
      expiresIn: 86400, // 24 hours for profile images
    };

    console.log(`📤 Uploading profile image: ${req.file.originalname} (${req.file.size} bytes)`);

    const result = await uploadFileToS3(req.file, options);

    console.log(`✅ Profile image uploaded successfully: ${result.key}`);

    return res.status(200).json({
      success: true,
      message: 'Profile image uploaded successfully',
      data: result,
    });
  } catch (error: any) {
    console.error('❌ Error uploading profile image:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload profile image',
    });
  }
};

/**
 * Upload lead files to S3 (stored in lead-files folder, max 3 files)
 */
export const uploadLeadFiles = async (req: Request, res: Response) => {
  try {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded',
      });
    }

    // Validate maximum 3 files
    if (req.files.length > 3) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 3 files allowed per lead. You uploaded ' + req.files.length + ' files.',
      });
    }

    // Only allow image and PDF files for leads
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    const invalidFiles = req.files.filter(file => !allowedMimeTypes.includes(file.mimetype));

    if (invalidFiles.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Only image files (JPEG, PNG, GIF, WebP) and PDF are allowed for lead files',
      });
    }

    const options: UploadOptions = {
      folder: 'lead-files',
      makePublic: false,
      expiresIn: 86400, // 24 hours
    };

    console.log(`📤 Uploading ${req.files.length} lead files...`);

    const uploadPromises = req.files.map(file => uploadFileToS3(file, options));
    const results = await Promise.all(uploadPromises);

    console.log(`✅ ${results.length} lead files uploaded successfully`);

    return res.status(200).json({
      success: true,
      message: `${results.length} lead files uploaded successfully`,
      data: results,
    });
  } catch (error: any) {
    console.error('❌ Error uploading lead files:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload lead files',
    });
  }
};
