// SPDX-License-Identifier: AGPL-3.0-or-later
import { Button } from "@ui/components/base-ui/button";
import { Input } from "@ui/components/base-ui/input";
import { Label } from "@ui/components/base-ui/label";
import { Plus, X } from "lucide-react";
import { useRef } from "react";

export interface SpreadPromptsEditorStrings {
  label: string;
  addLabel: string;
  promptPlaceholder: string;
  promptAria: (number: number) => string;
  removePromptAria: (number: number) => string;
}

interface SpreadPromptsEditorProps {
  prompts: string[];
  onUpdatePrompt: (index: number, value: string) => void;
  onRemovePrompt: (index: number) => void;
  onAddPrompt: () => void;
  strings: SpreadPromptsEditorStrings;
}

export default function SpreadPromptsEditor({
  prompts,
  onUpdatePrompt,
  onRemovePrompt,
  onAddPrompt,
  strings,
}: SpreadPromptsEditorProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const addButtonRef = useRef<HTMLButtonElement>(null);

  const handleRemove = (index: number) => {
    onRemovePrompt(index);
    if (index === prompts.length - 1) {
      (inputRefs.current[index - 1] ?? addButtonRef.current)?.focus();
    }
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <Label>{strings.label}</Label>
        <Button
          ref={addButtonRef}
          type="button"
          variant="outline"
          size="sm"
          onClick={onAddPrompt}
          disabled={prompts.length >= 10}
        >
          <Plus data-icon="inline-start" />
          {strings.addLabel}
        </Button>
      </div>
      <div className="flex flex-col gap-2">
        {prompts.map((prompt, index) => (
          <div key={index} className="flex gap-1">
            <Input
              ref={(element) => {
                inputRefs.current[index] = element;
              }}
              aria-label={strings.promptAria(index + 1)}
              placeholder={strings.promptPlaceholder}
              value={prompt}
              onChange={(e) => onUpdatePrompt(index, e.target.value)}
              maxLength={200}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label={strings.removePromptAria(index + 1)}
              onClick={() => handleRemove(index)}
            >
              <X />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
