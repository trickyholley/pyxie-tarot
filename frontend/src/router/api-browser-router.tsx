import { Navigate, Outlet } from "react-router-dom";
import { Login } from "../api-browser";
import { isAuthenticated } from "../util";
import Users from "../api-browser/users"; // adjust import as needed

function ApiBrowserLayout() {
  return (
    <div>
      <h1>API Browser</h1>
      <Outlet />
    </div>
  );
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  if (!isAuthenticated()) {
    return <Navigate to="/api-browser/login" replace />;
  }
  return <>{children}</>;
}

export function getApiBrowserRoutes() {
  return {
    path: "api-browser",
    element: <ApiBrowserLayout />,
    children: [
      { index: true, element: <p>Select a section.</p> },
      { path: "login", element: <Login /> },
      {
        path: "users",
        element: (
          <RequireAuth>
            <Users />
          </RequireAuth>
        ),
      },
    ],
  };
}

export default getApiBrowserRoutes;
