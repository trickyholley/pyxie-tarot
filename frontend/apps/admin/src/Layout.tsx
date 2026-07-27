// SPDX-License-Identifier: AGPL-3.0-or-later
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
