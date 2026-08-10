// SPDX-License-Identifier: AGPL-3.0-or-later
import "@/i18n";
import type { User } from "@pyxie/api-client";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { LoadingProvider, useAuth } from "@pyxie/providers";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import NotificationSettings from "./NotificationSettings";

vi.mock("@pyxie/api-client/src/api/users.ts", () => ({
  updateMyReminder: vi.fn(),
  updateMyNotifications: vi.fn(),
}));

vi.mock("@pyxie/providers", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@pyxie/providers")>();
  return { ...actual, useAuth: vi.fn() };
});

vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: vi.fn() } }));
vi.mock("@capacitor/local-notifications", () => ({
  LocalNotifications: { checkPermissions: vi.fn(), requestPermissions: vi.fn(), schedule: vi.fn() },
}));

const { updateMyReminder, updateMyNotifications } = await import("@pyxie/api-client/src/api/users.ts");

const baseUser: User = {
  id: "1",
  email: "a@b.com",
  username: "a",
  role: "user",
  is_verified: true,
  created_at: "",
  updated_at: "",
  settings: {
    theme: { name: "Pyxie (Default)" },
    reminder: { enabled: false, time: null },
    notifications: { enabled: false },
  },
};

function renderSettings(settings: Partial<User["settings"]>, updateUser = vi.fn()) {
  vi.mocked(useAuth).mockReturnValue({
    user: { ...baseUser, settings: { ...baseUser.settings, ...settings } },
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
    updateUser,
  });
  return render(
    <MemoryRouter>
      <LoadingProvider>
        <NotificationSettings />
      </LoadingProvider>
    </MemoryRouter>,
  );
}

