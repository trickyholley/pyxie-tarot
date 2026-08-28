// SPDX-License-Identifier: AGPL-3.0-or-later
import { RequireAuth, useAuth, useTheme } from "@pyxie/providers";
import { cn, Logo, Toaster } from "@pyxie/ui";
import { useState } from "react";
import { useLocation } from "react-router-dom";
import BottomNav from "@/components/BottomNav.tsx";
import Header from "@/components/Header.tsx";
import PrideIconGradientDefs from "@/components/PrideIconGradientDefs.tsx";
import WhatsNewModal from "@/components/WhatsNewModal.tsx";
import { HeaderConfig, HeaderContext } from "@/lib/header.tsx";
import { LogoFocusContext } from "@/lib/logoFocus.tsx";
import { PALLET_PRIDE } from "@/lib/palletPride.ts";
import { useReminderSync } from "@/lib/reminderSync.ts";
import { AppRoute } from "@/lib/routes.ts";
import { useOfflineEntrySync } from "@/lib/useOfflineEntrySync.ts";

/** The authed app shell: fixed header/logo/bottom nav around the routed page, plus mount-once pieces (pride gradient defs, what's-new modal, reminder sync, offline entry sync). */
export default function Layout() {
  const [logoFocused, setLogoFocused] = useState(false);
  const [header, setHeader] = useState<HeaderConfig | null>(null);
  const { pathname } = useLocation();
  const { theme } = useTheme();
  const { user } = useAuth();
  useReminderSync(!!user?.settings.notifications.enabled, user?.settings.reminder);
  useOfflineEntrySync();

  return (
    <LogoFocusContext.Provider value={setLogoFocused}>
      <HeaderContext.Provider value={setHeader}>
        {theme.name === PALLET_PRIDE && <PrideIconGradientDefs />}
        <div className="pt-16 pb-16">
          <Header title={header?.title} backTo={header?.backTo} icon={header?.icon} />
          <Logo
            themeEasterEgg={pathname === AppRoute.Appearance}
            // z-40 - above Header/BottomNav's z-30 (Header.tsx, BottomNav.tsx), since this logo is meant
            // to overlay the header while animating to its focused position.
            className={cn(
              "fixed z-40 transition-all duration-700 ease-in-out",
              logoFocused ? "top-24 left-1/2 size-20 -translate-x-1/2" : "top-4 right-5 size-8",
            )}
          />
          {/** Holds the Outlet for all child routes needing auth */}
          <RequireAuth />
        </div>
        <BottomNav />
        <Toaster />
        <WhatsNewModal />
      </HeaderContext.Provider>
    </LogoFocusContext.Provider>
  );
}
