'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

const ACCEPTED_TYPES = 'image/jpeg,image/png,image/webp,image/gif';
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // Mirrors ChildPhotoStorageService.MAX_FILE_SIZE_BYTES.

/**
 * Easy Enrollment (Product Gap H, phase 2) - replaces the old free-text
 * "Photo URL" field. The user picks a file from disk and sees an immediate
 * local preview (object URL, revoked on unmount/replace); `onFileSelected`
 * hands the raw File up to the caller, which decides when to actually
 * upload it - immediately (ChildForm, editing an existing child) or
 * deferred until the child exists (the wizard's Child step, where there's
 * no id yet to upload against).
 */
export function PhotoUploadField({
  previewUrl,
  onFileSelected,
  disabled,
  error,
}: {
  previewUrl: string | null;
  onFileSelected: (file: File) => void;
  disabled?: boolean;
  error?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (localPreview) URL.revokeObjectURL(localPreview);
    };
  }, [localPreview]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (localPreview) URL.revokeObjectURL(localPreview);
    setLocalPreview(URL.createObjectURL(file));
    onFileSelected(file);
  };

  const displayUrl = localPreview ?? previewUrl;

  return (
    <div className="flex flex-col gap-1.5">
      <Label>Child photo</Label>
      <div className="flex items-center gap-3">
        {displayUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- object URLs and API-streamed photos aren't Next/Image-optimizable sources.
          <img
            src={displayUrl}
            alt=""
            className="size-16 shrink-0 rounded-full border border-border object-cover"
          />
        ) : (
          <div className="flex size-16 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-xs text-muted-foreground">
            No photo
          </div>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
        >
          Upload photo
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES}
          className="hidden"
          onChange={handleChange}
        />
      </div>
      <p className="text-xs text-muted-foreground">JPEG, PNG, WEBP, or GIF - up to 5MB.</p>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

export { MAX_FILE_SIZE_BYTES };
