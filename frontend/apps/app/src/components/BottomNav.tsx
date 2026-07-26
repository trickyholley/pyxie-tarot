import { cn } from "@pyxie/ui";
import { Home, Settings } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const TABS = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/settings", label: "Settings", icon: Settings },
];

export default function BottomNav() {
  const { pathname } = useLocation();

  return (
    <nav className="fixed inset-x-0 bottom-0 flex border-t bg-card">
      {TABS.map(({ to, label, icon: Icon }) => {
        const active = pathname === to;
        return (
          <Link
            key={to}
            to={to}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-2 text-xs",
              active ? "text-primary" : "text-muted-foreground",
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
