import { ROLE_RANK } from '@crisis/types';
import type { AppRole, Profile } from '@crisis/types';
import type { LoginInput, RegisterInput } from '@crisis/validation';
import type { Session, User } from '@supabase/supabase-js';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { toast } from '@/components/ui/sonner';
import { ApiClientError, api } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { supabase } from '@/lib/supabase';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthContextValue {
  status: AuthStatus;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  role: AppRole | null;
  isAuthenticated: boolean;
  isModerator: boolean;
  isAdmin: boolean;
  hasRole: (minimum: AppRole) => boolean;
  signIn: (input: LoginInput) => Promise<void>;
  signUp: (input: RegisterInput) => Promise<{ needsEmailConfirmation: boolean }>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [initializing, setInitializing] = useState(true);
  const suspendedHandled = useRef(false);

  // Establish and track the Supabase session.
  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setInitializing(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      // Any identity change invalidates cached, user-scoped data.
      queryClient.removeQueries({ queryKey: queryKeys.me });
      queryClient.removeQueries({ queryKey: queryKeys.notifications.all });
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [queryClient]);

  // The API-returned Profile is the authoritative source of role + status.
  const profileQuery = useQuery({
    queryKey: queryKeys.me,
    queryFn: () => api.me.get(),
    enabled: !!session,
    staleTime: 60_000,
    retry: (failureCount, error) => {
      if (error instanceof ApiClientError && (error.isUnauthorized || error.isForbidden)) {
        return false;
      }
      return failureCount < 2;
    },
  });

  // If the account is suspended/banned, the API rejects /me — sign the user out.
  useEffect(() => {
    const error = profileQuery.error;
    if (
      error instanceof ApiClientError &&
      error.code === 'ACCOUNT_SUSPENDED' &&
      !suspendedHandled.current
    ) {
      suspendedHandled.current = true;
      toast.error('Your account has been suspended. Contact an administrator.');
      void supabase.auth.signOut();
    }
    if (!error) suspendedHandled.current = false;
  }, [profileQuery.error]);

  const signIn = useCallback(async (input: LoginInput) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });
    if (error) throw new Error(error.message);
  }, []);

  const signUp = useCallback(async (input: RegisterInput) => {
    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: { data: { full_name: input.fullName } },
    });
    if (error) throw new Error(error.message);
    // When email confirmation is enabled, no session is returned yet.
    return { needsEmailConfirmation: !data.session };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    queryClient.clear();
  }, [queryClient]);

  const requestPasswordReset = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw new Error(error.message);
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw new Error(error.message);
  }, []);

  const refreshProfile = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.me });
  }, [queryClient]);

  const profile = profileQuery.data ?? null;
  const role = profile?.role ?? null;

  const status: AuthStatus = initializing
    ? 'loading'
    : session
      ? profileQuery.isSuccess
        ? 'authenticated'
        : profileQuery.isError
          ? 'unauthenticated'
          : 'loading'
      : 'unauthenticated';

  const hasRole = useCallback(
    (minimum: AppRole) => (role ? ROLE_RANK[role] >= ROLE_RANK[minimum] : false),
    [role],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      session,
      user: session?.user ?? null,
      profile,
      role,
      isAuthenticated: status === 'authenticated',
      isModerator: hasRole('moderator'),
      isAdmin: hasRole('admin'),
      hasRole,
      signIn,
      signUp,
      signOut,
      requestPasswordReset,
      updatePassword,
      refreshProfile,
    }),
    [
      status,
      session,
      profile,
      role,
      hasRole,
      signIn,
      signUp,
      signOut,
      requestPasswordReset,
      updatePassword,
      refreshProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
