import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from '../../../config/environment-variables';

/**
 * Easy Enrollment (Product Gap H, phase 2) - the approved smallest-safe-MVP
 * photo storage: local disk on the API instance, not S3/Cloudinary/MinIO/any
 * third-party provider. Explicitly a single-instance limitation - files
 * don't survive a redeploy to a fresh container or a horizontally-scaled
 * second API instance. Object storage is the documented next step once that
 * becomes a real need, not built here without separate approval.
 *
 * Child.photoUrl keeps storing a stable reference string - "/children/{id}/photo"
 * - never the on-disk filename, so re-uploading a photo never changes the
 * stored value and never breaks anything already pointing at it. Exactly one
 * file is kept per child (the previous one is removed on replace); the
 * on-disk filename itself is an internal implementation detail, resolved by
 * ChildPhotoStorageService.resolve at read time.
 */
@Injectable()
export class ChildPhotoStorageService {
  private static readonly ALLOWED_MIME_TYPES: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
  };

  static readonly MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB - "reasonable limit," per instruction.

  constructor(private readonly configService: ConfigService<EnvironmentVariables, true>) {}

  private childDir(childId: string): string {
    const uploadsDir = this.configService.get('UPLOADS_DIR', { infer: true });
    return path.join(path.resolve(uploadsDir), 'children', childId);
  }

  /** Validates mime type before touching the filesystem - fileFilter on the interceptor is the first gate, this is the second, in case a caller ever invokes this service directly. */
  private extensionFor(mimetype: string): string {
    const ext = ChildPhotoStorageService.ALLOWED_MIME_TYPES[mimetype];
    if (!ext) {
      throw new BadRequestException(
        `Unsupported image type "${mimetype}" - allowed: ${Object.keys(ChildPhotoStorageService.ALLOWED_MIME_TYPES).join(', ')}`,
      );
    }
    return ext;
  }

  /**
   * Replaces whatever photo currently exists for this child with the given
   * buffer, and returns the stable public reference to store on
   * Child.photoUrl. Removing the previous file first keeps exactly one file
   * per child directory - resolve() below depends on that invariant.
   */
  async save(childId: string, file: { buffer: Buffer; mimetype: string }): Promise<string> {
    const ext = this.extensionFor(file.mimetype);
    const dir = this.childDir(childId);

    await fs.mkdir(dir, { recursive: true });
    await this.clearDir(dir);

    const filename = `${randomUUID()}${ext}`;
    await fs.writeFile(path.join(dir, filename), file.buffer);

    return `/children/${childId}/photo`;
  }

  /** Returns the current photo's absolute file path for this child, or null if none has been uploaded (yet, or ever - an externally-pasted legacy photoUrl has no on-disk file). */
  async resolve(childId: string): Promise<string | null> {
    const dir = this.childDir(childId);
    let entries: string[];
    try {
      entries = await fs.readdir(dir);
    } catch {
      return null;
    }
    const [filename] = entries;
    return filename ? path.join(dir, filename) : null;
  }

  private async clearDir(dir: string): Promise<void> {
    let entries: string[];
    try {
      entries = await fs.readdir(dir);
    } catch {
      return;
    }
    await Promise.all(entries.map((entry) => fs.unlink(path.join(dir, entry)).catch(() => undefined)));
  }
}
