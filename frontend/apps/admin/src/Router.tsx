// SPDX-License-Identifier: AGPL-3.0-or-later
import { AuthProvider, LoadingProvider, RequireAuth } from "@pyxie/providers";
import { NotFound } from "@pyxie/ui";
import { useTranslation } from "react-i18next";
import { createBrowserRouter, Navigate, Outlet, RouterProvider } from "react-router-dom";
import Layout from "@/Layout.tsx";
import { AdminRoute } from "@/lib/routes.ts";
import DeckCards from "./DeckCards.tsx";
import Decks from "./Decks.tsx";
import DiaryEntries from "./DiaryEntries.tsx";
import ForgotPassword from "./ForgotPassword.tsx";
import Login from "./Login.tsx";
import ResetPassword from "./ResetPassword.tsx";
import Spreads from "./Spreads.tsx";
import Users from "./Users.tsx";

function NotFoundPage() {
  const { t } = useTranslation("common");
  return <NotFound strings={{ title: t("notFound.title"), message: t("notFound.message") }} />;
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
    children: [
      { path: AdminRoute.Login, element: <Login /> },
      { path: AdminRoute.ForgotPassword, element: <ForgotPassword /> },
      { path: AdminRoute.ResetPassword, element: <ResetPassword /> },
      {
        element: <Layout />,
        children: [
          {
            element: <RequireAuth />,
            children: [
              { path: AdminRoute.Root, element: <Navigate to={AdminRoute.Users} replace /> },
              { path: AdminRoute.Users, element: <Users /> },
              { path: AdminRoute.Spreads, element: <Spreads /> },
              { path: AdminRoute.DiaryEntries, element: <DiaryEntries /> },
              { path: AdminRoute.Decks, element: <Decks /> },
              { path: AdminRoute.DeckCards, element: <DeckCards /> },
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
