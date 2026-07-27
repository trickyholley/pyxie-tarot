// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import { formatCardName } from "./formatCardName";

describe("formatCardName", () => {
  it("capitalizes a single-word card slug", () => {
    expect(formatCardName("the_fool")).toBe("The Fool");
  });

  it("capitalizes each word in a multi-word card slug", () => {
    expect(formatCardName("ace_of_wands")).toBe("Ace Of Wands");
  });
});
