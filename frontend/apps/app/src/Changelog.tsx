// SPDX-License-Identifier: AGPL-3.0-or-later
import { Card, CardContent } from "@pyxie/ui";
import { PartyPopper } from "lucide-react";
import { useTranslation } from "react-i18next";
import { CHANGELOG, formatChangelogDate, formatChangelogVersion } from "@/lib/changelog.ts";
import { useHeader } from "@/lib/header.tsx";
import { AppRoute } from "@/lib/routes.ts";

export default function Changelog() {
  const { t } = useTranslation("settings");
  useHeader({ title: t("changelogTitle"), backTo: AppRoute.Settings, icon: PartyPopper });

  return (
    <div className="flex flex-col gap-3 p-4">
      {CHANGELOG.map((entry) => (
        <Card key={entry.version}>
          <CardContent className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-medium">{formatChangelogVersion(entry.version)}</span>
              <span className="text-xs text-muted-foreground">{formatChangelogDate(entry.date)}</span>
            </div>
            <p className="text-sm text-muted-foreground">{entry.message}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
