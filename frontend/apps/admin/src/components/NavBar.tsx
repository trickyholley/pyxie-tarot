import {useAuth} from "@pyxie/providers";
import {Button, NavigationMenu, NavigationMenuItem, NavigationMenuLink, NavigationMenuList} from "@pyxie/ui";
import {Link, useLocation, useNavigate} from "react-router-dom";

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
      <div className="flex space-x-2">
        <span className="flex font-bold p-2 border-r">Admin</span>
        <NavigationMenu>
          <NavigationMenuList className="space-x-2">
            <NavigationMenuItem>
              <NavigationMenuLink render={<Link to="/" />} active={pathname === "/"}>
                Home
              </NavigationMenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink render={<Link to="/users" />} active={pathname === "/users"}>
                Users
              </NavigationMenuLink>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
      </div>

      <Button variant="outline" onClick={handleLogout}>
        Log out
      </Button>
    </header>
  );
}
