import { RISK_PRESENTATION } from '@crisis/config';
import type { CrisisMapFeature } from '@crisis/types';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { Icon } from '@/components/icon';
import { MapView, type MapMarkerData } from '@/components/map/map-view';
import { RiskBadge, SeverityBadge, VerificationBadge } from '@/components/status-badges';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useCategories } from '@/hooks/use-categories';
import { useMapFeatures, type MapBounds } from '@/hooks/use-map';
import { formatRelativeTime } from '@/lib/format';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';

export function HomePage() {
  const [bounds, setBounds] = useState<MapBounds | null>(null);
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: categories } = useCategories();
  const queryBounds = useMemo<MapBounds | null>(
    () => (bounds ? { ...bounds, categoryId, verifiedOnly: verifiedOnly || undefined } : null),
    [bounds, categoryId, verifiedOnly],
  );
  const { data: features, isLoading, isError } = useMapFeatures(queryBounds);

  const categoryBySlug = useMemo(() => {
    const map = new Map<string, { name: string; icon: string; color: string }>();
    for (const c of categories ?? []) map.set(c.slug, c);
    return map;
  }, [categories]);

  const markers = useMemo<MapMarkerData[]>(
    () =>
      (features ?? []).map((f) => ({
        id: f.id,
        lat: f.lat,
        lng: f.lng,
        color: RISK_PRESENTATION[f.riskLevel].color,
        label: `${f.title} — ${RISK_PRESENTATION[f.riskLevel].label} risk`,
        onClick: setSelectedId,
      })),
    [features],
  );

  const selected = features?.find((f) => f.id === selectedId) ?? null;
  const count = features?.length ?? 0;

  return (
    <div className="lg:grid lg:h-[calc(100dvh-3.5rem)] lg:grid-cols-[1fr_400px]">
      {/* Map pane */}
      <div className="relative h-[55vh] lg:h-full">
        <MapView
          markers={markers}
          selectedId={selectedId}
          onBoundsChange={setBounds}
          showGeolocate
          ariaLabel="Live crisis map"
        />

        {/* Filters overlay */}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-col gap-2 p-3">
          <div className="pointer-events-auto flex flex-wrap items-center gap-2 rounded-lg border bg-background/95 p-2 shadow-sm backdrop-blur">
            <div className="flex items-center gap-1.5">
              <Switch id="verified-only" checked={verifiedOnly} onCheckedChange={setVerifiedOnly} />
              <Label htmlFor="verified-only" className="cursor-pointer text-xs">
                Verified only
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

        {/* Selected feature card */}
        {selected && (
          <div className="pointer-events-auto absolute inset-x-3 bottom-3 mx-auto max-w-md rounded-lg border bg-background p-4 shadow-lg">
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <SeverityBadge severity={selected.severity} size="sm" />
                <VerificationBadge status={selected.verificationStatus} size="sm" />
                <RiskBadge level={selected.riskLevel} size="sm" />
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
            <h2 className="mt-2 font-semibold leading-snug">{selected.title}</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {categoryBySlug.get(selected.categorySlug)?.name ?? selected.categorySlug} ·{' '}
              {formatRelativeTime(selected.reportedAt)}
            </p>
            <Button asChild size="sm" className="mt-3 w-full">
              <Link to={routes.reportDetail(selected.id)}>View full report</Link>
            </Button>
          </div>
        )}
      </div>

      {/* Sidebar list */}
      <aside className="flex flex-col border-t lg:h-full lg:overflow-hidden lg:border-l lg:border-t-0">
        <div className="flex items-center justify-between gap-2 border-b p-4">
          <div>
            <h1 className="font-semibold">Incidents in view</h1>
            <p className="text-xs text-muted-foreground" aria-live="polite">
              {isLoading ? 'Loading…' : `${count} shown`}
            </p>
          </div>
          <Button asChild size="sm">
            <Link to={routes.report}>
              <Icon name="plus" className="mr-1.5 size-4" aria-hidden />
              Report
            </Link>
          </Button>
        </div>

        <div className="flex-1 overflow-auto p-3">
          {isError ? (
            <p className="p-4 text-center text-sm text-muted-foreground">
              Could not load incidents for this area.
            </p>
          ) : count === 0 && !isLoading ? (
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
                  onSelect={() => setSelectedId(feature.id)}
                />
              ))}
            </ul>
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
