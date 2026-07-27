// SPDX-License-Identifier: AGPL-3.0-or-later
import { AuthProvider, LoadingProvider } from "@pyxie/providers";
import { NotFound } from "@pyxie/ui";
import { createBrowserRouter, Navigate, Outlet, RouterProvider } from "react-router-dom";
import Layout from "@/Layout.tsx";
import RequireAuth from "@/RequireAuth.tsx";
import DeckCards from "./DeckCards.tsx";
import Decks from "./Decks.tsx";
import DiaryEntries from "./DiaryEntries.tsx";
import ForgotPassword from "./ForgotPassword.tsx";
import Login from "./Login.tsx";
import ResetPassword from "./ResetPassword.tsx";
import Spreads from "./Spreads.tsx";
import Users from "./Users.tsx";

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
      { path: "/login", element: <Login /> },
      { path: "/forgot-password", element: <ForgotPassword /> },
      { path: "/reset-password", element: <ResetPassword /> },
      {
        element: <Layout />,
        children: [
          {
            element: <RequireAuth />,
            children: [
              { path: "/", element: <Navigate to="/users" replace /> },
              { path: "/users", element: <Users /> },
              { path: "/spreads", element: <Spreads /> },
              { path: "/diary-entries", element: <DiaryEntries /> },
              { path: "/decks", element: <Decks /> },
              { path: "/decks/:deckId", element: <DeckCards /> },
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
