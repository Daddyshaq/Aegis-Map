import { env } from '../../config/env';

import { OsrmRoutingProvider } from './osrm';
import type { RoutingProvider } from './types';

let provider: RoutingProvider | null = null;

/**
 * Resolve the configured routing provider. New providers (OpenRouteService,
 * GraphHopper, Google) implement `RoutingProvider` and are wired in here.
 */
export function getRoutingProvider(): RoutingProvider {
  if (provider) return provider;
  switch (env.ROUTING_PROVIDER) {
    case 'osrm':
    default:
      provider = new OsrmRoutingProvider(env.ROUTING_BASE_URL);
      break;
  }
  return provider;
}

export type { RoutingProvider, RawRoute } from './types';
