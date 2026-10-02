// SPDX-License-Identifier: AGPL-3.0-or-later
import { Separator } from "@pyxie/ui";
import { useTranslation } from "react-i18next";

interface IntentionNoteProps {
  intention?: string | null;
}

/** TODO */
export default function IntentionNote({ intention }: IntentionNoteProps) {
  const { t } = useTranslation("createEntry");
  if (!intention) return null;

  return (
    <>
      <div className="flex flex-col gap-1">
        <p className="font-medium">{t("intentionNote.label")}</p>
        <p className="whitespace-pre-wrap text-muted-foreground italic">{intention}</p>
      </div>
      <Separator />
    </>
  );
}
