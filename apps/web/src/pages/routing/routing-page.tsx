import { RISK_PRESENTATION } from '@crisis/config';
import type { RouteResult } from '@crisis/types';
import type { RouteRequestInput } from '@crisis/validation';
import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { Icon } from '@/components/icon';
import { LocationPicker } from '@/components/map/location-picker';
import type { PickedLocation } from '@/components/map/location-picker';
import { MapView } from '@/components/map/map-view';
import type { MapBoundsBox, MapLineData, MapMarkerData } from '@/components/map/map-view';
import { Container, PageHeader } from '@/components/page';
import { SeverityBadge } from '@/components/status-badges';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useRoutePlanner } from '@/hooks/use-routing';
import { formatDistanceMeters, formatDuration } from '@/lib/format';
import { ROUTE_RISK_META } from '@/lib/labels';
import { cn } from '@/lib/utils';

type RouteProfile = RouteRequestInput['profile'];

const PROFILE_OPTIONS: ReadonlyArray<{ value: RouteProfile; label: string; icon: string }> = [
  { value: 'driving', label: 'Driving', icon: 'car' },
  { value: 'walking', label: 'Walking', icon: 'footprints' },
  { value: 'cycling', label: 'Cycling', icon: 'bike' },
];

const ORIGIN_COLOR = '#2563eb';
const DESTINATION_COLOR = '#7c3aed';

interface DestinationState {
  destination?: { lat: number; lng: number; name?: string };
}

function boundsOf(points: Array<[number, number]>): MapBoundsBox | null {
  if (points.length === 0) return null;
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;
  for (const [lng, lat] of points) {
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  }
  return { minLng, minLat, maxLng, maxLat };
}

