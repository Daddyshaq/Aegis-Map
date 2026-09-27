import { ALL_ALLOWED_UPLOAD_TYPES, UPLOAD_LIMITS } from '@crisis/config';
import { useEffect, useRef, useState } from 'react';

import { Icon } from '@/components/icon';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';
import { formatBytes } from '@/lib/format';
import { cn } from '@/lib/utils';

interface EvidencePickerProps {
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
}

/** Icon name for a file based on its MIME type. */
function kindIcon(type: string): string {
  if (type.startsWith('image/')) return 'image';
  if (type.startsWith('video/')) return 'video';
  if (type.startsWith('audio/')) return 'music';
  return 'file';
}

/**
 * Accessible multi-file evidence picker with client-side validation mirroring
 * the server limits (type allow-list, per-file size, max count). Files are held
 * in memory and uploaded by the parent after the report is created.
 */
export function EvidencePicker({ files, onChange, disabled }: EvidencePickerProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [previews, setPreviews] = useState<Record<string, string>>({});

  // Generate + revoke object URLs for image previews.
  useEffect(() => {
    const next: Record<string, string> = {};
    for (const file of files) {
      if (file.type.startsWith('image/')) next[fileKey(file)] = URL.createObjectURL(file);
    }
    setPreviews(next);
    return () => {
      for (const url of Object.values(next)) URL.revokeObjectURL(url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files.map(fileKey).join('|')]);

  const getNormalizedType = (file: File): string => {
    let t = (file.type || '').toLowerCase();
    if (t === 'image/jpg') return 'image/jpeg';
    if (!t || t === 'application/octet-stream') {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
      if (ext === 'png') return 'image/png';
      if (ext === 'webp') return 'image/webp';
      if (ext === 'heic') return 'image/heic';
      if (ext === 'mp4') return 'video/mp4';
      if (ext === 'mov') return 'video/quicktime';
    }
    return t;
  };

  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    const accepted: File[] = [...files];
    const errors: string[] = [];

    for (const file of Array.from(incoming)) {
      if (accepted.length >= UPLOAD_LIMITS.maxFiles) {
        errors.push(`You can attach at most ${UPLOAD_LIMITS.maxFiles} files.`);
        break;
      }
      const type = getNormalizedType(file);
      if (!ALL_ALLOWED_UPLOAD_TYPES.includes(type) && type !== 'image/jpg') {
        errors.push(`${file.name}: unsupported file type.`);
        continue;
      }
      if (file.size > UPLOAD_LIMITS.maxBytes) {
        errors.push(`${file.name}: exceeds ${formatBytes(UPLOAD_LIMITS.maxBytes)}.`);
        continue;
      }
      if (accepted.some((f) => fileKey(f) === fileKey(file))) continue; // de-dupe
      accepted.push(file);
    }

    if (errors.length) toast.error(errors[0]);
    onChange(accepted);
    if (inputRef.current) inputRef.current.value = '';
  };

  const remove = (target: File) => {
    onChange(files.filter((f) => fileKey(f) !== fileKey(target)));
  };

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,video/*,audio/*,.heic,.heif,.jpg,.jpeg,.png,.webp,.mp4,.mov,.mp3,.wav"
        className="sr-only"
        disabled={disabled}
        onChange={(e) => addFiles(e.target.files)}
      />

      <button
        type="button"
        disabled={disabled || files.length >= UPLOAD_LIMITS.maxFiles}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'flex w-full flex-col items-center gap-1 rounded-lg border border-dashed p-6 text-center transition-colors',
          'hover:border-primary/60 hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60',
        )}
      >
        <Icon name="upload" className="size-6 text-muted-foreground" aria-hidden />
        <span className="text-sm font-medium">Add photos, video or audio</span>
        <span className="text-xs text-muted-foreground">
          Up to {UPLOAD_LIMITS.maxFiles} files, {formatBytes(UPLOAD_LIMITS.maxBytes)} each
        </span>
      </button>

      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((file) => {
            const key = fileKey(file);
            const preview = previews[key];
            return (
              <li key={key} className="flex items-center gap-3 rounded-md border p-2">
                <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded bg-muted">
                  {preview ? (
                    <img src={preview} alt="" className="size-full object-cover" />
                  ) : (
                    <Icon
                      name={kindIcon(file.type)}
                      className="size-5 text-muted-foreground"
                      aria-hidden
                    />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0"
                  onClick={() => remove(file)}
                  disabled={disabled}
                  aria-label={`Remove ${file.name}`}
                >
                  <Icon name="x" className="size-4" aria-hidden />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function fileKey(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`;
}
