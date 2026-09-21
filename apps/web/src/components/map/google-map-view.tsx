/// <reference types="google.maps" />
import { APIProvider, Map, AdvancedMarker, Pin, useMap } from '@vis.gl/react-google-maps';
import { useCallback, useEffect, useRef } from 'react';

import { env } from '@/lib/env';
import { cn } from '@/lib/utils';

import type { MapLineData, MapViewProps } from './map-view';
// Re-export the shared types so consumers don't need to import from two files.
export type { MapViewProps } from './map-view';

/**
 * Google Maps implementation of the same MapView interface. Activated when a
 * Google Maps API key is configured (VITE_GOOGLE_MAPS_API_KEY).
 *
 * This component is designed to be a drop-in replacement for the MapLibre
 * `MapView`. The prop interface is identical, so the parent toggle can simply
 * swap the component.
 */
export function GoogleMapView({
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
  ariaLabel = 'Interactive map',
}: MapViewProps) {
  const apiKey = env.googleMaps.apiKey;

  if (!apiKey) {
    return (
      <div
        role="application"
        aria-label={ariaLabel}
        className={cn(
          'grid h-full w-full place-items-center bg-muted text-sm text-muted-foreground',
          className,
        )}
      >
        Google Maps requires an API key.
      </div>
    );
  }

  return (
    <APIProvider
      apiKey={apiKey}
      /* Required GMP attribution per google-maps-platform skill §3 */
      // @ts-expect-error — internal usage attribution prop
      internalUsageAttributionIds={['gmp_git_agentskills_v1']}
    >
      <div
        role="application"
        aria-label={ariaLabel}
        className={cn('h-full w-full overflow-hidden', className)}
      >
        <GoogleMapInner
          center={center}
          zoom={zoom}
          markers={markers}
          lines={lines}
          fitBounds={fitBounds}
          selectedId={selectedId}
          onBoundsChange={onBoundsChange}
          onMapClick={onMapClick}
          picker={picker}
          onPickerChange={onPickerChange}
          interactive={interactive}
        />
      </div>
    </APIProvider>
  );
}

function GoogleMapInner({
  center,
  zoom,
  markers,
  lines: _lines,
  fitBounds,
  selectedId,
  onBoundsChange,
  onMapClick,
  picker,
  onPickerChange,
  interactive,
}: Omit<MapViewProps, 'className' | 'ariaLabel' | 'showNavigation' | 'showGeolocate'>) {
  const map = useMap();
  const boundsRef = useRef(onBoundsChange);
  const clickRef = useRef(onMapClick);
  const pickerRef = useRef(onPickerChange);
  boundsRef.current = onBoundsChange;
  clickRef.current = onMapClick;
  pickerRef.current = onPickerChange;

  // Emit viewport bounds when the map moves.
  useEffect(() => {
    if (!map) return;
    const listener = map.addListener('idle', () => {
      const b = map.getBounds();
      if (!b || !boundsRef.current) return;
      const ne = b.getNorthEast();
      const sw = b.getSouthWest();
      boundsRef.current({
        minLng: sw.lng(),
        minLat: sw.lat(),
        maxLng: ne.lng(),
        maxLat: ne.lat(),
      });
    });
    return () => google.maps.event.removeListener(listener);
  }, [map]);

  // Handle map clicks (for location picking).
  useEffect(() => {
    if (!map) return;
    const listener = map.addListener('click', (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      clickRef.current?.({ lat: e.latLng.lat(), lng: e.latLng.lng() });
    });
    return () => google.maps.event.removeListener(listener);
  }, [map]);

  // Animate to fit bounds when they change.
  useEffect(() => {
    if (!map || !fitBounds) return;
    const b = new google.maps.LatLngBounds(
      { lat: fitBounds.minLat, lng: fitBounds.minLng },
      { lat: fitBounds.maxLat, lng: fitBounds.maxLng },
    );
    map.fitBounds(b, 56);
  }, [map, fitBounds]);

  // Draw polylines for routes.
  const polylinesRef = useRef<google.maps.Polyline[]>([]);
  useEffect(() => {
    if (!map) return;
    // Remove old polylines.
    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];

    if (!_lines || _lines.length === 0) return;

    for (const line of _lines as MapLineData[]) {
      const polyline = new google.maps.Polyline({
        path: line.coordinates.map(([lng, lat]) => ({ lat, lng })),
        strokeColor: line.color ?? '#2563eb',
        strokeWeight: line.width ?? 5,
        strokeOpacity: 0.9,
        map,
      });
      polylinesRef.current.push(polyline);
    }

    return () => {
      polylinesRef.current.forEach((p) => p.setMap(null));
      polylinesRef.current = [];
    };
  }, [map, _lines]);

  const handlePickerDragEnd = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      pickerRef.current?.({ lat: e.latLng.lat(), lng: e.latLng.lng() });
    },
    [],
  );

  return (
    <Map
      mapId={env.googleMaps.mapId}
      defaultCenter={center ?? { lat: env.map.defaultLat, lng: env.map.defaultLng }}
      defaultZoom={zoom ?? env.map.defaultZoom}
      center={center}
      zoom={zoom}
      gestureHandling={interactive ? 'auto' : 'none'}
      disableDefaultUI={!interactive}
      zoomControl={interactive}
      mapTypeControl={interactive}
      streetViewControl={false}
      fullscreenControl={false}
      style={{ width: '100%', height: '100%' }}
    >
      {/* Data markers */}
      {(markers ?? []).map((m) => {
        const isSelected = m.id === selectedId;
        return (
          <AdvancedMarker
            key={m.id}
            position={{ lat: m.lat, lng: m.lng }}
            title={m.label}
            onClick={() => m.onClick?.(m.id)}
          >
            <Pin
              background={m.color ?? '#6b7280'}
              borderColor={isSelected ? '#2563eb' : undefined}
              glyphColor="#fff"
              scale={isSelected ? 1.3 : 1}
            />
          </AdvancedMarker>
        );
      })}

      {/* Draggable picker pin */}
      {picker && (
        <AdvancedMarker
          position={{ lat: picker.lat, lng: picker.lng }}
          draggable
          onDragEnd={handlePickerDragEnd}
        >
          <Pin background="#2563eb" borderColor="#1d4ed8" glyphColor="#fff" scale={1.2} />
        </AdvancedMarker>
      )}
    </Map>
  );
}
