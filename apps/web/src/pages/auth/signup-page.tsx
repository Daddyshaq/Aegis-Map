import { registerSchema, type RegisterInput } from '@crisis/validation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useNavigate } from 'react-router-dom';

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

export function SignupPage() {
  const { signUp, status } = useAuth();
  const navigate = useNavigate();
  const [emailSent, setEmailSent] = useState<string | null>(null);

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: '', email: '', password: '', confirmPassword: '' },
  });

  if (status === 'authenticated') {
    return <Navigate to={routes.home} replace />;
  }

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const { needsEmailConfirmation } = await signUp(values);
      if (needsEmailConfirmation) {
        setEmailSent(values.email);
      } else {
        navigate(routes.home, { replace: true });
      }
    } catch (error) {
      form.setError('root', { message: getErrorMessage(error, 'Could not create your account.') });
    }
  });

  if (emailSent) {
    return (
      <AuthShell title="Confirm your email">
        <div className="space-y-4 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
            <Icon name="mail" className="size-6" aria-hidden />
          </span>
          <p className="text-sm text-muted-foreground">
            We sent a confirmation link to{' '}
            <span className="font-medium text-foreground">{emailSent}</span>. Open it to activate
            your account, then sign in.
          </p>
          <Button asChild className="w-full">
            <Link to={routes.login}>Back to sign in</Link>
          </Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Create your account"
      description="Report incidents, corroborate others, and get alerts near you."
      footer={
        <>
          Already have an account?{' '}
          <Link to={routes.login} className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </>
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
            name="fullName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full name</FormLabel>
                <FormControl>
                  <Input autoComplete="name" placeholder="Ada Lovelace" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

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

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
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
                <FormLabel>Confirm password</FormLabel>
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
            Create account
          </Button>
        </form>
      </Form>
    </AuthShell>
  );
}
