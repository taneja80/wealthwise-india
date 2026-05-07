import { trpc } from "@/providers/trpc";
import { useCallback, useEffect, useMemo } from "react";
import { useNavigate } from "react-router";
import { LOGIN_PATH } from "@/const";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = LOGIN_PATH } =
    options ?? {};

  const navigate = useNavigate();
  const utils = trpc.useUtils();

  // Query OAuth user
  const {
    data: oauthUser,
    isLoading: oauthLoading,
    error: oauthError,
  } = trpc.auth.me.useQuery(undefined, {
    staleTime: 1000 * 60 * 5,
    retry: false,
  });

  // Query local auth user
  const {
    data: localUser,
    isLoading: localLoading,
    error: localError,
  } = trpc.localAuth.me.useQuery(undefined, {
    staleTime: 1000 * 60 * 5,
    retry: false,
    enabled: !oauthUser, // only check local if no OAuth user
  });

  const oauthLogoutMutation = trpc.auth.logout.useMutation();
  const localLogoutMutation = trpc.localAuth.logout.useMutation();

  // Normalize user: prefer OAuth, fallback to local
  const user = oauthUser ?? localUser ?? null;
  const isLoading = oauthLoading || (localLoading && !oauthUser);
  const error = oauthError ?? localError;

  const logout = useCallback(() => {
    // Clear both OAuth and local auth cookies via server calls
    Promise.allSettled([
      oauthLogoutMutation.mutateAsync(undefined).catch(() => {}),
      localLogoutMutation.mutateAsync(undefined).catch(() => {}),
    ]).then(() => {
      window.location.href = redirectPath;
    });
  }, [oauthLogoutMutation, localLogoutMutation, redirectPath]);

  useEffect(() => {
    if (redirectOnUnauthenticated && !isLoading && !user) {
      const currentPath = window.location.pathname;
      if (currentPath !== redirectPath) {
        navigate(redirectPath);
      }
    }
  }, [redirectOnUnauthenticated, isLoading, user, navigate, redirectPath]);

  return useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading: isLoading || oauthLogoutMutation.isPending || localLogoutMutation.isPending,
      error,
      logout,
      refresh: () => {
        utils.auth.me.invalidate();
        utils.localAuth.me.invalidate();
      },
    }),
    [user, isLoading, oauthLogoutMutation.isPending, localLogoutMutation.isPending, error, logout, utils],
  );
}
