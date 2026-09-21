import type { Feature, FeatureCollection, LineString } from 'geojson';
import maplibregl from 'maplibre-gl';
import type { AddLayerObject, GeoJSONSource } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useRef } from 'react';

import { env } from '@/lib/env';
import { cn } from '@/lib/utils';

export interface MapMarkerData {
  id: string;
  lat: number;
  lng: number;
  /** Hex fill for the pin. */
  color?: string;
  label?: string;
  onClick?: (id: string) => void;
}

export interface MapLineData {
  id: string;
  /** GeoJSON-order coordinates: [lng, lat] pairs. */
  coordinates: [number, number][];
  color?: string;
  width?: number;
}

export interface MapBoundsBox {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

export interface MapViewProps {
  className?: string;
  center?: { lat: number; lng: number };
  zoom?: number;
  markers?: MapMarkerData[];
  /** Polylines (e.g. planned routes) drawn beneath the markers. */
  lines?: MapLineData[];
  /** When set, the map animates to frame this box after it changes. */
  fitBounds?: MapBoundsBox | null;
  selectedId?: string | null;
  /** Emit viewport bounds after the map settles (for viewport-scoped queries). */
  onBoundsChange?: (bounds: MapBoundsBox) => void;
  /** Emit a click position (used by the location picker). */
  onMapClick?: (position: { lat: number; lng: number }) => void;
  /** A single draggable pin for picking a location. */
  picker?: { lat: number; lng: number } | null;
  onPickerChange?: (position: { lat: number; lng: number }) => void;
  interactive?: boolean;
  showNavigation?: boolean;
  showGeolocate?: boolean;
  ariaLabel?: string;
}

/**
 * Thin, declarative wrapper over MapLibre GL. The rest of the app never touches
 * the map SDK directly — it passes markers/handlers, so the underlying provider
 * (OpenStreetMap vector tiles by default) can be swapped without page changes.
 */
export function MapView({
  className,
  center,
  zoom,
  markers = [],
  lines = [],
  fitBounds,
  selectedId,
  onBoundsChange,
  onMapClick,
  picker,
  onPickerChange,
  interactive = true,
  showNavigation = true,
  showGeolocate = false,
  ariaLabel = 'Interactive map',
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const pickerMarkerRef = useRef<maplibregl.Marker | null>(null);
  const readyRef = useRef(false);

  // Keep the latest callbacks without re-initialising the map.
  const boundsCbRef = useRef(onBoundsChange);
  const clickCbRef = useRef(onMapClick);
  const pickerCbRef = useRef(onPickerChange);
  const linesRef = useRef(lines);
  const fitBoundsRef = useRef(fitBounds);
  boundsCbRef.current = onBoundsChange;
  clickCbRef.current = onMapClick;
  pickerCbRef.current = onPickerChange;
  linesRef.current = lines;
  fitBoundsRef.current = fitBounds;

  // Initialise the map exactly once.
  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: env.map.styleUrl,
      center: [center?.lng ?? env.map.defaultLng, center?.lat ?? env.map.defaultLat],
      zoom: zoom ?? env.map.defaultZoom,
      interactive,
      attributionControl: { compact: true },
    });
    mapRef.current = map;

    if (showNavigation && interactive) {
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    }
    if (showGeolocate && interactive) {
      map.addControl(
        new maplibregl.GeolocateControl({
          positionOptions: { enableHighAccuracy: true },
          trackUserLocation: false,
        }),
        'top-right',
      );
    }

    const emitBounds = () => {
      if (!boundsCbRef.current) return;
      const b = map.getBounds();
      boundsCbRef.current({
        minLng: b.getWest(),
        minLat: b.getSouth(),
        maxLng: b.getEast(),
        maxLat: b.getNorth(),
      });
    };

    map.on('load', () => {
      readyRef.current = true;
      emitBounds();
      applyLines(map, linesRef.current);
      applyFitBounds(map, fitBoundsRef.current);
    });
    map.on('moveend', emitBounds);

    map.on('click', (e) => {
      clickCbRef.current?.({ lat: e.lngLat.lat, lng: e.lngLat.lng });
    });

