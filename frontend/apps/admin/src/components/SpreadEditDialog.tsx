// SPDX-License-Identifier: AGPL-3.0-or-later
import { adminAPI, AdminSpread } from "@pyxie/api-client";
import { normalizePositions, toast } from "@pyxie/ui";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import SpreadFormDialog, { SpreadFormValues } from "@/components/SpreadFormDialog";

interface SpreadEditDialogProps {
  spread: AdminSpread | null;
  onOpenChange: (open: boolean) => void;
  onSaved: (spread: AdminSpread) => void;
}

const emptyValues: SpreadFormValues = {
  name: "",
  description: "",
  positions: [],
  prompts: [],
  allowReversed: true,
};

export default function SpreadEditDialog({ spread, onOpenChange, onSaved }: SpreadEditDialogProps) {
  const { t } = useTranslation(["spreads", "common"]);
  const initialValues = useMemo<SpreadFormValues>(
    () =>
      spread
        ? {
            name: spread.name,
            description: spread.description ?? "",
            positions: normalizePositions(spread.positions),
            prompts: spread.prompts,
            allowReversed: spread.allow_reversed,
          }
        : emptyValues,
    [spread],
  );
  return (
    <SpreadFormDialog
      open={spread !== null}
      onOpenChange={onOpenChange}
      initialValues={initialValues}
      idPrefix="edit-spread"
      title={t("editDialog.title")}
      description={
        spread?.owner_username
          ? t("editDialog.ownedByTemplate", { username: spread.owner_username })
          : t("editDialog.systemSpread")
      }
      submitLabel={t("common:save")}
      submittingLabel={t("common:saving")}
      submitErrorMessage={t("editDialog.error")}
      onSubmit={async (values) => {
        if (!spread) return;
        const updated = await adminAPI.updateSpread(spread.id, {
          name: values.name,
          description: values.description || null,
          positions: values.positions,
          prompts: values.prompts,
          allow_reversed: values.allowReversed,
        });
        toast.success(t("editDialog.updatedToast"));
        onSaved({ ...updated, owner_username: spread.owner_username });
      }}
    />
  );
}
