import { SAFE_LOCATION_PRESENTATION } from '@crisis/config';
import type { SafeLocation } from '@crisis/types';
import type { SafeLocationInput } from '@crisis/validation';
import { useCallback, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { ErrorState } from '@/components/data-states';
import { Icon } from '@/components/icon';
import { MapView } from '@/components/map/map-view';
import { Container } from '@/components/page';
import { SafeLocationForm } from '@/components/safe-locations/safe-location-form';
import { SafeLocationTypeBadge, VerificationBadge } from '@/components/status-badges';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useDeleteSafeLocation,
  useSafeLocation,
  useUpdateSafeLocation,
  useVerifySafeLocation,
} from '@/hooks/use-safe-locations';
import { useWhat3Words } from '@/hooks/use-w3w';
import { formatDateTime } from '@/lib/format';
import { OPERATING_STATUS_META } from '@/lib/labels';
import { routes } from '@/lib/routes';
import { useAuth } from '@/providers/auth-provider';

export function SafeLocationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: location, isLoading, isError, error, refetch } = useSafeLocation(id);

  return (
    <Container size="narrow" className="py-8">
      <Link
        to={routes.safeLocations}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <Icon name="arrow-left" className="size-4" aria-hidden />
        All safe locations
      </Link>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : isError || !location ? (
        <ErrorState
          error={error}
          title="Safe location unavailable"
          onRetry={() => void refetch()}
        />
      ) : (
        <SafeLocationDetail location={location} />
      )}
    </Container>
  );
}

