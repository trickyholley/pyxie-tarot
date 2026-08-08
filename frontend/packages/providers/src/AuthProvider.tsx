// SPDX-License-Identifier: AGPL-3.0-or-later
import { clearToken, getToken, setToken, User } from "@pyxie/api-client";
import { getMe } from "@pyxie/api-client/src/api/users.ts";
import { type ReactNode, useCallback, useEffect, useState } from "react";
import AuthContext from "./AuthContext";

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
      .then((data) => setUser(data))
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback((token: string, user: User) => {
    setToken(token);
    setUser(user);
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
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
