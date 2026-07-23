import { AdminSpread, adminAPI } from "@pyxie/api-client";
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  toast,
} from "@pyxie/ui";
import { Plus } from "lucide-react";
import { useState } from "react";
import SpreadSlotsEditor, { EMPTY_SLOTS, Slot } from "@/components/SpreadSlotsEditor";
import { errorMessage } from "@/lib/errors";

interface CreateSpreadDialogProps {
  onCreated: (spread: AdminSpread) => void;
}

export default function CreateSpreadDialog({ onCreated }: CreateSpreadDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [slots, setSlots] = useState<Slot[]>(EMPTY_SLOTS);
  const [prompts, setPrompts] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setName("");
    setDescription("");
    setSlots(EMPTY_SLOTS);
    setPrompts([]);
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) resetForm();
  };

  const toggleSlot = (index: number) => {
    setSlots((prev) => prev.map((slot, i) => (i === index ? { ...slot, selected: !slot.selected } : slot)));
  };

  const updateLabel = (index: number, label: string) => {
    setSlots((prev) => prev.map((slot, i) => (i === index ? { ...slot, label } : slot)));
  };

  const updatePrompt = (index: number, value: string) => {
    setPrompts((prev) => prev.map((p, i) => (i === index ? value : p)));
  };

  const removePrompt = (index: number) => {
    setPrompts((prev) => prev.filter((_, i) => i !== index));
  };

  const addPrompt = () => setPrompts((prev) => [...prev, ""]);

  const handleSubmit = async () => {
    const positions = slots
      .map((slot, index) => ({ index, selected: slot.selected, label: slot.label.trim() }))
      .filter((p) => p.selected);

    if (positions.length === 0) {
      toast.error("Select at least one position");
      return;
    }

    if (positions.some((p) => p.label === "")) {
      toast.error("Give every selected position a label");
      return;
    }

    const trimmedPrompts = prompts.map((p) => p.trim());
    if (trimmedPrompts.some((p) => p === "")) {
      toast.error("Remove empty prompts or fill them in");
      return;
    }

    setSubmitting(true);
    try {
      const created = await adminAPI.createSpread({
        name,
        description: description.trim() || null,
        positions: positions.map(({ index, label }) => ({ index, label })),
        prompts: trimmedPrompts,
      });
      toast.success("Spread created");
      onCreated(created);
      handleOpenChange(false);
    } catch (err) {
      toast.error(errorMessage(err, "Failed to create spread"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button>
            <Plus />
            Create spread
          </Button>
        }
      />
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create spread</DialogTitle>
          <DialogDescription>New spreads are created as system spreads, available to all users.</DialogDescription>
        </DialogHeader>
        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(e) => {
            e.preventDefault();
            void handleSubmit();
          }}
        >
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
            <div>
              <Label className="mb-2" htmlFor="create-spread-name">
                Name
              </Label>
              <Input
                id="create-spread-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                required
              />
            </div>

            <div>
              <Label className="mb-2" htmlFor="create-spread-description">
                Description
              </Label>
              <Input
                id="create-spread-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
              />
            </div>

            <SpreadSlotsEditor
              slots={slots}
              prompts={prompts}
              onToggleSlot={toggleSlot}
              onUpdateLabel={updateLabel}
              onUpdatePrompt={updatePrompt}
              onRemovePrompt={removePrompt}
              onAddPrompt={addPrompt}
            />
          </div>

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
