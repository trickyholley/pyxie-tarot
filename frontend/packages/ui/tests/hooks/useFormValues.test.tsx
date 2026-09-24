// SPDX-License-Identifier: AGPL-3.0-or-later
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useFormValues } from "../../src/hooks/useFormValues";

const EMPTY = { name: "" };
const PYXIE = { name: "Pyxie" };
const toValues = (source: { name: string }) => ({ name: source.name });

describe("useFormValues", () => {
  it("seeds from the source and updates a single field", () => {
    const { result } = renderHook(() => useFormValues(PYXIE, toValues, EMPTY));

    expect(result.current.values).toEqual({ name: "Pyxie" });
    act(() => result.current.setField("name", "Tarot"));
    expect(result.current.values).toEqual({ name: "Tarot" });
  });

  it("re-seeds when the source changes, but keeps values when it goes back to null", () => {
    const first = { name: "First" };
    const second = { name: "Second" };
    const { result, rerender } = renderHook(
      ({ source }: { source: { name: string } | null }) => useFormValues(source, toValues, EMPTY),
      { initialProps: { source: first as { name: string } | null } },
    );

    rerender({ source: null });
    expect(result.current.values).toEqual({ name: "First" });

    act(() => result.current.setField("name", "Discarded edit"));
    rerender({ source: first });
    expect(result.current.values).toEqual({ name: "First" });

    rerender({ source: second });
    expect(result.current.values).toEqual({ name: "Second" });
  });
});
