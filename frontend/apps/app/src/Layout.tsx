// SPDX-License-Identifier: AGPL-3.0-or-later
import { RequireAuth, useAuth, useTheme } from "@pyxie/providers";
import { cn, Logo } from "@pyxie/ui";
import { useState } from "react";
import { useLocation } from "react-router-dom";
import BillingNotifications from "@/components/BillingNotifications.tsx";
import BottomNav from "@/components/BottomNav.tsx";
import Header from "@/components/Header.tsx";
import PendingDeletionDialog from "@/components/PendingDeletionDialog.tsx";
import PrideIconGradientDefs from "@/components/PrideIconGradientDefs.tsx";
import WhatsNewModal from "@/components/WhatsNewModal.tsx";
import { BillingReturnProvider } from "@/lib/BillingReturnContext.tsx";
import { HeaderConfig, HeaderContext } from "@/lib/header.tsx";
import { LogoFocusContext } from "@/lib/logoFocus.tsx";
import { PALLET_PRIDE } from "@/lib/palletPride.ts";
import { useReminderSync } from "@/lib/reminderSync.ts";
import { AppRoute } from "@/lib/routes.ts";

const FOCUSED_LOGO = "top-safe-24 [--logo-size:5rem] size-(--logo-size) right-[calc(50%-var(--logo-size)/2)]";

/** The authed app shell: fixed header/logo/bottom nav around the routed page, plus mount-once pieces (pride gradient defs, what's-new modal, reminder sync). */
export default function Layout() {
  const [logoFocused, setLogoFocused] = useState(false);
  const [header, setHeader] = useState<HeaderConfig | null>(null);
  const { pathname } = useLocation();
  const { theme } = useTheme();
  const { user } = useAuth();
  useReminderSync(!!user?.settings.notifications.enabled, user?.settings.reminder);

  return (
    <LogoFocusContext.Provider value={setLogoFocused}>
      <HeaderContext.Provider value={setHeader}>
        {theme.name === PALLET_PRIDE && <PrideIconGradientDefs />}
        <BillingReturnProvider>
          <div className="pt-safe-16 pb-safe-16">
            <Header title={header?.title} backTo={header?.backTo} icon={header?.icon} />
            <Logo
              themeEasterEgg={pathname === AppRoute.Appearance}
              // z-40 - above Header/BottomNav's z-30 (Header.tsx, BottomNav.tsx), since this logo is meant
              // to overlay the header while animating to its focused position.
              className={cn(
                "fixed z-40 transition-all duration-700 ease-in-out",
                logoFocused ? FOCUSED_LOGO : "top-safe-4 right-5 size-8",
              )}
            />
            {/** Outlet for all authed routes - held back while deletion is pending, since the backend 403s them */}
            {user?.deletion_scheduled_for ? <PendingDeletionDialog /> : <RequireAuth />}
          </div>
          <BottomNav />
          <WhatsNewModal />
          <BillingNotifications />
        </BillingReturnProvider>
      </HeaderContext.Provider>
    </LogoFocusContext.Provider>
  );
}
