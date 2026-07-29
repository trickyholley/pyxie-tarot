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
      <div className="pb-16">
        <Logo
          className={cn(
            "fixed z-10 transition-all duration-700 ease-in-out",
            logoFocused ? "right-[calc(50%-2.5rem)] bottom-[62%] size-20 opacity-100" : "right-4 bottom-20",
          )}
        />
        <Outlet />
      </div>
      <BottomNav />
      <Toaster />
    </LogoFocusContext.Provider>
  );
}
