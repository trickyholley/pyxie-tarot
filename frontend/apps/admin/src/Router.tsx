import { AuthProvider } from "@pyxie/providers";
import { NotFound } from "@pyxie/ui";
import { createBrowserRouter, Outlet, RouterProvider } from "react-router-dom";
import Home from "@/Home.tsx";
import Layout from "@/Layout.tsx";
import RequireAuth from "@/RequireAuth.tsx";
import Login from "./Login.tsx";
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
          { path: "/", element: <Home /> },
          {
            element: <RequireAuth />,
            children: [{ path: "/users", element: <Users /> }],
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
