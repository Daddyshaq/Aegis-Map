/**
 * Typed, validated access to the Vite-injected environment. Import `env`
 * anywhere in the app instead of touching `import.meta.env` directly, so a
 * missing variable fails loudly and in one place.
 */

interface AppEnv {
  supabaseUrl: string;
  supabaseAnonKey: string;
  apiUrl: string;
  map: {
    styleUrl: string;
    defaultLat: number;
    defaultLng: number;
    defaultZoom: number;
  };
  /** Present only when Web Push is configured for this deployment. */
  vapidPublicKey: string | null;
}

function required(key: string, value: string | undefined): string {
  if (value === undefined || value.trim() === '') {
    throw new Error(
      `Missing required environment variable ${key}. Copy .env.example to .env and fill it in.`,
    );
  }
  return value;
}

function numberWithDefault(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const env: AppEnv = {
  supabaseUrl: required('VITE_SUPABASE_URL', import.meta.env.VITE_SUPABASE_URL),
  supabaseAnonKey: required('VITE_SUPABASE_ANON_KEY', import.meta.env.VITE_SUPABASE_ANON_KEY),
  // Normalise away a trailing slash so path joins never double up.
  apiUrl: required('VITE_API_URL', import.meta.env.VITE_API_URL).replace(/\/+$/, ''),
  map: {
    styleUrl: import.meta.env.VITE_MAP_STYLE_URL ?? 'https://tiles.openfreemap.org/styles/liberty',
    defaultLat: numberWithDefault(import.meta.env.VITE_MAP_DEFAULT_LAT, 9.0765),
    defaultLng: numberWithDefault(import.meta.env.VITE_MAP_DEFAULT_LNG, 7.3986),
    defaultZoom: numberWithDefault(import.meta.env.VITE_MAP_DEFAULT_ZOOM, 6),
  },
  vapidPublicKey: import.meta.env.VITE_VAPID_PUBLIC_KEY ?? null,
};
