import { SAFE_LOCATION_PRESENTATION } from '@crisis/config';
import { SAFE_LOCATION_TYPES } from '@crisis/types';
import type { SafeLocation, SafeLocationType } from '@crisis/types';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { EmptyState, ErrorState } from '@/components/data-states';
import { Icon } from '@/components/icon';
import { MapView } from '@/components/map/map-view';
import type { MapMarkerData } from '@/components/map/map-view';
import { Container, PageHeader } from '@/components/page';
import { Pagination } from '@/components/pagination';
import { SafeLocationForm } from '@/components/safe-locations/safe-location-form';
import { SafeLocationTypeBadge, VerificationBadge } from '@/components/status-badges';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useCreateSafeLocation, useSafeLocations } from '@/hooks/use-safe-locations';
import { formatDistanceMeters } from '@/lib/format';
import { OPERATING_STATUS_META } from '@/lib/labels';
import { routes } from '@/lib/routes';
import { useAuth } from '@/providers/auth-provider';

const ALL = 'ALL';

export function SafeLocationsPage() {
  const { isAuthenticated } = useAuth();
  const [search, setSearch] = useState('');
  const [type, setType] = useState<SafeLocationType | typeof ALL>(ALL);
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [suggestOpen, setSuggestOpen] = useState(false);

  const debouncedSearch = useDebouncedValue(search, 400);
  const createLocation = useCreateSafeLocation();

  const { data, isLoading, isError, error, refetch } = useSafeLocations({
    q: debouncedSearch.trim() || undefined,
    type: type === ALL ? undefined : type,
    page,
  });

  const items = useMemo(() => data?.items ?? [], [data]);

  const markers = useMemo<MapMarkerData[]>(
    () =>
      items.map((location) => ({
        id: location.id,
        lat: location.lat,
        lng: location.lng,
        color: SAFE_LOCATION_PRESENTATION[location.type].color,
        label: location.name,
        onClick: setSelectedId,
      })),
    [items],
  );

  return (
    <Container size="wide" className="py-8">
      <PageHeader
        title="Safe locations"
        description="Verified shelters, hospitals, and relief points. Anyone can suggest a location; moderators verify them."
        actions={
          isAuthenticated ? (
            <Button onClick={() => setSuggestOpen(true)}>
              <Icon name="plus" className="mr-2 size-4" aria-hidden />
              Suggest a location
            </Button>
          ) : (
            <Button asChild variant="outline">
              <Link to={routes.login} state={{ from: { pathname: routes.safeLocations } }}>
                Sign in to suggest
              </Link>
            </Button>
          )
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Icon
            name="search"
            className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by name or address"
            className="pl-8"
            aria-label="Search safe locations"
          />
        </div>
        <Select
          value={type}
          onValueChange={(value) => {
            setType(value as SafeLocationType | typeof ALL);
            setPage(1);
          }}
        >
          <SelectTrigger className="sm:w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All types</SelectItem>
            {SAFE_LOCATION_TYPES.map((value) => (
              <SelectItem key={value} value={value}>
                {SAFE_LOCATION_PRESENTATION[value].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        <div>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-28 w-full" />
              ))}
            </div>
          ) : isError ? (
            <ErrorState error={error} onRetry={() => void refetch()} />
          ) : items.length === 0 ? (
            <EmptyState
              icon="shield-check"
              title="No safe locations found"
              description="Try adjusting your search or filters. You can also suggest a location you know about."
            />
          ) : (
            <>
              <ul className="space-y-3">
                {items.map((location) => (
                  <li key={location.id}>
                    <SafeLocationRow location={location} />
                  </li>
                ))}
              </ul>
              <Pagination pagination={data?.pagination} onPageChange={setPage} />
            </>
          )}
        </div>

        <div className="lg:sticky lg:top-20 lg:h-[calc(100dvh-8rem)]">
          <div className="h-72 overflow-hidden rounded-lg border lg:h-full">
            <MapView
              markers={markers}
              selectedId={selectedId}
              ariaLabel="Map of safe locations"
              showGeolocate
            />
          </div>
        </div>
      </div>

      <Dialog open={suggestOpen} onOpenChange={setSuggestOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Suggest a safe location</DialogTitle>
            <DialogDescription>
              Provide accurate details. Your suggestion will be reviewed by a moderator before it is
              marked verified.
            </DialogDescription>
          </DialogHeader>
          <SafeLocationForm
            submitting={createLocation.isPending}
            submitLabel="Submit for review"
            onCancel={() => setSuggestOpen(false)}
            onSubmit={(values) =>
              createLocation.mutate(values, { onSuccess: () => setSuggestOpen(false) })
            }
          />
        </DialogContent>
      </Dialog>
    </Container>
  );
}

function SafeLocationRow({ location }: { location: SafeLocation }) {
  const operating = OPERATING_STATUS_META[location.operatingStatus];

  return (
    <Card className="transition-colors hover:border-primary/40">
      <CardContent className="p-4">
        <Link to={routes.safeLocationDetail(location.id)} className="group block">
          <div className="flex flex-wrap items-center gap-1.5">
            <SafeLocationTypeBadge type={location.type} size="sm" />
            <VerificationBadge status={location.verificationStatus} size="sm" />
            <span
              className="inline-flex items-center gap-1 text-xs"
              style={{ color: operating.color }}
            >
              <span
                className="inline-block size-2 rounded-full"
                style={{ backgroundColor: operating.color }}
              />
              {operating.label}
            </span>
          </div>
          <h2 className="mt-2 font-semibold leading-snug group-hover:underline">{location.name}</h2>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {location.address && (
              <span className="inline-flex items-center gap-1">
                <Icon name="map-pin" className="size-3.5" aria-hidden />
                <span className="max-w-[20rem] truncate">{location.address}</span>
              </span>
            )}
            {location.distanceMeters != null && (
              <span>{formatDistanceMeters(location.distanceMeters)} away</span>
            )}
          </div>
        </Link>
      </CardContent>
    </Card>
  );
}
