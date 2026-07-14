import {useAuth} from "@pyxie/providers";
import {Navigate, Outlet} from "react-router-dom";

export default function RequireAuth() {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  return <Outlet />;
}
