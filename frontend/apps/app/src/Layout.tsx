// SPDX-License-Identifier: AGPL-3.0-or-later
import { useTheme } from "@pyxie/providers";
import { cn, Logo, Toaster } from "@pyxie/ui";
import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import BottomNav from "@/components/BottomNav.tsx";
import Header from "@/components/Header.tsx";
import PrideIconGradientDefs from "@/components/PrideIconGradientDefs.tsx";
import WhatsNewModal from "@/components/WhatsNewModal.tsx";
import { HeaderConfig, HeaderContext } from "@/lib/header.tsx";
import { LogoFocusContext } from "@/lib/logoFocus.tsx";
import { PALLET_PRIDE } from "@/lib/palletPride.ts";

export default function Layout() {
  const [logoFocused, setLogoFocused] = useState(false);
  const [header, setHeader] = useState<HeaderConfig | null>(null);
  const { pathname } = useLocation();
  const { theme } = useTheme();

  return (
    <LogoFocusContext.Provider value={setLogoFocused}>
      <HeaderContext.Provider value={setHeader}>
        {theme.name === PALLET_PRIDE && <PrideIconGradientDefs />}
        <div className="pt-16 pb-16">
          <Header title={header?.title} backTo={header?.backTo} />
          <Logo
            themeEasterEgg={pathname === "/settings/appearance"}
            className={cn(
              "fixed z-20 transition-all duration-700 ease-in-out",
              logoFocused ? "top-24 left-1/2 size-20 -translate-x-1/2" : "top-4 right-5 size-8",
            )}
          />
          <Outlet />
        </div>
        <BottomNav />
        <Toaster />
        <WhatsNewModal />
      </HeaderContext.Provider>
    </LogoFocusContext.Provider>
  );
}
