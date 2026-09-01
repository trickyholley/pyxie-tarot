// SPDX-License-Identifier: AGPL-3.0-or-later
import type { ComponentType } from "react";
import { AuthProvider, LoadingProvider, ThemeProvider, useAuth } from "@pyxie/providers";
import { NotFound, SplashScreen } from "@pyxie/ui";
import { lazy, Suspense, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { createBrowserRouter, Outlet, redirect, RouterProvider } from "react-router-dom";
import type { LazyNamespace } from "@/i18n.ts";
import { loadNamespaces } from "@/i18n.ts";
import FontLoader from "./components/FontLoader.tsx";
import NativeVersionGate from "./components/NativeVersionGate.tsx";
import Home from "./Home.tsx";
import { hasSession } from "./lib/homeRoute.ts";
import { useNativeBackButton } from "./lib/nativeBackButton.ts";
import { AppRoute } from "./lib/routes.ts";
import { useSplashPhase } from "./lib/splashHold.ts";
import Login from "./Login.tsx";
import NoAuthLayout from "./NoAuthLayout.tsx";
import RedirectIfAuthed from "./RedirectIfAuthed.tsx";

// CLAUDE Adapts a default-exporting page module to the `{ Component }` shape react-router's `lazy` wants,
// CLAUDE so each route below reads as one line. The router awaits these itself, so no <Suspense> is needed.
// CLAUDE `namespaces` are fetched in parallel with the chunk and are guaranteed registered before the page
// CLAUDE renders, which is what keeps a lazily-loaded namespace from flashing raw keys on first paint.
const lazyRoute =
  (load: () => Promise<{ default: ComponentType }>, namespaces: readonly LazyNamespace[] = []) =>
  async () => {
    const [module] = await Promise.all([load(), loadNamespaces(namespaces)]);
    return { Component: module.default };
  };

// CLAUDE Kept eager above: NoAuthLayout/providers, Login (a first paint rather than a navigation, and the
// CLAUDE only reader of the eager `auth` namespace) and Home (where "/" redirects a returning user, 17 lines).
// CLAUDE Everything else splits, including Landing - it reads the 19kB `marketing` namespace, so keeping it
// CLAUDE eager would keep that namespace eager for logged-in users who never see a marketing page.

// CLAUDE The authed shell is split off separately from the routes: it carries Header, BottomNav, WhatsNewModal
// CLAUDE and the Toaster (~52kB of sonner), none of which a logged-out visitor on Landing or the marketing
// CLAUDE pages can reach. ThemedApp prefetches it during the splash so it's cached before the splash clears.
// CLAUDE Pulls `settings` because WhatsNewModal and reminderSync read it from inside the shell itself.
const loadLayout = async () => {
  await loadNamespaces(["settings"]);
  return import("./Layout.tsx");
};
const Layout = lazy(loadLayout);

// CLAUDE Every no-auth route needs this, not just the marketing pages: NoAuthLayout's footer and
// CLAUDE NoAuthPageHeader read it, and they wrap all of them.
const MARKETING: readonly LazyNamespace[] = ["marketing"];

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

  // CLAUDE Starts the shell's chunk downloading alongside the /users/me request the splash is already
  // CLAUDE waiting on, rather than when <Layout> first renders - by then the splash has cleared, and the
  // CLAUDE Suspense fallback below would be a second, visibly separate hold.
  useEffect(() => {
    void loadLayout();
  }, []);

  // Greeting is optimistic - a stored token means "welcome back" without waiting on /users/me,
  // which is the whole point of showing this before auth resolves.
  const splashScreen = (
    <SplashScreen message={t(hasSession() ? "splash.welcomeBack" : "splash.welcome")} leaving={splash === "leaving"} />
  );

  return (
    <LoadingProvider>
      <ThemeProvider>
        <FontLoader />
        {splash === "gone" ? (
          <Suspense fallback={splashScreen}>
            <Layout />
          </Suspense>
        ) : (
          splashScreen
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
            lazy: lazyRoute(() => import("@/Landing.tsx"), MARKETING),
          },
          { path: AppRoute.PrivacyPolicy, lazy: lazyRoute(() => import("./marketing/PrivacyPolicy.tsx"), MARKETING) },
          { path: AppRoute.ForgotPassword, lazy: lazyRoute(() => import("./ForgotPassword.tsx"), MARKETING) },
          { path: AppRoute.ResetPassword, lazy: lazyRoute(() => import("./ResetPassword.tsx"), MARKETING) },
          { path: AppRoute.ConfirmEmail, lazy: lazyRoute(() => import("./ConfirmEmail.tsx"), MARKETING) },
          { path: AppRoute.ResendConfirmation, lazy: lazyRoute(() => import("./ResendConfirmation.tsx"), MARKETING) },
          { path: AppRoute.Contact, lazy: lazyRoute(() => import("./ContactForm.tsx"), ["marketing", "settings"]) },
          { path: AppRoute.Changelog, lazy: lazyRoute(() => import("./Changelog.tsx"), ["marketing", "settings"]) },
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
              {
                path: AppRoute.Reading,
                lazy: lazyRoute(() => import("./create-entry/CreateEntryPage.tsx"), ["createEntry"]),
              },
              { path: AppRoute.Diary, lazy: lazyRoute(() => import("./diary/DiaryPage.tsx"), ["diary"]) },
              { path: AppRoute.DiaryEntry, lazy: lazyRoute(() => import("./diary/EntryDetail.tsx"), ["diary"]) },
              { path: AppRoute.Decks, lazy: lazyRoute(() => import("./decks/DeckPicker.tsx"), ["decks"]) },
              { path: AppRoute.DeckViewer, lazy: lazyRoute(() => import("./decks/DeckViewer.tsx"), ["decks"]) },
              { path: AppRoute.Settings, lazy: lazyRoute(() => import("./Settings.tsx")) },
              { path: AppRoute.Profile, lazy: lazyRoute(() => import("./Profile.tsx")) },
              { path: AppRoute.Appearance, lazy: lazyRoute(() => import("./ThemeSettings.tsx")) },
              { path: AppRoute.AppearanceCreate, lazy: lazyRoute(() => import("./ThemeEditor.tsx")) },
              { path: AppRoute.Spreads, lazy: lazyRoute(() => import("./SpreadsSettings.tsx")) },
              { path: AppRoute.SpreadsCreate, lazy: lazyRoute(() => import("./Spreaditor.tsx")) },
              { path: AppRoute.SpreadEdit, lazy: lazyRoute(() => import("./Spreaditor.tsx")) },
              { path: AppRoute.AndroidApp, lazy: lazyRoute(() => import("./AndroidSettings.tsx")) },
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
