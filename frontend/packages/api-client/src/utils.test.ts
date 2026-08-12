// SPDX-License-Identifier: AGPL-3.0-or-later
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiFetch, clearToken, compareVersions, getToken, setToken } from "./utils";

describe("token storage", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("returns null when no token is stored", () => {
    expect(getToken()).toBeNull();
  });

  it("stores and retrieves a token", () => {
    setToken("abc123");
    expect(getToken()).toBe("abc123");
  });

  it("clears a stored token", () => {
    setToken("abc123");
    clearToken();
    expect(getToken()).toBeNull();
  });
});

describe("compareVersions", () => {
  it("returns 0 for equal versions", () => {
    expect(compareVersions("1.2.3", "1.2.3")).toBe(0);
  });

  it("compares numerically, not lexicographically", () => {
    expect(compareVersions("1.10.0", "1.9.0")).toBeGreaterThan(0);
  });

  it("treats a missing trailing segment as 0", () => {
    expect(compareVersions("1.2", "1.2.0")).toBe(0);
    expect(compareVersions("1.2.1", "1.2")).toBeGreaterThan(0);
  });

  it("returns negative when the first version is older", () => {
    expect(compareVersions("0.1.0", "0.4.0")).toBeLessThan(0);
  });
});

describe("ApiError", () => {
  it("carries status, body, and name", () => {
    const err = new ApiError(404, { detail: "not found" });

    expect(err.status).toBe(404);
    expect(err.body).toEqual({ detail: "not found" });
    expect(err.name).toBe("ApiError");
    expect(err).toBeInstanceOf(Error);
  });
});

describe("apiFetch", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it("always sets Content-Type and omits Authorization when there is no token", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 200 }));

    await apiFetch("/things");

    const [, init] = vi.mocked(fetch).mock.calls[0];
    const headers = init?.headers as Record<string, string>;
    expect(headers["Content-Type"]).toBe("application/json");
    expect(headers["Authorization"]).toBeUndefined();
  });

  it("adds an Authorization header when a token is present", async () => {
    setToken("my-token");
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 200 }));

    await apiFetch("/things");

    const [, init] = vi.mocked(fetch).mock.calls[0];
    const headers = init?.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Bearer my-token");
  });

  it("merges caller-supplied headers", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 200 }));

    await apiFetch("/things", { headers: { "X-Custom": "yes" } });

    const [, init] = vi.mocked(fetch).mock.calls[0];
    const headers = init?.headers as Record<string, string>;
    expect(headers["X-Custom"]).toBe("yes");
    expect(headers["Content-Type"]).toBe("application/json");
  });

  it("returns the response on success without throwing", async () => {
    const response = new Response(null, { status: 200 });
    vi.mocked(fetch).mockResolvedValue(response);

    await expect(apiFetch("/things")).resolves.toBe(response);
  });

  it("throws an ApiError with the parsed JSON body on a non-ok response", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ detail: "bad request" }), { status: 400 }));

    const error = await apiFetch("/things").catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(400);
    expect(error.body).toEqual({ detail: "bad request" });
  });

  it("throws an ApiError with a null body when the error response isn't valid JSON", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("not json", { status: 500 }));

    const error = await apiFetch("/things").catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(500);
    expect(error.body).toBeNull();
  });
});