describe("NotificationSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(LocalNotifications.checkPermissions).mockResolvedValue({ display: "granted" });
  });

  it("hides the reminder row entirely while notifications are off", () => {
    renderSettings({ notifications: { enabled: false }, reminder: { enabled: true, time: "20:00" } });

    expect(screen.queryByRole("switch", { name: "Daily reminder" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Reminder time")).not.toBeInTheDocument();
  });

  it("always shows the time picker once notifications are on, disabled while the reminder itself is off", () => {
    renderSettings({ notifications: { enabled: true }, reminder: { enabled: false, time: "20:00" } });

    expect(screen.getByRole("switch", { name: "Daily reminder" })).toBeInTheDocument();
    expect(screen.getByLabelText("Reminder time")).toBeDisabled();
    expect(screen.getByLabelText("Reminder time")).toHaveValue("20:00");
  });

  it("enables the time picker once both the master switch and the reminder are on", () => {
    renderSettings({ notifications: { enabled: true }, reminder: { enabled: true, time: "20:00" } });

    expect(screen.getByLabelText("Reminder time")).not.toBeDisabled();
  });

  it("toggles the master notifications switch", async () => {
    vi.mocked(updateMyNotifications).mockResolvedValue({
      ...baseUser,
      settings: { ...baseUser.settings, notifications: { enabled: true } },
    });
    const updateUser = vi.fn();
    const user = userEvent.setup();
    renderSettings({ notifications: { enabled: false } }, updateUser);

    await user.click(screen.getByRole("switch", { name: "Notifications" }));

    expect(updateMyNotifications).toHaveBeenCalledWith(true);
    await waitFor(() =>
      expect(updateUser).toHaveBeenCalledWith({
        settings: { ...baseUser.settings, notifications: { enabled: true } },
      }),
    );
  });

  it("enables the reminder at a default time when its switch is first turned on", async () => {
    vi.mocked(updateMyReminder).mockResolvedValue({
      ...baseUser,
      settings: { ...baseUser.settings, notifications: { enabled: true }, reminder: { enabled: true, time: "20:00" } },
    });
    const user = userEvent.setup();
    renderSettings({ notifications: { enabled: true }, reminder: { enabled: false, time: null } });

    await user.click(screen.getByRole("switch", { name: "Daily reminder" }));

    expect(updateMyReminder).toHaveBeenCalledWith(true, "20:00");
  });

  it("saves the new time on blur", async () => {
    vi.mocked(updateMyReminder).mockResolvedValue({
      ...baseUser,
      settings: { ...baseUser.settings, notifications: { enabled: true }, reminder: { enabled: true, time: "07:30" } },
    });
    const user = userEvent.setup();
    renderSettings({ notifications: { enabled: true }, reminder: { enabled: true, time: "20:00" } });

    const input = screen.getByLabelText("Reminder time");
    await user.click(input);
    await user.clear(input);
    await user.type(input, "07:30");
    input.blur();

    await waitFor(() => expect(updateMyReminder).toHaveBeenCalledWith(true, "07:30"));
  });

  it("resets to the last saved time instead of getting stuck blank", async () => {
    const user = userEvent.setup();
    renderSettings({ notifications: { enabled: true }, reminder: { enabled: true, time: "20:00" } });

    const input = screen.getByLabelText("Reminder time");
    await user.click(input);
    await user.clear(input);
    await user.tab();

    expect(updateMyReminder).not.toHaveBeenCalled();
    expect(input).toHaveValue("20:00");
  });

  it("turns the reminder off without discarding the picked time", async () => {
    vi.mocked(updateMyReminder).mockResolvedValue({
      ...baseUser,
      settings: { ...baseUser.settings, notifications: { enabled: true }, reminder: { enabled: false, time: "20:00" } },
    });
    const user = userEvent.setup();
    renderSettings({ notifications: { enabled: true }, reminder: { enabled: true, time: "20:00" } });

    await user.click(screen.getByRole("switch", { name: "Daily reminder" }));

    expect(updateMyReminder).toHaveBeenCalledWith(false, "20:00");
  });

  it("warns when notifications are on but the OS permission has been revoked", async () => {
    vi.mocked(LocalNotifications.checkPermissions).mockResolvedValue({ display: "denied" });

    renderSettings({ notifications: { enabled: true } });

    expect(await screen.findByText(/turned off for Pyxie Tarot in your device settings/)).toBeInTheDocument();
  });

  it("doesn't warn when the permission is denied but notifications are off", async () => {
    vi.mocked(LocalNotifications.checkPermissions).mockResolvedValue({ display: "denied" });

    renderSettings({ notifications: { enabled: false } });

    await waitFor(() => expect(LocalNotifications.checkPermissions).toHaveBeenCalled());
    expect(screen.queryByText(/turned off for Pyxie Tarot in your device settings/)).not.toBeInTheDocument();
  });

  it("doesn't check permissions outside the native app", () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);

    renderSettings({ notifications: { enabled: true } });

    expect(LocalNotifications.checkPermissions).not.toHaveBeenCalled();
  });

  it("sends an immediate test notification once permission is granted", async () => {
    vi.mocked(LocalNotifications.requestPermissions).mockResolvedValue({ display: "granted" });
    const user = userEvent.setup();
    renderSettings({ notifications: { enabled: true } });

    await user.click(screen.getByRole("button", { name: "Send test notification" }));

    await waitFor(() =>
      expect(LocalNotifications.schedule).toHaveBeenCalledWith({
        notifications: [expect.objectContaining({ title: "Pyxie Tarot", body: "Time for your daily reading." })],
      }),
    );
  });

  it("doesn't send a test notification when permission is denied, and surfaces the warning", async () => {
    vi.mocked(LocalNotifications.requestPermissions).mockResolvedValue({ display: "denied" });
    const user = userEvent.setup();
    renderSettings({ notifications: { enabled: true } });

    await user.click(screen.getByRole("button", { name: "Send test notification" }));

    await waitFor(() => expect(LocalNotifications.requestPermissions).toHaveBeenCalled());
    expect(LocalNotifications.schedule).not.toHaveBeenCalled();
    expect(await screen.findByText(/turned off for Pyxie Tarot in your device settings/)).toBeInTheDocument();
  });
});
