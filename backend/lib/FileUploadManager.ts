import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { v4 as uuid } from 'uuid';
import logger from '../config/logger';

interface UploadedFile {
  filename: string;
  path: string;
  mimetype: string;
  size: number;
}

interface ProcessedUpload {
  url: string;
  thumbnailUrl?: string;
}

export class FileUploadManager {
  private uploadDir: string;
  private cacheDir: string;
  private maxFileSize: number;

  constructor(uploadDir: string, cacheDir: string, maxFileSize: number) {
    this.uploadDir = uploadDir;
    this.cacheDir = cacheDir;
    this.maxFileSize = maxFileSize;
    this.ensureDirectories();
  }

  private async ensureDirectories() {
    await fs.mkdir(this.uploadDir, { recursive: true });
    await fs.mkdir(this.cacheDir, { recursive: true });
  }

  async processUpload(file: UploadedFile): Promise<ProcessedUpload> {
    if (file.size > this.maxFileSize) {
      throw new Error('File size exceeds maximum allowed size');
    }

    // Generate a unique filename
    const ext = path.extname(file.filename);
    const newFilename = `${uuid()}${ext}`;
    const newPath = path.join(this.uploadDir, newFilename);

    try {
      // Process image with sharp
      const image = sharp(file.path);
      const metadata = await image.metadata();

      // Create thumbnail if image is large
      let thumbnailUrl: string | undefined;
      if (metadata.width && metadata.width > 800) {
        const thumbnailName = `thumb_${newFilename}`;
        const thumbnailPath = path.join(this.cacheDir, thumbnailName);
        
        await image
          .resize(800, null, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .toFile(thumbnailPath);
        
        thumbnailUrl = `/uploads/cache/${thumbnailName}`;
      }

      // Move processed file to final location
      await fs.rename(file.path, newPath);

      return {
        url: `/uploads/${newFilename}`,
        thumbnailUrl
      };
    } catch (error) {
      // Clean up on error
      await fs.unlink(file.path).catch(() => {});
      logger.error('Failed to process upload:', error);
      throw new Error('Failed to process image upload');
    }
  }

  async cleanup(maxAge: number = 24 * 60 * 60 * 1000): Promise<void> {
    try {
      const now = Date.now();
      
      // Clean up main uploads
      const uploads = await fs.readdir(this.uploadDir);
      for (const file of uploads) {
        const filePath = path.join(this.uploadDir, file);
        const stats = await fs.stat(filePath);
        
        if (now - stats.mtime.getTime() > maxAge) {
          await fs.unlink(filePath);
          logger.info(`Cleaned up old upload: ${file}`);
        }
      }

      // Clean up cache
      const cache = await fs.readdir(this.cacheDir);
      for (const file of cache) {
        const filePath = path.join(this.cacheDir, file);
        const stats = await fs.stat(filePath);
        
        if (now - stats.mtime.getTime() > maxAge) {
          await fs.unlink(filePath);
          logger.info(`Cleaned up cached file: ${file}`);
        }
      }
    } catch (error) {
      logger.error('Failed to clean up files:', error);
      throw new Error('Failed to clean up uploaded files');
    }
  }

  async removeFile(filename: string): Promise<void> {
    try {
      const filePath = path.join(this.uploadDir, filename);
      await fs.unlink(filePath);
      
      // Try to remove thumbnail if it exists
      const thumbPath = path.join(this.cacheDir, `thumb_${filename}`);
      await fs.unlink(thumbPath).catch(() => {});
      
      logger.info(`Removed file: ${filename}`);
    } catch (error) {
      logger.error('Failed to remove file:', error);
      throw new Error('Failed to remove file');
    }
  }
}

export default FileUploadManager;