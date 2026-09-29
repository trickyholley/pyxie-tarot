// SPDX-License-Identifier: AGPL-3.0-or-later
import type { LucideIcon } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger, CardContent, LogoCard } from "@pyxie/ui";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { homeRoute } from "@/lib/homeRoute.ts";
import type { PolicySection } from "./policyContent.ts";
import PolicyBlocks from "./PolicyBlocks.tsx";
import { useDocumentHead } from "./useDocumentHead.ts";

interface PolicyPageProps {
  docKey: "privacyPolicy" | "termsOfService";
  icon: LucideIcon;
  effectiveDate: string;
  path: string;
}

export default function PolicyPage({ docKey, icon, effectiveDate, path }: PolicyPageProps) {
  const { t } = useTranslation("marketing");
  useDocumentHead({ title: t(`${docKey}.metaTitle`), description: t(`${docKey}.metaDescription`), path });
  // Cast needed: JSON module imports widen literal string fields (e.g. block.kind) to `string`,
  // so the returnObjects result can't structurally match PolicyBlock's discriminated union.
  const sections = t(`${docKey}.sections`, { returnObjects: true }) as unknown as PolicySection[];

  return (
    <LogoCard
      title={t(`${docKey}.title`)}
      description={t(`${docKey}.effectiveDate`, { date: effectiveDate })}
      icon={icon}
      className="w-2xl max-w-19/20"
      titleClassName="whitespace-nowrap text-[length:min(1.875rem,8.5vw)]"
      height="fill"
      headerExtra={
        <Link to={homeRoute()} className="text-sm text-muted-foreground underline underline-offset-4">
          {t("backToHome")}
        </Link>
      }
    >
      <CardContent className="overflow-y-auto">
        <Accordion>
          {sections.map((section) => (
            <AccordionItem key={section.id} value={section.id}>
              <AccordionTrigger>
                <h2 className="text-lg font-semibold">{section.title}</h2>
              </AccordionTrigger>
              <AccordionContent className="flex flex-col gap-3">
                {section.blocks && <PolicyBlocks blocks={section.blocks} />}
                {section.subsections?.map((sub) => (
                  <div key={sub.id} className="flex flex-col gap-3 pl-1">
                    <h3 className="text-base font-medium">{sub.title}</h3>
                    <PolicyBlocks blocks={sub.blocks} />
                  </div>
                ))}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </LogoCard>
  );
}
