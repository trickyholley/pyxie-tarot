// SPDX-License-Identifier: AGPL-3.0-or-later
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installChunkReloadRecovery, markChunkLoadSucceeded, reloadOnceForChunkError } from "../../src/lib/chunkReload";

function dispatchPreloadError() {
  const event = new Event("vite:preloadError", { cancelable: true });
  window.dispatchEvent(event);
  return event;
}

describe("reloadOnceForChunkError", () => {
  const originalLocation = window.location;
  const reload = vi.fn();

  beforeEach(() => {
    sessionStorage.clear();
    reload.mockClear();
    Object.defineProperty(window, "location", { writable: true, value: { ...originalLocation, reload } });
  });

  afterEach(() => {
    Object.defineProperty(window, "location", { writable: true, value: originalLocation });
  });

  it("reloads on the first call in a tab session", () => {
    expect(reloadOnceForChunkError()).toBe(true);
    expect(reload).toHaveBeenCalledOnce();
  });

  it("doesn't reload again until markChunkLoadSucceeded re-arms it", () => {
    reloadOnceForChunkError();
    expect(reloadOnceForChunkError()).toBe(false);

    markChunkLoadSucceeded();
    expect(reloadOnceForChunkError()).toBe(true);
  });
});

describe("installChunkReloadRecovery", () => {
  const originalLocation = window.location;
  const reload = vi.fn();

  beforeEach(() => {
    sessionStorage.clear();
    reload.mockClear();
    Object.defineProperty(window, "location", { writable: true, value: { ...originalLocation, reload } });
    installChunkReloadRecovery();
  });

  afterEach(() => {
    Object.defineProperty(window, "location", { writable: true, value: originalLocation });
  });

  it("suppresses the error and reloads on the first vite:preloadError", () => {
    const event = dispatchPreloadError();
    expect(event.defaultPrevented).toBe(true);
    expect(reload).toHaveBeenCalledOnce();
  });

  it("lets a second vite:preloadError in the same session through instead of looping", () => {
    dispatchPreloadError();
    const secondEvent = dispatchPreloadError();
    expect(secondEvent.defaultPrevented).toBe(false);
    expect(reload).toHaveBeenCalledOnce();
  });
});
