// SPDX-License-Identifier: AGPL-3.0-or-later
import { useAuth } from "@pyxie/providers";
import { Button, Logo, NavigationMenu, NavigationMenuItem, NavigationMenuLink, NavigationMenuList } from "@pyxie/ui";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate } from "react-router-dom";
import ThemeToggle from "@/components/ThemeToggle.tsx";
import { AdminRoute } from "@/lib/routes.ts";

export default function NavBar() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { t } = useTranslation("common");

  const handleLogout = () => {
    logout();
    navigate(AdminRoute.Login);
  };

  return (
    <header className="flex items-center justify-between border-b px-4 py-2">
      <div className="flex items-center space-x-2">
        <span className="flex items-center gap-2 font-bold text-lg p-2 border-r">
          <Logo />
          {t("appTitle")}
        </span>
        <NavigationMenu>
          <NavigationMenuList className="space-x-2">
            <NavigationMenuItem>
              <NavigationMenuLink
                render={<Link to={AdminRoute.Users} />}
                active={pathname === AdminRoute.Users}
                className="text-base p-2.5"
              >
                {t("nav.users")}
              </NavigationMenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink
                render={<Link to={AdminRoute.Spreads} />}
                active={pathname === AdminRoute.Spreads}
                className="text-base p-2.5"
              >
                {t("nav.spreads")}
              </NavigationMenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink
                render={<Link to={AdminRoute.DiaryEntries} />}
                active={pathname === AdminRoute.DiaryEntries}
                className="text-base p-2.5"
              >
                {t("nav.diaryEntries")}
              </NavigationMenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink
                render={<Link to={AdminRoute.Decks} />}
                active={pathname === AdminRoute.Decks || pathname.startsWith(`${AdminRoute.Decks}/`)}
                className="text-base p-2.5"
              >
                {t("nav.decks")}
              </NavigationMenuLink>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
      </div>

      <div className="flex items-center gap-4">
        <ThemeToggle />
        <Button variant="outline" size="lg" className="border-primary text-base" onClick={handleLogout}>
          {t("logOut")}
        </Button>
      </div>
    </header>
  );
}
