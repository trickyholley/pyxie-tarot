import { SpreadPosition } from "@pyxie/api-client";
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
import { ReactNode, useEffect, useMemo, useState } from "react";
import SpreadCanvas from "@/components/spread-canvas/SpreadCanvas";
import SpreadPromptsEditor from "@/components/SpreadPromptsEditor";
import { errorMessage } from "@/lib/errors";

export interface SpreadFormValues {
  name: string;
  description: string;
  positions: SpreadPosition[];
  prompts: string[];
  allowReversed: boolean;
}

interface SpreadFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Form fields re-initialize from getInitialValues() whenever this value changes. */
  resetKey: unknown;
  getInitialValues: () => SpreadFormValues;
  trigger?: ReactNode;
  idPrefix: string;
  title: string;
  description: ReactNode;
  submitLabel: string;
  submittingLabel: string;
  submitErrorMessage: string;
  onSubmit: (values: SpreadFormValues) => Promise<void>;
}

export default function SpreadFormDialog({
  open,
  onOpenChange,
  resetKey,
  getInitialValues,
  trigger,
  idPrefix,
  title,
  description,
  submitLabel,
  submittingLabel,
  submitErrorMessage,
  onSubmit,
}: SpreadFormDialogProps) {
  const [name, setName] = useState("");
  const [spreadDescription, setSpreadDescription] = useState("");
  const [positions, setPositions] = useState<SpreadPosition[]>([]);
  const [prompts, setPrompts] = useState<string[]>([]);
  const [allowReversed, setAllowReversed] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  const invalidIndices = useMemo(
    () => new Set(positions.filter((p) => p.label.trim() === "").map((p) => p.index)),
    [positions],
  );

  useEffect(() => {
    const initial = getInitialValues();
    setName(initial.name);
    setSpreadDescription(initial.description);
    setPositions(initial.positions);
    setPrompts(initial.prompts);
    setAllowReversed(initial.allowReversed);
    setAttemptedSubmit(false);
    // Re-initialize only when resetKey changes, not on every getInitialValues identity change.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  const updatePrompt = (index: number, value: string) => {
    setPrompts((prev) => prev.map((p, i) => (i === index ? value : p)));
  };

  const removePrompt = (index: number) => {
    setPrompts((prev) => prev.filter((_, i) => i !== index));
  };

  const addPrompt = () => setPrompts((prev) => [...prev, ""]);

  const handleSubmit = async () => {
    setAttemptedSubmit(true);

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
      await onSubmit({
        name,
        description: spreadDescription.trim(),
        positions: positions.map((p) => ({ ...p, label: p.label.trim() })),
        prompts: trimmedPrompts,
        allowReversed,
      });
    } catch (err) {
      toast.error(errorMessage(err, submitErrorMessage));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger}
      <DialogContent className="flex max-h-[90vh] min-w-4xl max-w-4xl flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(e) => {
            e.preventDefault();
            void handleSubmit();
          }}
        >
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-auto sm:grid-cols-[1fr_2fr]">
            <div className="flex flex-col gap-4">
              <div>
                <Label className="mb-2" htmlFor={`${idPrefix}-name`}>
                  Name
                </Label>
                <Input
                  id={`${idPrefix}-name`}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={100}
                  required
                />
              </div>

              <div>
                <Label className="mb-2" htmlFor={`${idPrefix}-description`}>
                  Description
                </Label>
                <Input
                  id={`${idPrefix}-description`}
                  value={spreadDescription}
                  onChange={(e) => setSpreadDescription(e.target.value)}
                  maxLength={500}
                />
              </div>

              <SpreadPromptsEditor
                prompts={prompts}
                onUpdatePrompt={updatePrompt}
                onRemovePrompt={removePrompt}
                onAddPrompt={addPrompt}
              />
            </div>

            <SpreadCanvas
              positions={positions}
              onChange={setPositions}
              invalidIndices={attemptedSubmit ? invalidIndices : undefined}
              allowReversed={allowReversed}
              onAllowReversedChange={setAllowReversed}
            />
          </div>

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
            <Button type="submit" disabled={submitting}>
              {submitting ? submittingLabel : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
