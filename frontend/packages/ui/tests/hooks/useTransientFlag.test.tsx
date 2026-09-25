// SPDX-License-Identifier: AGPL-3.0-or-later
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTransientFlag } from "../../src/hooks/useTransientFlag";

describe("useTransientFlag", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("turns on when triggered and back off after the duration", () => {
    const { result } = renderHook(() => useTransientFlag(1000));

    act(() => result.current[1]());
    expect(result.current[0]).toBe(true);

    act(() => vi.advanceTimersByTime(1000));
    expect(result.current[0]).toBe(false);
  });

  it("restarts the timer when triggered again", () => {
    const { result } = renderHook(() => useTransientFlag(1000));

    act(() => result.current[1]());
    act(() => vi.advanceTimersByTime(600));
    act(() => result.current[1]());
    act(() => vi.advanceTimersByTime(600));

    expect(result.current[0]).toBe(true);
  });
});
