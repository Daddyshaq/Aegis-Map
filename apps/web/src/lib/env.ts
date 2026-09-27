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
  /** Present when Google Maps Platform is configured for this deployment. */
  googleMaps: {
    apiKey: string | null;
    mapId: string;
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

function optionalString(value: string | undefined): string | null {
  if (value === undefined || value.trim() === '') return null;
  return value;
}

function cleanSupabaseUrl(value: string | undefined): string {
  const url = required('VITE_SUPABASE_URL', value).trim();
  // Strip trailing slashes and common accidental copy-pastes like '/rest/v1' or '/auth/v1'
  return url.replace(/\/+$/, '').replace(/\/(rest|auth)\/v1\/?$/, '');
}

export const env: AppEnv = {
  supabaseUrl: cleanSupabaseUrl(import.meta.env.VITE_SUPABASE_URL),
  supabaseAnonKey: required('VITE_SUPABASE_ANON_KEY', import.meta.env.VITE_SUPABASE_ANON_KEY),
  // Normalise away a trailing slash so path joins never double up.
  apiUrl: required('VITE_API_URL', import.meta.env.VITE_API_URL).replace(/\/+$/, ''),
  map: {
    styleUrl: import.meta.env.VITE_MAP_STYLE_URL ?? 'https://tiles.openfreemap.org/styles/liberty',
    defaultLat: numberWithDefault(import.meta.env.VITE_MAP_DEFAULT_LAT, 9.0765),
    defaultLng: numberWithDefault(import.meta.env.VITE_MAP_DEFAULT_LNG, 7.3986),
    defaultZoom: numberWithDefault(import.meta.env.VITE_MAP_DEFAULT_ZOOM, 6),
  },
  googleMaps: {
    apiKey: optionalString(import.meta.env.VITE_GOOGLE_MAPS_API_KEY),
    mapId: import.meta.env.VITE_GOOGLE_MAPS_MAP_ID ?? 'DEMO_MAP_ID',
  },
  vapidPublicKey: import.meta.env.VITE_VAPID_PUBLIC_KEY ?? null,
};
