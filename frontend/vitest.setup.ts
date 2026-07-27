import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// jsdom doesn't implement scrollIntoView; stub it so components that call it don't crash in tests.
Element.prototype.scrollIntoView = vi.fn();

afterEach(() => {
  cleanup();
});
