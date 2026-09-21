import type { EmergencyGuide } from '@crisis/types';
import { emergencyGuideSchema, type EmergencyGuideInput } from '@crisis/validation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { EmptyState, ErrorState } from '@/components/data-states';
import { Icon } from '@/components/icon';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useAdminGuides, useCreateGuide, useDeleteGuide, useUpdateGuide } from '@/hooks/use-admin';
import { useCategories } from '@/hooks/use-categories';
import { SectionHeader } from '@/pages/admin/admin-layout';

const NONE = 'NONE';

type Editing = EmergencyGuide | 'new' | null;

export function AdminGuidesPage() {
  const { data: guides, isLoading, isError, error, refetch } = useAdminGuides();
  const updateGuide = useUpdateGuide();
  const deleteGuide = useDeleteGuide();
  const [editing, setEditing] = useState<Editing>(null);

  return (
    <div>
      <SectionHeader
        title="Emergency guides"
        description="Author the safety guides shown to the public. Only published guides are visible to citizens."
        actions={
          <Button size="sm" onClick={() => setEditing('new')}>
            <Icon name="plus" className="mr-1.5 size-4" aria-hidden />
            New guide
          </Button>
        }
      />

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : !guides || guides.length === 0 ? (
        <EmptyState
          icon="book-open"
          title="No guides yet"
          description="Create your first emergency guide to help citizens prepare and respond."
          action={
            <Button onClick={() => setEditing('new')}>
              <Icon name="plus" className="mr-1.5 size-4" aria-hidden />
              New guide
            </Button>
          }
        />
      ) : (
        <ul className="space-y-2">
          {guides.map((guide) => (
            <li key={guide.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-md bg-muted">
                <Icon name={guide.icon} className="size-5 text-muted-foreground" aria-hidden />
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{guide.title}</span>
                  {guide.isPublished ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-500">
                      <Icon name="circle-check" className="size-3.5" aria-hidden />
                      Published
                    </span>
                  ) : (
                    <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                      Draft
                    </span>
                  )}
                </div>
                <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">{guide.summary}</p>
                <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                  <span className="font-mono">{guide.slug}</span>
                  <span>Order {guide.sortOrder}</span>
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm">
                <span className="sr-only">
                  {guide.isPublished ? 'Unpublish' : 'Publish'} {guide.title}
                </span>
                <Switch
                  checked={guide.isPublished}
                  disabled={updateGuide.isPending}
                  onCheckedChange={(checked) =>
                    updateGuide.mutate({ id: guide.id, input: { isPublished: checked } })
                  }
                />
                <span className="text-muted-foreground">Published</span>
              </label>

              <Button variant="outline" size="sm" onClick={() => setEditing(guide)}>
                <Icon name="pencil" className="mr-1.5 size-4" aria-hidden />
                Edit
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Icon name="trash" className="size-4" aria-hidden />
                    <span className="sr-only">Delete {guide.title}</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this guide?</AlertDialogTitle>
                    <AlertDialogDescription>
                      “{guide.title}” will be permanently removed. This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() => deleteGuide.mutate(guide.id)}
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          {editing && (
            <GuideForm
              key={editing === 'new' ? 'new' : editing.id}
              guide={editing === 'new' ? undefined : editing}
              onDone={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function GuideForm({ guide, onDone }: { guide?: EmergencyGuide; onDone: () => void }) {
  const createGuide = useCreateGuide();
  const updateGuide = useUpdateGuide();
  const { data: categories } = useCategories(true);
  const isEdit = !!guide;

  const form = useForm<EmergencyGuideInput>({
    resolver: zodResolver(emergencyGuideSchema),
    defaultValues: {
      slug: guide?.slug ?? '',
      title: guide?.title ?? '',
      summary: guide?.summary ?? '',
      content: guide?.content ?? '',
      icon: guide?.icon ?? 'book-open',
      categorySlug: guide?.categorySlug ?? null,
      sortOrder: guide?.sortOrder ?? 0,
      isPublished: guide?.isPublished ?? false,
    },
  });

  const iconValue = form.watch('icon');
  const pending = createGuide.isPending || updateGuide.isPending;

  const submit = form.handleSubmit((values) => {
    const input: EmergencyGuideInput = {
      ...values,
      categorySlug: values.categorySlug ? values.categorySlug : null,
    };
    if (guide) {
      updateGuide.mutate({ id: guide.id, input }, { onSuccess: onDone });
    } else {
      createGuide.mutate(input, { onSuccess: onDone });
    }
  });

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isEdit ? 'Edit guide' : 'New guide'}</DialogTitle>
        <DialogDescription>
          {isEdit ? `Update the “${guide?.title}” guide.` : 'Draft a new emergency guide.'}
        </DialogDescription>
      </DialogHeader>

      <Form {...form}>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="What to do during a flood" maxLength={160} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Slug</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="flood-safety"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value.toLowerCase())}
                    />
                  </FormControl>
                  <FormDescription>Used in the guide's public URL.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="summary"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Summary</FormLabel>
                <FormControl>
                  <Textarea
                    rows={2}
                    maxLength={400}
                    placeholder="One or two sentences shown in the guide list."
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="content"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Content</FormLabel>
                <FormControl>
                  <Textarea
                    rows={10}
                    maxLength={50000}
                    placeholder="The full guide. Use clear headings and short, actionable steps."
                    className="font-mono text-sm"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-4 sm:grid-cols-3">
            <FormField
              control={form.control}
              name="icon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Icon</FormLabel>
                  <div className="flex items-center gap-2">
                    <span className="grid size-9 shrink-0 place-items-center rounded-md border">
                      <Icon name={iconValue || 'circle'} className="size-4" aria-hidden />
                    </span>
                    <FormControl>
                      <Input placeholder="book-open" {...field} />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="categorySlug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select
                    value={field.value ?? NONE}
                    onValueChange={(v) => field.onChange(v === NONE ? null : v)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="No category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NONE}>No category</SelectItem>
                      {(categories ?? []).map((category) => (
                        <SelectItem key={category.id} value={category.slug}>
                          {category.name}
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
              name="sortOrder"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sort order</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      value={field.value ?? ''}
                      onChange={(e) =>
                        field.onChange(e.target.value === '' ? undefined : Number(e.target.value))
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="isPublished"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <FormLabel>Published</FormLabel>
                  <FormDescription>
                    Only published guides are visible to the public.
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onDone}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Icon name="loader" className="mr-2 size-4 animate-spin" aria-hidden />}
              {isEdit ? 'Save changes' : 'Create guide'}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
}
