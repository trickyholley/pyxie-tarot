import { Toaster } from "@pyxie/ui";
import { Outlet } from "react-router-dom";

export default function Layout() {
  return (
    <>
      <Outlet />
      <Toaster />
    </>
  );
}
