import { forgotPasswordSchema, type ForgotPasswordInput } from '@crisis/validation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';

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
import { getErrorMessage } from '@/lib/errors';
import { routes } from '@/lib/routes';
import { useAuth } from '@/providers/auth-provider';

export function ForgotPasswordPage() {
  const { requestPasswordReset } = useAuth();
  const [sentTo, setSentTo] = useState<string | null>(null);

  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await requestPasswordReset(values.email);
      setSentTo(values.email);
    } catch (error) {
      form.setError('root', { message: getErrorMessage(error) });
    }
  });

  if (sentTo) {
    return (
      <AuthShell title="Check your email">
        <div className="space-y-4 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
            <Icon name="mail" className="size-6" aria-hidden />
          </span>
          <p className="text-sm text-muted-foreground">
            If an account exists for <span className="font-medium text-foreground">{sentTo}</span>,
            we have sent a link to reset your password.
          </p>
          <Button asChild variant="outline" className="w-full">
            <Link to={routes.login}>Back to sign in</Link>
          </Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Reset your password"
      description="Enter your email and we'll send you a reset link."
      footer={
        <Link to={routes.login} className="font-medium text-primary hover:underline">
          Back to sign in
        </Link>
      }
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
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting && (
              <Icon name="loader" className="mr-2 size-4 animate-spin" aria-hidden />
            )}
            Send reset link
          </Button>
        </form>
      </Form>
    </AuthShell>
  );
}
