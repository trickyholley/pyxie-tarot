// SPDX-License-Identifier: AGPL-3.0-or-later
import { Navigate, Outlet } from "react-router";
import useAuth from "./useAuth";

/** Route guard: renders nothing while auth is resolving, redirects to `/login` if unauthenticated. */
export default function RequireAuth() {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  return <Outlet />;
}
