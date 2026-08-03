// SPDX-License-Identifier: AGPL-3.0-or-later
import { API } from "@pyxie/api-client";
import { describe, expect, it, vi } from "vitest";
import { getSafeImageUrl } from "./imageUrl";

describe("getSafeImageUrl", () => {
  it("accepts an https URL", () => {
    expect(getSafeImageUrl("https://example.com/fool.jpg")).toBe("https://example.com/fool.jpg");
  });

  it("accepts a relative URL, resolving it against the API origin rather than the frontend's own", () => {
    const apiOrigin = new URL(API.BASE_URL, window.location.origin).origin;
    expect(getSafeImageUrl("/static/card_back.png")).toBe(`${apiOrigin}/static/card_back.png`);
  });

  it("resolves a relative URL against a cross-origin API host, as in prod", async () => {
    vi.resetModules();
    vi.doMock("@pyxie/api-client", () => ({ API: { BASE_URL: "https://api.pyxietarot.live/api/v1" } }));
    const { getSafeImageUrl: getSafeImageUrlWithCrossOriginApi } = await import("./imageUrl");

    expect(getSafeImageUrlWithCrossOriginApi("/static/deck_images/fool.jpg")).toBe(
      "https://api.pyxietarot.live/static/deck_images/fool.jpg",
    );

    vi.doUnmock("@pyxie/api-client");
    vi.resetModules();
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
