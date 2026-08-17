// SPDX-License-Identifier: AGPL-3.0-or-later
import "@/i18n";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import NativeVersionGate from "../../src/components/NativeVersionGate";

vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: vi.fn() } }));
vi.mock("@capacitor/app", () => ({ App: { getInfo: vi.fn() } }));
vi.mock("@pyxie/api-client/src/api/app-version.ts", () => ({ getAppVersionRequirements: vi.fn() }));

const { getAppVersionRequirements } = await import("@pyxie/api-client/src/api/app-version.ts");

function mockRequirements(minimum: string, recommended: string) {
  vi.mocked(getAppVersionRequirements).mockResolvedValue({
    minimum_native_version: minimum,
    recommended_native_version: recommended,
  });
}

function mockInstalledVersion(version: string) {
  vi.mocked(App.getInfo).mockResolvedValue({ name: "Pyxie Tarot", id: "live.pyxietarot.app", version, build: "1" });
}

describe("NativeVersionGate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("renders children without checking on a non-native platform", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);

    render(
      <NativeVersionGate>
        <div>App content</div>
      </NativeVersionGate>,
    );

    expect(await screen.findByText("App content")).toBeInTheDocument();
    expect(getAppVersionRequirements).not.toHaveBeenCalled();
  });

  it("blocks the app entirely below the minimum version", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    mockInstalledVersion("0.1.0");
    mockRequirements("0.2.0", "0.4.0");

    render(
      <NativeVersionGate>
        <div>App content</div>
      </NativeVersionGate>,
    );

    expect(await screen.findByText("Update required")).toBeInTheDocument();
    expect(screen.queryByText("App content")).not.toBeInTheDocument();
  });

  it("shows a dismissible nudge between the minimum and recommended version", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    mockInstalledVersion("0.1.0");
    mockRequirements("0.1.0", "0.4.0");

    render(
      <NativeVersionGate>
        <div>App content</div>
      </NativeVersionGate>,
    );

    expect(await screen.findByText("App content")).toBeInTheDocument();
    expect(screen.getByText("Update available")).toBeInTheDocument();
  });

  it("renders nothing extra at or above the recommended version", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    mockInstalledVersion("0.4.0");
    mockRequirements("0.1.0", "0.4.0");

    render(
      <NativeVersionGate>
        <div>App content</div>
      </NativeVersionGate>,
    );

    expect(await screen.findByText("App content")).toBeInTheDocument();
    expect(screen.queryByText("Update available")).not.toBeInTheDocument();
  });

  it("doesn't re-show a nudge already dismissed for that recommended version", async () => {
    localStorage.setItem("pyxie:dismissedUpdateNudgeVersion", "0.4.0");
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    mockInstalledVersion("0.1.0");
    mockRequirements("0.1.0", "0.4.0");

    render(
      <NativeVersionGate>
        <div>App content</div>
      </NativeVersionGate>,
    );

    expect(await screen.findByText("App content")).toBeInTheDocument();
    expect(screen.queryByText("Update available")).not.toBeInTheDocument();
  });

  it("fails open and renders children if the version check errors", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(App.getInfo).mockRejectedValue(new Error("offline"));

    render(
      <NativeVersionGate>
        <div>App content</div>
      </NativeVersionGate>,
    );

    await waitFor(() => expect(screen.getByText("App content")).toBeInTheDocument());
  });
});
