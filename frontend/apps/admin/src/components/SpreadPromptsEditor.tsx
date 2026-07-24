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
  );
}
