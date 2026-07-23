import { useAuth } from "@pyxie/providers";
import { Button, NavigationMenu, NavigationMenuItem, NavigationMenuLink, NavigationMenuList } from "@pyxie/ui";
import { Link, useLocation, useNavigate } from "react-router-dom";
import logo from "@/assets/logo.png";

export default function NavBar() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="flex items-center justify-between border-b px-4 py-2">
      <div className="flex items-center space-x-2">
        <span className="flex items-center gap-2 font-bold text-lg p-2 border-r">
          <img src={logo} alt="Pyxie Tarot" className="size-10" />
          Admin
        </span>
        <NavigationMenu>
          <NavigationMenuList className="space-x-2">
            <NavigationMenuItem>
              <NavigationMenuLink
                render={<Link to="/users" />}
                active={pathname === "/users"}
                className="text-base p-2.5"
              >
                Users
              </NavigationMenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink
                render={<Link to="/spreads" />}
                active={pathname === "/spreads"}
                className="text-base p-2.5"
              >
                Spreads
              </NavigationMenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink
                render={<Link to="/diary-entries" />}
                active={pathname === "/diary-entries"}
                className="text-base p-2.5"
              >
                Diary Entries
              </NavigationMenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink
                render={<Link to="/decks" />}
                active={pathname === "/decks" || pathname.startsWith("/decks/")}
                className="text-base p-2.5"
              >
                Decks
              </NavigationMenuLink>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
      </div>

      <Button variant="outline" size="lg" className="border-primary text-base" onClick={handleLogout}>
        Log out
      </Button>
    </header>
  );
}