function SafeLocationDetail({ location }: { location: SafeLocation }) {
  const { isModerator } = useAuth();
  const navigate = useNavigate();
  const operating = OPERATING_STATUS_META[location.operatingStatus];
  const preset = SAFE_LOCATION_PRESENTATION[location.type];
  const { data: w3w } = useWhat3Words(location.lat, location.lng);

  const copyW3W = useCallback(() => {
    if (!w3w?.words) return;
    const text = w3w.words.startsWith('///') ? w3w.words : `///${w3w.words}`;
    navigator.clipboard.writeText(text).then(
      () => {},
      () => {},
    );
  }, [w3w]);

  const [editOpen, setEditOpen] = useState(false);
  const updateLocation = useUpdateSafeLocation();
  const verifyLocation = useVerifySafeLocation();
  const deleteLocation = useDeleteSafeLocation();

  const editDefaults: Partial<SafeLocationInput> = {
    name: location.name,
    description: location.description,
    type: location.type,
    lat: location.lat,
    lng: location.lng,
    address: location.address,
    phone: location.phone,
    capacity: location.capacity,
    operatingStatus: location.operatingStatus,
    openingHours: location.openingHours,
    facilities: location.facilities,
  };

  return (
    <article>
      <div className="flex flex-wrap items-center gap-2">
        <SafeLocationTypeBadge type={location.type} />
        <VerificationBadge status={location.verificationStatus} />
        <span
          className="inline-flex items-center gap-1.5 text-sm font-medium"
          style={{ color: operating.color }}
        >
          <span
            className="inline-block size-2 rounded-full"
            style={{ backgroundColor: operating.color }}
          />
          {operating.label}
        </span>
        {!location.isActive && (
          <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
            Inactive
          </span>
        )}
      </div>

      <h1 className="mt-3 flex items-start gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
        <Icon
          name={preset.icon}
          className="mt-1 size-6 shrink-0"
          style={{ color: preset.color }}
          aria-hidden
        />
        {location.name}
      </h1>

      {location.description && (
        <p className="mt-3 whitespace-pre-line text-muted-foreground">{location.description}</p>
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {location.address && (
          <DetailRow icon="map-pin" label="Address">
            {location.address}
          </DetailRow>
        )}
        {location.phone && (
          <DetailRow icon="phone" label="Phone">
            <a href={`tel:${location.phone}`} className="text-primary hover:underline">
              {location.phone}
            </a>
          </DetailRow>
        )}
        {location.capacity != null && (
          <DetailRow icon="users" label="Capacity">
            {location.capacity.toLocaleString()} people
          </DetailRow>
        )}
        {location.openingHours && (
          <DetailRow icon="clock" label="Opening hours">
            {location.openingHours}
          </DetailRow>
        )}
      </div>

      {location.facilities.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-2 text-sm font-semibold">Facilities</h2>
          <ul className="flex flex-wrap gap-2">
            {location.facilities.map((facility) => (
              <li
                key={facility}
                className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"
              >
                <Icon name="check" className="size-3" aria-hidden />
                {facility}
              </li>
            ))}
          </ul>
        </div>
      )}

      <section className="mt-6">
        <div className="h-64 overflow-hidden rounded-lg border">
          <MapView
            interactive={false}
            center={{ lat: location.lat, lng: location.lng }}
            zoom={14}
            markers={[
              {
                id: location.id,
                lat: location.lat,
                lng: location.lng,
                color: preset.color,
                label: location.name,
              },
            ]}
            ariaLabel={`Map showing the location of ${location.name}`}
          />
        </div>
        {/* What3Words + coordinates row */}
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
          <p className="text-xs text-muted-foreground">
            Coordinates:{' '}
            <span className="font-medium text-foreground">
              {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
            </span>
          </p>
          {w3w?.words && (
            <button
              type="button"
              onClick={copyW3W}
              title="Click to copy What3Words address"
              className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-100 dark:border-red-800 dark:bg-red-950 dark:text-red-300 dark:hover:bg-red-900"
            >
              <Icon name="grid-3x3" className="size-3" aria-hidden />
              {w3w.words.startsWith('///') ? w3w.words : `///${w3w.words}`}
              <Icon name="copy" className="ml-0.5 size-3 opacity-60" aria-hidden />
            </button>
          )}
        </div>
      </section>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button asChild>
          <Link
            to={routes.routing}
            state={{
              destination: { lat: location.lat, lng: location.lng, name: location.name },
            }}
          >
            <Icon name="route" className="mr-2 size-4" aria-hidden />
            Plan a safe route here
          </Link>
        </Button>
      </div>

      {isModerator && (
        <Card className="mt-8 border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Icon name="shield-check" className="size-4" aria-hidden />
              Moderator actions
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            {location.verificationStatus !== 'VERIFIED' && (
              <Button
                variant="outline"
                onClick={() => verifyLocation.mutate(location.id)}
                disabled={verifyLocation.isPending}
              >
                {verifyLocation.isPending ? (
                  <Icon name="loader" className="mr-2 size-4 animate-spin" aria-hidden />
                ) : (
                  <Icon name="badge-check" className="mr-2 size-4" aria-hidden />
                )}
                Mark verified
              </Button>
            )}

            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Icon name="pencil" className="mr-2 size-4" aria-hidden />
              Edit
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <Icon name="trash" className="mr-2 size-4" aria-hidden />
                  Remove
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove this safe location?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will remove “{location.name}” from the map. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() =>
                      deleteLocation.mutate(location.id, {
                        onSuccess: () => navigate(routes.safeLocations),
                      })
                    }
                  >
                    Remove
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      )}

      <p className="mt-8 text-xs text-muted-foreground">
        Last updated {formatDateTime(location.updatedAt)}. Conditions can change rapidly during a
        crisis — call ahead where possible and follow guidance from official responders.
      </p>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit safe location</DialogTitle>
            <DialogDescription>Update the details for “{location.name}”.</DialogDescription>
          </DialogHeader>
          <SafeLocationForm
            defaultValues={editDefaults}
            submitting={updateLocation.isPending}
            submitLabel="Save changes"
            onCancel={() => setEditOpen(false)}
            onSubmit={(values) =>
              updateLocation.mutate(
                { id: location.id, input: values },
                { onSuccess: () => setEditOpen(false) },
              )
            }
          />
        </DialogContent>
      </Dialog>
    </article>
  );
}

function DetailRow({
  icon,
  label,
  children,
}: {
  icon: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon name={icon} className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
      <div>
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        <div className="text-sm">{children}</div>
      </div>
    </div>
  );
}
