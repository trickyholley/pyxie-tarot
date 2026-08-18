// SPDX-License-Identifier: AGPL-3.0-or-later
import { Capacitor } from "@capacitor/core";
import { useAuth } from "@pyxie/providers";
import { Button, Card, CardContent, Separator } from "@pyxie/ui";
import {
  Bell,
  EyeOff,
  LayoutTemplate,
  LogOut,
  Paintbrush,
  PartyPopper,
  Settings as SettingsIcon,
  User,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { CURRENT_VERSION } from "@/lib/changelog.ts";
import { useHeader } from "@/lib/header.tsx";
import { clearOfflineDataCache } from "@/lib/offlineCache.ts";

export default function Settings() {
  const { t } = useTranslation("settings");
  useHeader({ title: t("title"), icon: SettingsIcon });
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    void clearOfflineDataCache();
    navigate("/login");
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <Card className="w-full max-w-sm">
        <CardContent className="flex flex-col gap-2">
          <Button type="button" onClick={() => navigate("/settings/profile")}>
            <User data-icon="inline-start" />
            {t("profile.title")}
          </Button>
          <Button type="button" onClick={() => navigate("/settings/appearance")}>
            <Paintbrush data-icon="inline-start" />
            {t("theme.title")}
          </Button>
          <Button type="button" onClick={() => navigate("/settings/spreads")}>
            <LayoutTemplate data-icon="inline-start" />
            {t("spreads.title")}
          </Button>
          {/* Notifications are local-only, delivered via Capacitor's native runtime - there's nothing
              for this to do in a browser tab, so the entry point is hidden there rather than shown
              non-functional. */}
          {Capacitor.isNativePlatform() && (
            <Button type="button" onClick={() => navigate("/settings/notifications")}>
              <Bell data-icon="inline-start" />
              {t("notifications.title")}
            </Button>
          )}
          <Button type="button" variant="outline" onClick={handleLogout}>
            <LogOut data-icon="inline-start" />
            {t("logOut")}
          </Button>
          <Separator className="my-2" />
          <Button type="button" variant="ghost" onClick={() => navigate("/contact")}>
            {t("contact.title")}
          </Button>
          <Button type="button" variant="ghost" onClick={() => navigate("/changelog")}>
            <PartyPopper data-icon="inline-start" />
            {t("whatsNew")}
          </Button>
          <Button type="button" variant="ghost" onClick={() => navigate("/privacy-policy")}>
            <EyeOff data-icon="inline-start" />
            {t("privacyPolicy")}
          </Button>
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">{t("version", { version: CURRENT_VERSION })}</p>
    </div>
  );
}
