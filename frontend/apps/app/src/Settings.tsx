// SPDX-License-Identifier: AGPL-3.0-or-later
import { Capacitor } from "@capacitor/core";
import { useAuth } from "@pyxie/providers";
import { Button, Card, CardContent } from "@pyxie/ui";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { CURRENT_VERSION } from "@/lib/changelog.ts";
import { useHeader } from "@/lib/header.tsx";

export default function Settings() {
  const { t } = useTranslation("settings");
  useHeader({ title: t("title") });
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <Card className="w-full max-w-sm">
        <CardContent className="flex flex-col gap-2">
          <Button type="button" onClick={() => navigate("/settings/profile")}>
            {t("profile.title")}
          </Button>
          <Button type="button" onClick={() => navigate("/settings/appearance")}>
            {t("theme.title")}
          </Button>
          {/* Notifications are local-only, delivered via Capacitor's native runtime - there's nothing
              for this to do in a browser tab, so the entry point is hidden there rather than shown
              non-functional. */}
          {Capacitor.isNativePlatform() && (
            <Button type="button" onClick={() => navigate("/settings/notifications")}>
              {t("notifications.title")}
            </Button>
          )}
          <Button type="button" variant="outline" onClick={handleLogout}>
            {t("logOut")}
          </Button>
          <Button type="button" variant="ghost" onClick={() => navigate("/changelog")}>
            {t("whatsNew")}
          </Button>
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">{t("version", { version: CURRENT_VERSION })}</p>
    </div>
  );
}
