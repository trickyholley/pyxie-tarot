// SPDX-License-Identifier: AGPL-3.0-or-later
import { AdminSpread, adminAPI } from "@pyxie/api-client";
import { Button, createDefaultPositions, DialogTrigger, toast, toSpreadPayload } from "@pyxie/ui";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import SpreadFormDialog, { SpreadFormValues } from "@/components/SpreadFormDialog";

interface CreateSpreadDialogProps {
  onCreated: (spread: AdminSpread) => void;
}

export default function CreateSpreadDialog({ onCreated }: CreateSpreadDialogProps) {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation(["spreads", "common"]);
  const initialValues = useMemo<SpreadFormValues>(
    () => ({ name: "", description: "", positions: createDefaultPositions(), prompts: [], allowReversed: true }),
    // `open` isn't read below, but keying on it re-derives a fresh object on every open, so re-opening
    // after a cancelled create discards the old draft instead of reusing the previous identity.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
    [open],
  );

  const handleCreate = async (values: SpreadFormValues) => {
    const created = await adminAPI.createSpread(toSpreadPayload(values));
    toast.success(t("createDialog.createdToast"));
    onCreated(created);
    setOpen(false);
  };

  return (
    <SpreadFormDialog
      open={open}
      onOpenChange={setOpen}
      initialValues={initialValues}
      trigger={
        <DialogTrigger
          render={
            <Button>
              <Plus />
              {t("createDialog.trigger")}
            </Button>
          }
        />
      }
      idPrefix="create-spread"
      title={t("createDialog.title")}
      description={t("createDialog.description")}
      submitLabel={t("common:create")}
      submittingLabel={t("common:creating")}
      submitErrorMessage={t("createDialog.error")}
      onSubmit={handleCreate}
    />
  );
}
