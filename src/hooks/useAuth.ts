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

  // Query local auth user
  const {
    data: localUser,
    isLoading,
    error,
  } = trpc.localAuth.me.useQuery(undefined, {
    staleTime: 1000 * 60 * 5,
    retry: false,
  });

  const localLogoutMutation = trpc.localAuth.logout.useMutation();

  const user = localUser ?? null;

  const logout = useCallback(() => {
    localLogoutMutation.mutateAsync(undefined).catch(() => {}).then(() => {
      window.location.href = redirectPath;
    });
  }, [localLogoutMutation, redirectPath]);

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
      isLoading: isLoading || localLogoutMutation.isPending,
      error,
      logout,
      refresh: () => {
        utils.localAuth.me.invalidate();
      },
    }),
    [user, isLoading, localLogoutMutation.isPending, error, logout, utils],
  );
}
