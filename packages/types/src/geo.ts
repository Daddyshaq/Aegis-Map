/** Geospatial primitives. Longitude first is GeoJSON convention. */

export interface LatLng {
  lat: number;
  lng: number;
}

/** GeoJSON [longitude, latitude] position. */
export type Position = [number, number];

export interface GeoJSONPoint {
  type: 'Point';
  coordinates: Position;
}

export interface GeoJSONPolygon {
  type: 'Polygon';
  /** Array of linear rings; the first is the exterior ring. */
  coordinates: Position[][];
}

export interface BoundingBox {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
}

export interface GeocodeResult {
  displayName: string;
  lat: number;
  lng: number;
  boundingBox?: BoundingBox;
  type?: string;
}
