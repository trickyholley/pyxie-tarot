// SPDX-License-Identifier: AGPL-3.0-or-later
import { AdminSpread, adminAPI } from "@pyxie/api-client";
import { Button, DialogTrigger, toast } from "@pyxie/ui";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { createDefaultPositions } from "@/components/spread-canvas/positions";
import SpreadFormDialog from "@/components/SpreadFormDialog";

interface CreateSpreadDialogProps {
  onCreated: (spread: AdminSpread) => void;
}

export default function CreateSpreadDialog({ onCreated }: CreateSpreadDialogProps) {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation(["spreads", "common"]);

  return (
    <SpreadFormDialog
      open={open}
      onOpenChange={setOpen}
      resetKey={open}
      getInitialValues={() => ({
        name: "",
        description: "",
        positions: createDefaultPositions(),
        prompts: [],
        allowReversed: true,
      })}
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
