// SPDX-License-Identifier: AGPL-3.0-or-later
import { adminAPI, AdminSpread } from "@pyxie/api-client";
import { normalizePositions, toast, toSpreadPayload } from "@pyxie/ui";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import SpreadFormDialog, { SpreadFormValues } from "@/components/SpreadFormDialog";

interface EditSpreadDialogProps {
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

export default function EditSpreadDialog({ spread, onOpenChange, onSaved }: EditSpreadDialogProps) {
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

  const handleEdit = async (values: SpreadFormValues) => {
    if (!spread) return;
    const updated = await adminAPI.updateSpread(spread.id, toSpreadPayload(values));
    toast.success(t("editDialog.updatedToast"));
    onSaved({ ...updated, owner_username: spread.owner_username });
  };

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
      onSubmit={handleEdit}
    />
  );
}
