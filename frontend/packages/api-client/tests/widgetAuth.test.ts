// SPDX-License-Identifier: AGPL-3.0-or-later
import { afterEach, describe, expect, it, vi } from "vitest";

const issueWidgetToken = vi.fn();
vi.mock("../src/api/auth", () => ({ issueWidgetToken }));

const syncRefreshTokenToNative = vi.fn();
vi.mock("../src/nativeAuthBridge", () => ({ syncRefreshTokenToNative }));

vi.mock("@capacitor/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@capacitor/core")>();
  return { ...actual, Capacitor: { isNativePlatform: vi.fn(() => true) } };
});

const { provisionWidgetToken } = await import("../src/widgetAuth");
const { hasProvisionedWidgetToken } = await import("../src/utils");

describe("provisionWidgetToken", () => {
  afterEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("marks the widget provisioned once the native write is confirmed", async () => {
    issueWidgetToken.mockResolvedValue({ refresh_token: "widget-refresh-token" });
    syncRefreshTokenToNative.mockResolvedValue(undefined);

    await provisionWidgetToken();

    expect(syncRefreshTokenToNative).toHaveBeenCalledWith("widget-refresh-token");
    expect(hasProvisionedWidgetToken()).toBe(true);
  });

  it("does not mark the widget provisioned if the native write fails, so it retries next launch", async () => {
    issueWidgetToken.mockResolvedValue({ refresh_token: "widget-refresh-token" });
    syncRefreshTokenToNative.mockRejectedValue(new Error("bridge not ready"));

    await provisionWidgetToken();

    expect(hasProvisionedWidgetToken()).toBe(false);
  });

  it("does not mark the widget provisioned if minting the token itself fails", async () => {
    issueWidgetToken.mockRejectedValue(new Error("network error"));

    await provisionWidgetToken();

    expect(syncRefreshTokenToNative).not.toHaveBeenCalled();
    expect(hasProvisionedWidgetToken()).toBe(false);
  });
});
