// SPDX-License-Identifier: AGPL-3.0-or-later
import { adminAPI, AdminSpread } from "@pyxie/api-client";
import { toast } from "@pyxie/ui";
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
  return (
    <SpreadFormDialog
      open={spread !== null}
      onOpenChange={onOpenChange}
      resetKey={spread}
      getInitialValues={() =>
        spread
          ? {
              name: spread.name,
              description: spread.description ?? "",
              positions: spread.positions,
              prompts: spread.prompts,
              allowReversed: spread.allow_reversed,
            }
          : emptyValues
      }
      idPrefix="edit-spread"
      title="Edit spread"
      description={spread?.owner_username ? `Owned by ${spread.owner_username}` : "System spread"}
      submitLabel="Save"
      submittingLabel="Saving..."
      submitErrorMessage="Failed to update spread"
      onSubmit={async (values) => {
        if (!spread) return;
        const updated = await adminAPI.updateSpread(spread.id, {
          name: values.name,
          description: values.description || null,
          positions: values.positions,
          prompts: values.prompts,
          allow_reversed: values.allowReversed,
        });
        toast.success("Spread updated");
        onSaved({ ...updated, owner_username: spread.owner_username });
      }}
    />
  );
}
