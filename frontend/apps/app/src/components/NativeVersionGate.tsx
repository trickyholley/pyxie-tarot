// SPDX-License-Identifier: AGPL-3.0-or-later
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { appVersionAPI, compareVersions } from "@pyxie/api-client";
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@pyxie/ui";
import { type ReactNode, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

type GateStatus = "checking" | "ok" | "encouraged" | "required";

const DISMISSED_KEY = "pyxie:dismissedUpdateNudgeVersion";

/**
 * Gates the whole app (mounted above auth in `Router.tsx`) on the installed Android shell's native
 * version. `server.url` keeps the JS bundle current on every deploy, but native-only changes (new
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
        const [{ version: installedVersion }, requirements] = await Promise.all([
          App.getInfo(),
          appVersionAPI.getAppVersionRequirements(),
        ]);

        if (compareVersions(installedVersion, requirements.minimum_native_version) < 0) {
          setStatus("required");
        } else if (compareVersions(installedVersion, requirements.recommended_native_version) < 0) {
          setRecommendedVersion(requirements.recommended_native_version);
          setStatus(
            localStorage.getItem(DISMISSED_KEY) === requirements.recommended_native_version ? "ok" : "encouraged",
          );
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

  if (status === "checking") return null;

  if (status === "required") {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-2 p-6 text-center">
        <h1 className="text-xl font-semibold">{t("updateRequired.title")}</h1>
        <p className="text-muted-foreground">{t("updateRequired.message")}</p>
      </div>
    );
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
              {t("updateEncouraged.dismiss")}
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
