// SPDX-License-Identifier: AGPL-3.0-or-later
import { Capacitor } from "@capacitor/core";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getInstaller = vi.fn();

vi.mock("@capacitor/core", () => ({
  Capacitor: { isPluginAvailable: vi.fn() },
  registerPlugin: () => ({ getInstaller }),
}));

const loadInstallSource = async () => {
  vi.resetModules();
  return import("@/lib/installSource");
};

describe("installSource", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Capacitor.isPluginAvailable).mockReturnValue(true);
  });

  it.each([
    { installer: "com.android.vending", fromPlay: true },
    { installer: "com.google.android.packageinstaller", fromPlay: false },
    { installer: null, fromPlay: false },
  ])("counts only the Play Store as a Play install ($installer)", async ({ installer, fromPlay }) => {
    getInstaller.mockResolvedValue({ installer });
    const installSource = await loadInstallSource();

    await installSource.loadInstallSource();

    expect(installSource.isInstalledFromPlay()).toBe(fromPlay);
  });

  it("never counts as a Play install on a shell without the plugin", async () => {
    vi.mocked(Capacitor.isPluginAvailable).mockReturnValue(false);
    const installSource = await loadInstallSource();

    await installSource.loadInstallSource();

    expect(getInstaller).not.toHaveBeenCalled();
    expect(installSource.isInstalledFromPlay()).toBe(false);
  });
});
