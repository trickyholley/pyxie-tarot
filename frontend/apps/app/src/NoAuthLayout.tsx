// SPDX-License-Identifier: AGPL-3.0-or-later
import { useTranslation } from "react-i18next";
import { NavLink, Outlet } from "react-router-dom";
import GithubIcon from "@/components/GithubIcon.tsx";
import { hasSession } from "@/lib/homeRoute.ts";
import { AppRoute } from "@/lib/routes.ts";

/** A light wrapper for no-auth pages to have a shared footer */
export default function NoAuthLayout() {
  const { t } = useTranslation("marketing");

  return (
    <div className="min-h-dvh flex flex-col">
      <div className="flex-1">
        <Outlet />
      </div>
      <footer className="bg-primary p-4 text-background flex flex-wrap justify-between">
        <div className="flex gap-4">
          {/* Landing has nothing for a signed-in visitor (its CTA is "Login or make an account") -
              only anonymous visitors get a link to it. */}
          {!hasSession() && (
            <NavLink to={AppRoute.Root} end>
              {t("footer.welcome")}
            </NavLink>
          )}
          <NavLink to={AppRoute.Changelog}>{t("footer.changelog")}</NavLink>
          <NavLink to={AppRoute.Contact}>{t("footer.contact")}</NavLink>
          <NavLink to={AppRoute.PrivacyPolicy}>{t("footer.privacyPolicy")}</NavLink>
        </div>
        <div className="flex gap-4">
          <a href="https://github.com/trickyholley/pyxie-tarot" target="_blank" rel="noopener noreferrer">
            <GithubIcon fill="var(--background)" />
          </a>
          <span>{t("footer.copyright")}</span>
        </div>
      </footer>
    </div>
  );
}
