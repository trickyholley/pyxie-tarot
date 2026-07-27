// SPDX-License-Identifier: AGPL-3.0-or-later
import { Button, Input, Label } from "@pyxie/ui";
import { Plus, X } from "lucide-react";

interface SpreadPromptsEditorProps {
  prompts: string[];
  onUpdatePrompt: (index: number, value: string) => void;
  onRemovePrompt: (index: number) => void;
  onAddPrompt: () => void;
}

export default function SpreadPromptsEditor({
  prompts,
  onUpdatePrompt,
  onRemovePrompt,
  onAddPrompt,
}: SpreadPromptsEditorProps) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <Label>Prompts</Label>
        <Button
          type="button"
          variant="outline"
          size="icon-xs"
          onClick={onAddPrompt}
          disabled={prompts.length >= 10}
          aria-label="Add prompt"
        >
          <Plus />
        </Button>
      </div>
      <div className="flex flex-col gap-2">
        {prompts.map((prompt, index) => (
          <div key={index} className="flex gap-1">
            <Input value={prompt} onChange={(e) => onUpdatePrompt(index, e.target.value)} maxLength={200} />
            <Button type="button" variant="ghost" size="icon-xs" onClick={() => onRemovePrompt(index)}>
              <X />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
