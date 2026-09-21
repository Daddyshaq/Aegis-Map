import { resetPasswordSchema, type ResetPasswordInput } from '@crisis/validation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';

import { AuthShell } from '@/components/auth/auth-shell';
import { Icon } from '@/components/icon';
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
import { toast } from '@/components/ui/sonner';
import { Spinner } from '@/components/ui/spinner';
import { getErrorMessage } from '@/lib/errors';
import { routes } from '@/lib/routes';
import { useAuth } from '@/providers/auth-provider';

export function ResetPasswordPage() {
  const { updatePassword, session, status } = useAuth();
  const navigate = useNavigate();

  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await updatePassword(values.password);
      toast.success('Password updated. You are now signed in.');
      navigate(routes.home, { replace: true });
    } catch (error) {
      form.setError('root', { message: getErrorMessage(error, 'Could not update your password.') });
    }
  });

  // The recovery link establishes a temporary session; wait for it to resolve.
  if (status === 'loading') {
    return (
      <AuthShell title="Reset your password">
        <div className="flex justify-center py-6">
          <Spinner />
        </div>
      </AuthShell>
    );
  }

  if (!session) {
    return (
      <AuthShell title="Link expired">
        <div className="space-y-4 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
            <Icon name="lock" className="size-6" aria-hidden />
          </span>
          <p className="text-sm text-muted-foreground">
            This password reset link is invalid or has expired. Request a new one to continue.
          </p>
          <Button asChild className="w-full">
            <Link to={routes.forgotPassword}>Request a new link</Link>
          </Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Set a new password"
      description="Choose a strong password you don't use elsewhere."
    >
      <Form {...form}>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          {form.formState.errors.root && (
            <p
              role="alert"
              className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {form.formState.errors.root.message}
            </p>
          )}
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>New password</FormLabel>
                <FormControl>
                  <Input type="password" autoComplete="new-password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm new password</FormLabel>
                <FormControl>
                  <Input type="password" autoComplete="new-password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting && (
              <Icon name="loader" className="mr-2 size-4 animate-spin" aria-hidden />
            )}
            Update password
          </Button>
        </form>
      </Form>
    </AuthShell>
  );
}
