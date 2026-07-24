import { AdminSpread, adminAPI, SpreadPosition } from "@pyxie/api-client";
import {
  Button,
  Checkbox,
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
import { useMemo, useState } from "react";
import SpreadCanvas from "@/components/spread-canvas/SpreadCanvas";
import SpreadPromptsEditor from "@/components/SpreadPromptsEditor";
import { errorMessage } from "@/lib/errors";

interface CreateSpreadDialogProps {
  onCreated: (spread: AdminSpread) => void;
}

export default function CreateSpreadDialog({ onCreated }: CreateSpreadDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [positions, setPositions] = useState<SpreadPosition[]>([]);
  const [prompts, setPrompts] = useState<string[]>([]);
  const [allowReversed, setAllowReversed] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  const invalidIndices = useMemo(
    () => new Set(positions.filter((p) => p.label.trim() === "").map((p) => p.index)),
    [positions],
  );

  const resetForm = () => {
    setName("");
    setDescription("");
    setPositions([]);
    setPrompts([]);
    setAllowReversed(true);
    setAttemptedSubmit(false);
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) resetForm();
  };

  const updatePrompt = (index: number, value: string) => {
    setPrompts((prev) => prev.map((p, i) => (i === index ? value : p)));
  };

  const removePrompt = (index: number) => {
    setPrompts((prev) => prev.filter((_, i) => i !== index));
  };

  const addPrompt = () => setPrompts((prev) => [...prev, ""]);

  const handleSubmit = async () => {
    setAttemptedSubmit(true);

    if (positions.length === 0) {
      toast.error("Select at least one position");
      return;
    }

    if (invalidIndices.size > 0) {
      toast.error("Give every position a label");
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
        positions: positions.map((p) => ({ ...p, label: p.label.trim() })),
        prompts: trimmedPrompts,
        allow_reversed: allowReversed,
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
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-3xl">
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
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto sm:grid-cols-2">
            <div className="flex flex-col gap-4">
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

              <SpreadPromptsEditor
                prompts={prompts}
                onUpdatePrompt={updatePrompt}
                onRemovePrompt={removePrompt}
                onAddPrompt={addPrompt}
              />

              <div className="flex items-center gap-2">
                <Checkbox
                  id="create-spread-allow-reversed"
                  checked={allowReversed}
                  onCheckedChange={setAllowReversed}
                />
                <Label htmlFor="create-spread-allow-reversed">Allow reversed cards</Label>
              </div>
            </div>

            <SpreadCanvas
              positions={positions}
              onChange={setPositions}
              invalidIndices={attemptedSubmit ? invalidIndices : undefined}
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
