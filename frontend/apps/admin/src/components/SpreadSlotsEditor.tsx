import { AdminSpread } from "@pyxie/api-client";
import { Button, Input, Label } from "@pyxie/ui";
import { Plus, X } from "lucide-react";

export interface Slot {
  selected: boolean;
  label: string;
}

export const EMPTY_SLOTS: Slot[] = Array.from({ length: 9 }, () => ({ selected: false, label: "" }));

export function buildSlots(positions: AdminSpread["positions"]): Slot[] {
  const slots = EMPTY_SLOTS.map((slot) => ({ ...slot }));
  for (const position of positions) {
    slots[position.index] = { selected: true, label: position.label };
  }
  return slots;
}

interface SpreadSlotsEditorProps {
  slots: Slot[];
  prompts: string[];
  onToggleSlot: (index: number) => void;
  onUpdateLabel: (index: number, label: string) => void;
  onUpdatePrompt: (index: number, value: string) => void;
  onRemovePrompt: (index: number) => void;
  onAddPrompt: () => void;
}

export default function SpreadSlotsEditor({
  slots,
  prompts,
  onToggleSlot,
  onUpdateLabel,
  onUpdatePrompt,
  onRemovePrompt,
  onAddPrompt,
}: SpreadSlotsEditorProps) {
  return (
    <>
      <div>
        <Label className="mb-2">Positions</Label>
        <div className="grid grid-cols-3 gap-2">
          {slots.map((slot, index) => (
            <div key={index} className="flex flex-col items-center gap-1">
              <Button
                type="button"
                variant={slot.selected ? "default" : "outline"}
                className="aspect-[5/8] h-auto w-12"
                onClick={() => onToggleSlot(index)}
              >
                {index + 1}
              </Button>
              <Input
                placeholder="Label"
                value={slot.label}
                onChange={(e) => onUpdateLabel(index, e.target.value)}
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
              <Input value={prompt} onChange={(e) => onUpdatePrompt(index, e.target.value)} maxLength={200} />
              <Button type="button" variant="ghost" size="icon-xs" onClick={() => onRemovePrompt(index)}>
                <X />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={onAddPrompt} disabled={prompts.length >= 10}>
            <Plus />
            Add prompt
          </Button>
        </div>
      </div>
    </>
  );
}
