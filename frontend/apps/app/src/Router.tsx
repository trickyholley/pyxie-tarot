// SPDX-License-Identifier: AGPL-3.0-or-later
import { AuthProvider, LoadingProvider, RequireAuth, ThemeProvider } from "@pyxie/providers";
import { NotFound } from "@pyxie/ui";
import { useTranslation } from "react-i18next";
import { createBrowserRouter, Navigate, Outlet, RouterProvider } from "react-router-dom";
import Changelog from "./Changelog.tsx";
import NativeVersionGate from "./components/NativeVersionGate.tsx";
import ConfirmEmail from "./ConfirmEmail.tsx";
import ContactForm from "./ContactForm.tsx";
import CreateEntryPage from "./create-entry/CreateEntryPage.tsx";
import DeckPicker from "./decks/DeckPicker.tsx";
import DeckViewer from "./decks/DeckViewer.tsx";
import DiaryPage from "./diary/DiaryPage.tsx";
import EntryDetail from "./diary/EntryDetail.tsx";
import ForgotPassword from "./ForgotPassword.tsx";
import Home from "./Home.tsx";
import Layout from "./Layout.tsx";
import { useNativeBackButton } from "./lib/nativeBackButton.ts";
import { AppRoute } from "./lib/routes.ts";
import Login from "./Login.tsx";
import NotificationSettings from "./NotificationSettings.tsx";
import PrivacyPolicy from "./PrivacyPolicy.tsx";
import Profile from "./Profile.tsx";
import RedirectIfAuthed from "./RedirectIfAuthed.tsx";
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
      { path: AppRoute.Root, element: <Navigate to={AppRoute.Home} replace /> },
      {
        element: <RedirectIfAuthed />,
        children: [{ path: AppRoute.Login, element: <Login /> }],
      },
      { path: AppRoute.ForgotPassword, element: <ForgotPassword /> },
      { path: AppRoute.ResetPassword, element: <ResetPassword /> },
      { path: AppRoute.ConfirmEmail, element: <ConfirmEmail /> },
      { path: AppRoute.ResendConfirmation, element: <ResendConfirmation /> },
      { path: AppRoute.PrivacyPolicy, element: <PrivacyPolicy /> },
      {
        element: <Layout />,
        children: [
          {
            element: <RequireAuth />,
            children: [
              { path: AppRoute.Home, element: <Home /> },
              { path: AppRoute.Reading, element: <CreateEntryPage /> },
              { path: AppRoute.Diary, element: <DiaryPage /> },
              { path: AppRoute.DiaryEntry, element: <EntryDetail /> },
              { path: AppRoute.Decks, element: <DeckPicker /> },
              { path: AppRoute.DeckViewer, element: <DeckViewer /> },
              { path: AppRoute.Settings, element: <Settings /> },
              { path: AppRoute.Profile, element: <Profile /> },
              { path: AppRoute.Appearance, element: <ThemeSettings /> },
              { path: AppRoute.AppearanceCreate, element: <ThemeEditor /> },
              { path: AppRoute.Spreads, element: <SpreadsSettings /> },
              { path: AppRoute.SpreadsCreate, element: <SpreadEditor /> },
              { path: AppRoute.SpreadEdit, element: <SpreadEditor /> },
              { path: AppRoute.Notifications, element: <NotificationSettings /> },
              { path: AppRoute.Contact, element: <ContactForm /> },
              { path: AppRoute.Changelog, element: <Changelog /> },
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
