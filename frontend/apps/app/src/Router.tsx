// SPDX-License-Identifier: AGPL-3.0-or-later
import { AuthProvider, LoadingProvider } from "@pyxie/providers";
import { NotFound } from "@pyxie/ui";
import { createBrowserRouter, Navigate, Outlet, RouterProvider } from "react-router-dom";
import ConfirmEmail from "./ConfirmEmail.tsx";
import CreateEntryPage from "./create-entry/CreateEntryPage.tsx";
import DiaryPage from "./diary/DiaryPage.tsx";
import EntryDetail from "./diary/EntryDetail.tsx";
import ForgotPassword from "./ForgotPassword.tsx";
import Home from "./Home.tsx";
import Layout from "./Layout.tsx";
import Login from "./Login.tsx";
import RequireAuth from "./RequireAuth.tsx";
import ResendConfirmation from "./ResendConfirmation.tsx";
import ResetPassword from "./ResetPassword.tsx";
import Settings from "./Settings.tsx";

// Standard client-side routing only — don't adopt react-router's unstable RSC APIs
// without first bumping to >=8.3.0 (GHSA-qwww-vcr4-c8h2 CSRF bypass, dismissed as
// inapplicable only because RSC mode is unused here)
const router = createBrowserRouter([
  {
    element: (
      <AuthProvider>
        <LoadingProvider>
          <Outlet />
        </LoadingProvider>
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
              { path: "/diary", element: <DiaryPage /> },
              { path: "/diary/:entryId", element: <EntryDetail /> },
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
