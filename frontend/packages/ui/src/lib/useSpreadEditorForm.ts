// SPDX-License-Identifier: AGPL-3.0-or-later
import { SpreadPosition } from "@pyxie/api-client";
import { hasBlankLabel } from "@ui/lib/spreadPositions";
import { useState } from "react";

export interface SpreadEditorValues {
  name: string;
  description: string;
  positions: SpreadPosition[];
  prompts: string[];
  allowReversed: boolean;
}

export type SpreadEditorValidationError = "label" | "prompts";

const deriveUniformScale = (positions: SpreadPosition[]) =>
  positions.every((position) => position.scale === positions[0]?.scale);

interface UseSpreadEditorFormOptions {
  /**
   * Form fields re-initialize from this value whenever its identity changes - callers must memoize it
   * (e.g. `useMemo`) so it's stable across renders that shouldn't reset the form.
   */
  initialValues: SpreadEditorValues;
  /** Called instead of submitting when a client-side check fails, so the caller can show translated feedback. */
  onValidationError: (error: SpreadEditorValidationError) => void;
  onSubmit: (values: SpreadEditorValues) => Promise<void>;
}

/**
 * Shared name/description/positions/prompts state, validation, and submit flow behind both admin's
 * spread dialog and apps/app's full-page editor, so the two stay in lockstep instead of forking.
 * Translation-agnostic - callers supply their own `t()`'d text via `onValidationError`.
 */
export function useSpreadEditorForm({ initialValues, onValidationError, onSubmit }: UseSpreadEditorFormOptions) {
  const [prevInitialValues, setPrevInitialValues] = useState(initialValues);
  const [name, setName] = useState(initialValues.name);
  const [description, setDescription] = useState(initialValues.description);
  const [positions, setPositions] = useState<SpreadPosition[]>(initialValues.positions);
  const [prompts, setPrompts] = useState<string[]>(initialValues.prompts);
  const [allowReversed, setAllowReversed] = useState(initialValues.allowReversed);
  const [uniformScale, setUniformScale] = useState(deriveUniformScale(initialValues.positions));
  const [submitting, setSubmitting] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  if (initialValues !== prevInitialValues) {
    setPrevInitialValues(initialValues);
    setName(initialValues.name);
    setDescription(initialValues.description);
    setPositions(initialValues.positions);
    setPrompts(initialValues.prompts);
    setAllowReversed(initialValues.allowReversed);
    setUniformScale(deriveUniformScale(initialValues.positions));
    setAttemptedSubmit(false);
  }

  const updatePrompt = (index: number, value: string) => {
    setPrompts((prevPrompts) => prevPrompts.map((prompt, i) => (i === index ? value : prompt)));
  };

  const removePrompt = (index: number) => {
    setPrompts((prevPrompts) => prevPrompts.filter((_, i) => i !== index));
  };

  const addPrompt = () => setPrompts((prevPrompts) => [...prevPrompts, ""]);

  const handleSubmit = async () => {
    setAttemptedSubmit(true);

    if (positions.some(hasBlankLabel)) {
      onValidationError("label");
      return;
    }

    const trimmedPrompts = prompts.map((prompt) => prompt.trim());
    if (trimmedPrompts.some((prompt) => prompt === "")) {
      onValidationError("prompts");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        name,
        description: description.trim(),
        positions: positions.map((position) => ({ ...position, label: position.label.trim() })),
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
    handleSubmit,
  };
}
