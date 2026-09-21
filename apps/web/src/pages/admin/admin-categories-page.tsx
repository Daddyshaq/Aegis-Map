import type { CrisisCategory } from '@crisis/types';
import { crisisCategorySchema, type CrisisCategoryInput } from '@crisis/validation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { EmptyState, ErrorState } from '@/components/data-states';
import { Icon } from '@/components/icon';
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
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useCategories, useCreateCategory, useUpdateCategory } from '@/hooks/use-categories';
import { SectionHeader } from '@/pages/admin/admin-layout';

type Editing = CrisisCategory | 'new' | null;

export function AdminCategoriesPage() {
  const { data: categories, isLoading, isError, error, refetch } = useCategories(true);
  const updateCategory = useUpdateCategory();
  const [editing, setEditing] = useState<Editing>(null);

  return (
    <div>
      <SectionHeader
        title="Crisis categories"
        description="Define the categories citizens choose when reporting. The default TTL sets how long a report stays active before auto-expiring."
        actions={
          <Button size="sm" onClick={() => setEditing('new')}>
            <Icon name="plus" className="mr-1.5 size-4" aria-hidden />
            New category
          </Button>
        }
      />

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 w-full animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : !categories || categories.length === 0 ? (
        <EmptyState
          icon="list"
          title="No categories yet"
          description="Create your first crisis category to let citizens file reports."
          action={
            <Button onClick={() => setEditing('new')}>
              <Icon name="plus" className="mr-1.5 size-4" aria-hidden />
              New category
            </Button>
          }
        />
      ) : (
        <ul className="space-y-2">
          {categories.map((category) => (
            <li
              key={category.id}
              className="flex flex-wrap items-center gap-3 rounded-lg border p-3"
            >
              <span
                className="grid size-10 shrink-0 place-items-center rounded-md"
                style={{ backgroundColor: `${category.color}1a` }}
              >
                <Icon
                  name={category.icon}
                  className="size-5"
                  style={{ color: category.color }}
                  aria-hidden
                />
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{category.name}</span>
                  {!category.isActive && (
                    <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                      Inactive
                    </span>
                  )}
                </div>
                <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                  <span className="font-mono">{category.slug}</span>
                  <span>TTL {category.defaultTtlHours} h</span>
                  <span>Order {category.sortOrder}</span>
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm">
                <span className="sr-only">
                  {category.isActive ? 'Deactivate' : 'Activate'} {category.name}
                </span>
                <Switch
                  checked={category.isActive}
                  disabled={updateCategory.isPending}
                  onCheckedChange={(checked) =>
                    updateCategory.mutate({ id: category.id, input: { isActive: checked } })
                  }
                />
                <span className="text-muted-foreground">Active</span>
              </label>

              <Button variant="outline" size="sm" onClick={() => setEditing(category)}>
                <Icon name="pencil" className="mr-1.5 size-4" aria-hidden />
                Edit
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-lg">
          {editing && (
            <CategoryForm
              key={editing === 'new' ? 'new' : editing.id}
              category={editing === 'new' ? undefined : editing}
              onDone={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CategoryForm({ category, onDone }: { category?: CrisisCategory; onDone: () => void }) {
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const isEdit = !!category;

  const form = useForm<CrisisCategoryInput>({
    resolver: zodResolver(crisisCategorySchema),
    defaultValues: {
      slug: category?.slug ?? '',
      name: category?.name ?? '',
      description: category?.description ?? '',
      icon: category?.icon ?? 'triangle-alert',
      color: category?.color ?? '#2563eb',
      defaultTtlHours: category?.defaultTtlHours ?? 24,
      isActive: category?.isActive ?? true,
      sortOrder: category?.sortOrder ?? 0,
    },
  });

  const iconValue = form.watch('icon');
  const colorValue = form.watch('color');
  const pending = createCategory.isPending || updateCategory.isPending;

  const submit = form.handleSubmit((values) => {
    const input: CrisisCategoryInput = {
      ...values,
      description: values.description?.trim() ? values.description.trim() : null,
    };
    if (category) {
      updateCategory.mutate({ id: category.id, input }, { onSuccess: onDone });
    } else {
      createCategory.mutate(input, { onSuccess: onDone });
    }
  });

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isEdit ? 'Edit category' : 'New category'}</DialogTitle>
        <DialogDescription>
          {isEdit
            ? `Update the “${category?.name}” category.`
            : 'Categories appear in the report form and on the map legend.'}
        </DialogDescription>
      </DialogHeader>

      <Form {...form}>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Flooding" {...field} />
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
                      placeholder="flooding"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value.toLowerCase())}
                    />
                  </FormControl>
                  <FormDescription>
                    Lowercase, hyphenated. Used in URLs and the API.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
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
                      <Input placeholder="triangle-alert" {...field} />
                    </FormControl>
                  </div>
                  <FormDescription>
                    A{' '}
                    <a
                      href="https://lucide.dev/icons/"
                      target="_blank"
                      rel="noreferrer noopener"
                      className="underline"
                    >
                      lucide
                    </a>{' '}
                    icon name (kebab-case).
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Colour</FormLabel>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      aria-label="Pick colour"
                      className="h-9 w-12 shrink-0 cursor-pointer rounded-md border bg-background p-1"
                      value={colorValue || '#2563eb'}
                      onChange={(e) => field.onChange(e.target.value)}
                    />
                    <FormControl>
                      <Input placeholder="#2563eb" {...field} />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="defaultTtlHours"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default TTL (hours)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={720}
                      value={field.value ?? ''}
                      onChange={(e) =>
                        field.onChange(e.target.value === '' ? undefined : Number(e.target.value))
                      }
                    />
                  </FormControl>
                  <FormDescription>Reports auto-expire after this many hours.</FormDescription>
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
                  <FormDescription>Lower numbers appear first.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description (optional)</FormLabel>
                <FormControl>
                  <Textarea
                    rows={2}
                    maxLength={500}
                    placeholder="Short explanation shown to reporters."
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
            name="isActive"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <FormLabel>Active</FormLabel>
                  <FormDescription>
                    Inactive categories are hidden from the report form.
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
              {isEdit ? 'Save changes' : 'Create category'}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
}
