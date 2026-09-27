import { RISK_PRESENTATION, SAFE_LOCATION_PRESENTATION } from '@crisis/config';
import type { CrisisMapFeature, SafeLocation } from '@crisis/types';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { Icon } from '@/components/icon';
import { MapView, type MapMarkerData } from '@/components/map/map-view';
import {
  RiskBadge,
  SafeLocationTypeBadge,
  SeverityBadge,
  VerificationBadge,
} from '@/components/status-badges';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useCategories } from '@/hooks/use-categories';
import { useMapFeatures, type MapBounds } from '@/hooks/use-map';
import { useSafeLocations } from '@/hooks/use-safe-locations';
import { formatRelativeTime } from '@/lib/format';
import { OPERATING_STATUS_META } from '@/lib/labels';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';

export function HomePage() {
  const [bounds, setBounds] = useState<MapBounds | null>(null);
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [showSafeLocations, setShowSafeLocations] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedSafeId, setSelectedSafeId] = useState<string | null>(null);
  const [sidebarTab, setSidebarTab] = useState<'incidents' | 'safe'>('incidents');

  const { data: categories } = useCategories();
  const queryBounds = useMemo<MapBounds | null>(
    () => (bounds ? { ...bounds, categoryId, verifiedOnly: verifiedOnly || undefined } : null),
    [bounds, categoryId, verifiedOnly],
  );
  const { data: features, isLoading: isIncidentsLoading, isError: isIncidentsError } = useMapFeatures(queryBounds);
  const { data: safeLocationsData, isLoading: isSafeLoading } = useSafeLocations({ pageSize: 100 });

  const safeLocations = useMemo(() => safeLocationsData?.items ?? [], [safeLocationsData]);

  const categoryBySlug = useMemo(() => {
    const map = new Map<string, { name: string; icon: string; color: string }>();
    for (const c of categories ?? []) map.set(c.slug, c);
    return map;
  }, [categories]);

  const incidentMarkers = useMemo<MapMarkerData[]>(
    () =>
      (features ?? []).map((f) => ({
        id: f.id,
        lat: f.lat,
        lng: f.lng,
        color: RISK_PRESENTATION[f.riskLevel].color,
        label: `${f.title} — ${RISK_PRESENTATION[f.riskLevel].label} risk`,
        onClick: (id: string) => {
          setSelectedSafeId(null);
          setSelectedId(id);
        },
      })),
    [features],
  );

  const safeMarkers = useMemo<MapMarkerData[]>(
    () =>
      safeLocations.map((s) => ({
        id: `safe-${s.id}`,
        lat: s.lat,
        lng: s.lng,
        color: SAFE_LOCATION_PRESENTATION[s.type]?.color ?? '#10b981',
        label: `[Safe Haven] ${s.name} (${SAFE_LOCATION_PRESENTATION[s.type]?.label ?? s.type})`,
        onClick: () => {
          setSelectedId(null);
          setSelectedSafeId(s.id);
        },
      })),
    [safeLocations],
  );

  const markers = useMemo<MapMarkerData[]>(
    () => [...incidentMarkers, ...(showSafeLocations ? safeMarkers : [])],
    [incidentMarkers, showSafeLocations, safeMarkers],
  );

  const activeSelectedMarkerId = selectedId ?? (selectedSafeId ? `safe-${selectedSafeId}` : null);
  const selectedIncident = features?.find((f) => f.id === selectedId) ?? null;
  const selectedSafe = safeLocations.find((s) => s.id === selectedSafeId) ?? null;
  const incidentsCount = features?.length ?? 0;
  const safeCount = safeLocations.length;

  return (
    <div className="lg:grid lg:h-[calc(100dvh-3.5rem)] lg:grid-cols-[1fr_420px]">
      {/* Map pane */}
      <div className="relative h-[55vh] lg:h-full">
        <MapView
          markers={markers}
          selectedId={activeSelectedMarkerId}
          onBoundsChange={setBounds}
          showGeolocate
          ariaLabel="Live crisis and safe havens map"
        />

        {/* Filters overlay */}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-col gap-2 p-3">
          <div className="pointer-events-auto flex flex-wrap items-center gap-3 rounded-lg border bg-background/95 p-2.5 shadow-sm backdrop-blur">
            <div className="flex items-center gap-1.5">
              <Switch id="verified-only" checked={verifiedOnly} onCheckedChange={setVerifiedOnly} />
              <Label htmlFor="verified-only" className="cursor-pointer text-xs font-medium">
                Verified only
              </Label>
            </div>
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-1.5">
              <Switch
                id="show-safe"
                checked={showSafeLocations}
                onCheckedChange={setShowSafeLocations}
              />
              <Label
                htmlFor="show-safe"
                className="flex cursor-pointer items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400"
              >
                <Icon name="shield-check" className="size-3.5" aria-hidden />
                Safe havens ({safeCount})
              </Label>
            </div>
            <div className="h-4 w-px bg-border" />
            <div className="flex flex-1 flex-wrap items-center gap-1">
              <FilterChip active={!categoryId} onClick={() => setCategoryId(undefined)}>
                All
              </FilterChip>
              {(categories ?? []).map((category) => (
                <FilterChip
                  key={category.id}
                  active={categoryId === category.id}
                  onClick={() =>
                    setCategoryId((prev) => (prev === category.id ? undefined : category.id))
                  }
                >
                  <Icon name={category.icon} className="size-3.5" aria-hidden />
                  {category.name}
                </FilterChip>
              ))}
            </div>
          </div>
        </div>

        {/* Selected Incident card */}
        {selectedIncident && (
          <div className="pointer-events-auto absolute inset-x-3 bottom-3 mx-auto max-w-md rounded-lg border bg-background p-4 shadow-lg animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <SeverityBadge severity={selectedIncident.severity} size="sm" />
                <VerificationBadge status={selectedIncident.verificationStatus} size="sm" />
                <RiskBadge level={selectedIncident.riskLevel} size="sm" />
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                aria-label="Close"
                onClick={() => setSelectedId(null)}
              >
                <Icon name="x" className="size-4" aria-hidden />
              </Button>
            </div>
            <h2 className="mt-2 font-semibold leading-snug">{selectedIncident.title}</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {categoryBySlug.get(selectedIncident.categorySlug)?.name ?? selectedIncident.categorySlug} ·{' '}
              {formatRelativeTime(selectedIncident.reportedAt)}
            </p>
            <div className="mt-3 flex gap-2">
              <Button asChild size="sm" className="flex-1">
                <Link to={routes.reportDetail(selectedIncident.id)}>View full report</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link to={`${routes.routing}?destinationLat=${selectedIncident.lat}&destinationLng=${selectedIncident.lng}`}>
                  <Icon name="navigation" className="mr-1.5 size-3.5" aria-hidden />
                  Route
                </Link>
              </Button>
            </div>
          </div>
        )}

        {/* Selected Safe Location card */}
        {selectedSafe && (
          <div className="pointer-events-auto absolute inset-x-3 bottom-3 mx-auto max-w-md rounded-lg border border-emerald-500/30 bg-background p-4 shadow-lg animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <SafeLocationTypeBadge type={selectedSafe.type} size="sm" />
                <VerificationBadge status={selectedSafe.verificationStatus} size="sm" />
                {(() => {
                  const meta = OPERATING_STATUS_META[selectedSafe.operatingStatus];
                  return (
                    <span
                      className="inline-flex items-center gap-1 text-xs font-medium"
                      style={{ color: meta.color }}
                    >
                      <span className="size-2 rounded-full" style={{ backgroundColor: meta.color }} />
                      {meta.label}
                    </span>
                  );
                })()}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                aria-label="Close"
                onClick={() => setSelectedSafeId(null)}
              >
                <Icon name="x" className="size-4" aria-hidden />
              </Button>
            </div>
            <h2 className="mt-2 font-semibold leading-snug flex items-center gap-1.5 text-foreground">
              <Icon name="shield-check" className="size-4 text-emerald-500 shrink-0" aria-hidden />
              {selectedSafe.name}
            </h2>
            {selectedSafe.address && (
              <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                <Icon name="map-pin" className="size-3 shrink-0" aria-hidden />
                {selectedSafe.address}
              </p>
            )}
            {selectedSafe.openingHours && (
              <p className="mt-0.5 text-xs text-muted-foreground flex items-center gap-1">
                <Icon name="clock" className="size-3 shrink-0" aria-hidden />
                Hours: {selectedSafe.openingHours}
              </p>
            )}
            <div className="mt-3 flex gap-2">
              <Button asChild size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white">
                <Link to={routes.safeLocationDetail(selectedSafe.id)}>View details</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link to={`${routes.routing}?destinationLat=${selectedSafe.lat}&destinationLng=${selectedSafe.lng}`}>
                  <Icon name="navigation" className="mr-1.5 size-3.5" aria-hidden />
                  Directions
                </Link>
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Sidebar pane */}
      <aside className="flex flex-col border-t lg:h-full lg:overflow-hidden lg:border-l lg:border-t-0">
        {/* Tab switch header */}
        <div className="border-b p-3">
          <div className="flex items-center justify-between gap-2 pb-2">
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1 w-full max-w-[280px]">
              <button
                type="button"
                onClick={() => setSidebarTab('incidents')}
                className={cn(
                  'rounded-md py-1.5 px-3 text-xs font-medium transition-all',
                  sidebarTab === 'incidents'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                Incidents ({incidentsCount})
              </button>
              <button
                type="button"
                onClick={() => setSidebarTab('safe')}
                className={cn(
                  'flex items-center justify-center gap-1 rounded-md py-1.5 px-3 text-xs font-medium transition-all',
                  sidebarTab === 'safe'
                    ? 'bg-background text-emerald-600 shadow-sm dark:text-emerald-400'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon name="shield-check" className="size-3" aria-hidden />
                Safe Havens ({safeCount})
              </button>
            </div>

            {sidebarTab === 'incidents' ? (
              <Button asChild size="sm">
                <Link to={routes.report}>
                  <Icon name="plus" className="mr-1.5 size-3.5" aria-hidden />
                  Report
                </Link>
              </Button>
            ) : (
              <Button asChild size="sm" variant="outline">
                <Link to={routes.safeLocations}>
                  <Icon name="list" className="mr-1.5 size-3.5" aria-hidden />
                  All
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-auto p-3">
          {sidebarTab === 'incidents' ? (
            isIncidentsError ? (
              <p className="p-4 text-center text-sm text-muted-foreground">
                Could not load incidents for this area.
              </p>
            ) : incidentsCount === 0 && !isIncidentsLoading ? (
              <div className="flex flex-col items-center gap-2 p-8 text-center">
                <Icon name="shield-check" className="size-8 text-muted-foreground" aria-hidden />
                <p className="text-sm text-muted-foreground">
                  No incidents reported in this area. Pan or zoom the map to explore elsewhere.
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {(features ?? []).map((feature) => (
                  <FeatureRow
                    key={feature.id}
                    feature={feature}
                    selected={feature.id === selectedId}
                    onSelect={() => {
                      setSelectedSafeId(null);
                      setSelectedId(feature.id);
                    }}
                  />
                ))}
              </ul>
            )
          ) : (
            <div>
              {isSafeLoading ? (
                <p className="p-4 text-center text-sm text-muted-foreground">Loading safe havens…</p>
              ) : safeCount === 0 ? (
                <div className="flex flex-col items-center gap-2 p-8 text-center">
                  <Icon name="shield-check" className="size-8 text-muted-foreground" aria-hidden />
                  <p className="text-sm text-muted-foreground">No safe havens available currently.</p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {safeLocations.map((location) => (
                    <SafeHavenRow
                      key={location.id}
                      location={location}
                      selected={location.id === selectedSafeId}
                      onSelect={() => {
                        setSelectedId(null);
                        setSelectedSafeId(location.id);
                      }}
                    />
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-input bg-background hover:bg-accent',
      )}
    >
      {children}
    </button>
  );
}

function FeatureRow({
  feature,
  selected,
  onSelect,
}: {
  feature: CrisisMapFeature;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          'w-full rounded-lg border p-3 text-left transition-colors hover:bg-accent',
          selected && 'border-primary ring-1 ring-primary',
        )}
      >
        <div className="flex flex-wrap items-center gap-1.5">
          <SeverityBadge severity={feature.severity} size="sm" />
          <VerificationBadge status={feature.verificationStatus} size="sm" />
        </div>
        <p className="mt-1.5 line-clamp-1 font-medium">{feature.title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {formatRelativeTime(feature.reportedAt)}
        </p>
      </button>
    </li>
  );
}

function SafeHavenRow({
  location,
  selected,
  onSelect,
}: {
  location: SafeLocation;
  selected: boolean;
  onSelect: () => void;
}) {
  const meta = OPERATING_STATUS_META[location.operatingStatus];

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          'w-full rounded-lg border p-3 text-left transition-colors hover:bg-accent',
          selected && 'border-emerald-500 ring-1 ring-emerald-500 bg-emerald-500/5',
        )}
      >
        <div className="flex flex-wrap items-center gap-1.5">
          <SafeLocationTypeBadge type={location.type} size="sm" />
          <VerificationBadge status={location.verificationStatus} size="sm" />
          <span
            className="inline-flex items-center gap-1 text-xs font-medium ml-auto"
            style={{ color: meta.color }}
          >
            <span className="size-1.5 rounded-full" style={{ backgroundColor: meta.color }} />
            {meta.label}
          </span>
        </div>
        <p className="mt-1.5 line-clamp-1 font-medium text-foreground">{location.name}</p>
        {location.address && (
          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground flex items-center gap-1">
            <Icon name="map-pin" className="size-3 shrink-0" aria-hidden />
            {location.address}
          </p>
        )}
      </button>
    </li>
  );
}
