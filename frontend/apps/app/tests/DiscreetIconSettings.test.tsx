// SPDX-License-Identifier: AGPL-3.0-or-later
import "@/i18n";
import { toast } from "@pyxie/ui";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DiscreetIconSettings from "../src/DiscreetIconSettings";

vi.mock("@/lib/discreetIcon.ts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/discreetIcon.ts")>();
  return { ...actual, getDiscreetIcon: vi.fn(), setDiscreetIcon: vi.fn() };
});

vi.mock("@pyxie/ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@pyxie/ui")>();
  return { ...actual, toast: { ...actual.toast, success: vi.fn(), error: vi.fn() } };
});

const { getDiscreetIcon, setDiscreetIcon } = await import("@/lib/discreetIcon.ts");

describe("DiscreetIconSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDiscreetIcon).mockResolvedValue(null);
  });

  it("lists the default icon alongside all five discreet options", async () => {
    render(<DiscreetIconSettings />);

    for (const name of ["Calendar", "Contact", "Focus", "Map", "Help"]) {
      expect(await screen.findByRole("button", { name })).toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: /Pyxie Tarot/ })).toBeInTheDocument();
  });

  it("switches to the chosen icon", async () => {
    vi.mocked(setDiscreetIcon).mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<DiscreetIconSettings />);

    await user.click(await screen.findByRole("button", { name: "Calendar" }));

    expect(setDiscreetIcon).toHaveBeenCalledWith("AppIconCalendar");
  });

  it("shows an error toast when switching fails", async () => {
    vi.mocked(setDiscreetIcon).mockRejectedValue(new Error("native call failed"));
    const user = userEvent.setup();
    render(<DiscreetIconSettings />);

    await user.click(await screen.findByRole("button", { name: "Calendar" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
  });
});
