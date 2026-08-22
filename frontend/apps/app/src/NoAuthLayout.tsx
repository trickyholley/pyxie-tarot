// SPDX-License-Identifier: AGPL-3.0-or-later
import { NavLink, Outlet } from "react-router-dom";
import GithubIcon from "@/components/GithubIcon.tsx";
import { AppRoute } from "@/lib/routes.ts";

/** A light wrapper for no-auth pages to have a shared footer */
export default function NoAuthLayout() {
  return (
    <div className="min-h-dvh flex flex-col">
      <div className="flex-1">
        <Outlet />
      </div>
      <footer className="bg-primary p-4 text-background flex flex-wrap justify-between">
        <div className="flex gap-4">
          <NavLink to={AppRoute.Changelog}>Changelog</NavLink>
          <NavLink to={AppRoute.Contact}>Contact</NavLink>
          <NavLink to={AppRoute.PrivacyPolicy}>Privacy Policy</NavLink>
        </div>
        <div className="flex gap-4">
          <a href="https://github.com/trickyholley/pyxie-tarot" target="_blank" rel="noopener noreferrer">
            <GithubIcon fill="var(--background)" />
          </a>
          <span>© 2026 Reilent LLC</span>
        </div>
      </footer>
    </div>
  );
}
