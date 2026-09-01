// SPDX-License-Identifier: AGPL-3.0-or-later
import { afterEach, describe, expect, it, vi } from "vitest";
import i18n, { loadNamespaces } from "../src/i18n.ts";

// vitest.setup.ts pre-registers every lazy namespace, since most tests mount pages directly with
// no router to resolve them. These tests need the un-loaded state, so they drop the bundle first
// and restore it afterwards rather than leaving the singleton short for whatever runs next.
const drop = (...namespaces: string[]) => {
  const saved = namespaces.map((ns) => [ns, i18n.getResourceBundle("en", ns)] as const);
  for (const ns of namespaces) i18n.removeResourceBundle("en", ns);
  return () => {
    for (const [ns, bundle] of saved) if (bundle) i18n.addResourceBundle("en", ns, bundle);
  };
};

let restore: (() => void) | undefined;
afterEach(() => {
  restore?.();
  restore = undefined;
  vi.restoreAllMocks();
});

describe("loadNamespaces", () => {
  it("fetches and registers a namespace that isn't bundled up front", async () => {
    restore = drop("settings");
    expect(i18n.hasResourceBundle("en", "settings")).toBe(false);

    await loadNamespaces(["settings"]);

    expect(i18n.hasResourceBundle("en", "settings")).toBe(true);
    expect(Object.keys(i18n.getResourceBundle("en", "settings")).length).toBeGreaterThan(0);
  });

  it("skips a namespace that's already registered", async () => {
    expect(i18n.hasResourceBundle("en", "marketing")).toBe(true);
    const addResourceBundle = vi.spyOn(i18n, "addResourceBundle");

    await loadNamespaces(["marketing"]);

    expect(addResourceBundle).not.toHaveBeenCalled();
  });

  it("registers every namespace in one call, loading only the missing ones", async () => {
    restore = drop("diary", "decks");
    const addResourceBundle = vi.spyOn(i18n, "addResourceBundle");

    await loadNamespaces(["diary", "decks", "marketing"]);

    expect(i18n.hasResourceBundle("en", "diary")).toBe(true);
    expect(i18n.hasResourceBundle("en", "decks")).toBe(true);
    expect(addResourceBundle.mock.calls.map((call) => call[1]).sort()).toEqual(["decks", "diary"]);
  });
});
