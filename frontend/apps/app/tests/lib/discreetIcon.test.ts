// SPDX-License-Identifier: AGPL-3.0-or-later
import { Capacitor } from "@capacitor/core";
import { AppIcon } from "@capawesome/capacitor-app-icon";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getDiscreetIcon, setDiscreetIcon } from "../../src/lib/discreetIcon";

vi.mock("@capacitor/core", () => ({ Capacitor: { getPlatform: vi.fn() } }));
vi.mock("@capawesome/capacitor-app-icon", () => ({
  AppIcon: { getCurrentIcon: vi.fn(), resetIcon: vi.fn(), setIcon: vi.fn() },
}));

describe("discreetIcon", () => {
  afterEach(() => vi.clearAllMocks());

  it("passes the id straight through to the plugin on android", async () => {
    vi.mocked(Capacitor.getPlatform).mockReturnValue("android");

    await setDiscreetIcon("AppIconFocus");

    expect(AppIcon.setIcon).toHaveBeenCalledWith({ icon: "AppIconFocus" });
  });

  // The alternate-icon asset-catalog name can't share the primary AppIcon set's "AppIcon" prefix -
  // the plugin's README documents that doing so renders a blank placeholder icon on real iOS devices.
  it("translates the id to the non-AppIcon-prefixed asset-catalog name on ios", async () => {
    vi.mocked(Capacitor.getPlatform).mockReturnValue("ios");

    await setDiscreetIcon("AppIconFocus");

    expect(AppIcon.setIcon).toHaveBeenCalledWith({ icon: "DiscreetFocus" });
  });

  it("resets the icon the same way on every platform", async () => {
    vi.mocked(Capacitor.getPlatform).mockReturnValue("ios");

    await setDiscreetIcon(null);

    expect(AppIcon.resetIcon).toHaveBeenCalled();
  });

  it("translates the native ios name back to the app's id when reading the current icon", async () => {
    vi.mocked(Capacitor.getPlatform).mockReturnValue("ios");
    vi.mocked(AppIcon.getCurrentIcon).mockResolvedValue({ icon: "DiscreetHelp" });

    await expect(getDiscreetIcon()).resolves.toBe("AppIconHelp");
  });

  it("returns null as-is when no discreet icon is active", async () => {
    vi.mocked(Capacitor.getPlatform).mockReturnValue("ios");
    vi.mocked(AppIcon.getCurrentIcon).mockResolvedValue({ icon: null });

    await expect(getDiscreetIcon()).resolves.toBeNull();
  });
});
