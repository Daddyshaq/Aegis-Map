import { Fragment, type ReactNode } from 'react';

/**
 * Minimal, dependency-free Markdown renderer that emits React elements (never
 * `dangerouslySetInnerHTML`, so it is XSS-safe by construction). Supports the
 * subset used by emergency guides: headings, ordered/unordered lists,
 * blockquotes, fenced code, horizontal rules, paragraphs, and the inline marks
 * bold, italic, inline-code and links.
 */
export function Markdown({ content, className }: { content: string; className?: string }) {
  const blocks = parseBlocks(content ?? '');
  return (
    <div className={className}>
      {blocks.map((block, index) => (
        <Block key={index} block={block} />
      ))}
    </div>
  );
}

type Block =
  | { type: 'heading'; level: number; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }
  | { type: 'quote'; lines: string[] }
  | { type: 'code'; text: string }
  | { type: 'hr' }
  | { type: 'p'; text: string };

function parseBlocks(input: string): Block[] {
  const lines = input.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i] ?? '';
    const trimmed = line.trim();

    if (trimmed === '') {
      i += 1;
      continue;
    }

    // Fenced code block.
    if (trimmed.startsWith('```')) {
      const buffer: string[] = [];
      i += 1;
      while (i < lines.length && !(lines[i] ?? '').trim().startsWith('```')) {
        buffer.push(lines[i] ?? '');
        i += 1;
      }
      i += 1; // closing fence
      blocks.push({ type: 'code', text: buffer.join('\n') });
      continue;
    }

    // Horizontal rule.
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      blocks.push({ type: 'hr' });
      i += 1;
      continue;
    }

    // Heading.
    const heading = /^(#{1,6})\s+(.*)$/.exec(trimmed);
    if (heading) {
      blocks.push({
        type: 'heading',
        level: (heading[1] ?? '').length,
        text: (heading[2] ?? '').trim(),
      });
      i += 1;
      continue;
    }

    // Unordered list.
    if (/^[-*]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test((lines[i] ?? '').trim())) {
        items.push((lines[i] ?? '').trim().replace(/^[-*]\s+/, ''));
        i += 1;
      }
      blocks.push({ type: 'ul', items });
      continue;
    }

    // Ordered list.
    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test((lines[i] ?? '').trim())) {
        items.push((lines[i] ?? '').trim().replace(/^\d+\.\s+/, ''));
        i += 1;
      }
      blocks.push({ type: 'ol', items });
      continue;
    }

    // Blockquote.
    if (trimmed.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && (lines[i] ?? '').trim().startsWith('>')) {
        quoteLines.push((lines[i] ?? '').trim().replace(/^>\s?/, ''));
        i += 1;
      }
      blocks.push({ type: 'quote', lines: quoteLines });
      continue;
    }

    // Paragraph: gather until a blank line or a block-starting marker.
    const paragraph: string[] = [];
    while (i < lines.length) {
      const current = (lines[i] ?? '').trim();
      if (
        current === '' ||
        current.startsWith('#') ||
        current.startsWith('```') ||
        current.startsWith('>') ||
        /^[-*]\s+/.test(current) ||
        /^\d+\.\s+/.test(current)
      ) {
        break;
      }
      paragraph.push(current);
      i += 1;
    }
    blocks.push({ type: 'p', text: paragraph.join(' ') });
  }

  return blocks;
}

function Block({ block }: { block: Block }) {
  switch (block.type) {
    case 'heading': {
      const cls =
        block.level <= 1
          ? 'mt-6 text-2xl font-bold tracking-tight first:mt-0'
          : block.level === 2
            ? 'mt-6 text-xl font-semibold tracking-tight first:mt-0'
            : 'mt-4 text-lg font-semibold first:mt-0';
      const Tag = `h${Math.min(block.level, 6)}` as keyof JSX.IntrinsicElements;
      return <Tag className={cls}>{renderInline(block.text)}</Tag>;
    }
    case 'ul':
      return (
        <ul className="my-3 list-disc space-y-1 pl-6">
          {block.items.map((item, index) => (
            <li key={index}>{renderInline(item)}</li>
          ))}
        </ul>
      );
    case 'ol':
      return (
        <ol className="my-3 list-decimal space-y-1 pl-6">
          {block.items.map((item, index) => (
            <li key={index}>{renderInline(item)}</li>
          ))}
        </ol>
      );
    case 'quote':
      return (
        <blockquote className="my-3 border-l-4 border-primary/40 pl-4 italic text-muted-foreground">
          {block.lines.map((line, index) => (
            <p key={index}>{renderInline(line)}</p>
          ))}
        </blockquote>
      );
    case 'code':
      return (
        <pre className="my-3 overflow-x-auto rounded-md bg-muted p-3 text-sm">
          <code>{block.text}</code>
        </pre>
      );
    case 'hr':
      return <hr className="my-6 border-border" />;
    case 'p':
      return <p className="my-3 leading-relaxed">{renderInline(block.text)}</p>;
  }
}

/** Inline tokenizer: links, bold, italic, and inline code. */
function renderInline(text: string): ReactNode {
  // Order matters: links first (they contain other characters), then code,
  // then bold, then italic.
  const pattern = /(\[[^\]]+\]\([^)]+\))|(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*|_[^_]+_)/g;
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(<Fragment key={key++}>{text.slice(lastIndex, match.index)}</Fragment>);
    }
    const token = match[0];
    if (token.startsWith('[')) {
      const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
      if (link) {
        const href = link[2] ?? '';
        const safe = /^(https?:|mailto:|tel:)/i.test(href) ? href : '#';
        nodes.push(
          <a
            key={key++}
            href={safe}
            className="font-medium text-primary underline underline-offset-2"
            {...(safe.startsWith('http') ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
          >
            {link[1]}
          </a>,
        );
      }
    } else if (token.startsWith('`')) {
      nodes.push(
        <code key={key++} className="rounded bg-muted px-1 py-0.5 text-sm">
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith('**')) {
      nodes.push(<strong key={key++}>{token.slice(2, -2)}</strong>);
    } else {
      nodes.push(<em key={key++}>{token.slice(1, -1)}</em>);
    }
    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(<Fragment key={key++}>{text.slice(lastIndex)}</Fragment>);
  }

  return nodes;
}
