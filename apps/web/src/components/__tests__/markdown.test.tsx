import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Markdown } from '@/components/markdown';

describe('Markdown', () => {
  it('renders headings and paragraphs', () => {
    const { container } = render(<Markdown content={'# Title\n\nHello world'} />);
    expect(container.querySelector('h1')?.textContent).toBe('Title');
    expect(container.textContent).toContain('Hello world');
  });

  it('renders fenced code blocks verbatim', () => {
    const { container } = render(<Markdown content={'```\nconst x = 1;\n```'} />);
    expect(container.querySelector('pre code')?.textContent).toBe('const x = 1;');
  });

  it('neutralises javascript: links (XSS-safe by construction)', () => {
    const { container } = render(<Markdown content={'[click me](javascript:alert(1))'} />);
    const anchor = container.querySelector('a');
    expect(anchor).not.toBeNull();
    expect(anchor?.getAttribute('href')).toBe('#');
  });

  it('keeps safe links and opens external ones securely', () => {
    const { container } = render(<Markdown content={'[site](https://example.com)'} />);
    const anchor = container.querySelector('a');
    expect(anchor?.getAttribute('href')).toBe('https://example.com');
    expect(anchor?.getAttribute('target')).toBe('_blank');
    expect(anchor?.getAttribute('rel') ?? '').toContain('noopener');
  });

  it('never injects raw HTML — tags survive as inert text', () => {
    const { container } = render(<Markdown content={'<script>alert(1)</script>'} />);
    expect(container.querySelector('script')).toBeNull();
    expect(container.textContent).toContain('<script>alert(1)</script>');
  });
});
