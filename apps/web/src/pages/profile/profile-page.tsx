import { ALERT_RADIUS_OPTIONS_KM, SEVERITY_PRESENTATION } from '@crisis/config';
import { SEVERITIES } from '@crisis/types';
import type { NotificationPreferences, Profile, SavedLocation, Severity } from '@crisis/types';
import { notificationPreferencesSchema, updateProfileSchema } from '@crisis/validation';
import type { NotificationPreferencesInput, UpdateProfileInput } from '@crisis/validation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { ErrorState } from '@/components/data-states';
import { Icon } from '@/components/icon';
import { LocationPicker } from '@/components/map/location-picker';
import type { PickedLocation } from '@/components/map/location-picker';
import { Container, PageHeader } from '@/components/page';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useAddSavedLocation,
  usePreferences,
  useRemoveSavedLocation,
  useSavedLocations,
  useUpdatePreferences,
  useUpdateProfile,
} from '@/hooks/use-profile';
import { IosInstallDialog } from '@/components/pwa/ios-install-dialog';
import { usePush } from '@/hooks/use-push';
import { usePwaInstall } from '@/hooks/use-pwa-install';
import { formatCoordinate, formatDate } from '@/lib/format';
import { ACCOUNT_STATUS_META, ROLE_LABELS } from '@/lib/labels';
import { useAuth } from '@/providers/auth-provider';

function initials(name: string | null, email: string | null): string {
  const source = name?.trim() || email || '?';
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const a = parts[0]?.[0] ?? '';
    const b = parts[1]?.[0] ?? '';
    return (a + b).toUpperCase() || '?';
  }
  return source.slice(0, 2).toUpperCase();
}

export function ProfilePage() {
  const { profile } = useAuth();

  if (!profile) {
    // ProtectedRoute guarantees an authenticated profile, but guard for safety.
    return (
      <Container className="py-8">
        <ErrorState title="Profile unavailable" />
      </Container>
    );
  }

  return (
    <Container className="py-8">
      <PageHeader
        title="Your account"
        description="Manage your profile, notifications, and saved places."
      />

      <Tabs defaultValue="profile">
        <TabsList className="mb-4">
          <TabsTrigger value="profile">
            <Icon name="user" className="size-4" aria-hidden />
            Profile
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Icon name="bell" className="size-4" aria-hidden />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="places">
            <Icon name="map-pin" className="size-4" aria-hidden />
            Saved places
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ProfileTab profile={profile} />
        </TabsContent>
        <TabsContent value="notifications">
          <NotificationsTab />
        </TabsContent>
        <TabsContent value="places">
          <SavedPlacesTab />
        </TabsContent>
      </Tabs>
    </Container>
  );
}

/* -------------------------------------------------------------------------- */
/* Profile tab                                                                 */
/* -------------------------------------------------------------------------- */

