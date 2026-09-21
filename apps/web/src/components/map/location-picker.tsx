import { useCallback, useEffect, useState } from 'react';

import { Icon } from '@/components/icon';
import { MapView } from '@/components/map/map-view';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useGeoSearch, useReverseGeocode } from '@/hooks/use-geo';
import { useWhat3Words, useWhat3WordsAutosuggest, useWhat3WordsLookup } from '@/hooks/use-w3w';
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

/** Regex matching both `///word.word.word` and `word.word.word` patterns. */
const W3W_REGEX = /^(?:\/\/\/)?([a-z]+\.[a-z]+\.[a-z]+)$/i;

/**
 * Location chooser combining address search, device geolocation, What3Words
 * lookup, and a draggable map pin. All inputs converge on a single lat/lng value.
 */
export function LocationPicker({ value, onChange, onResolveName, className }: LocationPickerProps) {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 400);
  const isW3WQuery = W3W_REGEX.test(debouncedSearch.trim());

  // Standard geocoding search (disabled when the query looks like W3W).
  const { data: results, isFetching } = useGeoSearch(isW3WQuery ? '' : debouncedSearch);
  const reverse = useReverseGeocode();
  const [locating, setLocating] = useState(false);

  // What3Words lookup when input matches the pattern.
  const w3wWords = debouncedSearch.trim().replace(/^\/\/\//, '');
  const { data: w3wResult, isFetching: w3wFetching } = useWhat3WordsLookup(
    w3wWords,
    isW3WQuery,
  );

  // What3Words autosuggest for partial 3-word input.
  const isPartialW3W = debouncedSearch.includes('.') && !isW3WQuery && debouncedSearch.split('.').length >= 2;
  const { data: w3wSuggestions } = useWhat3WordsAutosuggest(
    isPartialW3W ? debouncedSearch.trim() : '',
  );

  // What3Words reverse lookup — shows the W3W address for the currently picked location.
  const { data: w3wReverse } = useWhat3Words(value?.lat, value?.lng);

  // When a W3W result comes back, auto-pick the location.
  useEffect(() => {
    if (w3wResult && isW3WQuery) {
      onChange({ lat: w3wResult.lat, lng: w3wResult.lng });
      if (onResolveName && w3wResult.nearestPlace) {
        onResolveName(w3wResult.nearestPlace);
      }
    }
    // Only trigger when the W3W result changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [w3wResult]);

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

  const copyW3W = useCallback(() => {
    if (!w3wReverse?.words) return;
    const text = `///${w3wReverse.words}`;
    navigator.clipboard.writeText(text).then(
      () => toast.success(`Copied ${text}`),
      () => toast.error('Failed to copy to clipboard.'),
    );
  }, [w3wReverse]);

  const showingGeoResults = !isW3WQuery && debouncedSearch.trim().length >= 3;
  const showingW3WSuggestions = isPartialW3W && (w3wSuggestions?.length ?? 0) > 0;

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
            placeholder="Search address, place, or ///what3words"
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

      {/* What3Words matching/loading indicator */}
      {isW3WQuery && w3wFetching && (
        <div className="flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 p-2 text-sm text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300">
          <Icon name="loader" className="size-4 animate-spin" aria-hidden />
          Resolving What3Words address…
        </div>
      )}

      {/* What3Words autosuggest results */}
      {showingW3WSuggestions && (
        <div className="rounded-md border">
          <p className="border-b px-3 py-1.5 text-xs font-medium text-muted-foreground">
            <Icon name="grid-3x3" className="mr-1 inline-block size-3" aria-hidden />
            What3Words suggestions
          </p>
          <ul className="max-h-48 divide-y overflow-auto">
            {w3wSuggestions?.map((suggestion) => (
              <li key={suggestion.words}>
                <button
                  type="button"
                  onClick={() => {
                    setSearch(`///${suggestion.words}`);
                  }}
                  className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
                >
                  <Icon
                    name="grid-3x3"
                    className="mt-0.5 size-4 shrink-0 text-red-500"
                    aria-hidden
                  />
                  <div>
                    <span className="font-mono text-sm font-medium">
                      ///{suggestion.words}
                    </span>
                    {suggestion.nearestPlace && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        near {suggestion.nearestPlace}
                      </span>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Standard geocoding results */}
      {showingGeoResults && (
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

      {/* Coordinate + What3Words display */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
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

        {/* What3Words badge */}
        {value && w3wReverse?.words && (
          <button
            type="button"
            onClick={copyW3W}
            title="Click to copy What3Words address"
            className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-100 dark:border-red-800 dark:bg-red-950 dark:text-red-300 dark:hover:bg-red-900"
          >
            <Icon name="grid-3x3" className="size-3" aria-hidden />
            {w3wReverse.words.startsWith('///') ? w3wReverse.words : `///${w3wReverse.words}`}
            <Icon name="copy" className="ml-0.5 size-3 opacity-60" aria-hidden />
          </button>
        )}
      </div>
    </div>
  );
}
