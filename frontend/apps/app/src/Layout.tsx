// SPDX-License-Identifier: AGPL-3.0-or-later
import { cn, Logo, Toaster } from "@pyxie/ui";
import { useState } from "react";
import { Outlet } from "react-router-dom";
import BottomNav from "@/components/BottomNav.tsx";
import { LogoFocusContext } from "@/lib/logoFocus.tsx";

export default function Layout() {
  const [logoFocused, setLogoFocused] = useState(false);

  return (
    <LogoFocusContext.Provider value={setLogoFocused}>
      <div className="pt-16 pb-16">
        <Logo
          className={cn(
            "fixed z-10 left-1/2 -translate-x-1/2 transition-all duration-700 ease-in-out",
            logoFocused ? "top-[38%] size-20" : "top-4",
          )}
        />
        <Outlet />
      </div>
      <BottomNav />
      <Toaster />
    </LogoFocusContext.Provider>
  );
}
