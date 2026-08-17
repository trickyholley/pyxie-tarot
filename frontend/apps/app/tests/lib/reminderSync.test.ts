// SPDX-License-Identifier: AGPL-3.0-or-later
import "@/i18n";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useReminderSync } from "../../src/lib/reminderSync";

vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: vi.fn() } }));
vi.mock("@capacitor/local-notifications", () => ({
  LocalNotifications: { cancel: vi.fn(), requestPermissions: vi.fn(), schedule: vi.fn() },
}));

describe("useReminderSync", () => {
  afterEach(() => vi.clearAllMocks());

  it("does nothing outside a native platform", () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);

    renderHook(() => useReminderSync(true, { enabled: true, time: "20:00" }));

    expect(LocalNotifications.cancel).not.toHaveBeenCalled();
  });

  it("cancels any previously scheduled reminder when the reminder itself is disabled", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);

    renderHook(() => useReminderSync(true, { enabled: false, time: null }));

    await waitFor(() => expect(LocalNotifications.cancel).toHaveBeenCalledWith({ notifications: [{ id: 1 }] }));
    expect(LocalNotifications.schedule).not.toHaveBeenCalled();
  });

  it("cancels any previously scheduled reminder when the master notifications switch is off", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);

    renderHook(() => useReminderSync(false, { enabled: true, time: "20:00" }));

    await waitFor(() => expect(LocalNotifications.cancel).toHaveBeenCalledWith({ notifications: [{ id: 1 }] }));
    expect(LocalNotifications.schedule).not.toHaveBeenCalled();
  });

  it("schedules a daily notification at the picked time once permission is granted", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(LocalNotifications.requestPermissions).mockResolvedValue({ display: "granted" });

    renderHook(() => useReminderSync(true, { enabled: true, time: "20:30" }));

    await waitFor(() =>
      expect(LocalNotifications.schedule).toHaveBeenCalledWith({
        notifications: [
          expect.objectContaining({ id: 1, schedule: { on: { hour: 20, minute: 30 }, allowWhileIdle: true } }),
        ],
      }),
    );
  });

  it("uses the custom message as the notification body when set", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(LocalNotifications.requestPermissions).mockResolvedValue({ display: "granted" });

    renderHook(() => useReminderSync(true, { enabled: true, time: "20:30", message: "Draw your card!" }));

    await waitFor(() =>
      expect(LocalNotifications.schedule).toHaveBeenCalledWith({
        notifications: [expect.objectContaining({ body: "Draw your card!" })],
      }),
    );
  });

  it("falls back to the default body when no custom message is set", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(LocalNotifications.requestPermissions).mockResolvedValue({ display: "granted" });

    renderHook(() => useReminderSync(true, { enabled: true, time: "20:30", message: null }));

    await waitFor(() =>
      expect(LocalNotifications.schedule).toHaveBeenCalledWith({
        notifications: [expect.objectContaining({ body: "Time for your daily reading." })],
      }),
    );
  });

  it("doesn't schedule when notification permission is denied", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(LocalNotifications.requestPermissions).mockResolvedValue({ display: "denied" });

    renderHook(() => useReminderSync(true, { enabled: true, time: "20:30" }));

    await waitFor(() => expect(LocalNotifications.requestPermissions).toHaveBeenCalled());
    expect(LocalNotifications.schedule).not.toHaveBeenCalled();
  });
});
