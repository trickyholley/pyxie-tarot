// SPDX-License-Identifier: AGPL-3.0-or-later
import { AuthProvider, LoadingProvider, ThemeProvider } from "@pyxie/providers";
import { NotFound } from "@pyxie/ui";
import { useTranslation } from "react-i18next";
import { createBrowserRouter, Navigate, Outlet, RouterProvider } from "react-router-dom";
import Changelog from "./Changelog.tsx";
import NativeVersionGate from "./components/NativeVersionGate.tsx";
import ConfirmEmail from "./ConfirmEmail.tsx";
import CreateEntryPage from "./create-entry/CreateEntryPage.tsx";
import DiaryPage from "./diary/DiaryPage.tsx";
import EntryDetail from "./diary/EntryDetail.tsx";
import ForgotPassword from "./ForgotPassword.tsx";
import Home from "./Home.tsx";
import Layout from "./Layout.tsx";
import { useNativeBackButton } from "./lib/nativeBackButton.ts";
import Login from "./Login.tsx";
import NotificationSettings from "./NotificationSettings.tsx";
import Profile from "./Profile.tsx";
import RedirectIfAuthed from "./RedirectIfAuthed.tsx";
import RequireAuth from "./RequireAuth.tsx";
import ResendConfirmation from "./ResendConfirmation.tsx";
import ResetPassword from "./ResetPassword.tsx";
import Settings from "./Settings.tsx";
import SpreadEditor from "./SpreadEditor.tsx";
import SpreadsSettings from "./SpreadsSettings.tsx";
import ThemeEditor from "./ThemeEditor.tsx";
import ThemeSettings from "./ThemeSettings.tsx";

function NotFoundPage() {
  const { t } = useTranslation("common");
  return <NotFound strings={{ title: t("notFound.title"), message: t("notFound.message") }} />;
}

// Mounted above every route (authed or not) so the Android back gesture/button is handled app-wide,
// and so a required update blocks even the login screen.
function Root() {
  useNativeBackButton();
  return (
    <NativeVersionGate>
      <AuthProvider>
        <LoadingProvider>
          <ThemeProvider>
            <Outlet />
          </ThemeProvider>
        </LoadingProvider>
      </AuthProvider>
    </NativeVersionGate>
  );
}

// Standard client-side routing only - don't adopt react-router's unstable RSC APIs without first
// bumping to >=8.3.0 (GHSA-qwww-vcr4-c8h2, dismissed as inapplicable only because RSC is unused here).
const router = createBrowserRouter([
  {
    element: <Root />,
    children: [
      { path: "/", element: <Navigate to="/home" replace /> },
      {
        element: <RedirectIfAuthed />,
        children: [{ path: "/login", element: <Login /> }],
      },
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
              { path: "/reading", element: <CreateEntryPage /> },
              { path: "/diary", element: <DiaryPage /> },
              { path: "/diary/:entryId", element: <EntryDetail /> },
              { path: "/settings", element: <Settings /> },
              { path: "/settings/profile", element: <Profile /> },
              { path: "/settings/appearance", element: <ThemeSettings /> },
              { path: "/settings/appearance/create", element: <ThemeEditor /> },
              { path: "/settings/spreads", element: <SpreadsSettings /> },
              { path: "/settings/spreads/create", element: <SpreadEditor /> },
              { path: "/settings/spreads/:spreadId/edit", element: <SpreadEditor /> },
              { path: "/settings/notifications", element: <NotificationSettings /> },
              { path: "/changelog", element: <Changelog /> },
            ],
          },
        ],
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);

export default function Router() {
  return <RouterProvider router={router} />;
}
