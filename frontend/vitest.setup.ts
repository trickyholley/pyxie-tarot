import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// jsdom doesn't implement scrollIntoView; stub it so components that call it don't crash in tests.
Element.prototype.scrollIntoView = vi.fn();

// jsdom doesn't implement ResizeObserver; stub it so components that use it don't crash in tests.
// Uses a `function` (not an arrow function) so vi.fn() stays constructible via `new`.
global.ResizeObserver = vi.fn().mockImplementation(function () {
  return { observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn() };
});

afterEach(() => {
  cleanup();
});