    // The marker collection ref is stable for the component's lifetime; copy it
    // so the cleanup closes over that exact instance (satisfies exhaustive-deps).
    const markers = markersRef.current;
    return () => {
      readyRef.current = false;
      markers.forEach((m) => m.remove());
      markers.clear();
      pickerMarkerRef.current?.remove();
      pickerMarkerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
    // Only run on mount; prop-driven updates are handled in effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reconcile data markers.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const existing = markersRef.current;
    const nextIds = new Set(markers.map((m) => m.id));

    // Remove markers no longer present.
    for (const [id, marker] of existing) {
      if (!nextIds.has(id)) {
        marker.remove();
        existing.delete(id);
      }
    }

    // Add or update markers.
    for (const data of markers) {
      const selected = data.id === selectedId;
      let marker = existing.get(data.id);
      if (!marker) {
        const el = createPinElement(data, selected);
        marker = new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat([
          data.lng,
          data.lat,
        ]);
        marker.addTo(map);
        existing.set(data.id, marker);
      } else {
        marker.setLngLat([data.lng, data.lat]);
        updatePinElement(marker.getElement(), data, selected);
      }
    }
  }, [markers, selectedId]);

  // Manage the draggable picker pin.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!picker) {
      pickerMarkerRef.current?.remove();
      pickerMarkerRef.current = null;
      return;
    }

    if (!pickerMarkerRef.current) {
      const marker = new maplibregl.Marker({ color: '#2563eb', draggable: true })
        .setLngLat([picker.lng, picker.lat])
        .addTo(map);
      marker.on('dragend', () => {
        const pos = marker.getLngLat();
        pickerCbRef.current?.({ lat: pos.lat, lng: pos.lng });
      });
      pickerMarkerRef.current = marker;
    } else {
      pickerMarkerRef.current.setLngLat([picker.lng, picker.lat]);
    }
  }, [picker]);

  // Recenter when the controlled center changes materially.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !center) return;
    map.flyTo({ center: [center.lng, center.lat], zoom: zoom ?? map.getZoom(), essential: true });
  }, [center, zoom]);

  // Reconcile polylines (routes) once the style is ready.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    applyLines(map, lines);
  }, [lines]);

  // Frame a bounding box (e.g. an entire route) when it changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current || !fitBounds) return;
    applyFitBounds(map, fitBounds);
  }, [fitBounds]);

  return (
    <div
      ref={containerRef}
      role="application"
      aria-label={ariaLabel}
      className={cn('h-full w-full overflow-hidden bg-muted', className)}
    />
  );
}

const ROUTE_SOURCE = 'aegis-route-lines';
const ROUTE_LAYER = 'aegis-route-lines-layer';

type RouteLineProps = { color: string; width: number };

/** Add or update the GeoJSON source + layer used to draw route polylines. */
function applyLines(map: maplibregl.Map, lines: MapLineData[]): void {
  const data: FeatureCollection<LineString, RouteLineProps> = {
    type: 'FeatureCollection',
    features: lines.map((line): Feature<LineString, RouteLineProps> => ({
      type: 'Feature',
      properties: { color: line.color ?? '#2563eb', width: line.width ?? 5 },
      geometry: { type: 'LineString', coordinates: line.coordinates },
    })),
  };

  const existing = map.getSource(ROUTE_SOURCE) as GeoJSONSource | undefined;
  if (existing) {
    existing.setData(data);
    return;
  }

  map.addSource(ROUTE_SOURCE, { type: 'geojson', data });
  const layer: AddLayerObject = {
    id: ROUTE_LAYER,
    type: 'line',
    source: ROUTE_SOURCE,
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': ['get', 'color'],
      'line-width': ['get', 'width'],
      'line-opacity': 0.9,
    },
  };
  map.addLayer(layer);
}

/** Animate the viewport to frame a bounding box. */
function applyFitBounds(map: maplibregl.Map, box: MapBoundsBox | null | undefined): void {
  if (!box) return;
  map.fitBounds(
    [
      [box.minLng, box.minLat],
      [box.maxLng, box.maxLat],
    ],
    { padding: 56, maxZoom: 15, duration: 600 },
  );
}

function createPinElement(data: MapMarkerData, selected: boolean): HTMLElement {
  const el = document.createElement('button');
  el.type = 'button';
  el.style.cursor = data.onClick ? 'pointer' : 'default';
  el.style.border = 'none';
  el.style.background = 'transparent';
  el.style.padding = '0';
  el.style.lineHeight = '0';
  if (data.label) el.setAttribute('aria-label', data.label);
  el.title = data.label ?? '';
  el.innerHTML = pinSvg(data.color ?? '#6b7280', selected);
  if (data.onClick) {
    el.addEventListener('click', (event) => {
      event.stopPropagation();
      data.onClick?.(data.id);
    });
  }
  return el;
}

function updatePinElement(el: HTMLElement, data: MapMarkerData, selected: boolean): void {
  el.innerHTML = pinSvg(data.color ?? '#6b7280', selected);
  if (data.label) {
    el.setAttribute('aria-label', data.label);
    el.title = data.label;
  }
}

/** Teardrop pin SVG; grows and gains a ring when selected. */
function pinSvg(color: string, selected: boolean): string {
  const size = selected ? 34 : 26;
  const ring = selected
    ? '<circle cx="12" cy="9" r="10.5" fill="none" stroke="#2563eb" stroke-width="1.5" opacity="0.9"/>'
    : '';
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 30" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 1px 1px rgba(0,0,0,.35))">
    ${ring}
    <path d="M12 0C6.7 0 2.4 4.3 2.4 9.6c0 6.6 8.2 19 9.6 19s9.6-12.4 9.6-19C21.6 4.3 17.3 0 12 0z" fill="${color}"/>
    <circle cx="12" cy="9.6" r="3.4" fill="#fff"/>
  </svg>`;
}
