import { SAFE_LOCATION_PRESENTATION } from '@crisis/config';
import { OPERATING_STATUSES, SAFE_LOCATION_TYPES } from '@crisis/types';
import { safeLocationSchema, type SafeLocationInput } from '@crisis/validation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { Icon } from '@/components/icon';
import { LocationPicker } from '@/components/map/location-picker';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
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
import { Textarea } from '@/components/ui/textarea';
import { OPERATING_STATUS_META } from '@/lib/labels';

interface SafeLocationFormProps {
  defaultValues?: Partial<SafeLocationInput>;
  submitting?: boolean;
  submitLabel?: string;
  onSubmit: (values: SafeLocationInput) => void;
  onCancel?: () => void;
}

const emptyToNull = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

/**
 * Shared create/edit form for safe locations. Used by the public "suggest a
 * location" flow and by moderator editing on the detail page.
 */
export function SafeLocationForm({
  defaultValues,
  submitting = false,
  submitLabel = 'Submit',
  onSubmit,
  onCancel,
}: SafeLocationFormProps) {
  const form = useForm<SafeLocationInput>({
    resolver: zodResolver(safeLocationSchema),
    defaultValues: {
      name: '',
      description: '',
      address: '',
      phone: '',
      openingHours: '',
      capacity: null,
      operatingStatus: 'UNKNOWN',
      facilities: [],
      ...defaultValues,
    },
  });

  const [facilitiesText, setFacilitiesText] = useState(
    (defaultValues?.facilities ?? []).join(', '),
  );

  const lat = form.watch('lat');
  const lng = form.watch('lng');

  const submit = form.handleSubmit((values) => {
    const facilities = facilitiesText
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 30);

    onSubmit({
      ...values,
      description: emptyToNull(values.description),
      address: emptyToNull(values.address),
      phone: emptyToNull(values.phone),
      openingHours: emptyToNull(values.openingHours),
      capacity: values.capacity ?? null,
      facilities,
    });
  });

  return (
    <Form {...form}>
      <form onSubmit={submit} className="space-y-5" noValidate>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g. National Stadium Evacuation Centre"
                  maxLength={160}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type</FormLabel>
              <Select value={field.value || undefined} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {SAFE_LOCATION_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      <span className="flex items-center gap-2">
                        <Icon
                          name={SAFE_LOCATION_PRESENTATION[type].icon}
                          className="size-4"
                          style={{ color: SAFE_LOCATION_PRESENTATION[type].color }}
                          aria-hidden
                        />
                        {SAFE_LOCATION_PRESENTATION[type].label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (optional)</FormLabel>
              <FormControl>
                <Textarea
                  rows={3}
                  placeholder="What services does this location provide?"
                  maxLength={2000}
                  {...field}
                  value={field.value ?? ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-2">
          <Label>Location</Label>
          <LocationPicker
            value={lat != null && lng != null ? { lat, lng } : null}
            onChange={(pos) => {
              form.setValue('lat', pos.lat, { shouldValidate: true });
              form.setValue('lng', pos.lng, { shouldValidate: true });
            }}
            onResolveName={(name) => {
              if (!form.getValues('address')) form.setValue('address', name);
            }}
          />
          {(form.formState.errors.lat || form.formState.errors.lng) && (
            <p className="text-sm font-medium text-destructive">
              Please choose a location on the map.
            </p>
          )}
        </div>

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address (optional)</FormLabel>
              <FormControl>
                <Input placeholder="Street address" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone (optional)</FormLabel>
                <FormControl>
                  <Input type="tel" placeholder="+234…" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="capacity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Capacity (optional)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    placeholder="Number of people"
                    value={field.value ?? ''}
                    onChange={(e) =>
                      field.onChange(e.target.value === '' ? null : Number(e.target.value))
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="operatingStatus"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Operating status</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {OPERATING_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {OPERATING_STATUS_META[status].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="openingHours"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Opening hours (optional)</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. 24/7" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="facilities">Facilities (optional)</Label>
          <Input
            id="facilities"
            placeholder="water, medical, food, wheelchair-access"
            value={facilitiesText}
            onChange={(e) => setFacilitiesText(e.target.value)}
          />
          <p className="text-sm text-muted-foreground">Separate facilities with commas.</p>
        </div>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={submitting}>
            {submitting && <Icon name="loader" className="mr-2 size-4 animate-spin" aria-hidden />}
            {submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  );
}
