import { Navigate, Outlet } from "react-router-dom";
import { DBBLogin, DBBUsers } from "../db-browser";
import { isAuthenticated } from "../util";
import {ROUTES} from "../constant";
import * as React from "react";

function DBBrowserLayout() {
  return (
    <div>
      <h1>DB Browser</h1>
      <Outlet />
    </div>
  );
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  if (!isAuthenticated()) {
    return <Navigate to={`/${ROUTES.DB_LOGIN}`} replace />;
  }
  return <>{children}</>;
}

export function getDBBrowserRoutes() {
  return {
    path: ROUTES.DB_BROWSER,
    element: <DBBrowserLayout />,
    children: [
      { index: true, element: <p>Select a section.</p> },
      { path: ROUTES.LOGIN, element: <DBBLogin /> },
      {
        path: ROUTES.USERS,
        element: (
          <RequireAuth>
            <DBBUsers />
          </RequireAuth>
        ),
      },
    ],
  };
}

export default getDBBrowserRoutes;
