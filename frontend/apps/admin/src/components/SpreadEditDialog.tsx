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
  Input,
  Label,
  toast,
} from "@pyxie/ui";
import { useEffect, useMemo, useState } from "react";
import SpreadCanvas from "@/components/spread-canvas/SpreadCanvas";
import SpreadPromptsEditor from "@/components/SpreadPromptsEditor";
import { errorMessage } from "@/lib/errors";

interface SpreadEditDialogProps {
  spread: AdminSpread | null;
  onOpenChange: (open: boolean) => void;
  onSaved: (spread: AdminSpread) => void;
}

export default function SpreadEditDialog({ spread, onOpenChange, onSaved }: SpreadEditDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [positions, setPositions] = useState<SpreadPosition[]>([]);
  const [prompts, setPrompts] = useState<string[]>([]);
  const [allowReversed, setAllowReversed] = useState(true);
  const [saving, setSaving] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  const invalidIndices = useMemo(
    () => new Set(positions.filter((p) => p.label.trim() === "").map((p) => p.index)),
    [positions],
  );

  useEffect(() => {
    if (spread) {
      setName(spread.name);
      setDescription(spread.description ?? "");
      setPositions(spread.positions);
      setPrompts(spread.prompts);
      setAllowReversed(spread.allow_reversed);
      setAttemptedSubmit(false);
    }
  }, [spread]);

  const updatePrompt = (index: number, value: string) => {
    setPrompts((prev) => prev.map((p, i) => (i === index ? value : p)));
  };

  const removePrompt = (index: number) => {
    setPrompts((prev) => prev.filter((_, i) => i !== index));
  };

  const addPrompt = () => setPrompts((prev) => [...prev, ""]);

  const handleSubmit = async () => {
    if (!spread) return;

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

    setSaving(true);
    try {
      const updated = await adminAPI.updateSpread(spread.id, {
        name,
        description: description.trim() || null,
        positions: positions.map((p) => ({ ...p, label: p.label.trim() })),
        prompts: trimmedPrompts,
        allow_reversed: allowReversed,
      });
      toast.success("Spread updated");
      onSaved({ ...updated, owner_username: spread.owner_username });
    } catch (err) {
      toast.error(errorMessage(err, "Failed to update spread"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={spread !== null} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Edit spread</DialogTitle>
          <DialogDescription>
            {spread?.owner_username ? `Owned by ${spread.owner_username}` : "System spread"}
          </DialogDescription>
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
                <Label className="mb-2" htmlFor="edit-spread-name">
                  Name
                </Label>
                <Input
                  id="edit-spread-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={100}
                  required
                />
              </div>

              <div>
                <Label className="mb-2" htmlFor="edit-spread-description">
                  Description
                </Label>
                <Input
                  id="edit-spread-description"
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
                <Checkbox id="edit-spread-allow-reversed" checked={allowReversed} onCheckedChange={setAllowReversed} />
                <Label htmlFor="edit-spread-allow-reversed">Allow reversed cards</Label>
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
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
