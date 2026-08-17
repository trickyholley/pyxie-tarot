// SPDX-License-Identifier: AGPL-3.0-or-later
import {
  clearRefreshToken,
  clearToken,
  getRefreshToken,
  getToken,
  setRefreshToken,
  setToken,
  User,
} from "@pyxie/api-client";
import { logout as logoutRequest } from "@pyxie/api-client/src/api/auth.ts";
import { getMe } from "@pyxie/api-client/src/api/users.ts";
import { type ReactNode, useCallback, useEffect, useState } from "react";
import AuthContext from "./AuthContext";

/** Tracks the logged-in user; hydrates from a stored token via `getMe()` on mount, clearing it on failure. */
export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();

    if (token === null) {
      setLoading(false);
      return;
    }

    getMe()
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setUser(data);
        // Re-run setToken's side effects (e.g. syncing to native) for an already-logged-in session -
        // this hydration path reads the token directly rather than going through login().
        if (data) setToken(token);
      })
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  // Fired by apiFetch when a background token refresh fails (expired/reused refresh token) - tokens are
  // already cleared by that point, this just drops the user so RequireAuth redirects to /login.
  useEffect(() => {
    const onSessionExpired = () => setUser(null);
    window.addEventListener("auth:session-expired", onSessionExpired);
    return () => window.removeEventListener("auth:session-expired", onSessionExpired);
  }, []);

  const login = useCallback((token: string, user: User, refreshToken?: string) => {
    setToken(token);
    if (refreshToken) setRefreshToken(refreshToken);
    setUser(user);
  }, []);

  const logout = useCallback(() => {
    const refreshToken = getRefreshToken();
    clearToken();
    clearRefreshToken();
    setUser(null);
    // Best-effort server-side revoke - the client-side clear above already ends the session locally
    // either way, this just closes the refresh token off from being reused elsewhere.
    if (refreshToken) void logoutRequest({ refresh_token: refreshToken }).catch(() => {});
  }, []);

  const updateUser = useCallback((patch: Partial<User>) => {
    setUser((current) => (current ? { ...current, ...patch } : current));
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
