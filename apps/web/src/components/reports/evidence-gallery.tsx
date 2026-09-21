import type { CrisisEvidence } from '@crisis/types';

import { Icon } from '@/components/icon';

/**
 * Read-only gallery of report evidence. Renders images/video/audio inline and
 * documents as openable links, using the short-lived signed URL minted by the
 * API for authorized viewers. Shared by the public report detail page and the
 * moderator review page so both render evidence identically.
 */
export function EvidenceGallery({ evidence }: { evidence: CrisisEvidence[] }) {
  if (evidence.length === 0) {
    return <p className="text-sm text-muted-foreground">No evidence attached to this report.</p>;
  }

  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {evidence.map((item) => (
        <li key={item.id}>
          <EvidenceItem evidence={item} />
        </li>
      ))}
    </ul>
  );
}

function EvidenceItem({ evidence }: { evidence: CrisisEvidence }) {
  const url = evidence.signedUrl;

  if (!url) {
    return (
      <div className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border bg-muted/40 p-2 text-center">
        <Icon name="lock" className="size-5 text-muted-foreground" aria-hidden />
        <span className="text-xs text-muted-foreground">Preview unavailable</span>
      </div>
    );
  }

  if (evidence.kind === 'IMAGE') {
    return (
      <a href={url} target="_blank" rel="noreferrer noopener" className="block">
        <img
          src={url}
          alt="Report evidence"
          loading="lazy"
          className="aspect-square w-full rounded-lg border object-cover transition-opacity hover:opacity-90"
        />
      </a>
    );
  }

  if (evidence.kind === 'VIDEO') {
    return (
      <video
        src={url}
        controls
        className="aspect-square w-full rounded-lg border bg-black object-contain"
      />
    );
  }

  if (evidence.kind === 'AUDIO') {
    return (
      <div className="flex aspect-square flex-col items-center justify-center gap-2 rounded-lg border p-3">
        <Icon name="music" className="size-6 text-muted-foreground" aria-hidden />
        <audio src={url} controls className="w-full" />
      </div>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer noopener"
      className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border p-2 text-center hover:bg-accent"
    >
      <Icon name="file" className="size-6 text-muted-foreground" aria-hidden />
      <span className="text-xs">Open document</span>
    </a>
  );
}
