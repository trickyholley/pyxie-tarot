import { AuthProvider } from "@pyxie/providers";
import { NotFound } from "@pyxie/ui";
import { createBrowserRouter, Navigate, Outlet, RouterProvider } from "react-router-dom";
import ConfirmEmail from "./ConfirmEmail.tsx";
import ForgotPassword from "./ForgotPassword.tsx";
import Login from "./Login.tsx";
import ResendConfirmation from "./ResendConfirmation.tsx";
import ResetPassword from "./ResetPassword.tsx";

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
      { path: "*", element: <NotFound /> },
    ],
  },
]);

export default function Router() {
  return <RouterProvider router={router} />;
}