export function RoutingPage() {
  const routerLocation = useLocation();
  const presetDestination = (routerLocation.state as DestinationState | null)?.destination;

  const [origin, setOrigin] = useState<PickedLocation | null>(null);
  const [destination, setDestination] = useState<PickedLocation | null>(
    presetDestination ? { lat: presetDestination.lat, lng: presetDestination.lng } : null,
  );
  const [profile, setProfile] = useState<RouteProfile>('driving');
  const [avoidCrisisZones, setAvoidCrisisZones] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const planner = useRoutePlanner();
  const result = planner.data;
  const routes = useMemo(() => result?.routes ?? [], [result]);
  const selectedRoute = routes[selectedIndex] ?? routes[0];

  // If arriving from a safe location, keep the preset in sync on navigation.
  useEffect(() => {
    if (presetDestination) {
      setDestination({ lat: presetDestination.lat, lng: presetDestination.lng });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetDestination?.lat, presetDestination?.lng]);

  const canPlan = origin != null && destination != null && !planner.isPending;

  const handlePlan = () => {
    if (!origin || !destination) return;
    planner.mutate(
      { origin, destination, profile, avoidCrisisZones },
      { onSuccess: () => setSelectedIndex(0) },
    );
  };

  const lines = useMemo<MapLineData[]>(
    () =>
      routes.map((route, index) => ({
        id: `route-${index}`,
        coordinates: route.geometry,
        color: index === selectedIndex ? ROUTE_RISK_META[route.risk].color : '#94a3b8',
        width: index === selectedIndex ? 6 : 3.5,
      })),
    [routes, selectedIndex],
  );

  const markers = useMemo<MapMarkerData[]>(() => {
    const list: MapMarkerData[] = [];
    if (origin)
      list.push({
        id: 'origin',
        lat: origin.lat,
        lng: origin.lng,
        color: ORIGIN_COLOR,
        label: 'Start',
      });
    if (destination)
      list.push({
        id: 'destination',
        lat: destination.lat,
        lng: destination.lng,
        color: DESTINATION_COLOR,
        label: 'Destination',
      });
    selectedRoute?.hazards.forEach((hazard) =>
      list.push({
        id: `hazard-${hazard.reportId}`,
        lat: hazard.lat,
        lng: hazard.lng,
        color: RISK_PRESENTATION[hazard.riskLevel].color,
        label: hazard.title,
      }),
    );
    return list;
  }, [origin, destination, selectedRoute]);

  const fitBounds = useMemo<MapBoundsBox | null>(() => {
    const points: Array<[number, number]> = [];
    if (selectedRoute) points.push(...selectedRoute.geometry);
    if (origin) points.push([origin.lng, origin.lat]);
    if (destination) points.push([destination.lng, destination.lat]);
    return boundsOf(points);
  }, [selectedRoute, origin, destination]);

  return (
    <Container size="wide" className="py-8">
      <PageHeader
        title="Safe route planning"
        description="Plan a route that accounts for reported crisis hazards along the way."
      />

      <Alert variant="warning" className="mb-6">
        <Icon name="triangle-alert" aria-hidden />
        <AlertTitle>Routes are guidance, not a safety guarantee</AlertTitle>
        <AlertDescription>
          Suggested routes are based on reports that may be incomplete, delayed, or unverified. No
          route is ever “absolutely safe”. Always use your own judgement, obey official
          instructions, and turn back if conditions look dangerous.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Starting point</CardTitle>
            </CardHeader>
            <CardContent>
              <LocationPicker value={origin} onChange={setOrigin} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Destination</CardTitle>
            </CardHeader>
            <CardContent>
              <LocationPicker value={destination} onChange={setDestination} />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-2">
                <Label htmlFor="route-profile">Travel mode</Label>
                <Select value={profile} onValueChange={(v) => setProfile(v as RouteProfile)}>
                  <SelectTrigger id="route-profile">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROFILE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <span className="flex items-center gap-2">
                          <Icon name={option.icon} className="size-4" aria-hidden />
                          {option.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-start justify-between gap-4 rounded-md border p-3">
                <div>
                  <Label htmlFor="avoid-crisis" className="cursor-pointer">
                    Avoid reported crisis zones
                  </Label>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    Prefer alternatives that steer clear of active hazards where possible.
                  </p>
                </div>
                <Switch
                  id="avoid-crisis"
                  checked={avoidCrisisZones}
                  onCheckedChange={setAvoidCrisisZones}
                />
              </div>

              <Button className="w-full" onClick={handlePlan} disabled={!canPlan}>
                {planner.isPending ? (
                  <Icon name="loader" className="mr-2 size-4 animate-spin" aria-hidden />
                ) : (
                  <Icon name="route" className="mr-2 size-4" aria-hidden />
                )}
                Find routes
              </Button>
              {!origin || !destination ? (
                <p className="text-center text-sm text-muted-foreground">
                  Choose a starting point and destination to plan a route.
                </p>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {routes.length > 0 ? (
            <>
              <div className="h-80 overflow-hidden rounded-lg border lg:sticky lg:top-20">
                <MapView
                  markers={markers}
                  lines={lines}
                  fitBounds={fitBounds}
                  ariaLabel="Map of planned routes and reported hazards"
                />
              </div>

              {result?.disclaimer && (
                <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                  {result.disclaimer}
                </p>
              )}

              <ul className="space-y-3">
                {routes.map((route, index) => (
                  <li key={index}>
                    <RouteCard
                      route={route}
                      index={index}
                      selected={index === selectedIndex}
                      onSelect={() => setSelectedIndex(index)}
                    />
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <Card className="flex h-full min-h-[20rem] items-center justify-center border-dashed">
              <div className="p-8 text-center text-muted-foreground">
                <Icon name="route" className="mx-auto mb-3 size-8 opacity-60" aria-hidden />
                <p className="font-medium">No route yet</p>
                <p className="mt-1 text-sm">
                  Your planned routes and any reported hazards along them will appear here.
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </Container>
  );
}

function RouteCard({
  route,
  index,
  selected,
  onSelect,
}: {
  route: RouteResult;
  index: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const risk = ROUTE_RISK_META[route.risk];

  return (
    <Card
      className={cn(
        'cursor-pointer transition-colors',
        selected ? 'border-primary ring-1 ring-primary' : 'hover:border-primary/40',
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className="block w-full rounded-lg p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold">
            {route.isAlternative ? `Alternative ${index}` : 'Recommended route'}
          </span>
          <span
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold"
            style={{ backgroundColor: risk.color, color: '#fff' }}
          >
            <Icon name={risk.icon} className="size-3.5" aria-hidden />
            {risk.label}
          </span>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Icon name="route" className="size-4" aria-hidden />
            {formatDistanceMeters(route.distanceMeters)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Icon name="clock" className="size-4" aria-hidden />
            {formatDuration(route.durationSeconds)}
          </span>
        </div>

        <p className="mt-2 text-sm">{route.advisory}</p>

        {route.hazards.length > 0 && (
          <div className="mt-3 border-t pt-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {route.hazards.length} reported hazard{route.hazards.length === 1 ? '' : 's'} near
              this route
            </p>
            <ul className="space-y-1.5">
              {route.hazards.slice(0, 5).map((hazard) => (
                <li key={hazard.reportId} className="flex items-center gap-2 text-sm">
                  <SeverityBadge severity={hazard.severity} size="sm" />
                  <span className="min-w-0 flex-1 truncate">{hazard.title}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatDistanceMeters(hazard.distanceMeters)} away
                  </span>
                </li>
              ))}
              {route.hazards.length > 5 && (
                <li className="text-xs text-muted-foreground">+ {route.hazards.length - 5} more</li>
              )}
            </ul>
          </div>
        )}
      </button>
    </Card>
  );
}
