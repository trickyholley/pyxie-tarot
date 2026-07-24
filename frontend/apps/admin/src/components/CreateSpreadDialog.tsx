import { AdminSpread, adminAPI } from "@pyxie/api-client";
import { Button, DialogTrigger, toast } from "@pyxie/ui";
import { Plus } from "lucide-react";
import { useState } from "react";
import { createDefaultPositions } from "@/components/spread-canvas/positions";
import SpreadFormDialog from "@/components/SpreadFormDialog";

interface CreateSpreadDialogProps {
  onCreated: (spread: AdminSpread) => void;
}

export default function CreateSpreadDialog({ onCreated }: CreateSpreadDialogProps) {
  const [open, setOpen] = useState(false);

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
              Create spread
            </Button>
          }
        />
      }
      idPrefix="create-spread"
      title="Create spread"
      description="New spreads are created as system spreads, available to all users."
      submitLabel="Create"
      submittingLabel="Creating..."
      submitErrorMessage="Failed to create spread"
      onSubmit={async (values) => {
        const created = await adminAPI.createSpread({
          name: values.name,
          description: values.description || null,
          positions: values.positions,
          prompts: values.prompts,
          allow_reversed: values.allowReversed,
        });
        toast.success("Spread created");
        onCreated(created);
        setOpen(false);
      }}
    />
  );
}
