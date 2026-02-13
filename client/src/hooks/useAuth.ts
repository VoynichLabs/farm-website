/**
 * Author: Cascade (Claude Sonnet)
 * Date: 2026-02-13
 * PURPOSE: Authentication hook. Fetches current user from /api/auth/me,
 *          provides login/logout helpers, and exposes auth state.
 *          Adapted from ModelCompare useAuth pattern.
 * SRP/DRY check: Pass
 */

import { useQuery, useQueryClient } from "@tanstack/react-query";

// User shape matching Express.User on the server
export interface AuthUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  googleId: string | null;
  stripeCustomerId: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

// Fetch the current session user from the API
async function fetchCurrentUser(): Promise<AuthUser | null> {
  const res = await fetch("/api/auth/me", { credentials: "include" });
  if (!res.ok) return null;
  const data = await res.json();
  return data.user ?? null;
}

export function useAuth() {
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery<AuthUser | null>({
    queryKey: ["auth-user"],
    queryFn: fetchCurrentUser,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });

  // Redirect to Google OAuth login
  const login = () => {
    window.location.href = "/api/auth/google";
  };

  // POST logout, then clear cached user
  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    queryClient.setQueryData(["auth-user"], null);
  };

  // Force re-fetch user data (e.g. after a purchase)
  const refreshUser = () => {
    queryClient.invalidateQueries({ queryKey: ["auth-user"] });
  };

  return {
    user: user ?? null,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    refreshUser,
  };
}
