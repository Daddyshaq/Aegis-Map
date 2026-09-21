import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useOnlineStatus } from '@/hooks/use-online-status';
import { checkIsIOS, checkIsStandalone, usePwaInstall } from '@/hooks/use-pwa-install';

describe('PWA detection utilities', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('checkIsStandalone', () => {
    it('returns true when display-mode: standalone matches', () => {
      vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
        matches: query === '(display-mode: standalone)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      expect(checkIsStandalone()).toBe(true);
    });

    it('returns false when display-mode: standalone does not match', () => {
      vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      expect(checkIsStandalone()).toBe(false);
    });
  });

  describe('checkIsIOS', () => {
    it('returns true for iPhone user agent', () => {
      vi.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      );
      expect(checkIsIOS()).toBe(true);
    });

    it('returns true for iPad user agent', () => {
      vi.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue(
        'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      );
      expect(checkIsIOS()).toBe(true);
    });

    it('returns false for Android user agent', () => {
      vi.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue(
        'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
      );
      expect(checkIsIOS()).toBe(false);
    });

    it('returns false for desktop Chrome user agent', () => {
      vi.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      );
      expect(checkIsIOS()).toBe(false);
    });
  });
});

describe('useOnlineStatus hook', () => {
  it('reflects network online/offline events', () => {
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(true);

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(result.current).toBe(false);

    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    expect(result.current).toBe(true);
  });
});

describe('usePwaInstall hook', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('initializes with default browser state', () => {
    const { result } = renderHook(() => usePwaInstall());
    expect(result.current.isInstalled).toBe(false);
  });

  it('captures beforeinstallprompt event and becomes installable', () => {
    const { result } = renderHook(() => usePwaInstall());

    const mockPromptEvent = new Event('beforeinstallprompt') as unknown as {
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
      platforms: string[];
    };
    mockPromptEvent.prompt = vi.fn().mockResolvedValue(undefined);
    mockPromptEvent.userChoice = Promise.resolve({ outcome: 'accepted', platform: 'web' });
    mockPromptEvent.platforms = ['web'];

    act(() => {
      window.dispatchEvent(mockPromptEvent as unknown as Event);
    });

    expect(result.current.isInstallable).toBe(true);
  });

  it('supports prompt dismissal', () => {
    const { result } = renderHook(() => usePwaInstall());
    expect(result.current.isDismissed).toBe(false);

    act(() => {
      result.current.dismissPrompt();
    });

    expect(result.current.isDismissed).toBe(true);
  });
});
