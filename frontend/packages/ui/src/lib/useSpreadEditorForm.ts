// SPDX-License-Identifier: AGPL-3.0-or-later
import { SpreadPosition } from "@pyxie/api-client";
import { useEffect, useMemo, useState } from "react";

export interface SpreadEditorValues {
  name: string;
  description: string;
  positions: SpreadPosition[];
  prompts: string[];
  allowReversed: boolean;
}

export type SpreadEditorValidationError = "label" | "prompts";

interface UseSpreadEditorFormOptions {
  /** Form fields re-initialize from getInitialValues() whenever this value changes. */
  resetKey: unknown;
  getInitialValues: () => SpreadEditorValues;
  /** Called instead of submitting when a client-side check fails, so the caller can show translated feedback. */
  onValidationError: (error: SpreadEditorValidationError) => void;
  onSubmit: (values: SpreadEditorValues) => Promise<void>;
}

/**
 * Shared name/description/positions/prompts state, validation, and submit flow behind both admin's
 * spread dialog and apps/app's full-page editor, so the two stay in lockstep instead of forking.
 * Translation-agnostic - callers supply their own `t()`'d text via `onValidationError`.
 */
export function useSpreadEditorForm({
  resetKey,
  getInitialValues,
  onValidationError,
  onSubmit,
}: UseSpreadEditorFormOptions) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [positions, setPositions] = useState<SpreadPosition[]>([]);
  const [prompts, setPrompts] = useState<string[]>([]);
  const [allowReversed, setAllowReversed] = useState(true);
  // Whether one slider drives every position's scale at once. UI-only, re-derived per resetKey
  // rather than owned by the canvas itself so it stays correct across resets.
  const [uniformScale, setUniformScale] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  const invalidIndices = useMemo(
    () => new Set(positions.filter((p) => p.label.trim() === "").map((p) => p.index)),
    [positions],
  );

  useEffect(() => {
    const initial = getInitialValues();
    setName(initial.name);
    setDescription(initial.description);
    setPositions(initial.positions);
    setPrompts(initial.prompts);
    setAllowReversed(initial.allowReversed);
    setUniformScale(initial.positions.every((p) => p.scale === initial.positions[0]?.scale));
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
      onValidationError("label");
      return;
    }

    const trimmedPrompts = prompts.map((p) => p.trim());
    if (trimmedPrompts.some((p) => p === "")) {
      onValidationError("prompts");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        name,
        description: description.trim(),
        positions: positions.map((p) => ({ ...p, label: p.label.trim() })),
        prompts: trimmedPrompts,
        allowReversed,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return {
    name,
    setName,
    description,
    setDescription,
    positions,
    setPositions,
    prompts,
    updatePrompt,
    removePrompt,
    addPrompt,
    allowReversed,
    setAllowReversed,
    uniformScale,
    setUniformScale,
    submitting,
    attemptedSubmit,
    invalidIndices,
    handleSubmit,
  };
}
