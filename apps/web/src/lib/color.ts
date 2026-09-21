/** Colour helpers for turning the shared presentation hex palette into
 * accessible, theme-independent UI (badges, map markers). */

function normalizeHex(hex: string): string {
  const value = hex.replace('#', '');
  if (value.length === 3) {
    return value
      .split('')
      .map((c) => c + c)
      .join('');
  }
  return value;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const value = normalizeHex(hex);
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
}

export function hexToRgba(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Returns black or white — whichever has sufficient contrast against the given
 * background — using the WCAG relative-luminance formula. Keeps filled status
 * badges legible regardless of the semantic colour.
 */
export function readableTextColor(hex: string): '#000000' | '#ffffff' {
  const { r, g, b } = hexToRgb(hex);
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const luminance = 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  return luminance > 0.5 ? '#000000' : '#ffffff';
}
