// SPDX-License-Identifier: AGPL-3.0-or-later
import { AuthProvider, LoadingProvider, ThemeProvider, useAuth } from "@pyxie/providers";
import { NotFound, SplashScreen } from "@pyxie/ui";
import { useTranslation } from "react-i18next";
import { createBrowserRouter, Outlet, redirect, RouterProvider } from "react-router-dom";
import Landing from "@/Landing.tsx";
import AndroidSettings from "./AndroidSettings.tsx";
import Changelog from "./Changelog.tsx";
import FontLoader from "./components/FontLoader.tsx";
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
import { hasSession } from "./lib/homeRoute.ts";
import { useNativeBackButton } from "./lib/nativeBackButton.ts";
import { AppRoute } from "./lib/routes.ts";
import { useSplashPhase } from "./lib/splashHold.ts";
import Login from "./Login.tsx";
import PrivacyPolicy from "./marketing/PrivacyPolicy.tsx";
import NoAuthLayout from "./NoAuthLayout.tsx";
import Profile from "./Profile.tsx";
import RedirectIfAuthed from "./RedirectIfAuthed.tsx";
import ResendConfirmation from "./ResendConfirmation.tsx";
import ResetPassword from "./ResetPassword.tsx";
import Settings from "./Settings.tsx";
import Spreaditor from "./Spreaditor.tsx";
import SpreadsSettings from "./SpreadsSettings.tsx";
import ThemeEditor from "./ThemeEditor.tsx";
import ThemeSettings from "./ThemeSettings.tsx";

function NotFoundPage() {
  const { t } = useTranslation("common");
  return <NotFound strings={{ title: t("notFound.title"), message: t("notFound.message") }} />;
}

// Thin wrapper to ensure Android back gesture works
// Also handles app version block
function Root() {
  useNativeBackButton();
  return (
    <NativeVersionGate>
      <Outlet />
    </NativeVersionGate>
  );
}

// Wraps every route that needs a session
// Excludes marketing pages such as Landing and PrivacyPolicy
// Separate from theme strictly for Login
function AuthedApp() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
}

// Wraps the no-auth pages: no AuthProvider here, so none of these pages (Landing included, issue #18)
// touch a live auth read during render and stay safe to prerender - Contact pre-fills the account email,
// when one's cached, from localStorage directly instead. LoadingProvider backs Contact's submit spinner.
function PublicApp() {
  return (
    <LoadingProvider>
      <NoAuthLayout />
    </LoadingProvider>
  );
}

// Wraps the routes that render the current user's chosen look
// Holds the splash until auth resolves: Layout paints the whole shell (header, logo, bottom nav)
// and RequireAuth only blanks the content area, so rendering it any earlier shows an empty shell in the
// default theme, then snaps to the user's own once /users/me lands (issue #262)
function ThemedApp() {
  const { t } = useTranslation("common");
  const { loading } = useAuth();
  const splash = useSplashPhase(loading);

  return (
    <LoadingProvider>
      <ThemeProvider>
        <FontLoader />
        {splash === "gone" ? (
          <Layout />
        ) : (
          // Greeting is optimistic - a stored token means "welcome back" without waiting on /users/me,
          // which is the whole point of showing this before auth resolves.
          <SplashScreen
            message={t(hasSession() ? "splash.welcomeBack" : "splash.welcome")}
            leaving={splash === "leaving"}
          />
        )}
      </ThemeProvider>
    </LoadingProvider>
  );
}

const router = createBrowserRouter([
  {
    element: <Root />,
    children: [
      {
        // No-auth pages
        element: <PublicApp />,
        children: [
          {
            path: AppRoute.Root,
            // Landing is for un-authed visitors; authed ones go to the app home. Done as a loader, which
            // runs before anything renders, rather than a <Navigate> inside the element: the element sits
            // under PublicApp, so bailing out from there still committed NoAuthLayout's footer for a frame
            // first. Most visible on the Android shell, which always opens at "/" (capacitor.config.ts's
            // server.url). Prerendering is unaffected - headless Chromium carries no session (prerender.mjs).
            loader: () => (hasSession() ? redirect(AppRoute.Home) : null),
            element: <Landing />,
          },
          { path: AppRoute.PrivacyPolicy, element: <PrivacyPolicy /> },
          { path: AppRoute.ForgotPassword, element: <ForgotPassword /> },
          { path: AppRoute.ResetPassword, element: <ResetPassword /> },
          { path: AppRoute.ConfirmEmail, element: <ConfirmEmail /> },
          { path: AppRoute.ResendConfirmation, element: <ResendConfirmation /> },
          { path: AppRoute.Contact, element: <ContactForm /> },
          { path: AppRoute.Changelog, element: <Changelog /> },
        ],
      },
      {
        // Authed pages
        element: <AuthedApp />,
        children: [
          {
            element: <RedirectIfAuthed />,
            children: [{ path: AppRoute.Login, element: <Login /> }],
          },
          {
            element: <ThemedApp />,
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
              { path: AppRoute.SpreadsCreate, element: <Spreaditor /> },
              { path: AppRoute.SpreadEdit, element: <Spreaditor /> },
              { path: AppRoute.AndroidApp, element: <AndroidSettings /> },
            ],
          },
          { path: "*", element: <NotFoundPage /> },
        ],
      },
    ],
  },
]);

export default function Router() {
  return <RouterProvider router={router} />;
}
