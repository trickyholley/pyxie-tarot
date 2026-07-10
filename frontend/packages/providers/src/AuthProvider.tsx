import {clearToken, getToken, isAuthenticated, setToken} from "@pyxie/api-client";
import {type ReactNode, useCallback, useEffect, useState} from "react";
import AuthContext, {type AuthUser} from "./AuthContext";

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount: if we have a token, fetch the current user
  useEffect(() => {
    if (!isAuthenticated()) {
      setLoading(false);
      return;
    }

    // Replace with your actual "me" endpoint
    fetch("/api/users/me", {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setUser(data))
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback((token: string, user: AuthUser) => {
    setToken(token);
    setUser(user);
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: user !== null,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
