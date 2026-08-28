// SPDX-License-Identifier: AGPL-3.0-or-later
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// The hook anchors its deadline to module load, so each case imports it fresh *after* installing fake
// timers - otherwise the anchor is a real timestamp the fake clock can't be positioned against.
async function importFreshWithFakeTimers() {
  vi.useFakeTimers();
  vi.resetModules();
  return (await import("../../src/lib/splashHold")).useSplashPhase;
}

describe("useSplashPhase", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("runs visible -> leaving -> gone once the minimum has elapsed", async () => {
    const useSplashPhase = await importFreshWithFakeTimers();
    const { result } = renderHook(() => useSplashPhase(false));
    expect(result.current).toBe("visible");

    act(() => vi.advanceTimersByTime(2000));
    expect(result.current).toBe("leaving");

    act(() => vi.advanceTimersByTime(1000));
    expect(result.current).toBe("gone");
  });

  // Otherwise the fade-out would play on schedule and strand a blank screen while /users/me is still
  // in flight, which is exactly what the splash exists to cover.
  it("stays visible past the minimum while still waiting", async () => {
    const useSplashPhase = await importFreshWithFakeTimers();
    const { result, rerender } = renderHook((waiting: boolean) => useSplashPhase(waiting), { initialProps: true });

    act(() => vi.advanceTimersByTime(5000));
    expect(result.current).toBe("visible");

    rerender(false);
    expect(result.current).toBe("leaving");
  });
});
