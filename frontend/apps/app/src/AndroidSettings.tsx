// SPDX-License-Identifier: AGPL-3.0-or-later
import { Smartphone } from "lucide-react";
import { useTranslation } from "react-i18next";
import DiscreetIconSettings from "@/DiscreetIconSettings.tsx";
import { useHeader } from "@/lib/header.tsx";
import { AppRoute } from "@/lib/routes.ts";
import NotificationSettings from "@/NotificationSettings.tsx";

// Combines every native-only settings section under one entry point (issue #250) instead of each
// getting its own Capacitor.isNativePlatform()-gated link in Settings.tsx.
export default function AndroidSettings() {
  const { t } = useTranslation("settings");
  useHeader({ title: t("android.title"), backTo: AppRoute.Settings, icon: Smartphone });

  return (
    <div className="flex flex-col gap-4 p-4">
      <NotificationSettings />
      <DiscreetIconSettings />
    </div>
  );
}
