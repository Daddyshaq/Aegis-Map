import { ACCOUNT_STATUSES, APP_ROLES } from '@crisis/types';
import type { AppRole, Profile } from '@crisis/types';
import {
  suspendUserSchema,
  updateUserRoleSchema,
  type SuspendUserInput,
  type UpdateUserRoleInput,
} from '@crisis/validation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { EmptyState, ErrorState } from '@/components/data-states';
import { Icon } from '@/components/icon';
import { Pagination } from '@/components/pagination';
import { Badge } from '@/components/ui/badge';
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
import { Textarea } from '@/components/ui/textarea';
import { useAdminUsers, useSetUserRole, useSetUserStatus } from '@/hooks/use-admin';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { formatDate } from '@/lib/format';
import { ACCOUNT_STATUS_META, ROLE_LABELS } from '@/lib/labels';
import { SectionHeader } from '@/pages/admin/admin-layout';
import { useAuth } from '@/providers/auth-provider';

const ALL = 'ALL';

const ROLE_ICON: Record<AppRole, string> = {
  citizen: 'user',
  moderator: 'shield-check',
  admin: 'shield-alert',
};

const ROLE_BADGE_VARIANT: Record<AppRole, 'default' | 'secondary' | 'outline'> = {
  citizen: 'outline',
  moderator: 'secondary',
  admin: 'default',
};

type EditTarget = { user: Profile; mode: 'role' | 'status' };

export function AdminUsersPage() {
  const { profile } = useAuth();
  const [role, setRole] = useState<AppRole | typeof ALL>(ALL);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<EditTarget | null>(null);

  const debouncedSearch = useDebouncedValue(search, 400);

  const { data, isLoading, isError, error, refetch } = useAdminUsers({
    role: role === ALL ? undefined : role,
    q: debouncedSearch.trim() || undefined,
    page,
  });

  const users = data?.items ?? [];

  return (
    <div>
      <SectionHeader
        title="Users"
        description="Manage roles and account status. You cannot change your own role or status."
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_12rem]">
        <div className="relative">
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
            placeholder="Search by name or email"
            className="pl-8"
            aria-label="Search users"
          />
        </div>
        <Select
          value={role}
          onValueChange={(value) => {
            setRole(value as AppRole | typeof ALL);
            setPage(1);
          }}
        >
          <SelectTrigger aria-label="Filter by role">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Any role</SelectItem>
            {APP_ROLES.map((value) => (
              <SelectItem key={value} value={value}>
                {ROLE_LABELS[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : users.length === 0 ? (
        <EmptyState
          icon="users"
          title="No users found"
          description="No accounts match these filters."
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[46rem] text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    User
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Role
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Reputation
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Joined
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const isSelf = user.id === profile?.id;
                  const statusMeta = ACCOUNT_STATUS_META[user.accountStatus];
                  return (
                    <tr key={user.id} className="border-b last:border-0">
                      <td className="px-4 py-3">
                        <div className="font-medium">{user.fullName ?? 'Unnamed user'}</div>
                        <div className="text-xs text-muted-foreground">{user.email ?? '—'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={ROLE_BADGE_VARIANT[user.role]}>
                          <Icon name={ROLE_ICON[user.role]} aria-hidden />
                          {ROLE_LABELS[user.role]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center gap-1.5 text-sm font-medium"
                          style={{ color: statusMeta.color }}
                        >
                          <Icon name={statusMeta.icon} className="size-3.5" aria-hidden />
                          {statusMeta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-muted-foreground">
                        {user.reputation}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isSelf}
                            onClick={() => setEditing({ user, mode: 'role' })}
                          >
                            Role
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isSelf}
                            onClick={() => setEditing({ user, mode: 'status' })}
                          >
                            Status
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination pagination={data?.pagination} onPageChange={setPage} />
        </>
      )}

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          {editing?.mode === 'role' && (
            <RoleForm
              key={`role-${editing.user.id}`}
              user={editing.user}
              onDone={() => setEditing(null)}
            />
          )}
          {editing?.mode === 'status' && (
            <StatusForm
              key={`status-${editing.user.id}`}
              user={editing.user}
              onDone={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RoleForm({ user, onDone }: { user: Profile; onDone: () => void }) {
  const setUserRole = useSetUserRole();
  const form = useForm<UpdateUserRoleInput>({
    resolver: zodResolver(updateUserRoleSchema),
    defaultValues: { role: user.role },
  });

  const submit = form.handleSubmit((values) => {
    setUserRole.mutate({ id: user.id, input: values }, { onSuccess: onDone });
  });

  return (
    <>
      <DialogHeader>
        <DialogTitle>Change role</DialogTitle>
        <DialogDescription>
          Update the role for {user.fullName ?? user.email ?? 'this user'}. Roles grant additional
          permissions across the platform.
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={submit} className="space-y-5" noValidate>
          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Role</FormLabel>
                <Select value={field.value} onValueChange={(v) => field.onChange(v as AppRole)}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {APP_ROLES.map((value) => (
                      <SelectItem key={value} value={value}>
                        <span className="flex items-center gap-2">
                          <Icon name={ROLE_ICON[value]} className="size-4" aria-hidden />
                          {ROLE_LABELS[value]}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onDone}>
              Cancel
            </Button>
            <Button type="submit" disabled={setUserRole.isPending}>
              {setUserRole.isPending && (
                <Icon name="loader" className="mr-2 size-4 animate-spin" aria-hidden />
              )}
              Save role
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
}

function StatusForm({ user, onDone }: { user: Profile; onDone: () => void }) {
  const setUserStatus = useSetUserStatus();
  const form = useForm<SuspendUserInput>({
    resolver: zodResolver(suspendUserSchema),
    defaultValues: { status: user.accountStatus, reason: '' },
  });

  const submit = form.handleSubmit((values) => {
    setUserStatus.mutate(
      {
        id: user.id,
        input: { status: values.status, reason: values.reason?.trim() || undefined },
      },
      { onSuccess: onDone },
    );
  });

  return (
    <>
      <DialogHeader>
        <DialogTitle>Change account status</DialogTitle>
        <DialogDescription>
          Suspending or banning {user.fullName ?? user.email ?? 'this user'} immediately blocks
          their access to the platform.
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={submit} className="space-y-5" noValidate>
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={(v) => field.onChange(v as SuspendUserInput['status'])}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {ACCOUNT_STATUSES.map((value) => (
                      <SelectItem key={value} value={value}>
                        <span className="flex items-center gap-2">
                          <Icon
                            name={ACCOUNT_STATUS_META[value].icon}
                            className="size-4"
                            style={{ color: ACCOUNT_STATUS_META[value].color }}
                            aria-hidden
                          />
                          {ACCOUNT_STATUS_META[value].label}
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
            name="reason"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reason (optional)</FormLabel>
                <FormControl>
                  <Textarea
                    rows={3}
                    maxLength={500}
                    placeholder="Recorded in the audit log for accountability."
                    {...field}
                    value={field.value ?? ''}
                  />
                </FormControl>
                <FormDescription>
                  Shared with other administrators via the audit log.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onDone}>
              Cancel
            </Button>
            <Button type="submit" disabled={setUserStatus.isPending}>
              {setUserStatus.isPending && (
                <Icon name="loader" className="mr-2 size-4 animate-spin" aria-hidden />
              )}
              Save status
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
}
