import { useState } from 'react';

import { Icon } from '@/components/icon';
import { MapView } from '@/components/map/map-view';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useGeoSearch, useReverseGeocode } from '@/hooks/use-geo';
import { formatCoordinate } from '@/lib/format';
import { cn } from '@/lib/utils';

export interface PickedLocation {
  lat: number;
  lng: number;
}

interface LocationPickerProps {
  value: PickedLocation | null;
  onChange: (position: PickedLocation) => void;
  /** Called with a human-readable place name when one is resolved. */
  onResolveName?: (name: string) => void;
  className?: string;
}

/**
 * Location chooser combining address search, device geolocation, and a
 * draggable map pin. All three converge on a single lat/lng value.
 */
export function LocationPicker({ value, onChange, onResolveName, className }: LocationPickerProps) {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 400);
  const { data: results, isFetching } = useGeoSearch(debouncedSearch);
  const reverse = useReverseGeocode();
  const [locating, setLocating] = useState(false);

  const resolveName = (lat: number, lng: number) => {
    if (!onResolveName) return;
    reverse.mutate(
      { lat, lng },
      {
        onSuccess: (result) => {
          if (result?.displayName) onResolveName(result.displayName);
        },
      },
    );
  };

  const pick = (lat: number, lng: number, name?: string) => {
    onChange({ lat, lng });
    if (name && onResolveName) onResolveName(name);
    else resolveName(lat, lng);
  };

  const useMyLocation = () => {
    if (!('geolocation' in navigator)) {
      toast.error('Geolocation is not available on this device.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        pick(pos.coords.latitude, pos.coords.longitude);
      },
      (error) => {
        setLocating(false);
        toast.error(
          error.code === error.PERMISSION_DENIED
            ? 'Location permission denied.'
            : 'Could not determine your location.',
        );
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Icon
            name="search"
            className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search for an address or place"
            className="pl-8"
            aria-label="Search for a location"
          />
        </div>
        <Button type="button" variant="outline" onClick={useMyLocation} disabled={locating}>
          <Icon
            name={locating ? 'loader' : 'crosshair'}
            className={cn('size-4 sm:mr-2', locating && 'animate-spin')}
            aria-hidden
          />
          <span className="hidden sm:inline">Use my location</span>
        </Button>
      </div>

      {debouncedSearch.trim().length >= 3 && (
        <div className="rounded-md border">
          {isFetching && <p className="px-3 py-2 text-sm text-muted-foreground">Searching…</p>}
          {!isFetching && (results?.length ?? 0) === 0 && (
            <p className="px-3 py-2 text-sm text-muted-foreground">No matches found.</p>
          )}
          <ul className="max-h-48 divide-y overflow-auto">
            {results?.map((result, index) => (
              <li key={`${result.lat},${result.lng},${index}`}>
                <button
                  type="button"
                  onClick={() => {
                    pick(result.lat, result.lng, result.displayName);
                    setSearch('');
                  }}
                  className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
                >
                  <Icon
                    name="map-pin"
                    className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                  <span className="line-clamp-2">{result.displayName}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="h-64 overflow-hidden rounded-md border">
        <MapView
          ariaLabel="Choose a location by clicking or dragging the pin"
          center={value ?? undefined}
          zoom={value ? 14 : undefined}
          picker={value}
          onPickerChange={(pos) => pick(pos.lat, pos.lng)}
          onMapClick={(pos) => pick(pos.lat, pos.lng)}
          showGeolocate
        />
      </div>

      <p className="text-xs text-muted-foreground">
        {value ? (
          <>
            Selected:{' '}
            <span className="font-medium text-foreground">
              {formatCoordinate(value.lat, value.lng)}
            </span>
          </>
        ) : (
          'Click the map, drag the pin, search an address, or use your current location.'
        )}
      </p>
    </div>
  );
}
