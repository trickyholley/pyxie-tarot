// SPDX-License-Identifier: AGPL-3.0-or-later
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { useAuth } from "@pyxie/providers";
import { Button, Card, CardContent, Separator } from "@pyxie/ui";
import {
  EyeOff,
  HandHeart,
  LayoutTemplate,
  LogOut,
  MessageCircleHeart,
  Paintbrush,
  PartyPopper,
  Settings as SettingsIcon,
  Smartphone,
  User,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { CURRENT_VERSION } from "@/lib/changelog.ts";
import { useHeader } from "@/lib/header.tsx";
import { getNativePlatformLabel } from "@/lib/platform.ts";
import { AppRoute } from "@/lib/routes.ts";

export default function Settings() {
  const { t } = useTranslation("settings");
  useHeader({ title: t("title"), icon: SettingsIcon });
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [nativeVersion, setNativeVersion] = useState<string | null>(null);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    App.getInfo()
      .then(({ version }) => setNativeVersion(version))
      .catch(() => undefined);
  }, []);

  const handleLogout = () => {
    logout();
    navigate(AppRoute.Login);
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <Card className="w-full max-w-sm">
        <CardContent className="flex flex-col gap-2">
          <Button nativeButton={false} render={<Link to={AppRoute.Profile} />}>
            <User data-icon="inline-start" />
            {t("profile.title")}
          </Button>
          <Button nativeButton={false} render={<Link to={AppRoute.Appearance} />}>
            <Paintbrush data-icon="inline-start" />
            {t("theme.title")}
          </Button>
          <Button nativeButton={false} render={<Link to={AppRoute.Spreads} />}>
            <LayoutTemplate data-icon="inline-start" />
            {t("spreads.title")}
          </Button>
          <Button nativeButton={false} render={<Link to={AppRoute.Supporter} />}>
            <HandHeart data-icon="inline-start" />
            {t("supporter.title")}
          </Button>
          {/* Notifications and the discreet-icon picker are both native-only (delivered via
              Capacitor's runtime / the OS's own package manager) - there's nothing for either to do
              in a browser tab, so the entry point is hidden there rather than shown non-functional. */}
          {Capacitor.isNativePlatform() && (
            <Button nativeButton={false} render={<Link to={AppRoute.NativeApp} />}>
              <Smartphone data-icon="inline-start" />
              {t("native.title", { platform: getNativePlatformLabel() })}
            </Button>
          )}
          <Button type="button" variant="outline" onClick={handleLogout}>
            <LogOut data-icon="inline-start" />
            {t("logOut")}
          </Button>
          <Separator className="my-2" />
          <Button variant="ghost" className="underline" nativeButton={false} render={<Link to={AppRoute.Contact} />}>
            <MessageCircleHeart data-icon="inline-start" />
            {t("contact.title")}
          </Button>
          <Button variant="ghost" className="underline" nativeButton={false} render={<Link to={AppRoute.Changelog} />}>
            <PartyPopper data-icon="inline-start" />
            {t("whatsNew")}
          </Button>
          <Button
            variant="ghost"
            className="underline"
            nativeButton={false}
            render={<Link to={AppRoute.PrivacyPolicy} />}
          >
            <EyeOff data-icon="inline-start" />
            {t("privacyPolicy")}
          </Button>
          <Separator className="my-2" />
          <p className="text-center text-xs text-muted-foreground">{t("version", { version: CURRENT_VERSION })}</p>
          {nativeVersion && (
            <p className="text-center text-xs text-muted-foreground">
              {t("nativeVersion", { version: nativeVersion, platform: getNativePlatformLabel() })}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
