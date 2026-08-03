// SPDX-License-Identifier: AGPL-3.0-or-later
import { cn } from "@pyxie/ui";
import { Book, Home, Settings } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const TABS = [
  {
    to: "/home",
    label: "Home",
    icon: Home,
    isActive: (pathname: string) => pathname === "/home" || pathname.startsWith("/spread"),
  },
  { to: "/diary", label: "Diary", icon: Book, isActive: (pathname: string) => pathname.startsWith("/diary") },
  { to: "/settings", label: "Settings", icon: Settings, isActive: (pathname: string) => pathname === "/settings" },
];

export default function BottomNav() {
  const { pathname } = useLocation();

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
