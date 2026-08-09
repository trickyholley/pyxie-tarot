// SPDX-License-Identifier: AGPL-3.0-or-later
import { cn } from "@pyxie/ui";
import { Book, Home, Settings, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";

export default function BottomNav() {
  const { pathname } = useLocation();
  const { t } = useTranslation("common");

  // Home is the one exception that matches its root path only - every other tab covers its whole
  // subtree, so e.g. /settings/appearance still highlights Settings.
  const TABS = [
    { to: "/home", label: t("nav.home"), icon: Home, isActive: (path: string) => path === "/home" },
    {
      to: "/reading",
      label: t("nav.reading"),
      icon: Sparkles,
      isActive: (path: string) => path.startsWith("/reading"),
    },
    { to: "/diary", label: t("nav.diary"), icon: Book, isActive: (path: string) => path.startsWith("/diary") },
    {
      to: "/settings",
      label: t("nav.settings"),
      icon: Settings,
      isActive: (path: string) => path.startsWith("/settings"),
    },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 flex border-t bg-card">
      {TABS.map(({ to, label, icon: Icon, isActive }) => {
        const active = isActive(pathname);
        return (
          <Link
            key={to}
            to={to}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-2 text-xs",
              active ? "bg-primary text-primary-foreground" : "text-muted-foreground",
            )}
          >
            <Icon className="size-5" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
