// SPDX-License-Identifier: AGPL-3.0-or-later
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { checkNativeVersion } from "@/lib/nativeVersionCheck.ts";

vi.mock("@capacitor/core", () => ({ Capacitor: { getPlatform: vi.fn() } }));
vi.mock("@capacitor/app", () => ({ App: { getInfo: vi.fn() } }));
vi.mock("@pyxie/api-client/src/api/app-version.ts", () => ({ getAppVersionRequirements: vi.fn() }));

const { getAppVersionRequirements } = await import("@pyxie/api-client/src/api/app-version.ts");

function mockInstalledVersion(version: string) {
  vi.mocked(App.getInfo).mockResolvedValue({ name: "Pyxie Tarot", id: "live.pyxietarot.app", version, build: "1" });
}

describe("checkNativeVersion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resolves ok without hitting the API on web", async () => {
    vi.mocked(Capacitor.getPlatform).mockReturnValue("web");

    await expect(checkNativeVersion()).resolves.toEqual({ status: "ok" });
    expect(getAppVersionRequirements).not.toHaveBeenCalled();
  });

  it("checks against iOS's own thresholds on iOS, independent of Android's", async () => {
    vi.mocked(Capacitor.getPlatform).mockReturnValue("ios");
    mockInstalledVersion("0.1.0");
    vi.mocked(getAppVersionRequirements).mockResolvedValue({
      minimum_native_version: "0.1.0",
      recommended_native_version: "0.1.0",
    });

    await expect(checkNativeVersion()).resolves.toEqual({ status: "ok" });
    expect(getAppVersionRequirements).toHaveBeenCalledWith("ios");
  });

  it("blocks below the platform's minimum version", async () => {
    vi.mocked(Capacitor.getPlatform).mockReturnValue("android");
    mockInstalledVersion("0.1.0");
    vi.mocked(getAppVersionRequirements).mockResolvedValue({
      minimum_native_version: "0.2.0",
      recommended_native_version: "0.6.0",
    });

    await expect(checkNativeVersion()).resolves.toEqual({ status: "required" });
  });

  it("recommends an update between the minimum and recommended version", async () => {
    vi.mocked(Capacitor.getPlatform).mockReturnValue("android");
    mockInstalledVersion("0.2.0");
    vi.mocked(getAppVersionRequirements).mockResolvedValue({
      minimum_native_version: "0.1.0",
      recommended_native_version: "0.6.0",
    });

    await expect(checkNativeVersion()).resolves.toEqual({ status: "encouraged", recommendedVersion: "0.6.0" });
  });
});
