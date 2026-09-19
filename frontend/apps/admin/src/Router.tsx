// SPDX-License-Identifier: AGPL-3.0-or-later
import type { ComponentType } from "react";
import { AuthProvider, LoadingProvider, RequireAuth } from "@pyxie/providers";
import { installChunkReloadRecovery, markChunkLoadSucceeded, NotFound, RouteError } from "@pyxie/ui";
import { useTranslation } from "react-i18next";
import { createBrowserRouter, Navigate, Outlet, RouterProvider } from "react-router-dom";
import Layout from "@/Layout.tsx";
import { AdminRoute } from "@/lib/routes.ts";
import Login from "./Login.tsx";

installChunkReloadRecovery();

// Adapts a default-exporting page module to the `{ Component }` shape react-router's `lazy` wants.
const lazyRoute = (load: () => Promise<{ default: ComponentType }>) => async () => {
  const module = await load();
  markChunkLoadSucceeded();
  return { Component: module.default };
};

function NotFoundPage() {
  const { t } = useTranslation("common");
  return (
    <NotFound
      strings={{ title: t("notFound.title"), message: t("notFound.message"), goHome: t("goHome") }}
      homeHref={AdminRoute.Root}
    />
  );
}

// Catches lazy-route/render errors for the whole tree. A stale chunk after a new deploy is already
// handled upstream by installChunkReloadRecovery's one-time reload - anything that still reaches here
// (that reload didn't help, or an unrelated crash) gets this manual-retry fallback instead of a blank
// screen.
function RootErrorPage() {
  const { t } = useTranslation("common");
  return (
    <RouteError
      strings={{
        title: t("routeError.title"),
        message: t("routeError.message"),
        retry: t("routeError.retry"),
        goHome: t("goHome"),
      }}
      homeHref={AdminRoute.Root}
    />
  );
}

// Standard client-side routing only - don't adopt react-router's unstable RSC APIs without first
// bumping to >=8.3.0 (GHSA-qwww-vcr4-c8h2, dismissed as inapplicable only because RSC is unused here).
const router = createBrowserRouter([
  {
    element: (
      <AuthProvider>
        <LoadingProvider>
          <Outlet />
        </LoadingProvider>
      </AuthProvider>
    ),
    errorElement: <RootErrorPage />,
    children: [
      { path: AdminRoute.Login, element: <Login /> },
      { path: AdminRoute.ForgotPassword, lazy: lazyRoute(() => import("./ForgotPassword.tsx")) },
      { path: AdminRoute.ResetPassword, lazy: lazyRoute(() => import("./ResetPassword.tsx")) },
      {
        element: <Layout />,
        children: [
          {
            element: <RequireAuth />,
            children: [
              { path: AdminRoute.Root, element: <Navigate to={AdminRoute.Users} replace /> },
              { path: AdminRoute.Users, lazy: lazyRoute(() => import("./Users.tsx")) },
              { path: AdminRoute.Spreads, lazy: lazyRoute(() => import("./Spreads.tsx")) },
              { path: AdminRoute.DiaryEntries, lazy: lazyRoute(() => import("./DiaryEntries.tsx")) },
              { path: AdminRoute.Decks, lazy: lazyRoute(() => import("./Decks.tsx")) },
              { path: AdminRoute.DeckCards, lazy: lazyRoute(() => import("./DeckCards.tsx")) },
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
