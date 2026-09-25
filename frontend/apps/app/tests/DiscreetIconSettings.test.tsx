// SPDX-License-Identifier: AGPL-3.0-or-later
import "@/i18n";
import { Capacitor } from "@capacitor/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DiscreetIconSettings from "../src/DiscreetIconSettings";

vi.mock("@/lib/discreetIcon.ts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/discreetIcon.ts")>();
  // Real sleep would add MIN_BLOCK_MS of wall-clock time to every test that confirms a switch.
  return { ...actual, getDiscreetIcon: vi.fn(), setDiscreetIcon: vi.fn(), sleep: vi.fn().mockResolvedValue(undefined) };
});

const { getDiscreetIcon, setDiscreetIcon } = await import("@/lib/discreetIcon.ts");

describe("DiscreetIconSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDiscreetIcon).mockResolvedValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows every icon, including Default, once the accordion is opened", async () => {
    const user = userEvent.setup();
    render(<DiscreetIconSettings />);

    expect(screen.queryByRole("button", { name: /Calendar/ })).not.toBeInTheDocument();

    await user.click(await screen.findByRole("button", { name: /Choose icon/ }));
    for (const name of [/Default/, /Calendar/, /Contact/, /Focus/, /Map/, /Help/]) {
      expect(await screen.findByRole("button", { name })).toBeInTheDocument();
    }
  });

  it("switches to the chosen icon once confirmed", async () => {
    vi.mocked(setDiscreetIcon).mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<DiscreetIconSettings />);

    await user.click(await screen.findByRole("button", { name: /Choose icon/ }));
    await user.click(await screen.findByRole("button", { name: /Focus/ }));
    await user.click(await screen.findByRole("button", { name: /Switch/ }));

    expect(setDiscreetIcon).toHaveBeenLastCalledWith("AppIconFocus");
  });

  it("switches back to the Default icon", async () => {
    vi.mocked(getDiscreetIcon).mockResolvedValue("AppIconFocus");
    vi.mocked(setDiscreetIcon).mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<DiscreetIconSettings />);

    await user.click(await screen.findByRole("button", { name: /Choose icon/ }));
    await user.click(await screen.findByRole("button", { name: /Default/ }));
    await user.click(await screen.findByRole("button", { name: /Switch/ }));

    expect(setDiscreetIcon).toHaveBeenLastCalledWith(null);
  });

  it("doesn't switch when the confirm dialog is cancelled", async () => {
    vi.mocked(setDiscreetIcon).mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<DiscreetIconSettings />);

    await user.click(await screen.findByRole("button", { name: /Choose icon/ }));
    await user.click(await screen.findByRole("button", { name: /Focus/ }));
    await user.click(await screen.findByRole("button", { name: /Cancel/ }));

    expect(setDiscreetIcon).not.toHaveBeenCalled();
  });

  it("warns about the app closing on Android, but points to widgets and app names on iOS", async () => {
    const user = userEvent.setup();
    const getPlatform = vi.spyOn(Capacitor, "getPlatform").mockReturnValue("android");
    const { unmount } = render(<DiscreetIconSettings />);
    await user.click(await screen.findByRole("button", { name: /Choose icon/ }));
    await user.click(await screen.findByRole("button", { name: /Focus/ }));
    expect(screen.getByText(/If it does, simply open the app again/)).toBeInTheDocument();
    unmount();

    getPlatform.mockReturnValue("ios");
    render(<DiscreetIconSettings />);
    await user.click(await screen.findByRole("button", { name: /Choose icon/ }));
    await user.click(await screen.findByRole("button", { name: /Focus/ }));
    expect(screen.getByText(/remove any Pyxie widgets and hide app names/)).toBeInTheDocument();
    expect(screen.queryByText(/If it does, simply open the app again/)).not.toBeInTheDocument();
  });

  it("shows an error when switching fails", async () => {
    vi.mocked(setDiscreetIcon).mockRejectedValue(new Error("native call failed"));
    const user = userEvent.setup();
    render(<DiscreetIconSettings />);

    await user.click(await screen.findByRole("button", { name: /Choose icon/ }));
    await user.click(await screen.findByRole("button", { name: /Focus/ }));
    await user.click(await screen.findByRole("button", { name: /Switch/ }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });
});
