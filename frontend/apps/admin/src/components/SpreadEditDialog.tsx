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
  Input,
  Label,
  toast,
} from "@pyxie/ui";
import { Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { errorMessage } from "@/lib/errors";

interface Slot {
  selected: boolean;
  label: string;
}

const EMPTY_SLOTS: Slot[] = Array.from({ length: 9 }, () => ({ selected: false, label: "" }));

function buildSlots(positions: AdminSpread["positions"]): Slot[] {
  const slots = EMPTY_SLOTS.map((slot) => ({ ...slot }));
  for (const position of positions) {
    slots[position.index] = { selected: true, label: position.label };
  }
  return slots;
}

interface SpreadEditDialogProps {
  spread: AdminSpread | null;
  onOpenChange: (open: boolean) => void;
  onSaved: (spread: AdminSpread) => void;
}

export default function SpreadEditDialog({ spread, onOpenChange, onSaved }: SpreadEditDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [slots, setSlots] = useState<Slot[]>(EMPTY_SLOTS);
  const [prompts, setPrompts] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (spread) {
      setName(spread.name);
      setDescription(spread.description ?? "");
      setSlots(buildSlots(spread.positions));
      setPrompts(spread.prompts);
    }
  }, [spread]);

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
    if (!spread) return;

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

    setSaving(true);
    try {
      const updated = await adminAPI.updateSpread(spread.id, {
        name,
        description: description.trim() || null,
        positions: positions.map(({ index, label }) => ({ index, label })),
        prompts: trimmedPrompts,
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
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-lg">
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
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
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

            <div>
              <Label className="mb-2">Positions</Label>
              <div className="grid grid-cols-3 gap-2">
                {slots.map((slot, index) => (
                  <div key={index} className="flex flex-col items-center gap-1">
                    <Button
                      type="button"
                      variant={slot.selected ? "default" : "outline"}
                      className="aspect-[5/8] h-auto w-12"
                      onClick={() => toggleSlot(index)}
                    >
                      {index + 1}
                    </Button>
                    <Input
                      placeholder="Label"
                      value={slot.label}
                      onChange={(e) => updateLabel(index, e.target.value)}
                      maxLength={50}
                      disabled={!slot.selected}
                      className="w-24 text-xs"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label className="mb-2">Prompts</Label>
              <div className="flex flex-col gap-2">
                {prompts.map((prompt, index) => (
                  <div key={index} className="flex gap-1">
                    <Input value={prompt} onChange={(e) => updatePrompt(index, e.target.value)} maxLength={200} />
                    <Button type="button" variant="ghost" size="icon-xs" onClick={() => removePrompt(index)}>
                      <X />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addPrompt} disabled={prompts.length >= 10}>
                  <Plus />
                  Add prompt
                </Button>
              </div>
            </div>
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
