// SPDX-License-Identifier: AGPL-3.0-or-later
import { Card, CardContent } from "@pyxie/ui";
import { useTranslation } from "react-i18next";
import { CHANGELOG } from "@/lib/changelog.ts";
import { useHeader } from "@/lib/header.tsx";

export default function Changelog() {
  const { t } = useTranslation("settings");
  useHeader({ title: t("changelogTitle"), backTo: "/settings" });

  return (
    <div className="flex flex-col gap-3 p-4">
      {CHANGELOG.map((entry) => (
        <Card key={entry.version}>
          <CardContent className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-medium">{entry.version}</span>
              <span className="text-xs text-muted-foreground">{new Date(entry.date).toLocaleDateString()}</span>
            </div>
            <p className="text-sm text-muted-foreground">{entry.message}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
