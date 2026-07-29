// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import { getSafeImageUrl } from "./imageUrl";

describe("getSafeImageUrl", () => {
  it("accepts an https URL", () => {
    expect(getSafeImageUrl("https://example.com/fool.jpg")).toBe("https://example.com/fool.jpg");
  });

  it("accepts a relative URL, resolving it against the current origin", () => {
    expect(getSafeImageUrl("/static/card_back.png")).toBe(`${window.location.origin}/static/card_back.png`);
  });

  it("rejects a javascript: URL", () => {
    expect(getSafeImageUrl("javascript:alert(1)")).toBeNull();
  });

  it("rejects a data: URL", () => {
    expect(getSafeImageUrl("data:text/html,<script>alert(1)</script>")).toBeNull();
  });

  it("rejects a non-http(s) scheme like blob:", () => {
    expect(getSafeImageUrl("blob:https://example.com/uuid")).toBeNull();
  });
});
