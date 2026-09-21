import { describe, expect, it } from 'vitest';

import { serializeSubscription, urlBase64ToUint8Array } from '@/lib/push';

describe('urlBase64ToUint8Array', () => {
  it('decodes base64url into the expected bytes', () => {
    const out = urlBase64ToUint8Array('AQID');
    expect(out).toBeInstanceOf(Uint8Array);
    expect(Array.from(out)).toEqual([1, 2, 3]);
  });

  it('pads unpadded input', () => {
    expect(Array.from(urlBase64ToUint8Array('AA'))).toEqual([0]);
    expect(Array.from(urlBase64ToUint8Array(''))).toEqual([]);
  });

  it('translates the URL-safe characters "-" and "_"', () => {
    expect(Array.from(urlBase64ToUint8Array('-_'))).toEqual([251]);
  });
});

describe('serializeSubscription', () => {
  it('maps a PushSubscription to the API payload shape', () => {
    const sub = {
      endpoint: 'https://push.example/abc',
      expirationTime: null,
      toJSON: () => ({
        endpoint: 'https://push.example/abc',
        expirationTime: null,
        keys: { p256dh: 'PUB', auth: 'AUTH' },
      }),
    } as unknown as PushSubscription;

    expect(serializeSubscription(sub)).toEqual({
      endpoint: 'https://push.example/abc',
      expirationTime: null,
      keys: { p256dh: 'PUB', auth: 'AUTH' },
    });
  });

  it('defaults missing keys to empty strings and preserves expirationTime', () => {
    const sub = {
      endpoint: 'https://push.example/xyz',
      expirationTime: 123456,
      toJSON: () => ({ endpoint: 'https://push.example/xyz', expirationTime: 123456 }),
    } as unknown as PushSubscription;

    expect(serializeSubscription(sub)).toEqual({
      endpoint: 'https://push.example/xyz',
      expirationTime: 123456,
      keys: { p256dh: '', auth: '' },
    });
  });
});
