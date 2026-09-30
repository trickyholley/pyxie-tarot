// SPDX-License-Identifier: AGPL-3.0-or-later
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@pyxie/ui";
import { PartyPopper } from "lucide-react";
import { useTranslation } from "react-i18next";
import DocumentCard from "@/components/DocumentCard.tsx";
import { CHANGELOG, formatChangelogDate, formatChangelogVersion } from "@/lib/changelog.ts";

export default function Changelog() {
  const { t } = useTranslation("settings");

  return (
    <DocumentCard title={t("changelogTitle")} icon={PartyPopper}>
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
    </DocumentCard>
  );
}
