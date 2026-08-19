// SPDX-License-Identifier: AGPL-3.0-or-later
import { useAuth } from "@pyxie/providers";
import { Navigate, Outlet } from "react-router-dom";
import { AppRoute } from "@/lib/routes.ts";

export default function RedirectIfAuthed() {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (user) return <Navigate to={AppRoute.Home} replace />;

  return <Outlet />;
}