function ProfileTab({ profile }: { profile: Profile }) {
  const updateProfile = useUpdateProfile();
  const accountStatus = ACCOUNT_STATUS_META[profile.accountStatus];

  const form = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      fullName: profile.fullName ?? '',
      phone: profile.phone ?? '',
      avatarUrl: profile.avatarUrl ?? '',
      dataSaver: profile.dataSaver,
    },
  });

  const avatarUrl = form.watch('avatarUrl');

  const submit = form.handleSubmit((values) => {
    updateProfile.mutate({
      ...values,
      fullName: values.fullName?.trim() || undefined,
      phone: values.phone?.trim() ?? '',
      avatarUrl: values.avatarUrl?.trim() ?? '',
    });
  });

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Profile details</CardTitle>
          <CardDescription>
            This information helps responders and moderators reach you.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={submit} className="space-y-5" noValidate>
              <div className="flex items-center gap-4">
                <Avatar className="size-16">
                  {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
                  <AvatarFallback className="text-lg">
                    {initials(profile.fullName, profile.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="text-sm text-muted-foreground">
                  <div className="font-medium text-foreground">{profile.email ?? 'No email'}</div>
                  <div>Signed in with email</div>
                </div>
              </div>

              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full name</FormLabel>
                    <FormControl>
                      <Input placeholder="Your name" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone (optional)</FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="+234…" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormDescription>
                      Used only for follow-up on reports you submit.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="avatarUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Avatar URL (optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="url"
                        placeholder="https://…"
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dataSaver"
                render={({ field }) => (
                  <FormItem className="flex items-start justify-between gap-4 rounded-md border p-3">
                    <div>
                      <FormLabel>Data saver</FormLabel>
                      <FormDescription>
                        Reduce image quality and background updates on slow connections.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value ?? false} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex justify-end">
                <Button type="submit" disabled={updateProfile.isPending || !form.formState.isDirty}>
                  {updateProfile.isPending && (
                    <Icon name="loader" className="mr-2 size-4 animate-spin" aria-hidden />
                  )}
                  Save changes
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <InfoRow label="Role">{ROLE_LABELS[profile.role]}</InfoRow>
            <InfoRow label="Status">
              <span
                className="inline-flex items-center gap-1.5"
                style={{ color: accountStatus.color }}
              >
                <Icon name={accountStatus.icon} className="size-4" aria-hidden />
                {accountStatus.label}
              </span>
            </InfoRow>
            <InfoRow label="Reputation">{profile.reputation}</InfoRow>
            <InfoRow label="Member since">{formatDate(profile.createdAt)}</InfoRow>
          </CardContent>
        </Card>

        <PwaDeviceCard />
      </div>
    </div>
  );
}

function PwaDeviceCard() {
  const { isInstallable, isInstalled, showIOSGuide, setShowIOSGuide, promptInstall } =
    usePwaInstall();

  return (
    <>
      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Icon name="smartphone" className="size-4 text-primary" aria-hidden />
            App & Device
          </CardTitle>
          <CardDescription>
            Progressive Web App installation and offline status.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <InfoRow label="Experience">
            {isInstalled ? (
              <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400 font-medium">
                <Icon name="circle-check" className="size-3.5" aria-hidden />
                Installed App
              </span>
            ) : (
              <span className="text-muted-foreground">Browser Tab</span>
            )}
          </InfoRow>
          <InfoRow label="Offline caching">
            <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400 font-medium">
              <Icon name="circle-check" className="size-3.5" aria-hidden />
              Active
            </span>
          </InfoRow>

          {isInstallable && !isInstalled && (
            <div className="pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-1.5 font-semibold text-primary border-primary/40 hover:bg-primary/10"
                onClick={() => void promptInstall()}
              >
                <Icon name="download" className="size-3.5" aria-hidden />
                Install on this device
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <IosInstallDialog open={showIOSGuide} onOpenChange={setShowIOSGuide} />
    </>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{children}</span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Notifications tab                                                           */
/* -------------------------------------------------------------------------- */

function NotificationsTab() {
  const { data: prefs, isLoading, isError, error, refetch } = usePreferences();

  return (
    <div className="space-y-6">
      <PushCard />
      {isLoading ? (
        <Card>
          <CardContent className="space-y-4 py-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : isError || !prefs ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : (
        <PreferencesForm prefs={prefs} />
      )}
    </div>
  );
}

const PREF_TOGGLES: ReadonlyArray<{
  key: keyof Pick<
    NotificationPreferencesInput,
    | 'emergencyAlerts'
    | 'nearbyCrisisAlerts'
    | 'reportStatusUpdates'
    | 'safeLocationUpdates'
    | 'systemNotifications'
  >;
  label: string;
  description: string;
}> = [
  {
    key: 'emergencyAlerts',
    label: 'Emergency alerts',
    description: 'Critical, official alerts for your area. Strongly recommended.',
  },
  {
    key: 'nearbyCrisisAlerts',
    label: 'Nearby crisis reports',
    description: 'New incidents reported within your chosen radius.',
  },
  {
    key: 'reportStatusUpdates',
    label: 'Report status updates',
    description: 'When a report you submitted is verified, rejected, or needs info.',
  },
  {
    key: 'safeLocationUpdates',
    label: 'Safe location updates',
    description: 'Changes to shelters and relief points near you.',
  },
  {
    key: 'systemNotifications',
    label: 'System notifications',
    description: 'Account and service messages.',
  },
];

function PreferencesForm({ prefs }: { prefs: NotificationPreferences }) {
  const updatePreferences = useUpdatePreferences();

  const form = useForm<NotificationPreferencesInput>({
    resolver: zodResolver(notificationPreferencesSchema),
    defaultValues: {
      emergencyAlerts: prefs.emergencyAlerts,
      nearbyCrisisAlerts: prefs.nearbyCrisisAlerts,
      reportStatusUpdates: prefs.reportStatusUpdates,
      safeLocationUpdates: prefs.safeLocationUpdates,
      systemNotifications: prefs.systemNotifications,
      minSeverity: prefs.minSeverity,
      radiusKm: prefs.radiusKm,
      pushEnabled: prefs.pushEnabled,
    },
  });

  const submit = form.handleSubmit((values) => updatePreferences.mutate(values));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Notification preferences</CardTitle>
        <CardDescription>
          Choose what you want to hear about and how far around you.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={submit} className="space-y-5" noValidate>
            <div className="space-y-3">
              {PREF_TOGGLES.map((toggle) => (
                <FormField
                  key={toggle.key}
                  control={form.control}
                  name={toggle.key}
                  render={({ field }) => (
                    <FormItem className="flex items-start justify-between gap-4 rounded-md border p-3">
                      <div>
                        <FormLabel>{toggle.label}</FormLabel>
                        <FormDescription>{toggle.description}</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              ))}
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="minSeverity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Minimum severity</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(v) => field.onChange(v as Severity)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SEVERITIES.map((severity) => (
                          <SelectItem key={severity} value={severity}>
                            {SEVERITY_PRESENTATION[severity].label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>Only notify me at or above this level.</FormDescription>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="radiusKm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Alert radius</FormLabel>
                    <Select
                      value={String(field.value)}
                      onValueChange={(v) => field.onChange(Number(v))}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ALERT_RADIUS_OPTIONS_KM.map((km) => (
                          <SelectItem key={km} value={String(km)}>
                            {km} km
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>How far around you to watch for incidents.</FormDescription>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={updatePreferences.isPending || !form.formState.isDirty}
              >
                {updatePreferences.isPending && (
                  <Icon name="loader" className="mr-2 size-4 animate-spin" aria-hidden />
                )}
                Save preferences
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

function PushCard() {
  const { supported, permission, isSubscribed, isBusy, subscribe, unsubscribe } = usePush();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Push notifications on this device</CardTitle>
        <CardDescription>
          Receive alerts even when Aegis Map isn’t open in your browser.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!supported ? (
          <p className="text-sm text-muted-foreground">
            This browser doesn’t support push notifications. You’ll still see in-app notifications.
          </p>
        ) : permission === 'denied' ? (
          <p className="text-sm text-muted-foreground">
            Notifications are blocked for this site. Enable them in your browser settings, then
            return here.
          </p>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm">
              <span
                className={
                  isSubscribed
                    ? 'inline-flex items-center gap-1.5 font-medium text-green-600'
                    : 'inline-flex items-center gap-1.5 text-muted-foreground'
                }
              >
                <Icon
                  name={isSubscribed ? 'circle-check' : 'bell-off'}
                  className="size-4"
                  aria-hidden
                />
                {isSubscribed ? 'Enabled on this device' : 'Not enabled on this device'}
              </span>
            </div>
            <Button
              variant={isSubscribed ? 'outline' : 'default'}
              disabled={isBusy}
              onClick={() => void (isSubscribed ? unsubscribe() : subscribe())}
            >
              {isBusy && <Icon name="loader" className="mr-2 size-4 animate-spin" aria-hidden />}
              {isSubscribed ? 'Disable on this device' : 'Enable push'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/* Saved places tab                                                            */
/* -------------------------------------------------------------------------- */

function SavedPlacesTab() {
  const { data: locations, isLoading, isError, error, refetch } = useSavedLocations();
  const [addOpen, setAddOpen] = useState(false);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="text-base">Saved places</CardTitle>
          <CardDescription>
            Quick access to places that matter to you, like home or work.
          </CardDescription>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Icon name="plus" className="mr-2 size-4" aria-hidden />
              Add place
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add a saved place</DialogTitle>
            </DialogHeader>
            <AddSavedLocation onDone={() => setAddOpen(false)} />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : isError ? (
          <ErrorState error={error} onRetry={() => void refetch()} />
        ) : (locations?.length ?? 0) === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            You haven’t saved any places yet.
          </p>
        ) : (
          <ul className="divide-y">
            {(locations ?? []).map((location) => (
              <SavedLocationRow key={location.id} location={location} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function SavedLocationRow({ location }: { location: SavedLocation }) {
  const removeSavedLocation = useRemoveSavedLocation();

  return (
    <li className="flex items-center gap-3 py-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted">
        <Icon name="map-pin" className="size-4 text-muted-foreground" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <div className="font-medium">{location.label}</div>
        <div className="truncate text-sm text-muted-foreground">
          {location.address ?? formatCoordinate(location.lat, location.lng)}
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Remove ${location.label}`}
        disabled={removeSavedLocation.isPending}
        onClick={() => removeSavedLocation.mutate(location.id)}
      >
        <Icon name="trash" className="size-4" aria-hidden />
      </Button>
    </li>
  );
}

function AddSavedLocation({ onDone }: { onDone: () => void }) {
  const addSavedLocation = useAddSavedLocation();
  const [label, setLabel] = useState('');
  const [picked, setPicked] = useState<PickedLocation | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);

  const submit = () => {
    setAttempted(true);
    if (!label.trim() || !picked) return;
    addSavedLocation.mutate(
      { label: label.trim(), lat: picked.lat, lng: picked.lng, address },
      { onSuccess: onDone },
    );
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="place-label">Label</Label>
        <Input
          id="place-label"
          placeholder="e.g. Home, Work, School"
          maxLength={80}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
        {attempted && !label.trim() && (
          <p className="text-sm font-medium text-destructive">Please enter a label.</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Location</Label>
        <LocationPicker
          value={picked}
          onChange={setPicked}
          onResolveName={(name) => setAddress(name)}
        />
        {attempted && !picked && (
          <p className="text-sm font-medium text-destructive">Please choose a location.</p>
        )}
      </div>

      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onDone}
          disabled={addSavedLocation.isPending}
        >
          Cancel
        </Button>
        <Button type="button" onClick={submit} disabled={addSavedLocation.isPending}>
          {addSavedLocation.isPending && (
            <Icon name="loader" className="mr-2 size-4 animate-spin" aria-hidden />
          )}
          Save place
        </Button>
      </div>
    </div>
  );
}
