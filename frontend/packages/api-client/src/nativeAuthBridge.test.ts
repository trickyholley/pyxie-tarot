// SPDX-License-Identifier: AGPL-3.0-or-later
import { afterEach, describe, expect, it, vi } from "vitest";

const pluginSetToken = vi.fn();
const pluginClearToken = vi.fn();
const pluginRefreshWidget = vi.fn();

vi.mock("@capacitor/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@capacitor/core")>();
  return {
    ...actual,
    Capacitor: { isNativePlatform: vi.fn() },
    registerPlugin: vi.fn(() => ({
      setToken: pluginSetToken,
      clearToken: pluginClearToken,
      refreshWidget: pluginRefreshWidget,
    })),
  };
});

const { Capacitor, registerPlugin } = await import("@capacitor/core");
const { syncTokenToNative, clearTokenFromNative, refreshNativeWidget } = await import("./nativeAuthBridge");

describe("nativeAuthBridge", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("does nothing outside a native platform, without registering the plugin", () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);

    syncTokenToNative("abc123");
    clearTokenFromNative();
    refreshNativeWidget();

    expect(registerPlugin).not.toHaveBeenCalled();
    expect(pluginSetToken).not.toHaveBeenCalled();
    expect(pluginClearToken).not.toHaveBeenCalled();
    expect(pluginRefreshWidget).not.toHaveBeenCalled();
  });

  it("forwards the token to the native plugin on a native platform", () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);

    syncTokenToNative("abc123");

    expect(pluginSetToken).toHaveBeenCalledWith({ token: "abc123" });
  });

  it("clears the native plugin's token on a native platform", () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);

    clearTokenFromNative();

    expect(pluginClearToken).toHaveBeenCalled();
  });

  it("triggers a widget refresh on a native platform", () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);

    refreshNativeWidget();

    expect(pluginRefreshWidget).toHaveBeenCalled();
  });
});
