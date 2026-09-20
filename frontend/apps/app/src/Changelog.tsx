// SPDX-License-Identifier: AGPL-3.0-or-later
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger, CardContent, LogoCard } from "@pyxie/ui";
import { PartyPopper } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { CHANGELOG, formatChangelogDate, formatChangelogVersion } from "@/lib/changelog.ts";
import { homeRoute } from "@/lib/homeRoute.ts";

export default function Changelog() {
  const { t } = useTranslation("settings");
  const { t: tm } = useTranslation("marketing");

  return (
    <LogoCard
      title={t("changelogTitle")}
      icon={PartyPopper}
      className="max-h-[85dvh] w-2xl max-w-19/20"
      fullHeight={false}
      headerExtra={
        <Link to={homeRoute()} className="text-sm text-muted-foreground underline underline-offset-4">
          {tm("backToHome")}
        </Link>
      }
    >
      <CardContent className="overflow-y-auto">
        <Accordion>
          {CHANGELOG.map((entry) => (
            <AccordionItem key={entry.version} value={entry.version}>
              <AccordionTrigger>
                <h2 className="flex items-baseline gap-2 text-lg font-semibold">
                  {formatChangelogVersion(entry.version)}
                  <span className="text-xs font-normal text-muted-foreground">{formatChangelogDate(entry.date)}</span>
                </h2>
              </AccordionTrigger>
              <AccordionContent>
                <p className="text-sm text-muted-foreground">{entry.message}</p>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </LogoCard>
  );
}
