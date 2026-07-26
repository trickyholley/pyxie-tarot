import { AuthProvider } from "@pyxie/providers";
import { NotFound } from "@pyxie/ui";
import { createBrowserRouter, Navigate, Outlet, RouterProvider } from "react-router-dom";
import ConfirmEmail from "./ConfirmEmail.tsx";
import CreateEntryPage from "./create-entry/CreateEntryPage.tsx";
import ForgotPassword from "./ForgotPassword.tsx";
import Home from "./Home.tsx";
import Layout from "./Layout.tsx";
import Login from "./Login.tsx";
import RequireAuth from "./RequireAuth.tsx";
import ResendConfirmation from "./ResendConfirmation.tsx";
import ResetPassword from "./ResetPassword.tsx";
import Settings from "./Settings.tsx";

const router = createBrowserRouter([
  {
    element: (
      <AuthProvider>
        <Outlet />
      </AuthProvider>
    ),
    children: [
      { path: "/", element: <Navigate to="/login" replace /> },
      { path: "/login", element: <Login /> },
      { path: "/forgot-password", element: <ForgotPassword /> },
      { path: "/reset-password", element: <ResetPassword /> },
      { path: "/confirm-email", element: <ConfirmEmail /> },
      { path: "/resend-confirmation", element: <ResendConfirmation /> },
      {
        element: <Layout />,
        children: [
          {
            element: <RequireAuth />,
            children: [
              { path: "/home", element: <Home /> },
              { path: "/spread", element: <CreateEntryPage /> },
              { path: "/settings", element: <Settings /> },
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
