// SPDX-License-Identifier: AGPL-3.0-or-later
import { Capacitor } from "@capacitor/core";
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  LogoCard,
  SplashScreen,
} from "@pyxie/ui";
import { X } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { checkNativeVersion } from "@/lib/nativeVersionCheck.ts";

type GateStatus = "checking" | "ok" | "encouraged" | "required";

const DISMISSED_KEY = "pyxie:dismissedUpdateNudgeVersion";

/**
 * Gates the whole app (mounted above auth in `Router.tsx`) on the installed native shell's version,
 * via `checkNativeVersion` (`@/lib/nativeVersionCheck.ts`) - Android and iOS each have their own
 * thresholds. `server.url` keeps the JS bundle current on every deploy, but native-only changes (new
 * Capacitor plugins/permissions, see CLAUDE.md's Mobile section - issue #155's gesture fix is an
 * example) only reach a device on its next store install, so that's the version space that can lag.
 * No-ops on web/desktop, where the JS is always current. Below the minimum blocks entirely; below the
 * recommended shows a dismissible nudge instead. Fails open (renders children) if the check itself
 * can't complete, so a network hiccup never locks users out.
 */
export default function NativeVersionGate({ children }: { children: ReactNode }) {
  const { t } = useTranslation("common");
  // Non-native platforms have nothing to gate on - start settled rather than flipping to "ok" a
  // moment later.
  const [status, setStatus] = useState<GateStatus>(() => (Capacitor.isNativePlatform() ? "checking" : "ok"));
  const [recommendedVersion, setRecommendedVersion] = useState<string | null>(null);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    (async () => {
      try {
        const result = await checkNativeVersion();
        if (result.status === "required") {
          setStatus("required");
        } else if (result.status === "encouraged") {
          setRecommendedVersion(result.recommendedVersion);
          setStatus(localStorage.getItem(DISMISSED_KEY) === result.recommendedVersion ? "ok" : "encouraged");
        } else {
          setStatus("ok");
        }
      } catch {
        setStatus("ok");
      }
    })();
  }, []);

  const dismiss = () => {
    if (recommendedVersion) localStorage.setItem(DISMISSED_KEY, recommendedVersion);
    setStatus("ok");
  };

  if (status === "checking") return <SplashScreen />;

  if (status === "required") {
    return <LogoCard title={t("updateRequired.title")} description={t("updateRequired.message")} />;
  }

  return (
    <>
      {children}
      <Dialog open={status === "encouraged"} onOpenChange={(open) => !open && dismiss()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("updateEncouraged.title")}</DialogTitle>
            <DialogDescription>{t("updateEncouraged.message")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button />} onClick={dismiss}>
              <X data-icon="inline-start" />
              {t("updateEncouraged.dismiss")}
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
