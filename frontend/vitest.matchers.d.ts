// SPDX-License-Identifier: AGPL-3.0-or-later
import type { TestingLibraryMatchers } from "@testing-library/jest-dom/matchers";

// jest-dom's own `vitest` augmentation still targets vitest 4's `Assertion<T>`, which no longer merges under vitest 5.
declare module "vitest" {
  interface Matchers<R extends void | Promise<void> = void | Promise<void>, T = unknown> extends TestingLibraryMatchers<
    unknown,
    R
  > {}
}
