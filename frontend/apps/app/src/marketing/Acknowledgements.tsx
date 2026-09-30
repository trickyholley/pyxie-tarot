// SPDX-License-Identifier: AGPL-3.0-or-later
import { AwardIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import DocumentCard from "@/components/DocumentCard.tsx";
import { AppRoute } from "@/lib/routes.ts";
import type { PolicySection } from "./policyContent.ts";
import PolicyBlocks from "./PolicyBlocks.tsx";
import { useDocumentHead } from "./useDocumentHead.ts";

export default function Acknowledgements() {
  const { t } = useTranslation("marketing");
  useDocumentHead({
    title: t("acknowledgements.metaTitle"),
    description: t("acknowledgements.metaDescription"),
    path: AppRoute.Acknowledgements,
  });
  // Same JSON-widening cast as PolicyPage's sections.
  const sections = t("acknowledgements.sections", { returnObjects: true }) as unknown as PolicySection[];

  return (
    <DocumentCard title={t("acknowledgements.title")} icon={AwardIcon}>
      <div className="flex flex-col gap-6">
        {sections.map((section) => (
          <section key={section.id} className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">{section.title}</h2>
            {section.blocks && <PolicyBlocks blocks={section.blocks} />}
          </section>
        ))}
      </div>
    </DocumentCard>
  );
}
