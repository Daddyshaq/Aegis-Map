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
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useCategories } from '@/hooks/use-categories';
import { useMapFeatures, type MapBounds } from '@/hooks/use-map';
import { useReports } from '@/hooks/use-reports';
import { useSafeLocations } from '@/hooks/use-safe-locations';
import { formatRelativeTime } from '@/lib/format';
import { OPERATING_STATUS_META } from '@/lib/labels';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';

export function HomePage() {
  const [bounds, setBounds] = useState<MapBounds | null>(null);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | undefined>();
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
  const {
    data: features,
    isLoading: isIncidentsLoading,
    isError: isIncidentsError,
  } = useMapFeatures(queryBounds);
  const { data: recentReportsData, isLoading: isReportsLoading } = useReports({ pageSize: 50 });
  const recentReports = useMemo(() => recentReportsData?.items ?? [], [recentReportsData]);
  const { data: safeLocationsData, isLoading: isSafeLoading } = useSafeLocations({ pageSize: 100 });

  const safeLocations = useMemo(() => safeLocationsData?.items ?? [], [safeLocationsData]);

  const categoryBySlug = useMemo(() => {
    const map = new Map<string, { name: string; icon: string; color: string }>();
    for (const c of categories ?? []) map.set(c.slug, c);
    return map;
  }, [categories]);

  const categoryById = useMemo(() => {
    const map = new Map<string, { name: string; slug: string; icon: string; color: string }>();
    for (const c of categories ?? []) map.set(c.id, c);
    return map;
  }, [categories]);

  const incidentMarkers = useMemo<MapMarkerData[]>(() => {
    const map = new Map<string, MapMarkerData>();
    // First populate from all active reports in the database
    for (const r of recentReports) {
      if (categoryId && r.categoryId !== categoryId) continue;
      if (verifiedOnly && r.verificationStatus !== 'VERIFIED') continue;
      map.set(r.id, {
        id: r.id,
        lat: r.lat,
        lng: r.lng,
        color: RISK_PRESENTATION[r.riskLevel].color,
        label: `${r.title} — ${RISK_PRESENTATION[r.riskLevel].label} risk`,
        onClick: (id: string) => {
          setSelectedSafeId(null);
          setSelectedId(id);
          setMapCenter({ lat: r.lat, lng: r.lng });
        },
      });
    }
    // Then layer in viewport-specific features
    for (const f of features ?? []) {
      map.set(f.id, {
        id: f.id,
        lat: f.lat,
        lng: f.lng,
        color: RISK_PRESENTATION[f.riskLevel].color,
        label: `${f.title} — ${RISK_PRESENTATION[f.riskLevel].label} risk`,
        onClick: (id: string) => {
          setSelectedSafeId(null);
          setSelectedId(id);
          setMapCenter({ lat: f.lat, lng: f.lng });
        },
      });
    }
    return Array.from(map.values());
  }, [features, recentReports, categoryId, verifiedOnly]);

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
          setMapCenter({ lat: s.lat, lng: s.lng });
        },
      })),
    [safeLocations],
  );

  const markers = useMemo<MapMarkerData[]>(
    () => [...incidentMarkers, ...(showSafeLocations ? safeMarkers : [])],
    [incidentMarkers, showSafeLocations, safeMarkers],
  );

  const activeSelectedMarkerId = selectedId ?? (selectedSafeId ? `safe-${selectedSafeId}` : null);
  const selectedIncident = useMemo(() => {
    if (!selectedId) return null;
    const feat = features?.find((f) => f.id === selectedId);
    if (feat) return feat;
    const rep = recentReports.find((r) => r.id === selectedId);
    if (!rep) return null;
    return {
      id: rep.id,
      reference: rep.reference,
      categoryId: rep.categoryId,
      categorySlug: rep.category?.slug ?? categoryById.get(rep.categoryId)?.slug ?? '',
      title: rep.title,
      severity: rep.severity,
      status: rep.status,
      verificationStatus: rep.verificationStatus,
      riskLevel: rep.riskLevel,
      lat: rep.lat,
      lng: rep.lng,
      reportedAt: rep.reportedAt,
      expiresAt: rep.expiresAt ?? null,
    };
  }, [selectedId, features, recentReports, categoryById]);
  const selectedSafe = safeLocations.find((s) => s.id === selectedSafeId) ?? null;

  const displayFeatures = useMemo(() => {
    const map = new Map<string, CrisisMapFeature>();

    // 1. Seed with all active reports from database matching filters
    for (const r of recentReports) {
      if (categoryId && r.categoryId !== categoryId) continue;
      if (verifiedOnly && r.verificationStatus !== 'VERIFIED') continue;
      map.set(r.id, {
        id: r.id,
        reference: r.reference,
        categoryId: r.categoryId,
        categorySlug: r.category?.slug ?? categoryById.get(r.categoryId)?.slug ?? '',
        title: r.title,
        severity: r.severity,
        status: r.status,
        verificationStatus: r.verificationStatus,
        riskLevel: r.riskLevel,
        lat: r.lat,
        lng: r.lng,
        reportedAt: r.reportedAt,
        expiresAt: r.expiresAt ?? null,
      });
    }

    // 2. Merge viewport features (which may contain fresh updates or spatial properties)
    for (const f of features ?? []) {
      if (categoryId && f.categoryId !== categoryId) continue;
      if (verifiedOnly && f.verificationStatus !== 'VERIFIED') continue;
      map.set(f.id, f);
    }

    const all = Array.from(map.values());

    // 3. Sort: incidents within active map bounds come first, then most recently reported
    if (bounds) {
      const minLat = Math.min(bounds.minLat, bounds.maxLat);
      const maxLat = Math.max(bounds.minLat, bounds.maxLat);
      const minLng = Math.min(bounds.minLng, bounds.maxLng);
      const maxLng = Math.max(bounds.minLng, bounds.maxLng);

      all.sort((a, b) => {
        const aInBounds = a.lat >= minLat && a.lat <= maxLat && a.lng >= minLng && a.lng <= maxLng;
        const bInBounds = b.lat >= minLat && b.lat <= maxLat && b.lng >= minLng && b.lng <= maxLng;
        if (aInBounds && !bInBounds) return -1;
        if (!aInBounds && bInBounds) return 1;
        return new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime();
      });
    } else {
      all.sort((a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime());
    }

    return all;
  }, [features, recentReports, bounds, categoryId, verifiedOnly, categoryById]);

  const incidentsCount = displayFeatures.length;
  const safeCount = safeLocations.length;

  return (
    <div className="lg:grid lg:h-[calc(100dvh-3.5rem)] lg:grid-cols-[1fr_420px]">
      {/* Map pane */}
      <div className="relative h-[55vh] lg:h-full">
        <MapView
          center={mapCenter}
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
              {categoryBySlug.get(selectedIncident.categorySlug)?.name ??
                selectedIncident.categorySlug}{' '}
              · {formatRelativeTime(selectedIncident.reportedAt)}
            </p>
            <div className="mt-3 flex gap-2">
              <Button asChild size="sm" className="flex-1">
                <Link to={routes.reportDetail(selectedIncident.id)}>View full report</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link
                  to={`${routes.routing}?destinationLat=${selectedIncident.lat}&destinationLng=${selectedIncident.lng}`}
                >
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
                      <span
                        className="size-2 rounded-full"
                        style={{ backgroundColor: meta.color }}
                      />
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
              <Button
                asChild
                size="sm"
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Link to={routes.safeLocationDetail(selectedSafe.id)}>View details</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link
                  to={`${routes.routing}?destinationLat=${selectedSafe.lat}&destinationLng=${selectedSafe.lng}`}
                >
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
            ) : incidentsCount === 0 && !isIncidentsLoading && !isReportsLoading ? (
              <div className="flex flex-col items-center gap-2 p-8 text-center">
                <Icon name="shield-check" className="size-8 text-muted-foreground" aria-hidden />
                <p className="text-sm text-muted-foreground">
                  No incidents reported currently. Pan or zoom the map to explore elsewhere.
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {displayFeatures.map((feature) => {
                  const inView = bounds
                    ? feature.lat >= Math.min(bounds.minLat, bounds.maxLat) &&
                      feature.lat <= Math.max(bounds.minLat, bounds.maxLat) &&
                      feature.lng >= Math.min(bounds.minLng, bounds.maxLng) &&
                      feature.lng <= Math.max(bounds.minLng, bounds.maxLng)
                    : false;

                  return (
                    <FeatureRow
                      key={feature.id}
                      feature={feature}
                      selected={feature.id === selectedId}
                      categoryName={
                        categoryBySlug.get(feature.categorySlug)?.name ??
                        categoryById.get(feature.categoryId)?.name
                      }
                      inView={inView}
                      onSelect={() => {
                        setSelectedSafeId(null);
                        setSelectedId(feature.id);
                        setMapCenter({ lat: feature.lat, lng: feature.lng });
                      }}
                    />
                  );
                })}
              </ul>
            )
          ) : (
            <div>
              {isSafeLoading ? (
                <p className="p-4 text-center text-sm text-muted-foreground">
                  Loading safe havens…
                </p>
              ) : safeCount === 0 ? (
                <div className="flex flex-col items-center gap-2 p-8 text-center">
                  <Icon name="shield-check" className="size-8 text-muted-foreground" aria-hidden />
                  <p className="text-sm text-muted-foreground">
                    No safe havens available currently.
                  </p>
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
                        setMapCenter({ lat: location.lat, lng: location.lng });
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
  categoryName,
  inView,
  onSelect,
}: {
  feature: CrisisMapFeature;
  selected: boolean;
  categoryName?: string;
  inView?: boolean;
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
        <div className="flex flex-wrap items-center justify-between gap-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <SeverityBadge severity={feature.severity} size="sm" />
            <VerificationBadge status={feature.verificationStatus} size="sm" />
            {categoryName && (
              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                {categoryName}
              </span>
            )}
          </div>
          {inView && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-primary">
              <span className="size-1.5 rounded-full bg-primary" />
              In map view
            </span>
          )}
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
