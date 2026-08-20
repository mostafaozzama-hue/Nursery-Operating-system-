import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from '../../../config/environment-variables';
import { ChildPhotoStorageService } from './child-photo-storage.service';

describe('ChildPhotoStorageService', () => {
  let uploadsDir: string;
  let service: ChildPhotoStorageService;

  beforeEach(async () => {
    uploadsDir = await fs.mkdtemp(path.join(os.tmpdir(), 'nursery-os-photo-test-'));
    const configService = {
      get: jest.fn().mockReturnValue(uploadsDir),
    } as unknown as ConfigService<EnvironmentVariables, true>;
    service = new ChildPhotoStorageService(configService);
  });

  afterEach(async () => {
    await fs.rm(uploadsDir, { recursive: true, force: true });
  });

  it('saves a file and returns the stable, id-only reference (never the on-disk filename)', async () => {
    const photoUrl = await service.save('child-1', { buffer: Buffer.from('fake-image'), mimetype: 'image/png' });
    expect(photoUrl).toBe('/children/child-1/photo');
  });

  it('resolve() finds the file that was just saved', async () => {
    await service.save('child-1', { buffer: Buffer.from('fake-image'), mimetype: 'image/jpeg' });
    const resolved = await service.resolve('child-1');
    expect(resolved).toMatch(/child-1[\\/].+\.jpg$/);
    expect(await fs.readFile(resolved!, 'utf8')).toBe('fake-image');
  });

  it('resolve() returns null when nothing has ever been uploaded for this child', async () => {
    await expect(service.resolve('never-uploaded')).resolves.toBeNull();
  });

  it('replacing a photo removes the previous file - exactly one file remains', async () => {
    await service.save('child-1', { buffer: Buffer.from('first'), mimetype: 'image/png' });
    await service.save('child-1', { buffer: Buffer.from('second'), mimetype: 'image/webp' });

    const dir = path.join(uploadsDir, 'children', 'child-1');
    const entries = await fs.readdir(dir);
    expect(entries).toHaveLength(1);
    expect(await fs.readFile(path.join(dir, entries[0]), 'utf8')).toBe('second');
  });

  it('rejects an unsupported mime type before writing anything to disk', async () => {
    await expect(
      service.save('child-1', { buffer: Buffer.from('x'), mimetype: 'application/pdf' }),
    ).rejects.toThrow(BadRequestException);
    await expect(service.resolve('child-1')).resolves.toBeNull();
  });

  it('keeps different children fully isolated from each other', async () => {
    await service.save('child-1', { buffer: Buffer.from('one'), mimetype: 'image/png' });
    await service.save('child-2', { buffer: Buffer.from('two'), mimetype: 'image/png' });

    expect(await fs.readFile((await service.resolve('child-1'))!, 'utf8')).toBe('one');
    expect(await fs.readFile((await service.resolve('child-2'))!, 'utf8')).toBe('two');
  });
});
