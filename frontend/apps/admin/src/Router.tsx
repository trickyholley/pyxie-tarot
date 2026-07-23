import { AuthProvider } from "@pyxie/providers";
import { NotFound } from "@pyxie/ui";
import { createBrowserRouter, Navigate, Outlet, RouterProvider } from "react-router-dom";
import Layout from "@/Layout.tsx";
import RequireAuth from "@/RequireAuth.tsx";
import Login from "./Login.tsx";
import Spreads from "./Spreads.tsx";
import Users from "./Users.tsx";

const router = createBrowserRouter([
  {
    element: (
      <AuthProvider>
        <Outlet />
      </AuthProvider>
    ),
    children: [
      { path: "/login", element: <Login /> },
      {
        element: <Layout />,
        children: [
          {
            element: <RequireAuth />,
            children: [
              { path: "/", element: <Navigate to="/users" replace /> },
              { path: "/users", element: <Users /> },
              { path: "/spreads", element: <Spreads /> },
            ],
          },
        ],
      },
      { path: "*", element: <NotFound /> },
    ],
  },
]);

export default function Router() {
  return <RouterProvider router={router} />;
}
