// SPDX-License-Identifier: AGPL-3.0-or-later
import { Logo, Toaster } from "@pyxie/ui";
import { Outlet } from "react-router-dom";
import BottomNav from "@/components/BottomNav.tsx";

export default function Layout() {
  return (
    <>
      <div className="pb-16">
        <Logo className="fixed top-6 left-4 z-10" />
        <Outlet />
      </div>
      <BottomNav />
      <Toaster />
    </>
  );
}
