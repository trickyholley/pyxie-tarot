import { Toaster } from "@pyxie/ui";
import { Outlet } from "react-router-dom";
import NavBar from "@/components/NavBar.tsx";

export default function Layout() {
  return (
    <>
      <NavBar />
      <Outlet />
      <Toaster />
    </>
  );
}
