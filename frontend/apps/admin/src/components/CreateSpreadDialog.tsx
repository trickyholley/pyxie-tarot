// SPDX-License-Identifier: AGPL-3.0-or-later
import { AdminSpread, adminAPI } from "@pyxie/api-client";
import { Button, createDefaultPositions, DialogTrigger, toast } from "@pyxie/ui";
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
      onSubmit={async (values) => {
        const created = await adminAPI.createSpread({
          name: values.name,
          description: values.description || null,
          positions: values.positions,
          prompts: values.prompts,
          allow_reversed: values.allowReversed,
        });
        toast.success(t("createDialog.createdToast"));
        onCreated(created);
        setOpen(false);
      }}
    />
  );
}
