import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import i18n from "i18next";
import { afterEach, vi } from "vitest";
import createEntry from "./apps/app/src/locales/en/createEntry.json";
import decks from "./apps/app/src/locales/en/decks.json";
import diary from "./apps/app/src/locales/en/diary.json";
import marketing from "./apps/app/src/locales/en/marketing.json";
import settings from "./apps/app/src/locales/en/settings.json";

// apps/app's i18n.ts bundles only the namespaces its eagerly-rendered pages need; the rest are
// fetched per-route. Tests mount those pages directly with no router, so register them here instead
i18n.on("initialized", () => {
  if (!i18n.hasResourceBundle("en", "home")) return;
  for (const [namespace, resources] of Object.entries({ createEntry, decks, diary, marketing, settings })) {
    i18n.addResourceBundle("en", namespace, resources);
  }
});

// jsdom doesn't implement scrollIntoView; stub it so components that call it don't crash in tests.
Element.prototype.scrollIntoView = vi.fn();

// jsdom doesn't implement ResizeObserver; stub it so components that use it don't crash in tests.
// Uses a `function` (not an arrow function) so vi.fn() stays constructible via `new`.
global.ResizeObserver = vi.fn().mockImplementation(function () {
  return { observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn() };
});

// jsdom doesn't implement IntersectionObserver; stub it so components that use it don't crash in tests.
global.IntersectionObserver = vi.fn().mockImplementation(function () {
  return { observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn() };
});

afterEach(() => {
  cleanup();
});
