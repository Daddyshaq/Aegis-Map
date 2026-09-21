import type { LatLng, Position } from '@crisis/types';

export interface RawRoute {
  geometry: Position[];
  distanceMeters: number;
  durationSeconds: number;
}

export interface RoutingProvider {
  readonly name: string;
  /**
   * Return one or more candidate routes between two points. Implementations
   * should request alternatives where the provider supports them so the risk
   * overlay can choose a safer option.
   */
  getRoutes(
    origin: LatLng,
    destination: LatLng,
    profile: 'driving' | 'walking' | 'cycling',
  ): Promise<RawRoute[]>;
}
