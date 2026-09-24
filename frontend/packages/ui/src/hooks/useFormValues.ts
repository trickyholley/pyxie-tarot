// SPDX-License-Identifier: AGPL-3.0-or-later
import { useState } from "react";

/**
 * Form state for an edit dialog, seeded from `source` (the item being edited).
 *
 * Re-seeds during render (not an effect) whenever `source` changes to a new non-null item, so reopening
 * the same item after a Cancel discards the abandoned edits. `source` going back to null (the dialog
 * closing) deliberately keeps the values, so the close animation still shows real content.
 *
 * `source` must be referentially stable across renders (state or a prop); a fresh object literal re-seeds forever.
 */
export function useFormValues<Source, Values extends object>(
  source: Source | null,
  toValues: (source: Source) => Values,
  emptyValues: Values,
) {
  const [values, setValues] = useState<Values>(source ? toValues(source) : emptyValues);
  const [seededFrom, setSeededFrom] = useState(source);

  if (source !== seededFrom) {
    setSeededFrom(source);
    if (source) setValues(toValues(source));
  }

  const setField = <Key extends keyof Values>(key: Key, value: Values[Key]) =>
    setValues((current) => ({ ...current, [key]: value }));

  return { values, setField };
}
