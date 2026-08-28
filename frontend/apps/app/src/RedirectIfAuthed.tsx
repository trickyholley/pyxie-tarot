// SPDX-License-Identifier: AGPL-3.0-or-later
import { useAuth } from "@pyxie/providers";
import { SplashScreen } from "@pyxie/ui";
import { useTranslation } from "react-i18next";
import { Navigate, Outlet } from "react-router-dom";
import { AppRoute } from "@/lib/routes.ts";
import { useSplashPhase } from "@/lib/splashHold.ts";

export default function RedirectIfAuthed() {
  const { t } = useTranslation("common");
  const { user, loading } = useAuth();
  const splash = useSplashPhase(loading);

  if (splash !== "gone") {
    return <SplashScreen message={t("splash.welcome")} leaving={splash === "leaving"} />;
  }
  if (user) return <Navigate to={AppRoute.Home} replace />;

  return <Outlet />;
}
